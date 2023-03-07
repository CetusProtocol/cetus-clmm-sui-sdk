/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-await-in-loop */
/* eslint-disable class-methods-use-this */
import { MoveCallTransaction } from '@mysten/sui.js'
// eslint-disable-next-line import/no-unresolved
import { DynamicFieldPage } from '@mysten/sui.js/dist/types/dynamic_fields'
import { buildTickData, buildTickDataByEvent } from '../utils/common'
import { extractStructTagFromType } from '../utils/contracts'
import { TickData } from '../types/clmmpool'
import { ClmmFetcherModule, ClmmIntegrateModule, LiquidityGasBudget, SuiObjectIdType } from '../types/sui'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { CoinPairType } from './resourcesModule'

const TIICK_TYPE_ARG_REGEX = /^(.+)::i64::I64 {bits: (.+)u64}$/

export type CreatePoolParams = {
  tick_spacing: number
  initialize_sqrt_price: string
  uri: string
  amount_a: number
  amount_b: number
  fix_amount_a: boolean
  coin_object_ids_a: SuiObjectIdType[]
  coin_object_ids_b: SuiObjectIdType[]
  tick_lower: number
  tick_upper: number
} & CoinPairType

export type FetchTickParams = {
  pool_id: SuiObjectIdType
} & CoinPairType

type GetTickParams = {
  index: number
  offset: number
  limit: number
} & FetchTickParams

type TickIndex = {
  index: string
  objectId: string
}

export class PoolModule implements IModule {
  protected _sdk: SDK

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  creatPoolTransactionPayload(params: CreatePoolParams, gasBudget = LiquidityGasBudget): MoveCallTransaction {
    const { modules } = this.sdk.sdkOptions.networkOptions
    const eventConfig = modules.config
    if (eventConfig === null) {
      throw Error('eventConfig is null')
    }
    const globalPauseStatusObjectId = eventConfig!.global_config_id
    const poolsId = eventConfig!.pools_id

    const needAddLiquidity = params.amount_a > 0 && params.amount_b > 0
    const typeArguments = [params.coinTypeA, params.coinTypeB]
    const args = needAddLiquidity
      ? [
          poolsId,
          globalPauseStatusObjectId,
          params.tick_spacing.toString(),
          params.initialize_sqrt_price,
          params.uri,
          params.coin_object_ids_a,
          params.coin_object_ids_b,
          BigInt.asUintN(64, BigInt(params.tick_lower)).toString(),
          BigInt.asUintN(64, BigInt(params.tick_upper)).toString(),
          params.amount_a.toString(),
          params.amount_b.toString(),
          params.fix_amount_a,
        ]
      : [poolsId, globalPauseStatusObjectId, params.tick_spacing, params.initialize_sqrt_price, params.uri]
    return {
      packageObjectId: modules.cetus_integrate,
      module: ClmmIntegrateModule,
      function: needAddLiquidity ? 'create_and_add_liquidity_fix_token' : 'create_pool',
      gasBudget,
      typeArguments,
      arguments: args,
    }
  }

  async fetchTicks(params: FetchTickParams): Promise<TickData[]> {
    let ticks: TickData[] = []
    let index = 0
    let offset = 0
    const limit = 512

    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const data = await this.getTicks({
        pool_id: params.pool_id,
        coinTypeA: params.coinTypeA,
        coinTypeB: params.coinTypeB,
        index,
        offset,
        limit,
      })
      ticks = [...ticks, ...data.ticks]
      if (data.ticks.length < limit) {
        break
      }
      if (data.offset < 999) {
        offset = data.offset + 1
        index = data.index
      } else {
        index = data.index + 1
        offset = 0
      }
    }
    return ticks
  }

  private async getTicks(params: GetTickParams): Promise<{ ticks: TickData[]; index: number; offset: number }> {
    const { modules, simulationAccount } = this.sdk.sdkOptions.networkOptions
    const ticks: TickData[] = []
    const typeArguments = [params.coinTypeA, params.coinTypeB]
    const args = [params.pool_id, params.index.toString(), params.offset.toString(), params.limit.toString()]

    let index = 0
    let offset = 0

    const payload = {
      packageObjectId: modules.cetus_integrate,
      module: ClmmFetcherModule,
      function: 'fetch_ticks',
      gasBudget: 10000,
      typeArguments,
      arguments: args,
    }
    console.log('payload: ', payload)

    const simulateRes = await this.sdk.fullClient.devInspectTransaction(simulationAccount.address, {
      kind: 'moveCall',
      data: payload,
    })
    simulateRes.effects.events?.forEach((item) => {
      if ('moveEvent' in item) {
        if (extractStructTagFromType(item.moveEvent.type).name === `FetchTicksResultEvent`) {
          const { fields } = item.moveEvent
          index = Number(fields.index)
          offset = Number(fields.offset)
          item.moveEvent.fields.ticks.forEach((tick: any) => {
            ticks.push(buildTickDataByEvent(tick.fields))
          })
        }
      }
    })
    return { ticks, index, offset }
  }

  async fetchTicksByRpc(tickHandle: string): Promise<TickData[]> {
    let allTickData: TickData[] = []
    let nextCursor: string | null = null
    const limit = 512
    while (true) {
      const allTickId: TickIndex[] = []
      // eslint-disable-next-line no-await-in-loop
      const idRes: DynamicFieldPage = await this.sdk.fullClient.getDynamicFields(tickHandle, nextCursor, limit)
      nextCursor = idRes.nextCursor
      // eslint-disable-next-line no-loop-func
      idRes.data.forEach((item) => {
        if (extractStructTagFromType(item.objectType).name === 'Tick') {
          const warpIndex = (item.name as string).match(TIICK_TYPE_ARG_REGEX)
          if (warpIndex) {
            allTickId.push({
              index: BigInt.asIntN(64, BigInt(warpIndex[2])).toString(),
              objectId: item.objectId,
            })
          } else {
            console.log(`transform fail:  ${item} `)
          }
        }
      })

      allTickData = [...allTickData, ...(await this.getTicksByRpc(allTickId.map((item) => item.objectId)))]

      if (nextCursor === null || idRes.data.length < limit) {
        break
      }
    }

    return allTickData
  }

  private async getTicksByRpc(tickObjectId: string[]): Promise<TickData[]> {
    // console.log('tickObjectId: ', tickObjectId)

    const ticks: TickData[] = []
    const objectDataResponses = await this.sdk.fullClient.getObjectBatch(tickObjectId)
    // eslint-disable-next-line no-restricted-syntax
    for (const suiObj of objectDataResponses) {
      ticks.push(buildTickData(suiObj))
    }
    return ticks
  }

  // "0x352487c02db4a2ad131b416e899bed1970d54de5::i64::I64 {bits: 2u64}"
  async getTickDataByIndex(tickHandle: string, tickIndex: string): Promise<TickData> {
    const integerMate = this.sdk.sdkOptions.networkOptions.modules.integer_mate
    const name = `${integerMate}::i64::I64 {bits: ${BigInt.asUintN(64, BigInt(tickIndex)).toString()}u64}`
    const res = await this.sdk.fullClient.getDynamicFieldObject(tickHandle, name)
    return buildTickData(res)
  }

  async getTickDataByObjectId(tickId: string): Promise<TickData> {
    const res = await this.sdk.fullClient.getObject(tickId)
    return buildTickData(res)
  }
}
