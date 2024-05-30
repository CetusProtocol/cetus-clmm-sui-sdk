/* eslint-disable @typescript-eslint/no-use-before-define */
import BN from 'bn.js'
import { Transaction, TransactionArgument, TransactionObjectArgument } from '@mysten/sui/transactions'
import { BuildCoinResult, checkInvalidSuiAddress, extractStructTagFromType, normalizeCoinType, TransactionUtil } from '../utils'
import { ClmmFetcherModule, ClmmIntegratePoolModule, ClmmIntegratePoolV2Module, CLOCK_ADDRESS } from '../types/sui'
import { getRewardInTickRange } from '../utils/tick'
import { MathUtil, ONE, ZERO } from '../math/utils'
import { TickData } from '../types/clmmpool'
import { CetusClmmSDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import {
  CoinAsset,
  CollectRewarderParams,
  getPackagerConfigs,
  Pool,
  Position,
  PositionReward,
  Rewarder,
  RewarderAmountOwed,
} from '../types'
import { CollectFeesQuote } from '../math'
import { ClmmpoolsError, ConfigErrorCode, UtilsErrorCode } from '../errors/errors'

export type FetchPosRewardParams = {
  poolAddress: string
  positionId: string
  coinTypeA: string
  coinTypeB: string
  rewarderInfo: Rewarder[]
}

export type FetchPosFeeParams = {
  poolAddress: string
  positionId: string
  coinTypeA: string
  coinTypeB: string
}

export type PosRewarderResult = {
  poolAddress: string
  positionId: string
  rewarderAmountOwed: RewarderAmountOwed[]
}

/**
 * Helper class to help interact with clmm position rewaeder with a rewaeder router interface.
 */
export class RewarderModule implements IModule {
  protected _sdk: CetusClmmSDK

  private growthGlobal: BN[]

  constructor(sdk: CetusClmmSDK) {
    this._sdk = sdk
    this.growthGlobal = [ZERO, ZERO, ZERO]
  }

  get sdk() {
    return this._sdk
  }

  /**
   * Gets the emissions for the given pool every day.
   *
   * @param {string} poolID The object ID of the pool.
   * @returns {Promise<Array<{emissions: number, coinAddress: string}>>} A promise that resolves to an array of objects with the emissions and coin address for each rewarder.
   */
  async emissionsEveryDay(poolID: string) {
    const currentPool: Pool = await this.sdk.Pool.getPool(poolID)
    const rewarderInfos = currentPool.rewarder_infos
    if (!rewarderInfos) {
      return null
    }

    const emissionsEveryDay = []
    for (const rewarderInfo of rewarderInfos) {
      const emissionSeconds = MathUtil.fromX64(new BN(rewarderInfo.emissions_per_second))
      emissionsEveryDay.push({
        emissions: Math.floor(emissionSeconds.toNumber() * 60 * 60 * 24),
        coin_address: rewarderInfo.coinAddress,
      })
    }

    return emissionsEveryDay
  }

  /**
   * Updates the rewarder for the given pool.
   *
   * @param {string} poolID The object ID of the pool.
   * @param {BN} currentTime The current time in seconds since the Unix epoch.
   * @returns {Promise<Pool>} A promise that resolves to the updated pool.
   */
  private async updatePoolRewarder(poolID: string, currentTime: BN): Promise<Pool> {
    // refresh pool rewarder
    const currentPool: Pool = await this.sdk.Pool.getPool(poolID)
    const lastTime = currentPool.rewarder_last_updated_time
    currentPool.rewarder_last_updated_time = currentTime.toString()

    if (Number(currentPool.liquidity) === 0 || currentTime.eq(new BN(lastTime))) {
      return currentPool
    }
    const timeDelta = currentTime.div(new BN(1000)).sub(new BN(lastTime)).add(new BN(15))
    const rewarderInfos: any = currentPool.rewarder_infos

    for (let i = 0; i < rewarderInfos.length; i += 1) {
      const rewarderInfo = rewarderInfos[i]
      const rewarderGrowthDelta = MathUtil.checkMulDivFloor(
        timeDelta,
        new BN(rewarderInfo.emissions_per_second),
        new BN(currentPool.liquidity),
        128
      )
      this.growthGlobal[i] = new BN(rewarderInfo.growth_global).add(new BN(rewarderGrowthDelta))
    }

    return currentPool
  }

  /**
   * Gets the amount owed to the rewarders for the given position.
   *
   * @param {string} poolID The object ID of the pool.
   * @param {string} positionHandle The handle of the position.
   * @param {string} positionID The ID of the position.
   * @returns {Promise<Array<{amountOwed: number}>>} A promise that resolves to an array of objects with the amount owed to each rewarder.
   * @deprecated This method is deprecated and may be removed in future versions. Use `sdk.Rewarder.fetchPosRewardersAmount()` instead.
   */
  async posRewardersAmount(poolID: string, positionHandle: string, positionID: string) {
    const currentTime = Date.parse(new Date().toString())
    const pool: Pool = await this.updatePoolRewarder(poolID, new BN(currentTime))
    const position = await this.sdk.Position.getPositionRewarders(positionHandle, positionID)

    if (position === undefined) {
      return []
    }

    const ticksHandle = pool.ticks_handle
    const tickLower = await this.sdk.Pool.getTickDataByIndex(ticksHandle, position.tick_lower_index)
    const tickUpper = await this.sdk.Pool.getTickDataByIndex(ticksHandle, position.tick_upper_index)

    const amountOwed = this.posRewardersAmountInternal(pool, position, tickLower!, tickUpper!)
    return amountOwed
  }

  /**
   * Gets the amount owed to the rewarders for the given account and pool.
   *
   * @param {string} accountAddress The account address.
   * @param {string} poolID The object ID of the pool.
   * @returns {Promise<Array<{amountOwed: number}>>} A promise that resolves to an array of objects with the amount owed to each rewarder.
   * @deprecated This method is deprecated and may be removed in future versions. Use `sdk.Rewarder.fetchPosRewardersAmount()` instead.
   */
  async poolRewardersAmount(accountAddress: string, poolID: string) {
    const currentTime = Date.parse(new Date().toString())
    const pool: Pool = await this.updatePoolRewarder(poolID, new BN(currentTime))

    const positions = await this.sdk.Position.getPositionList(accountAddress, [poolID])
    const tickDatas = await this.getPoolLowerAndUpperTicks(pool.ticks_handle, positions)

    const rewarderAmount = [ZERO, ZERO, ZERO]

    for (let i = 0; i < positions.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const posRewarderInfo: any = await this.posRewardersAmountInternal(pool, positions[i], tickDatas[0][i], tickDatas[1][i])
      for (let j = 0; j < 3; j += 1) {
        rewarderAmount[j] = rewarderAmount[j].add(posRewarderInfo[j].amount_owed)
      }
    }

    return rewarderAmount
  }

  /**
   * Gets the amount owed to the rewarders for the given account and pool.
   * @param {Pool} pool Pool object
   * @param {PositionReward} position Position object
   * @param {TickData} tickLower Lower tick data
   * @param {TickData} tickUpper Upper tick data
   * @returns {RewarderAmountOwed[]}
   */
  private posRewardersAmountInternal(pool: Pool, position: PositionReward, tickLower: TickData, tickUpper: TickData): RewarderAmountOwed[] {
    const tickLowerIndex = position.tick_lower_index
    const tickUpperIndex = position.tick_upper_index
    const rewardersInside = getRewardInTickRange(pool, tickLower, tickUpper, tickLowerIndex, tickUpperIndex, this.growthGlobal)

    const growthInside = []
    const AmountOwed = []

    if (rewardersInside.length > 0) {
      let growthDelta0 = MathUtil.subUnderflowU128(rewardersInside[0], new BN(position.reward_growth_inside_0))

      if (growthDelta0.gt(new BN('3402823669209384634633745948738404'))) {
        growthDelta0 = ONE
      }

      const amountOwed_0 = MathUtil.checkMulShiftRight(new BN(position.liquidity), growthDelta0, 64, 128)
      growthInside.push(rewardersInside[0])
      AmountOwed.push({
        amount_owed: new BN(position.reward_amount_owed_0).add(amountOwed_0),

        coin_address: pool.rewarder_infos[0].coinAddress,
      })
    }

    if (rewardersInside.length > 1) {
      let growthDelta_1 = MathUtil.subUnderflowU128(rewardersInside[1], new BN(position.reward_growth_inside_1))
      if (growthDelta_1.gt(new BN('3402823669209384634633745948738404'))) {
        growthDelta_1 = ONE
      }

      const amountOwed_1 = MathUtil.checkMulShiftRight(new BN(position.liquidity), growthDelta_1, 64, 128)
      growthInside.push(rewardersInside[1])

      AmountOwed.push({
        amount_owed: new BN(position.reward_amount_owed_1).add(amountOwed_1),
        coin_address: pool.rewarder_infos[1].coinAddress,
      })
    }

    if (rewardersInside.length > 2) {
      let growthDelta_2 = MathUtil.subUnderflowU128(rewardersInside[2], new BN(position.reward_growth_inside_2))
      if (growthDelta_2.gt(new BN('3402823669209384634633745948738404'))) {
        growthDelta_2 = ONE
      }

      const amountOwed_2 = MathUtil.checkMulShiftRight(new BN(position.liquidity), growthDelta_2, 64, 128)
      growthInside.push(rewardersInside[2])

      AmountOwed.push({
        amount_owed: new BN(position.reward_amount_owed_2).add(amountOwed_2),
        coin_address: pool.rewarder_infos[2].coinAddress,
      })
    }
    return AmountOwed
  }

  /**
   * Fetches the Position reward amount for a given list of addresses.
   * @param {string[]}positionIDs An array of position object ids.
   * @returns {Promise<Record<string, RewarderAmountOwed[]>>} A Promise that resolves with the fetched position reward amount for the specified position object ids.
   */
  async batchFetchPositionRewarders(positionIDs: string[]): Promise<Record<string, RewarderAmountOwed[]>> {
    const posRewardParamsList: FetchPosRewardParams[] = []
    for (const id of positionIDs) {
      const position = await this._sdk.Position.getPositionById(id, false)
      const pool = await this._sdk.Pool.getPool(position.pool, false)
      posRewardParamsList.push({
        poolAddress: pool.poolAddress,
        positionId: position.pos_object_id,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
        rewarderInfo: pool.rewarder_infos,
      })
    }

    const positionMap: Record<string, RewarderAmountOwed[]> = {}

    if (posRewardParamsList.length > 0) {
      const result: PosRewarderResult[] = await this.fetchPosRewardersAmount(posRewardParamsList)
      for (const posRewarderInfo of result) {
        positionMap[posRewarderInfo.positionId] = posRewarderInfo.rewarderAmountOwed
      }
      return positionMap
    }
    return positionMap
  }

  /**
   * Fetch the position rewards for a given pool.
   * @param {Pool}pool Pool object
   * @param {string}positionId Position object id
   * @returns {Promise<RewarderAmountOwed[]>} A Promise that resolves with the fetched position reward amount for the specified position object id.
   */
  async fetchPositionRewarders(pool: Pool, positionId: string): Promise<RewarderAmountOwed[]> {
    const param = {
      poolAddress: pool.poolAddress,
      positionId,
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      rewarderInfo: pool.rewarder_infos,
    }

    const result = await this.fetchPosRewardersAmount([param])

    return result[0].rewarderAmountOwed
  }

  /**
   * Fetches the Position fee amount for a given list of addresses.
   * @param positionIDs An array of position object ids.
   * @returns {Promise<Record<string, CollectFeesQuote>>} A Promise that resolves with the fetched position fee amount for the specified position object ids.
   * @deprecated This method is deprecated and may be removed in future versions. Use alternative methods if available.
   */
  async batchFetchPositionFees(positionIDs: string[]): Promise<Record<string, CollectFeesQuote>> {
    const posFeeParamsList: FetchPosFeeParams[] = []
    for (const id of positionIDs) {
      const position = await this._sdk.Position.getPositionById(id, false)
      const pool = await this._sdk.Pool.getPool(position.pool, false)
      posFeeParamsList.push({
        poolAddress: pool.poolAddress,
        positionId: position.pos_object_id,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
      })
    }

    const positionMap: Record<string, CollectFeesQuote> = {}

    if (posFeeParamsList.length > 0) {
      const result: CollectFeesQuote[] = await this.fetchPosFeeAmount(posFeeParamsList)
      for (const posRewarderInfo of result) {
        positionMap[posRewarderInfo.position_id] = posRewarderInfo
      }
      return positionMap
    }
    return positionMap
  }

  /**
   * Fetches the Position fee amount for a given list of addresses.
   * @param params  An array of FetchPosFeeParams objects containing the target addresses and their corresponding amounts.
   * @returns
   */
  async fetchPosFeeAmount(params: FetchPosFeeParams[]): Promise<CollectFeesQuote[]> {
    const { clmm_pool, integrate, simulationAccount } = this.sdk.sdkOptions
    const tx = new Transaction()

    for (const paramItem of params) {
      const typeArguments = [paramItem.coinTypeA, paramItem.coinTypeB]
      const args = [
        tx.object(getPackagerConfigs(clmm_pool).global_config_id),
        tx.object(paramItem.poolAddress),
        tx.pure.id(paramItem.positionId),
      ]
      tx.moveCall({
        target: `${integrate.published_at}::${ClmmFetcherModule}::fetch_position_fees`,
        arguments: args,
        typeArguments,
      })
    }

    const simulateRes = await this.sdk.fullClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: simulationAccount.address,
    })

    const valueData: any = simulateRes.events?.filter((item: any) => {
      return extractStructTagFromType(item.type).name === `FetchPositionFeesEvent`
    })
    if (valueData.length === 0) {
      return []
    }

    const result: CollectFeesQuote[] = []

    for (let i = 0; i < valueData.length; i += 1) {
      const { parsedJson } = valueData[i]
      const posRrewarderResult: CollectFeesQuote = {
        feeOwedA: new BN(parsedJson.fee_owned_a),
        feeOwedB: new BN(parsedJson.fee_owned_b),
        position_id: parsedJson.position_id,
      }
      result.push(posRrewarderResult)
    }

    return result
  }

  /**
   * Fetches the Position reward amount for a given list of addresses.
   * @param params  An array of FetchPosRewardParams objects containing the target addresses and their corresponding amounts.
   * @returns
   */
  async fetchPosRewardersAmount(params: FetchPosRewardParams[]) {
    const { clmm_pool, integrate, simulationAccount } = this.sdk.sdkOptions
    const tx = new Transaction()

    for (const paramItem of params) {
      const typeArguments = [paramItem.coinTypeA, paramItem.coinTypeB]
      const args = [
        tx.object(getPackagerConfigs(clmm_pool).global_config_id),
        tx.object(paramItem.poolAddress),
        tx.pure.id(paramItem.positionId),
        tx.object(CLOCK_ADDRESS),
      ]
      tx.moveCall({
        target: `${integrate.published_at}::${ClmmFetcherModule}::fetch_position_rewards`,
        arguments: args,
        typeArguments,
      })
    }

    if (!checkInvalidSuiAddress(simulationAccount.address)) {
      throw new ClmmpoolsError(
        `this config simulationAccount: ${simulationAccount.address} is not set right`,
        ConfigErrorCode.InvalidSimulateAccount
      )
    }

    const simulateRes = await this.sdk.fullClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: simulationAccount.address,
    })

    if (simulateRes.error != null) {
      throw new ClmmpoolsError(
        `fetch position rewards error code: ${simulateRes.error ?? 'unknown error'}, please check config and params`,
        ConfigErrorCode.InvalidConfig
      )
    }

    const valueData: any = simulateRes.events?.filter((item: any) => {
      return extractStructTagFromType(item.type).name === `FetchPositionRewardsEvent`
    })
    if (valueData.length === 0) {
      return []
    }

    if (valueData.length !== params.length) {
      throw new ClmmpoolsError('valueData.length !== params.pools.length')
    }

    const result: PosRewarderResult[] = []

    for (let i = 0; i < valueData.length; i += 1) {
      const posRrewarderResult: PosRewarderResult = {
        poolAddress: params[i].poolAddress,
        positionId: params[i].positionId,
        rewarderAmountOwed: [],
      }

      for (let j = 0; j < params[i].rewarderInfo.length; j += 1) {
        posRrewarderResult.rewarderAmountOwed.push({
          amount_owed: new BN(valueData[i].parsedJson.data[j]),
          coin_address: params[i].rewarderInfo[j].coinAddress,
        })
      }

      result.push(posRrewarderResult)
    }

    return result
  }

  /**
   * Fetches the pool reward amount for a given account and pool object id.
   * @param {string} account - The target account.
   * @param {string} poolObjectId - The target pool object id.
   * @returns {Promise<number|null>} - A Promise that resolves with the fetched pool reward amount for the specified account and pool, or null if the fetch is unsuccessful.
   */
  async fetchPoolRewardersAmount(account: string, poolObjectId: string) {
    const pool: Pool = await this.sdk.Pool.getPool(poolObjectId)
    const positions = await this.sdk.Position.getPositionList(account, [poolObjectId])

    const params: FetchPosRewardParams[] = []

    for (const position of positions) {
      params.push({
        poolAddress: pool.poolAddress,
        positionId: position.pos_object_id,
        rewarderInfo: pool.rewarder_infos,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
      })
    }

    const result = await this.fetchPosRewardersAmount(params)

    const rewarderAmount = [ZERO, ZERO, ZERO]

    if (result != null) {
      for (const posRewarderInfo of result) {
        for (let j = 0; j < posRewarderInfo.rewarderAmountOwed.length; j += 1) {
          rewarderAmount[j] = rewarderAmount[j].add(posRewarderInfo.rewarderAmountOwed[j].amount_owed)
        }
      }
    }
    return rewarderAmount
  }

  private async getPoolLowerAndUpperTicks(ticksHandle: string, positions: Position[]): Promise<TickData[][]> {
    const lowerTicks: TickData[] = []
    const upperTicks: TickData[] = []

    for (const pos of positions) {
      const tickLower = await this.sdk.Pool.getTickDataByIndex(ticksHandle, pos.tick_lower_index)
      const tickUpper = await this.sdk.Pool.getTickDataByIndex(ticksHandle, pos.tick_upper_index)
      lowerTicks.push(tickLower!)
      upperTicks.push(tickUpper!)
    }

    return [lowerTicks, upperTicks]
  }

  /**
   * Collect rewards from Position.
   * @param params
   * @param gasBudget
   * @returns
   */
  async collectRewarderTransactionPayload(params: CollectRewarderParams): Promise<Transaction> {
    if (!checkInvalidSuiAddress(this._sdk.senderAddress)) {
      throw new ClmmpoolsError('this config sdk senderAddress is not set right', UtilsErrorCode.InvalidSendAddress)
    }

    const allCoinAsset = await this._sdk.getOwnerCoinAssets(this._sdk.senderAddress, null)
    let tx = new Transaction()

    tx = TransactionUtil.createCollectRewarderAndFeeParams(this._sdk, tx, params, allCoinAsset)
    return tx
  }

  /**
   * batech Collect rewards from Position.
   * @param params
   * @param published_at
   * @param tx
   * @returns
   */
  async batchCollectRewardePayload(params: CollectRewarderParams[], published_at: string, tx?: Transaction) {
    if (!checkInvalidSuiAddress(this._sdk.senderAddress)) {
      throw new ClmmpoolsError('this config sdk senderAddress is not set right', UtilsErrorCode.InvalidSendAddress)
    }
    const allCoinAsset = await this._sdk.getOwnerCoinAssets(this._sdk.senderAddress, null)
    tx = tx || new Transaction()
    const coinIdMaps: Record<string, BuildCoinResult> = {}
    params.forEach((item) => {
      const coinTypeA = normalizeCoinType(item.coinTypeA)
      const coinTypeB = normalizeCoinType(item.coinTypeB)

      if (item.collect_fee) {
        let coinAInput = coinIdMaps[coinTypeA]
        if (coinAInput === undefined) {
          coinAInput = TransactionUtil.buildCoinForAmount(tx!, allCoinAsset!, BigInt(0), coinTypeA, false)
          coinIdMaps[coinTypeA] = coinAInput
        }

        let coinBInput = coinIdMaps[coinTypeB]
        if (coinBInput === undefined) {
          coinBInput = TransactionUtil.buildCoinForAmount(tx!, allCoinAsset!, BigInt(0), coinTypeB, false)
          coinIdMaps[coinTypeB] = coinBInput
        }

        tx = this._sdk.Position.createCollectFeeNoSendPaylod(
          {
            pool_id: item.pool_id,
            pos_id: item.pos_id,
            coinTypeA: item.coinTypeA,
            coinTypeB: item.coinTypeB,
          },
          published_at,
          tx!,
          coinAInput.targetCoin,
          coinBInput.targetCoin
        )
      }
      const primaryCoinInputs: TransactionObjectArgument[] = []
      item.rewarder_coin_types.forEach((type) => {
        const coinType = normalizeCoinType(type)
        let coinInput = coinIdMaps[type]
        if (coinInput === undefined) {
          coinInput = TransactionUtil.buildCoinForAmount(tx!, allCoinAsset!, BigInt(0), coinType, false)
          coinIdMaps[coinType] = coinInput
        }
        primaryCoinInputs.push(coinInput.targetCoin)
      })

      tx = this.createCollectRewarderNoSendPaylod(item, published_at, tx!, primaryCoinInputs)
    })

    Object.keys(coinIdMaps).forEach((key) => {
      const value = coinIdMaps[key]
      if (value.isMintZeroCoin) {
        TransactionUtil.buildTransferCoin(this._sdk, tx!, value.targetCoin, key, this._sdk.senderAddress)
      }
    })

    return tx
  }

  createCollectRewarderPaylod(params: CollectRewarderParams, tx: Transaction, primaryCoinInputs: TransactionArgument[]) {
    const { clmm_pool, integrate } = this.sdk.sdkOptions
    const clmmConfigs = getPackagerConfigs(clmm_pool)
    const typeArguments = [params.coinTypeA, params.coinTypeB]
    params.rewarder_coin_types.forEach((type, index) => {
      if (tx) {
        tx.moveCall({
          target: `${integrate.published_at}::${ClmmIntegratePoolV2Module}::collect_reward`,
          typeArguments: [...typeArguments, type],
          arguments: [
            tx.object(clmmConfigs.global_config_id),
            tx.object(params.pool_id),
            tx.object(params.pos_id),
            tx.object(clmmConfigs.global_vault_id),
            primaryCoinInputs[index],
            tx.object(CLOCK_ADDRESS),
          ],
        })
      }
    })
    return tx
  }

  createCollectRewarderNoSendPaylod(
    params: CollectRewarderParams,
    published_at: string,
    tx: Transaction,
    primaryCoinInputs: TransactionArgument[]
  ) {
    const { clmm_pool } = this.sdk.sdkOptions
    const clmmConfigs = getPackagerConfigs(clmm_pool)
    const typeArguments = [params.coinTypeA, params.coinTypeB]
    params.rewarder_coin_types.forEach((type, index) => {
      if (tx) {
        tx.moveCall({
          target: `${published_at}::${ClmmIntegratePoolModule}::collect_reward`,
          typeArguments: [...typeArguments, type],
          arguments: [
            tx.object(clmmConfigs.global_config_id),
            tx.object(params.pool_id),
            tx.object(params.pos_id),
            tx.object(clmmConfigs.global_vault_id),
            primaryCoinInputs[index],
            tx.object(CLOCK_ADDRESS),
          ],
        })
      }
    })
    return tx
  }
}
