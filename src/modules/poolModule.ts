/* eslint-disable no-return-await */
/* eslint-disable camelcase */
/* eslint-disable import/no-unresolved */
import { DynamicFieldPage } from '@mysten/sui.js/dist/types/dynamic_fields'
import { normalizeSuiAddress, TransactionArgument, TransactionBlock } from '@mysten/sui.js'
import { TransactionUtil } from '../utils/transaction-util'
import { tickScore } from '../math'
import { asUintN, buildTickData, buildTickDataByEvent } from '../utils/common'
import { extractStructTagFromType, isSortedSymbols } from '../utils/contracts'
import { TickData } from '../types/clmmpool'
import { ClmmFetcherModule, ClmmIntegrateModule, CLOCK_ADDRESS, SuiObjectIdType } from '../types/sui'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { CoinPairType } from './resourcesModule'

export type CreatePoolParams = {
  tick_spacing: number
  initialize_sqrt_price: string
  uri: string
} & CoinPairType

export type CreatePoolAddLiquidityParams = {
  amount_a: number
  amount_b: number
  fix_amount_a: boolean
  tick_lower: number
  tick_upper: number
} & CreatePoolParams

export type FetchTickParams = {
  pool_id: SuiObjectIdType
} & CoinPairType

type GetTickParams = {
  start: number[]
  limit: number
} & FetchTickParams

export class PoolModule implements IModule {
  protected _sdk: SDK

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  async creatPoolsTransactionPayload(paramss: CreatePoolParams[]): Promise<TransactionBlock> {
    for (const params of paramss) {
      if (isSortedSymbols(normalizeSuiAddress(params.coinTypeA), normalizeSuiAddress(params.coinTypeB))) {
        const swpaCoinTypeB = params.coinTypeB
        params.coinTypeB = params.coinTypeA
        params.coinTypeA = swpaCoinTypeB
      }
    }

    return await this.creatPool(paramss)
  }

  /**
   * Create a pool of clmmpool protocol. The pool is identified by (CoinTypeA, CoinTypeB, tick_spacing).
   * @param params
   * @returns
   */
  async creatPoolTransactionPayload(params: CreatePoolParams | CreatePoolAddLiquidityParams): Promise<TransactionBlock> {
    if (isSortedSymbols(normalizeSuiAddress(params.coinTypeA), normalizeSuiAddress(params.coinTypeB))) {
      const swpaCoinTypeB = params.coinTypeB
      params.coinTypeB = params.coinTypeA
      params.coinTypeA = swpaCoinTypeB
    }

    if ('fix_amount_a' in params) {
      return await this.creatPoolAndAddLiquidity(params)
    }
    return await this.creatPool([params])
  }

  private async creatPool(paramss: CreatePoolParams[]) {
    const tx = new TransactionBlock()
    const { clmm } = this.sdk.sdkOptions
    const eventConfig = clmm.config
    if (eventConfig === undefined) {
      throw Error('eventConfig is null')
    }
    const globalPauseStatusObjectId = eventConfig.global_config_id
    const poolsId = eventConfig.pools_id
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetHigh2)

    paramss.forEach((params) => {
      const args = [
        tx.object(globalPauseStatusObjectId),
        tx.object(poolsId),
        tx.pure(params.tick_spacing.toString()),
        tx.pure(params.initialize_sqrt_price),
        tx.pure(params.uri),
        tx.object(CLOCK_ADDRESS),
      ]

      tx.moveCall({
        target: `${clmm.clmm_router}::${ClmmIntegrateModule}::create_pool`,
        typeArguments: [params.coinTypeA, params.coinTypeB],
        arguments: args,
      })
    })

    return tx
  }

  private async creatPoolAndAddLiquidity(params: CreatePoolAddLiquidityParams) {
    if (this._sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    const tx = new TransactionBlock()
    const { clmm } = this.sdk.sdkOptions
    const eventConfig = clmm.config
    if (eventConfig === undefined) {
      throw Error('eventConfig is null')
    }
    const globalPauseStatusObjectId = eventConfig.global_config_id
    const poolsId = eventConfig.pools_id
    const allCoinAsset = await this._sdk.Resources.getOwnerCoinAssets(this._sdk.senderAddress)
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetHigh2)

    const primaryCoinAInputs = TransactionUtil.buildCoinInputForAmount(
      tx,
      allCoinAsset,
      BigInt(params.amount_a),
      params.coinTypeA
    ) as TransactionArgument
    const primaryCoinBInputs = TransactionUtil.buildCoinInputForAmount(
      tx,
      allCoinAsset,
      BigInt(params.amount_b),
      params.coinTypeB
    ) as TransactionArgument

    const primaryCoinInputs: {
      coinInput: TransactionArgument
      coinAmount: string
    }[] = []
    if (primaryCoinAInputs) {
      primaryCoinInputs.push({
        coinInput: primaryCoinAInputs,
        coinAmount: params.amount_a.toString(),
      })
    }
    if (primaryCoinBInputs) {
      primaryCoinInputs.push({
        coinInput: primaryCoinBInputs,
        coinAmount: params.amount_b.toString(),
      })
    }

    let addLiquidityName
    if (primaryCoinInputs.length === 2) {
      addLiquidityName = 'create_pool_with_liquidity_with_all'
    } else {
      addLiquidityName = primaryCoinAInputs !== undefined ? 'create_pool_with_liquidity_only_a' : 'create_pool_with_liquidity_only_b'
    }

    const args = [
      tx.pure(globalPauseStatusObjectId),
      tx.pure(poolsId),
      tx.pure(params.tick_spacing.toString()),
      tx.pure(params.initialize_sqrt_price),
      tx.pure(params.uri),
      ...primaryCoinInputs.map((item) => item.coinInput),
      tx.pure(asUintN(BigInt(params.tick_lower)).toString()),
      tx.pure(asUintN(BigInt(params.tick_upper)).toString()),
      ...primaryCoinInputs.map((item) => tx.pure(item.coinAmount)),
      tx.pure(params.fix_amount_a),
      tx.pure(CLOCK_ADDRESS),
    ]

    tx.moveCall({
      target: `${clmm.clmm_router}::${ClmmIntegrateModule}::${addLiquidityName}`,
      typeArguments: [params.coinTypeA, params.coinTypeB],
      arguments: args,
    })

    return tx
  }

  async fetchTicks(params: FetchTickParams): Promise<TickData[]> {
    let ticks: TickData[] = []
    let start: number[] = []
    const limit = 512

    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const data = await this.getTicks({
        pool_id: params.pool_id,
        coinTypeA: params.coinTypeA,
        coinTypeB: params.coinTypeB,
        start,
        limit,
      })
      // console.log('data: ', data)

      ticks = [...ticks, ...data]
      if (data.length < limit) {
        break
      }
      start = [data[data.length - 1].index]
    }
    return ticks
  }

  private async getTicks(params: GetTickParams): Promise<TickData[]> {
    const { clmm, simulationAccount } = this.sdk.sdkOptions
    const ticks: TickData[] = []
    const typeArguments = [params.coinTypeA, params.coinTypeB]

    const tx = new TransactionBlock()
    const args = [tx.pure(params.pool_id), tx.pure(params.start), tx.pure(params.limit.toString())]

    tx.moveCall({
      target: `${clmm.clmm_router}::${ClmmFetcherModule}::fetch_ticks`,
      arguments: args,
      typeArguments,
    })
    console.log('payload: ', tx.blockData.transactions[0])

    const simulateRes = await this.sdk.fullClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: simulationAccount.address,
    })

    // console.log('simulateRes: ', simulateRes.events)

    simulateRes.events?.forEach((item: any) => {
      if (extractStructTagFromType(item.type).name === `FetchTicksResultEvent`) {
        item.parsedJson.ticks.forEach((tick: any) => {
          ticks.push(buildTickDataByEvent(tick))
        })
      }
    })
    return ticks
  }

  async fetchTicksByRpc(tickHandle: string): Promise<TickData[]> {
    let allTickData: TickData[] = []
    let nextCursor: string | null = null
    const limit = 512
    while (true) {
      const allTickId: SuiObjectIdType[] = []
      // eslint-disable-next-line no-await-in-loop
      const idRes: DynamicFieldPage = await this.sdk.fullClient.getDynamicFields({
        parentId: tickHandle,
        cursor: nextCursor,
        limit,
      })
      // console.log('idRes: ', idRes.data)

      nextCursor = idRes.nextCursor
      // eslint-disable-next-line no-loop-func
      idRes.data.forEach((item) => {
        if (extractStructTagFromType(item.objectType).module === 'skip_list') {
          allTickId.push(item.objectId)
        }
      })

      // eslint-disable-next-line no-await-in-loop
      allTickData = [...allTickData, ...(await this.getTicksByRpc(allTickId))]

      if (nextCursor === null || idRes.data.length < limit) {
        break
      }
    }

    return allTickData
  }

  private async getTicksByRpc(tickObjectId: string[]): Promise<TickData[]> {
    const ticks: TickData[] = []
    const objectDataResponses = await this.sdk.fullClient.multiGetObjects({
      ids: tickObjectId,
      options: { showContent: true, showType: true },
    })
    // eslint-disable-next-line no-restricted-syntax
    for (const suiObj of objectDataResponses) {
      ticks.push(buildTickData(suiObj))
    }
    return ticks
  }

  async getTickDataByIndex(tickHandle: string, tickIndex: number): Promise<TickData> {
    const name = { type: 'u64', value: asUintN(BigInt(tickScore(tickIndex).toString())).toString() }
    const res = await this.sdk.fullClient.getDynamicFieldObject({
      parentId: tickHandle,
      name,
    })
    return buildTickData(res)
  }

  async getTickDataByObjectId(tickId: string): Promise<TickData> {
    const res = await this.sdk.fullClient.getObject({
      id: tickId,
      options: { showContent: true },
    })

    return buildTickData(res)
  }
}
