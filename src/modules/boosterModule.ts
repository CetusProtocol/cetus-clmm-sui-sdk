/* eslint-disable class-methods-use-this */
/* eslint-disable no-await-in-loop */
/* eslint-disable camelcase */
import { getMoveObjectType, getObjectFields, ObjectType, TransactionBlock } from '@mysten/sui.js'
import BN from 'bn.js'
import { d, extractStructTagFromType, getOwnedObjects, loopToGetAllQueryEvents, multiGetObjects } from '../utils'
import { BoosterUtil } from '../utils/booster'
import {
  BoosterInitEvent,
  BoosterPool,
  BoosterPoolImmutables,
  BoosterPoolState,
  BoosterRouterModule,
  CancelParams,
  LockNFT,
  LockPositionInfo,
  LockPositionParams,
  RedeemParams,
} from '../types/booster_type'
import { SuiResource, SuiObjectIdType, CLOCK_ADDRESS, SuiAddressType } from '../types/sui'
import { CachedContent } from '../utils/cachedContent'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { RewarderAmountOwed } from './rewarderModule'

export const cacheTime5min = 5 * 60 * 1000
export const cacheTime24h = 24 * 60 * 60 * 1000
export const intervalFaucetTime = 12 * 60 * 60 * 1000

function getFutureTime(interval: number) {
  return Date.parse(new Date().toString()) + interval
}

export class BoosterModule implements IModule {
  protected _sdk: SDK

  private readonly _cache: Record<string, CachedContent> = {}

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  async getPoolImmutables(forceRefresh = false): Promise<BoosterPoolImmutables[]> {
    const { booster } = this._sdk.sdkOptions
    const cacheKey = `${booster.booster_display}_getPoolImmutables`
    const cacheData = this._cache[cacheKey]

    const allPool: BoosterPoolImmutables[] = []

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      allPool.push(...(cacheData.value as BoosterPoolImmutables[]))
    } else {
      const simplePoolIds: SuiObjectIdType[] = []
      const result = await this._sdk.fullClient.getDynamicFields({ parentId: booster.config.booster_pool_handle })
      result.data?.forEach((item) => {
        simplePoolIds.push(item.objectId)
      })
      const simpleDatas = await multiGetObjects(this._sdk, simplePoolIds, {
        showContent: true,
      })

      for (const item of simpleDatas) {
        const fields = getObjectFields(item)
        if (fields) {
          allPool.push(BoosterUtil.buildPoolImmutables(fields))
        }
      }
    }
    return allPool
  }

  async getPoolImmutable(poolObjectId: SuiObjectIdType): Promise<BoosterPoolImmutables> {
    const { booster } = this._sdk.sdkOptions
    const cacheKey = `${booster}_getPoolImmutables`
    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData()) {
      const poolImmutableool = (cacheData.value as BoosterPoolImmutables[]).filter((item) => {
        return poolObjectId === item.pool_id
      })
      if (poolImmutableool.length > 0) {
        return poolImmutableool[0]
      }
    }
    const result = await this._sdk.fullClient.getDynamicFieldObject({
      parentId: booster.config.booster_pool_handle,
      name: {
        type: '0x2::object::ID',
        value: poolObjectId,
      },
    })
    const fields = getObjectFields(result)

    return BoosterUtil.buildPoolImmutables(fields)
  }

  async getPools(): Promise<BoosterPool[]> {
    const allPool: BoosterPool[] = []
    const poolImmutables = await this.getPoolImmutables()

    const poolObjectIds: string[] = poolImmutables.map((item) => {
      return item.pool_id
    })
    const objectDataResponses = await multiGetObjects(this._sdk, poolObjectIds, { showType: true, showContent: true })
    let index = 0
    for (const suiObj of objectDataResponses) {
      const poolState = BoosterUtil.buildPoolState(suiObj)

      if (poolState) {
        const pool = {
          ...poolImmutables[index],
          ...poolState,
        }
        allPool.push(pool)
        const cacheKey = `${pool.pool_id}_getPoolObject`
        this.updateCache(cacheKey, pool, cacheTime24h)
      }
      index += 1
    }

    return allPool
  }

  async getPool(poolObjectId: string, forceRefresh = true): Promise<BoosterPool> {
    const cacheKey = `${poolObjectId}_getPoolObject`
    const cacheData = this._cache[cacheKey]

    const poolImmutables = await this.getPoolImmutable(poolObjectId)

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      const poolState = cacheData.value as BoosterPoolState
      return {
        ...poolImmutables,
        ...poolState,
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

  async getOwnerLockNfts(accountAddress: SuiAddressType, clmm_pool_id?: string): Promise<LockNFT[]> {
    const { booster } = this.sdk.sdkOptions
    const lockCetuss: LockNFT[] = []

    const filterType = `${booster.booster_display}::lock_nft::LockNFT<${this._sdk.Resources.buildPositionType()}>`

    const ownerRes: any = await getOwnedObjects(this._sdk, accountAddress, {
      options: { showType: true, showContent: true, showOwner: true },
      filter: { StructType: filterType },
    })
    for (const item of ownerRes.data) {
      const type = extractStructTagFromType(getMoveObjectType(item) as ObjectType).source_address

      if (type === filterType) {
        if (item.data) {
          const lockCetus = BoosterUtil.buildLockNFT(item)
          if (lockCetus) {
            if (clmm_pool_id === undefined || clmm_pool_id === lockCetus.lock_clmm_position.pool) {
              lockCetuss.push(lockCetus)
            }
          }
        }
      }
    }

    return lockCetuss
  }

  async getLockNftById(locked_nft_id: SuiObjectIdType): Promise<LockNFT | undefined> {
    const result = await this._sdk.fullClient.getObject({
      id: locked_nft_id,
      options: { showContent: true, showOwner: true },
    })
    return BoosterUtil.buildLockNFT(result)
  }

  async getLockPositionInfos(lock_positions_handle: SuiObjectIdType, lock_nft_ids: SuiObjectIdType[] = []): Promise<LockPositionInfo[]> {
    const result = await this._sdk.fullClient.getDynamicFields({
      parentId: lock_positions_handle,
    })
    // console.log(result.data)

    const objectIds: SuiObjectIdType[] = []
    const positionList: LockPositionInfo[] = []
    result.data?.forEach((item) => {
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

  async getLockPositionInfo(lock_positions_handle: SuiObjectIdType, lock_nft_id: SuiObjectIdType): Promise<LockPositionInfo | undefined> {
    const result = await this._sdk.fullClient.getDynamicFieldObject({
      parentId: lock_positions_handle,
      name: {
        type: '0x2::object::ID',
        value: lock_nft_id,
      },
    })
    return BoosterUtil.buildLockPositionInfo(result)
  }

  async getLockPositionInfoById(id: SuiObjectIdType): Promise<LockPositionInfo | undefined> {
    const result = await this._sdk.fullClient.getObject({ id, options: { showContent: true } })
    return BoosterUtil.buildLockPositionInfo(result)
  }

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
      boosterPool.config.forEach((item) => {
        if (item.lock_day === lockPositionInfo.lock_period) {
          multiplier = item.multiplier
        }
      })
    }

    const xcetus_amount = d(rewarder_now).sub(lockPositionInfo.growth_rewarder).mul(multiplier)
    const xcetus_reward_amount = d(lockPositionInfo.xcetus_owned).add(xcetus_amount)
    return new BN(xcetus_reward_amount.toString())
  }

  /**
   * lock position
   * @param params
   * @returns
   */
  lockPositionPayload(params: LockPositionParams): TransactionBlock {
    const { booster, clmm } = this.sdk.sdkOptions

    const tx = new TransactionBlock()
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetMiddle)

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
   * Cancel lock
   * @param params
   * @returns
   */
  canceLockPositionPayload(params: CancelParams): TransactionBlock {
    const { booster } = this.sdk.sdkOptions

    const tx = new TransactionBlock()
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetMiddle)

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
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetMiddle)

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
}
