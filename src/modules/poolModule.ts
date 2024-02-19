import { DynamicFieldPage, SuiObjectResponse, SuiTransactionBlockResponse } from '@mysten/sui.js/dist/cjs/client'
import { normalizeSuiAddress } from '@mysten/sui.js/utils'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { CachedContent, cacheTime24h, cacheTime5min, checkInvalidSuiAddress, d, getFutureTime } from '../utils'
import {
  CreatePoolAddLiquidityParams,
  CreatePoolParams,
  FetchParams,
  ClmmConfig,
  Pool,
  PoolImmutables,
  Position,
  PositionReward,
  getPackagerConfigs,
  CoinAsset,
} from '../types'
import { TransactionUtil } from '../utils/transaction-util'
import { tickScore } from '../math'
import { asUintN, buildPool, buildPositionReward, buildTickData, buildTickDataByEvent } from '../utils/common'
import { extractStructTagFromType, isSortedSymbols } from '../utils/contracts'
import { TickData } from '../types/clmmpool'
import {
  ClmmFetcherModule,
  ClmmIntegratePoolModule,
  ClmmIntegratePoolV2Module,
  ClmmPartnerModule,
  CLOCK_ADDRESS,
  DataPage,
  PaginationArgs,
  SuiObjectIdType,
  SuiResource,
} from '../types/sui'
import { CetusClmmSDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { getObjectPreviousTransactionDigest } from '../utils/objects'
import { ClmmpoolsError, ConfigErrorCode, PartnerErrorCode, PoolErrorCode, PositionErrorCode, UtilsErrorCode } from '../errors/errors'

type GetTickParams = {
  start: number[]
  limit: number
} & FetchParams

/**
 * Helper class to help interact with clmm pools with a pool router interface.
 */
export class PoolModule implements IModule {
  protected _sdk: CetusClmmSDK

  private readonly _cache: Record<string, CachedContent> = {}

  constructor(sdk: CetusClmmSDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  /**
   * Gets a list of positions for the given positionHandle.
   * @param {string} positionHandle The handle for the position.
   * @returns {DataPage<Position>} A promise that resolves to an array of Position objects.
   */
  async getPositionList(positionHandle: string, paginationArgs: PaginationArgs = 'all'): Promise<DataPage<Position>> {
    const dataPage: DataPage<Position> = {
      data: [],
      hasNextPage: true,
    }
    const objects = await this._sdk.fullClient.getDynamicFieldsByPage(positionHandle, paginationArgs)

    dataPage.hasNextPage = objects.hasNextPage
    dataPage.nextCursor = objects.nextCursor

    const positionObjectIDs = objects.data.map((item: any) => {
      if (item.error != null || item.data?.content?.dataType !== "moveObject") {
        throw new ClmmpoolsError(`when getPositionList get position objects error: ${item.error}, please check the rpc, contracts address config and position id.`, ConfigErrorCode.InvalidConfig)
      }

      return item.name.value
    })

    const allPosition: Position[] = await this._sdk.Position.getSipmlePositionList(positionObjectIDs)
    dataPage.data = allPosition
    return dataPage
  }

  /**
   * Gets a list of pool immutables.
   * @param {string[]} assignPoolIDs An array of pool IDs to get.
   * @param {number} offset The offset to start at.
   * @param {number} limit The number of pools to get.
   * @param {boolean} forceRefresh Whether to force a refresh of the cache.
   * @returns {Promise<PoolImmutables[]>} array of PoolImmutable objects.
   */
  async getPoolImmutables(assignPoolIDs: string[] = [], offset = 0, limit = 100, forceRefresh = false): Promise<PoolImmutables[]> {
    const { package_id } = this._sdk.sdkOptions.clmm_pool
    const cacheKey = `${package_id}_getInitPoolEvent`
    const cacheData = this.getCache<PoolImmutables[]>(cacheKey, forceRefresh)

    const allPools: PoolImmutables[] = []
    const filterPools: PoolImmutables[] = []

    if (cacheData !== undefined) {
      allPools.push(...cacheData)
    }

    if (allPools.length === 0) {
      try {
        const objects = await this._sdk.fullClient.queryEventsByPage({ MoveEventType: `${package_id}::factory::CreatePoolEvent` })

        objects.data.forEach((object: any) => {
          const fields = object.parsedJson
          if (fields) {
            allPools.push({
              poolAddress: fields.pool_id,
              tickSpacing: fields.tick_spacing,
              coinTypeA: extractStructTagFromType(fields.coin_type_a).full_address,
              coinTypeB: extractStructTagFromType(fields.coin_type_b).full_address,
            })
          }
        })
        this.updateCache(cacheKey, allPools, cacheTime24h)
      } catch (error) {
        console.log('getPoolImmutables', error)
      }
    }

    const hasAssignPools = assignPoolIDs.length > 0
    for (let index = 0; index < allPools.length; index += 1) {
      const item = allPools[index]
      if (hasAssignPools && !assignPoolIDs.includes(item.poolAddress)) continue
      if (!hasAssignPools && (index < offset || index >= offset + limit)) continue
      filterPools.push(item)
    }
    return filterPools
  }

  /**
   * Gets a list of pools.
   * @param {string[]} assignPools An array of pool IDs to get.
   * @param {number} offset The offset to start at.
   * @param {number} limit The number of pools to get.
   * @returns {Promise<Pool[]>} array of Pool objects.
   */
  async getPools(assignPools: string[] = [], offset = 0, limit = 100): Promise<Pool[]> {
    const allPool: Pool[] = []
    let poolObjectIds: string[] = []

    if (assignPools.length > 0) {
      poolObjectIds = [...assignPools]
    } else {
      const poolImmutables = await this.getPoolImmutables([], offset, limit, false)
      poolImmutables.forEach((item) => poolObjectIds.push(item.poolAddress))
    }

    const objectDataResponses = await this._sdk.fullClient.batchGetObjects(poolObjectIds, {
      showContent: true,
      showType: true,
    })

    for (const suiObj of objectDataResponses) {
      if (suiObj.error != null || suiObj.data?.content?.dataType !== 'moveObject') {
        throw new ClmmpoolsError(`getPools error code: ${suiObj.error?.code ?? 'unknown error'}, please check config and object ids`, PoolErrorCode.InvalidPoolObject)
      }

      const pool = buildPool(suiObj)
      allPool.push(pool)
      const cacheKey = `${pool.poolAddress}_getPoolObject`
      this.updateCache(cacheKey, pool, cacheTime24h)
    }
    return allPool
  }

  /**
   * Gets a list of pool immutables.
   * @param {PaginationArgs} paginationArgs The cursor and limit to start at.
   * @returns {Promise<DataPage<PoolImmutables>>} Array of PoolImmutable objects.
   */
  async getPoolImmutablesWithPage(paginationArgs: PaginationArgs = 'all', forceRefresh = false): Promise<DataPage<PoolImmutables>> {
    const { package_id } = this._sdk.sdkOptions.clmm_pool
    const allPools: PoolImmutables[] = []
    const dataPage: DataPage<PoolImmutables> = {
      data: [],
      hasNextPage: false,
    }

    const queryAll = paginationArgs === 'all'
    const cacheAllKey = `${package_id}_getPoolImmutables`
    if (queryAll) {
      const cacheDate = this.getCache<PoolImmutables[]>(cacheAllKey, forceRefresh)
      if (cacheDate) {
        allPools.push(...cacheDate)
      }
    }
    if (allPools.length === 0) {
      try {
        const moveEventType = `${package_id}::factory::CreatePoolEvent`
        const objects = await this._sdk.fullClient.queryEventsByPage({ MoveEventType: moveEventType }, paginationArgs)
        dataPage.hasNextPage = objects.hasNextPage
        dataPage.nextCursor = objects.nextCursor
        objects.data.forEach((object: any) => {
          const fields = object.parsedJson
          if (fields) {
            const poolImmutables = {
              poolAddress: fields.pool_id,
              tickSpacing: fields.tick_spacing,
              coinTypeA: extractStructTagFromType(fields.coin_type_a).full_address,
              coinTypeB: extractStructTagFromType(fields.coin_type_b).full_address,
            }
            allPools.push(poolImmutables)
          }
        })
      } catch (error) {
        console.log('getPoolImmutables', error)
      }
    }
    dataPage.data = allPools
    if (queryAll) {
      this.updateCache(`${package_id}_getPoolImmutables`, allPools, cacheTime24h)
    }
    return dataPage
  }

  /**
   * Gets a list of pools.
   * @param {string[]} assignPools An array of pool IDs to get.
   * @returns {Promise<Pool[]>} An array of Pool objects.
   */
  async getPoolsWithPage(assignPools: string[] = []): Promise<Pool[]> {
    const allPool: Pool[] = []
    let poolObjectIds: string[] = []

    if (assignPools.length > 0) {
      poolObjectIds = [...assignPools]
    } else {
      const poolImmutables = (await this.getPoolImmutablesWithPage()).data
      poolImmutables.forEach((item) => poolObjectIds.push(item.poolAddress))
    }

    const objectDataResponses: any[] = await this._sdk.fullClient.batchGetObjects(poolObjectIds, {
      showContent: true,
      showType: true,
    })

    for (const suiObj of objectDataResponses) {
      if (suiObj.error != null || suiObj.data?.content?.dataType !== 'moveObject') {
        throw new ClmmpoolsError(`getPoolWithPages error code: ${suiObj.error?.code ?? 'unknown error'}, please check config and object ids`, PoolErrorCode.InvalidPoolObject)
      }
      const pool = buildPool(suiObj)
      allPool.push(pool)
      const cacheKey = `${pool.poolAddress}_getPoolObject`
      this.updateCache(cacheKey, pool, cacheTime24h)
    }
    return allPool
  }

  /**
   * Gets a pool by its object ID.
   * @param {string} poolID The object ID of the pool to get.
   * @param {true} forceRefresh Whether to force a refresh of the cache.
   * @returns {Promise<Pool>} A promise that resolves to a Pool object.
   */
  async getPool(poolID: string, forceRefresh = true): Promise<Pool> {
    const cacheKey = `${poolID}_getPoolObject`
    const cacheData = this.getCache<Pool>(cacheKey, forceRefresh)
    if (cacheData !== undefined) {
      return cacheData
    }
    const object = (await this._sdk.fullClient.getObject({
      id: poolID,
      options: {
        showType: true,
        showContent: true,
      },
    })) as SuiObjectResponse

    if (object.error != null || object.data?.content?.dataType !== 'moveObject') {
      throw new ClmmpoolsError(`getPool error code: ${object.error?.code ?? 'unknown error'}, please check config and object id`, PoolErrorCode.InvalidPoolObject)
    }
    const pool = buildPool(object)
    this.updateCache(cacheKey, pool)
    return pool
  }

  /**
   * Creates a transaction payload for creating multiple pools.
   * @param {CreatePoolParams[]} paramss The parameters for the pools.
   * @returns {Promise<TransactionBlock>} A promise that resolves to the transaction payload.
   */
  async creatPoolsTransactionPayload(paramss: CreatePoolParams[]): Promise<TransactionBlock> {
    for (const params of paramss) {
      if (isSortedSymbols(normalizeSuiAddress(params.coinTypeA), normalizeSuiAddress(params.coinTypeB))) {
        const swpaCoinTypeB = params.coinTypeB
        params.coinTypeB = params.coinTypeA
        params.coinTypeA = swpaCoinTypeB
      }
    }
    const payload = await this.creatPool(paramss)
    return payload
  }

  /**
   * Create a pool of clmmpool protocol. The pool is identified by (CoinTypeA, CoinTypeB, tick_spacing).
   * @param {CreatePoolParams | CreatePoolAddLiquidityParams} params
   * @returns {Promise<TransactionBlock>}
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

  /**
   * Gets the ClmmConfig object for the given package object ID.
   * @param {boolean} forceRefresh Whether to force a refresh of the cache.
   * @returns the ClmmConfig object.
   */
  async getClmmConfigs(forceRefresh = false): Promise<ClmmConfig> {
    const { package_id } = this._sdk.sdkOptions.clmm_pool
    const cacheKey = `${package_id}_getInitEvent`
    const cacheData = this.getCache<ClmmConfig>(cacheKey, forceRefresh)
    if (cacheData !== undefined) {
      return cacheData
    }
    const packageObject = await this._sdk.fullClient.getObject({
      id: package_id,
      options: { showPreviousTransaction: true },
    })

    const previousTx = getObjectPreviousTransactionDigest(packageObject) as string

    const objects = (await this._sdk.fullClient.queryEventsByPage({ Transaction: previousTx })).data

    const clmmConfig: ClmmConfig = {
      pools_id: '',
      global_config_id: '',
      global_vault_id: '',
      admin_cap_id: '',
    }

    if (objects.length > 0) {
      objects.forEach((item: any) => {
        const fields = item.parsedJson as any

        if (item.type) {
          switch (extractStructTagFromType(item.type).full_address) {
            case `${package_id}::config::InitConfigEvent`:
              clmmConfig.global_config_id = fields.global_config_id
              clmmConfig.admin_cap_id = fields.admin_cap_id
              break
            case `${package_id}::factory::InitFactoryEvent`:
              clmmConfig.pools_id = fields.pools_id
              break
            case `${package_id}::rewarder::RewarderInitEvent`:
              clmmConfig.global_vault_id = fields.global_vault_id
              break
            case `${package_id}::partner::InitPartnerEvent`:
              clmmConfig.partners_id = fields.partners_id
              break
            default:
              break
          }
        }
      })
      this.updateCache(cacheKey, clmmConfig, cacheTime24h)
      return clmmConfig
    }

    return clmmConfig
  }

  /**
   * Gets the SUI transaction response for a given transaction digest.
   * @param digest - The digest of the transaction for which the SUI transaction response is requested.
   * @param forceRefresh - A boolean flag indicating whether to force a refresh of the response.
   * @returns A Promise that resolves with the SUI transaction block response or null if the response is not available.
   */
  async getSuiTransactionResponse(digest: string, forceRefresh = false): Promise<SuiTransactionBlockResponse | null> {
    const cacheKey = `${digest}_getSuiTransactionResponse`
    const cacheData = this.getCache<SuiTransactionBlockResponse>(cacheKey, forceRefresh)

    if (cacheData !== undefined) {
      return cacheData
    }
    let objects
    try {
      objects = (await this._sdk.fullClient.getTransactionBlock({
        digest,
        options: {
          showEvents: true,
          showEffects: true,
          showBalanceChanges: true,
          showInput: true,
          showObjectChanges: true,
        },
      })) as SuiTransactionBlockResponse
    } catch (error) {
      objects = (await this._sdk.fullClient.getTransactionBlock({
        digest,
        options: {
          showEvents: true,
          showEffects: true,
        },
      })) as SuiTransactionBlockResponse
    }

    this.updateCache(cacheKey, objects, cacheTime24h)
    return objects
  }

  /**
   * Create pool internal. 
   * @param {CreatePoolParams[]}params The parameters for the pools. 
   * @returns {Promise<TransactionBlock>} A promise that resolves to the transaction payload.
   */
  private async creatPool(params: CreatePoolParams[]): Promise<TransactionBlock> {
    const tx = new TransactionBlock()
    const { integrate, clmm_pool } = this.sdk.sdkOptions
    const eventConfig = getPackagerConfigs(clmm_pool)
    const globalPauseStatusObjectId = eventConfig.global_config_id
    const poolsId = eventConfig.pools_id

    params.forEach((params) => {
      const args = [
        tx.object(globalPauseStatusObjectId),
        tx.object(poolsId),
        tx.pure(params.tick_spacing.toString()),
        tx.pure(params.initialize_sqrt_price),
        tx.pure(params.uri),
        tx.object(CLOCK_ADDRESS),
      ]

      tx.moveCall({
        target: `${integrate.published_at}::${ClmmIntegratePoolModule}::create_pool`,
        typeArguments: [params.coinTypeA, params.coinTypeB],
        arguments: args,
      })
    })

    return tx
  }

  /**
   * Create pool and add liquidity internal. It will call create_pool_with_liquidity function.
   * @param {CreatePoolAddLiquidityParams}params The parameters for the create and liquidity.
   * @returns {Promise<TransactionBlock>} A promise that resolves to the transaction payload.
   */
  private async creatPoolAndAddLiquidity(params: CreatePoolAddLiquidityParams): Promise<TransactionBlock> {
    if (!checkInvalidSuiAddress(this._sdk.senderAddress)) {
      throw new ClmmpoolsError('this config sdk senderAddress is not set right', UtilsErrorCode.InvalidSendAddress)
    }

    const tx = new TransactionBlock()
    const { integrate, clmm_pool } = this.sdk.sdkOptions
    const eventConfig = getPackagerConfigs(clmm_pool)
    const globalPauseStatusObjectId = eventConfig.global_config_id
    const poolsId = eventConfig.pools_id
    const allCoinAsset = await this._sdk.getOwnerCoinAssets(this._sdk.senderAddress)

    const primaryCoinAInputsR = TransactionUtil.buildAddLiquidityFixTokenCoinInput(
      tx,
      !params.fix_amount_a,
      params.amount_a,
      params.slippage,
      params.coinTypeA,
      allCoinAsset,
      false
    )

    const primaryCoinBInputsR = TransactionUtil.buildAddLiquidityFixTokenCoinInput(
      tx,
      params.fix_amount_a,
      params.amount_b,
      params.slippage,
      params.coinTypeB,
      allCoinAsset,
      false
    )

    const args = [
      tx.pure(globalPauseStatusObjectId),
      tx.pure(poolsId),
      tx.pure(params.tick_spacing.toString()),
      tx.pure(params.initialize_sqrt_price),
      tx.pure(params.uri),
      primaryCoinAInputsR.targetCoin,
      primaryCoinBInputsR.targetCoin,
      tx.pure(asUintN(BigInt(params.tick_lower)).toString()),
      tx.pure(asUintN(BigInt(params.tick_upper)).toString()),
      tx.pure(params.amount_a),
      tx.pure(params.amount_b),
      tx.pure(params.fix_amount_a),
      tx.pure(CLOCK_ADDRESS),
    ]

    tx.moveCall({
      target: `${integrate.published_at}::${ClmmIntegratePoolV2Module}::create_pool_with_liquidity`,
      typeArguments: [params.coinTypeA, params.coinTypeB],
      arguments: args,
    })
    return tx
  }

  /**
   * Fetches ticks from the exchange.
   * @param {FetchParams} params The parameters for the fetch.
   * @returns {Promise<TickData[]>} A promise that resolves to an array of tick data.
   */
  async fetchTicks(params: FetchParams): Promise<TickData[]> {
    let ticks: TickData[] = []
    let start: number[] = []
    const limit = 512

    while (true) {
      const data = await this.getTicks({
        pool_id: params.pool_id,
        coinTypeA: params.coinTypeA,
        coinTypeB: params.coinTypeB,
        start,
        limit,
      })
      ticks = [...ticks, ...data]
      if (data.length < limit) {
        break
      }
      start = [data[data.length - 1].index]
    }
    return ticks
  }

  /**
   * Fetches ticks from the exchange using the simulation exec tx.
   * @param {GetTickParams} params The parameters for the fetch.
   * @returns {Promise<TickData[]>} A promise that resolves to an array of tick data.
   */
  private async getTicks(params: GetTickParams): Promise<TickData[]> {
    const { integrate, simulationAccount } = this.sdk.sdkOptions
    const ticks: TickData[] = []
    const typeArguments = [params.coinTypeA, params.coinTypeB]

    const tx = new TransactionBlock()
    const args = [tx.pure(params.pool_id), tx.pure(params.start), tx.pure(params.limit.toString())]

    tx.moveCall({
      target: `${integrate.published_at}::${ClmmFetcherModule}::fetch_ticks`,
      arguments: args,
      typeArguments,
    })

    if (!checkInvalidSuiAddress(simulationAccount.address)) {
      throw new ClmmpoolsError('this config simulationAccount is not set right', ConfigErrorCode.InvalidSimulateAccount)
    }

    const simulateRes = await this.sdk.fullClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: simulationAccount.address,
    })

    if (simulateRes.error != null) {
      throw new ClmmpoolsError(`getTicks error code: ${simulateRes.error ?? 'unknown error'}, please check config and tick object ids`, PoolErrorCode.InvalidTickObjectId)
    }

    simulateRes.events?.forEach((item: any) => {
      if (extractStructTagFromType(item.type).name === `FetchTicksResultEvent`) {
        item.parsedJson.ticks.forEach((tick: any) => {
          ticks.push(buildTickDataByEvent(tick))
        })
      }
    })
    return ticks
  }

  /**
   * Fetches a list of position rewards from the exchange.
   * @param {FetchParams} params The parameters for the fetch.
   * @returns {Promise<PositionReward[]>} A promise that resolves to an array of position rewards.
   */
  async fetchPositionRewardList(params: FetchParams): Promise<PositionReward[]> {
    const { integrate, simulationAccount } = this.sdk.sdkOptions
    const allPosition: PositionReward[] = []
    let start: SuiObjectIdType[] = []
    const limit = 512

    while (true) {
      const typeArguments = [params.coinTypeA, params.coinTypeB]

      const tx = new TransactionBlock()
      const args = [tx.object(params.pool_id), tx.pure(start, 'u64'), tx.pure(limit.toString(), 'u64')]

      tx.moveCall({
        target: `${integrate.published_at}::${ClmmFetcherModule}::fetch_positions`,
        arguments: args,
        typeArguments,
      })

      if (!checkInvalidSuiAddress(simulationAccount.address)) {
        throw new ClmmpoolsError('this config simulationAccount is not set right', ConfigErrorCode.InvalidSimulateAccount)
      }
      const simulateRes = await this.sdk.fullClient.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: simulationAccount.address,
      })

      if (simulateRes.error != null) {
        throw new ClmmpoolsError(`fetch position reward error code: ${simulateRes.error ?? 'unknown error'}, please check config and tick object ids`, PositionErrorCode.InvalidPositionRewardObject)
      }

      const positionRewards: PositionReward[] = []
      simulateRes?.events?.forEach((item: any) => {
        if (extractStructTagFromType(item.type).name === `FetchPositionsEvent`) {
          item.parsedJson.positions.forEach((item: any) => {
            const positionReward = buildPositionReward(item)
            positionRewards.push(positionReward)
          })
        }
      })

      allPosition.push(...positionRewards)

      if (positionRewards.length < limit) {
        break
      } else {
        start = [positionRewards[positionRewards.length - 1].pos_object_id]
      }
    }

    return allPosition
  }

  /**
   * Fetches ticks from the fullnode using the RPC API.
   * @param {string} tickHandle The handle for the tick.
   * @returns {Promise<TickData[]>} A promise that resolves to an array of tick data.
   */
  async fetchTicksByRpc(tickHandle: string): Promise<TickData[]> {
    let allTickData: TickData[] = []
    let nextCursor: string | null = null
    const limit = 512
    while (true) {
      const allTickId: SuiObjectIdType[] = []
      const idRes: DynamicFieldPage = await this.sdk.fullClient.getDynamicFields({
        parentId: tickHandle,
        cursor: nextCursor,
        limit,
      })

      nextCursor = idRes.nextCursor
      idRes.data.forEach((item) => {
        if (extractStructTagFromType(item.objectType).module === 'skip_list') {
          allTickId.push(item.objectId)
        }
      })

      allTickData = [...allTickData, ...(await this.getTicksByRpc(allTickId))]

      if (nextCursor === null || idRes.data.length < limit) {
        break
      }
    }

    return allTickData
  }

  /**
   * Get ticks by tick object ids.
   * @param {string} tickObjectId The object ids of the ticks. 
   * @returns {Promise<TickData[]>} A promise that resolves to an array of tick data.
   */
  private async getTicksByRpc(tickObjectId: string[]): Promise<TickData[]> {
    const ticks: TickData[] = []
    const objectDataResponses = await this.sdk.fullClient.batchGetObjects(tickObjectId, { showContent: true, showType: true })
    for (const suiObj of objectDataResponses) {
      if (suiObj.error != null || suiObj.data?.content?.dataType !== 'moveObject') {
        throw new ClmmpoolsError(`getTicksByRpc error code: ${suiObj.error?.code ?? 'unknown error'}, please check config and tick object ids`, PoolErrorCode.InvalidTickObjectId)
      }

      const tick = buildTickData(suiObj)
      if (tick != null) {
        ticks.push(tick)
      }
    }
    return ticks
  }

  /**
   * Gets the tick data for the given tick index.
   * @param {string} tickHandle The handle for the tick.
   * @param {number} tickIndex The index of the tick.
   * @returns {Promise<TickData | null>} A promise that resolves to the tick data.
   */
  async getTickDataByIndex(tickHandle: string, tickIndex: number): Promise<TickData> {
    const name = { type: 'u64', value: asUintN(BigInt(tickScore(tickIndex).toString())).toString() }
    const res = await this.sdk.fullClient.getDynamicFieldObject({
      parentId: tickHandle,
      name,
    })

    if (res.error != null || res.data?.content?.dataType !== 'moveObject') {
      throw new ClmmpoolsError(`get tick by index: ${tickIndex} error: ${res.error}`, PoolErrorCode.InvalidTickIndex)
    }

    return buildTickData(res)
  }

  /**
   * Gets the tick data for the given object ID.
   * @param {string} tickId The object ID of the tick.
   * @returns {Promise<TickData | null>} A promise that resolves to the tick data.
   */
  async getTickDataByObjectId(tickId: string): Promise<TickData | null> {
    const res = await this.sdk.fullClient.getObject({
      id: tickId,
      options: { showContent: true },
    })

    if (res.error != null || res.data?.content?.dataType !== 'moveObject') {
      throw new ClmmpoolsError(`getTicksByRpc error code: ${res.error?.code ?? 'unknown error'}, please check config and tick object ids`, PoolErrorCode.InvalidTickObjectId)
    }
    return buildTickData(res)
  }

  /**
   * Get partner ref fee amount
   * @param {string}partner Partner object id 
   * @returns {Promise<CoinAsset[]>} A promise that resolves to an array of coin asset.
   */
  async getPartnerRefFeeAmount(partner: string): Promise<CoinAsset[]> {
    const objectDataResponses = await this._sdk.fullClient.batchGetObjects([partner], {
      showOwner: true,
      showContent: true,
      showDisplay: true,
      showType: true,
    })

    if (objectDataResponses[0].error != null || objectDataResponses[0].data?.content?.dataType !== 'moveObject') {
      throw new ClmmpoolsError(`get partner by object id: ${partner} error: ${objectDataResponses[0].error}`, PartnerErrorCode.NotFoundPartnerObject)
    }

    const balance = (objectDataResponses[0].data.content.fields as any).balances

    const objects = await this._sdk.fullClient.getDynamicFieldsByPage(balance.fields.id.id)

    const coins: string[] = []
    objects.data.forEach((object) => {
      if (object.error != null || object.data?.content?.dataType !== "moveObject") {
        throw new ClmmpoolsError(`when getPartnerRefFeeAmount get partner object error: ${object.error}, please check the rpc, contracts address config and position id.`, ConfigErrorCode.InvalidConfig)
      }

      coins.push(object.objectId)
    })

    const refFee: CoinAsset[] = []
    const object = await this._sdk.fullClient.batchGetObjects(coins, {
      showOwner: true,
      showContent: true,
      showDisplay: true,
      showType: true,
    })
    object.forEach((info: any) => {
      if (info.error != null || info.data?.content?.dataType !== 'moveObject') {
        throw new ClmmpoolsError(`get coin by object id: ${info.data.objectId} error: ${info.error}`, PartnerErrorCode.InvalidParnterRefFeeFields)
      }

      const coinAsset: CoinAsset = {
        coinAddress: info.data.content.fields.name,
        coinObjectId: info.data.objectId,
        balance: BigInt(info.data.content.fields.value),
      }
      refFee.push(coinAsset)
    })

    return refFee
  }

  /**
   * Claim partner ref fee.
   * @param {string} partnerCap partner cap id.
   * @param {string} partner partner id.
   * @returns {Promise<TransactionBlock>} A promise that resolves to the transaction payload.
   */
  async claimPartnerRefFeePayload(partnerCap: string, partner: string, coinType: string): Promise<TransactionBlock> {
    const tx = new TransactionBlock()
    const { clmm_pool } = this.sdk.sdkOptions
    const { global_config_id } = getPackagerConfigs(clmm_pool)
    const typeArguments = [coinType]

    const args = [
      tx.object(global_config_id),
      tx.object(partnerCap),
      tx.object(partner),
    ]

    tx.moveCall({
      target: `${clmm_pool.published_at}::${ClmmPartnerModule}::claim_ref_fee`,
      arguments: args,
      typeArguments,
    })

    return tx
  }

  /**
   * Updates the cache for the given key.
   * @param key The key of the cache entry to update.
   * @param data The data to store in the cache.
   * @param time The time in minutes after which the cache entry should expire.
   */
  updateCache(key: string, data: SuiResource, time = cacheTime5min) {
    let cacheData = this._cache[key]
    if (cacheData) {
      cacheData.overdueTime = getFutureTime(time)
      cacheData.value = data
    } else {
      cacheData = new CachedContent(data, getFutureTime(time))
    }
    this._cache[key] = cacheData
  }

  /**
   * Gets the cache entry for the given key.
   * @param key The key of the cache entry to get.
   * @param forceRefresh Whether to force a refresh of the cache entry.
   * @returns The cache entry for the given key, or undefined if the cache entry does not exist or is expired.
   */
  getCache<T>(key: string, forceRefresh = false): T | undefined {
    const cacheData = this._cache[key]
    const isValid = cacheData?.isValid()
    if (!forceRefresh && isValid) {
      return cacheData.value as T
    }
    if (!isValid) {
      delete this._cache[key]
    }
    return undefined
  }
}
