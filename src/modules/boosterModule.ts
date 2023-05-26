/* eslint-disable class-methods-use-this */
/* eslint-disable no-await-in-loop */
/* eslint-disable camelcase */
import { getMoveObjectType, getObjectFields, ObjectType, TransactionBlock } from '@mysten/sui.js'
import { RewarderAmountOwed } from '../types'
import {
  d,
  extractStructTagFromType,
  getDynamicFields,
  getFutureTime,
  getOwnedObjects,
  loopToGetAllQueryEvents,
  multiGetObjects,
} from '../utils'
import { BoosterUtil } from '../utils/booster'
import {
  BoosterInitEvent,
  BoosterPool,
  BoosterPoolImmutables,
  BoosterPoolState,
  BoosterPositionInfo,
  BoosterRouterModule,
  CancelParams,
  LockNFT,
  LockPositionInfo,
  LockPositionParams,
  RedeemParams,
} from '../types/booster_type'
import { SuiResource, SuiObjectIdType, CLOCK_ADDRESS, SuiAddressType } from '../types/sui'
import { CachedContent, cacheTime24h, cacheTime5min } from '../utils/cachedContent'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'

/**
 * Helper class to help interact with booster pools with a router interface.
 */
export class BoosterModule implements IModule {
  protected _sdk: SDK

  private readonly _cache: Record<string, CachedContent> = {}

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  /**
   * Gets a list of booster pool immutables.
   *
   * @param forceRefresh Whether to force a refresh of the cache.
   * @returns array of PoolImmutable objects.
   */
  async getPoolImmutables(forceRefresh = false): Promise<BoosterPoolImmutables[]> {
    const { booster } = this._sdk.sdkOptions
    const cacheKey = `${booster.booster_display}_getPoolImmutables`
    const cacheData = this.getCache<BoosterPoolImmutables[]>(cacheKey, forceRefresh)

    const allPool: BoosterPoolImmutables[] = []

    if (cacheData !== undefined) {
      allPool.push(...cacheData)
    } else {
      const simplePoolIds: SuiObjectIdType[] = []
      const result = await getDynamicFields(this._sdk, booster.config.booster_pool_handle)
      result.data?.forEach((item: any) => {
        simplePoolIds.push(item.objectId)
      })
      const simpleDatas = await multiGetObjects(this._sdk, simplePoolIds, {
        showContent: true,
      })

      for (const item of simpleDatas) {
        const fields = getObjectFields(item)
        if (fields) {
          const poolImmutables = BoosterUtil.buildPoolImmutables(fields)
          this.updateCache(`${poolImmutables.pool_id}_getPoolImmutable`, poolImmutables, cacheTime24h)
          allPool.push(poolImmutables)
        }
      }
    }
    this.updateCache(cacheKey, allPool, cacheTime24h)
    return allPool
  }

  /**
   * Gets a pool immutables by its object ID.
   *
   * @param poolObjectId The object ID of the pool to get.
   * @returns A promise that resolves to a Pool object.
   */
  async getPoolImmutable(poolObjectId: SuiObjectIdType): Promise<BoosterPoolImmutables> {
    const { booster } = this._sdk.sdkOptions
    const cacheKey = `${poolObjectId}_getPoolImmutable`
    const cacheData = this.getCache<BoosterPoolImmutables>(cacheKey)

    if (cacheData !== undefined) {
      return cacheData
    }
    const result = await this._sdk.fullClient.getDynamicFieldObject({
      parentId: booster.config.booster_pool_handle,
      name: {
        type: '0x2::object::ID',
        value: poolObjectId,
      },
    })
    const fields = getObjectFields(result)
    const poolImmutables = BoosterUtil.buildPoolImmutables(fields)
    this.updateCache(cacheKey, poolImmutables, cacheTime24h)
    return poolImmutables
  }

  /**
   * Gets a list of booster pools.
   *
   * @returns array of Pool objects.
   */
  async getPools(): Promise<BoosterPool[]> {
    const allPool: BoosterPool[] = []
    const poolImmutables = await this.getPoolImmutables()

    const poolObjectIds: string[] = poolImmutables.map((item) => {
      return item.pool_id
    })
    const objectDataResponses = await multiGetObjects(this._sdk, poolObjectIds, { showType: true, showContent: true })
    for (const suiObj of objectDataResponses) {
      const poolState = BoosterUtil.buildPoolState(suiObj)

      if (poolState) {
        const pool = {
          ...(await this.getPoolImmutable(poolState.pool_id)),
          ...poolState,
        }
        allPool.push(pool)
        const cacheKey = `${pool.pool_id}_getPoolObject`
        this.updateCache(cacheKey, pool, cacheTime24h)
      }
    }

    return allPool
  }

  /**
   * Gets a pool by its object ID.
   *
   * @param poolObjectId The object ID of the pool to get.
   * @param forceRefresh Whether to force a refresh of the cache.
   * @returns A promise that resolves to a Pool object.
   */
  async getPool(poolObjectId: string, forceRefresh = true): Promise<BoosterPool> {
    const cacheKey = `${poolObjectId}_getPoolObject`
    const cacheData = this.getCache<BoosterPoolState>(cacheKey, forceRefresh)
    const poolImmutables = await this.getPoolImmutable(poolObjectId)

    if (cacheData !== undefined) {
      return {
        ...poolImmutables,
        ...cacheData,
      }
    }
    const objects = await this._sdk.fullClient.getObject({
      id: poolObjectId,
      options: { showContent: true, showType: true },
    })

    const poolState = BoosterUtil.buildPoolState(objects)
    const pool = {
      ...poolImmutables,
      ...poolState,
    }
    this.updateCache(cacheKey, pool, cacheTime24h)
    return pool
  }

  private async getPoolHandleId(booster_config_id: string) {
    const reault = await this._sdk.fullClient.getObject({ id: booster_config_id, options: { showContent: true } })
    const fields = getObjectFields(reault)
    if (fields) {
      return fields.list.fields.id.id
    }
    return ''
  }

  /**
   * Gets the initial factory event
   *
   * @returns  the initial factory event.
   */
  async getInitFactoryEvent(): Promise<BoosterInitEvent> {
    const { booster_display } = this.sdk.sdkOptions.booster

    const initEventObjects = (
      await loopToGetAllQueryEvents(this._sdk, { query: { MoveEventType: `${booster_display}::config::InitEvent` } })
    )?.data

    const initEvent: BoosterInitEvent = {
      booster_config_id: '',
      booster_pool_handle: '',
    }

    if (initEventObjects.length > 0) {
      initEventObjects.forEach((item: any) => {
        const fields = item.parsedJson
        if (fields) {
          initEvent.booster_config_id = fields.config_id
        }
      })
    }

    initEvent.booster_pool_handle = await this.getPoolHandleId(initEvent.booster_config_id)

    return initEvent
  }

  /**
   * Gets the booster positions for the given account address.
   *
   * @param {SuiAddressType} accountAddress The account address to get the booster positions for.
   * @param {string} clmm_pool_id The ID of the CLMM pool.
   * @param {string} lock_positions_handle The handle of the lock positions.
   * @returns {Promise<BoosterPositionInfo[]>} A promise that resolves to an array of booster position information objects.
   */
  async getOwnerBoosterPositions(
    accountAddress: SuiAddressType,
    clmm_pool_id: string,
    lock_positions_handle: string
  ): Promise<BoosterPositionInfo[]> {
    const { booster } = this.sdk.sdkOptions
    const lockNfts: LockNFT[] = []

    const boosterList: BoosterPositionInfo[] = []

    const filterType = `${booster.booster_display}::lock_nft::LockNFT<${this._sdk.Position.buildPositionType()}>`

    const ownerRes: any = await getOwnedObjects(this._sdk, accountAddress, {
      options: { showType: true, showContent: true, showOwner: true },
      filter: { StructType: filterType },
    })
    for (const item of ownerRes.data) {
      const type = extractStructTagFromType(getMoveObjectType(item) as ObjectType).source_address

      if (type === filterType) {
        if (item.data) {
          const lockCetus = BoosterUtil.buildLockNFT(item)
          this.updateCache(`${lockCetus.locked_nft_id}_getBoosterPositionById`, lockCetus, cacheTime24h)
          if (lockCetus) {
            if (clmm_pool_id === undefined || clmm_pool_id === lockCetus.lock_clmm_position.pool) {
              lockNfts.push(lockCetus)
            }
          }
        }
      }
    }

    const infos = await this.getLockPositionInfos(
      lock_positions_handle,
      lockNfts.map((item) => item.locked_nft_id)
    )

    for (const nft of lockNfts) {
      for (const info of infos) {
        if (nft.lock_clmm_position.pos_object_id === info.position_id) {
          boosterList.push({ ...nft, ...info })
          break
        }
      }
    }

    return boosterList
  }

  /**
   * Get booster position information based on the locked NFT ID
   * @param lock_positions_handle
   * @param locked_nft_id
   * @returns
   */
  async getBoosterPosition(lock_positions_handle: SuiObjectIdType, locked_nft_id: SuiObjectIdType): Promise<BoosterPositionInfo> {
    const cacheKey = `${locked_nft_id}_getBoosterPositionById`
    const cacheData = this.getCache<LockNFT>(cacheKey)

    let lockNFT: LockNFT
    if (cacheData !== undefined) {
      lockNFT = cacheData
    } else {
      const result = await this._sdk.fullClient.getObject({
        id: locked_nft_id,
        options: { showContent: true, showOwner: true },
      })
      lockNFT = BoosterUtil.buildLockNFT(result)
      this.updateCache(cacheKey, lockNFT, cacheTime24h)
    }

    const lockPositionInfo = await this.getLockPositionInfo(lock_positions_handle, locked_nft_id)

    return {
      ...lockNFT,
      ...lockPositionInfo,
    }
  }

  /**
   * Gets the lock position information objects for the given lock positions handle and lock NFT IDs.
   *
   * @param {SuiObjectIdType} lock_positions_handle The handle of the lock positions.
   * @param {SuiObjectIdType[]} lock_nft_ids An array of lock NFT IDs.
   * @returns {Promise<LockPositionInfo[]>} A promise that resolves to an array of lock position information objects.
   */
  async getLockPositionInfos(lock_positions_handle: SuiObjectIdType, lock_nft_ids: SuiObjectIdType[] = []): Promise<LockPositionInfo[]> {
    const result = await getDynamicFields(this._sdk, lock_positions_handle)
    // console.log(result.data)

    const objectIds: SuiObjectIdType[] = []
    const positionList: LockPositionInfo[] = []
    result.data?.forEach((item: any) => {
      if (lock_nft_ids.length > 0) {
        if (lock_nft_ids.includes(item.name.value)) {
          objectIds.push(item.objectId)
        }
      } else {
        objectIds.push(item.objectId)
      }
    })
    if (objectIds.length > 0) {
      const results = await multiGetObjects(this._sdk, objectIds, { showContent: true })
      results.forEach((data) => {
        const position = BoosterUtil.buildLockPositionInfo(data)
        if (position) {
          positionList.push(position)
        }
      })
    }
    return positionList
  }

  /**
   * Gets the lock position information for the given lock positions handle and lock NFT ID.
   *
   * @param {SuiObjectIdType} lock_positions_handle The handle of the lock positions.
   * @param {SuiObjectIdType} lock_nft_id The ID of the lock NFT.
   * @returns {Promise<LockPositionInfo>} A promise that resolves to the lock position information object.
   */
  async getLockPositionInfo(lock_positions_handle: SuiObjectIdType, lock_nft_id: SuiObjectIdType): Promise<LockPositionInfo> {
    const result = await this._sdk.fullClient.getDynamicFieldObject({
      parentId: lock_positions_handle,
      name: {
        type: '0x2::object::ID',
        value: lock_nft_id,
      },
    })
    return BoosterUtil.buildLockPositionInfo(result)
  }

  /**
   * Calculates the XCetus rewarder for the given CLMM rewarders, booster pool, and lock position information.
   *
   * @param {RewarderAmountOwed[]} clmmRewarders The CLMM rewarders.
   * @param {BoosterPool} boosterPool The booster pool.
   * @param {LockPositionInfo} lockPositionInfo The lock position information.
   * @returns {string} The XCetus rewarder.
   */
  calculateXCetusRewarder(clmmRewarders: RewarderAmountOwed[], boosterPool: BoosterPool, lockPositionInfo: LockPositionInfo) {
    let multiplier = boosterPool.basic_percent
    let rewarder_now = '0'

    clmmRewarders.forEach((item) => {
      if (item.coin_address === boosterPool.booster_type) {
        console.log('find ', boosterPool.booster_type)
        rewarder_now = item.amount_owed.toString()
      }
    })

    if (!lockPositionInfo.is_settled) {
      boosterPool.config.forEach((item: any) => {
        if (item.lock_day === lockPositionInfo.lock_period) {
          multiplier = item.multiplier
        }
      })
    }
    const xcetus_amount = d(rewarder_now).sub(lockPositionInfo.growth_rewarder).mul(multiplier)
    const xcetus_reward_amount = d(lockPositionInfo.rewarder_owned).add(xcetus_amount)
    return xcetus_reward_amount.toString()
  }

  /**
   * Creates a transaction block for locking a position.
   *
   * @param {LockPositionParams} params The parameters for the lock position.
   * @returns {TransactionBlock} The transaction block.
   */
  lockPositionPayload(params: LockPositionParams): TransactionBlock {
    const { booster, clmm } = this.sdk.sdkOptions

    const tx = new TransactionBlock()

    tx.moveCall({
      target: `${booster.booster_router}::${BoosterRouterModule}::lock_position`,
      typeArguments: [params.booster_type, params.coinTypeA, params.coinTypeB],
      arguments: [
        tx.pure(booster.config.booster_config_id),
        tx.pure(clmm.config.global_config_id),
        tx.pure(params.booster_pool_id),
        tx.pure(params.clmm_pool_id),
        tx.pure(params.clmm_position_id),
        tx.pure(params.lock_day),
        tx.pure(CLOCK_ADDRESS),
      ],
    })

    return tx
  }

  /**
   * Creates a transaction block for canceling a lock position.
   *
   * @param {CancelParams} params The parameters for the cancel lock position.
   * @returns {TransactionBlock} The transaction block.
   */
  canceLockPositionPayload(params: CancelParams): TransactionBlock {
    const { booster } = this.sdk.sdkOptions

    const tx = new TransactionBlock()

    tx.moveCall({
      target: `${booster.booster_router}::${BoosterRouterModule}::cancel_lock`,
      typeArguments: [params.booster_type],
      arguments: [
        tx.pure(booster.config.booster_config_id),
        tx.pure(params.booster_pool_id),
        tx.pure(params.lock_nft_id),
        tx.pure(CLOCK_ADDRESS),
      ],
    })

    return tx
  }

  /**
   * Redeem the rewarder, get back the Clmm Position if the lock time ends.
   * @param params
   * @returns
   */
  redeemPayload(params: RedeemParams): TransactionBlock {
    const { booster, clmm, xcetus } = this.sdk.sdkOptions

    const tx = new TransactionBlock()

    tx.moveCall({
      target: `${booster.booster_router}::${BoosterRouterModule}::redeem`,
      typeArguments: [params.booster_type, params.coinTypeA, params.coinTypeB],
      arguments: [
        tx.pure(booster.config.booster_config_id),
        tx.pure(clmm.config.global_config_id),
        tx.pure(params.booster_pool_id),
        tx.pure(params.lock_nft_id),
        tx.pure(params.clmm_pool_id),
        tx.pure(xcetus.config.lock_manager_id),
        tx.pure(xcetus.config.xcetus_manager_id),
        tx.pure(params.ve_nft_id),
        tx.pure(CLOCK_ADDRESS),
      ],
    })

    return tx
  }

  private updateCache(key: string, data: SuiResource, time = cacheTime5min) {
    let cacheData = this._cache[key]
    if (cacheData) {
      cacheData.overdueTime = getFutureTime(time)
      cacheData.value = data
    } else {
      cacheData = new CachedContent(data, getFutureTime(time))
    }
    this._cache[key] = cacheData
  }

  private getCache<T>(key: string, forceRefresh = false): T | undefined {
    const cacheData = this._cache[key]
    if (!forceRefresh && cacheData?.isValid()) {
      return cacheData.value as T
    }
    delete this._cache[key]
    return undefined
  }
}
