/* eslint-disable guard-for-in */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-await-in-loop */
/* eslint-disable camelcase */
import { getObjectFields, TransactionBlock } from '@mysten/sui.js'
import Decimal from 'decimal.js'
import { ClmmPositionStatus } from '../types'
import { d, getDynamicFields, loopToGetAllQueryEvents, multiGetObjects } from '../utils'
import { MakerUtil } from '../utils/maker'
import {
  ClaimAllParams,
  ClaimMakerParams,
  MakerInitEvent,
  MakerPool,
  MakerPoolImmutables,
  MakerPoolPeriod,
  MakerRouterModule,
  MarkerPosition,
  PoolBonusInfo,
} from '../types/maker_type'
import { SuiResource, SuiObjectIdType, SuiAddressType } from '../types/sui'
import { CachedContent, cacheTime24h, cacheTime5min, getFutureTime } from '../utils/cachedContent'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'

/**
 * Helper class to help interact with maker bonus pools with a router interface.
 */
export class MakerModule implements IModule {
  protected _sdk: SDK

  private readonly _cache: Record<string, CachedContent> = {}

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  /**
   * Gets the pool immutables
   *
   * @param {boolean} forceRefresh Whether to force a refresh of the cache.
   * @returns {Promise<MakerPoolImmutables[]>} A promise that resolves to an array of maker pool immutables.
   */
  async getPoolImmutables(forceRefresh = false): Promise<MakerPoolImmutables[]> {
    const { maker_bonus } = this._sdk.sdkOptions
    const cacheKey = `${maker_bonus.maker_display}_getPoolImmutables`
    const cacheData = this.getCache<MakerPoolImmutables[]>(cacheKey, forceRefresh)

    const allPool: MakerPoolImmutables[] = []

    if (cacheData !== undefined) {
      allPool.push(...cacheData)
    } else {
      const simplePoolIds: SuiObjectIdType[] = []
      const result = await getDynamicFields(this._sdk, maker_bonus.config.maker_pool_handle)
      result.data?.forEach((item: any) => {
        simplePoolIds.push(item.objectId)
      })

      const simpleDatas = await multiGetObjects(this._sdk, simplePoolIds, { showContent: true })

      for (const item of simpleDatas) {
        const fields = getObjectFields(item)
        if (fields) {
          allPool.push(MakerUtil.buildPoolImmutables(fields))
        }
      }
    }
    return allPool
  }

  /**
   * Gets the pool immutable for the given pool object id.
   *
   * @param {SuiObjectIdType} poolObjectId The pool object id.
   * @returns {Promise<MakerPoolImmutables>} A promise that resolves to the pool immutable.
   */
  async getPoolImmutable(poolObjectId: SuiObjectIdType): Promise<MakerPoolImmutables> {
    const { maker_bonus } = this._sdk.sdkOptions
    const cacheKey = `${maker_bonus.maker_display}_getPoolImmutables`
    const cacheData = this.getCache<MakerPoolImmutables[]>(cacheKey)

    if (cacheData !== undefined) {
      const poolImmutableool = cacheData.filter((item) => {
        return poolObjectId === item.pool_id
      })
      if (poolImmutableool.length > 0) {
        return poolImmutableool[0]
      }
    }
    const result = await this._sdk.fullClient.getDynamicFieldObject({
      parentId: maker_bonus.config.maker_pool_handle,
      name: {
        type: '0x2::object::ID',
        value: poolObjectId,
      },
    })
    const fields = getObjectFields(result)

    return MakerUtil.buildPoolImmutables(fields)
  }

  /**
   * Gets all pools.
   *
   * @returns {Promise<MakerPool[]>} A promise that resolves to an array of MakerPool objects.
   */
  async getPools(): Promise<MakerPool[]> {
    const allPool: MakerPool[] = []
    const poolImmutables = await this.getPoolImmutables()

    const poolObjectIds: string[] = poolImmutables.map((item) => {
      return item.pool_id
    })

    const objectDataResponses = await multiGetObjects(this._sdk, poolObjectIds, { showType: true, showContent: true })
    let index = 0
    for (const suiObj of objectDataResponses) {
      const poolState = MakerUtil.buildPoolState(suiObj)

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

  /**
   * Gets a pool by its object id.
   *
   * @param {string} poolObjectId The object id of the pool.
   * @param {boolean} forceRefresh Whether to force a refresh of the cache.
   * @returns {Promise<MakerPool>} A promise that resolves to the pool.
   */
  async getPool(poolObjectId: string, forceRefresh = true): Promise<MakerPool> {
    const cacheKey = `${poolObjectId}_getPoolObject`
    const cacheData = this.getCache<MakerPool>(cacheKey, forceRefresh)

    const poolImmutables = await this.getPoolImmutable(poolObjectId)

    if (cacheData !== undefined) {
      return cacheData
    }
    const objects = await this._sdk.fullClient.getObject({
      id: poolObjectId,
      options: { showContent: true, showType: true },
    })

    const poolState = MakerUtil.buildPoolState(objects)
    const pool: MakerPool = {
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
   * Gets the periods for a given MakerPool.
   *
   * @param {MakerPool} pool The MakerPool to get periods for.
   * @param {boolean} forceRefresh Whether to force a refresh of the cache.
   * @returns {Promise<MakerPoolPeriod[]>} A promise that resolves to an array of MakerPoolPeriod objects.
   */
  async getMakerPoolPeriods(pool: MakerPool, forceRefresh = false): Promise<MakerPoolPeriod[]> {
    const periods: MakerPoolPeriod[] = []

    const cacheKey = `${pool.pool_id}_getMakerPoolPeriods`
    const cacheData = this.getCache<MakerPoolPeriod[]>(cacheKey, forceRefresh)

    if (cacheData !== undefined) {
      return cacheData
    }

    const results = await getDynamicFields(this._sdk, pool.whale_nfts.whale_nfts_handle)

    results.data.forEach((item: any) => {
      const info: MakerPoolPeriod = {
        id: item.objectId,
        start_time: 0,
        end_time: 0,
        period: Number(item.name.value),
      }
      info.start_time = Number(
        d(pool.start_time)
          .add(
            d(pool.interval_day)
              .mul(24 * 3600)
              .mul(info.period)
          )
          .toFixed(0, Decimal.ROUND_DOWN)
      )
      info.end_time = Number(
        d(info.start_time)
          .add(d(pool.interval_day).mul(24 * 3600))
          .toFixed(0, Decimal.ROUND_DOWN)
      )
      periods.push(info)
    })

    this.updateCache(cacheKey, periods, cacheTime24h)
    return periods
  }

  /**
   * Gets the init factory event.
   *
   * @returns {Promise<MakerInitEvent>} A promise that resolves to a MakerInitEvent object.
   */
  async getInitFactoryEvent(): Promise<MakerInitEvent> {
    const { maker_display } = this.sdk.sdkOptions.maker_bonus

    const initEventObjects = (await loopToGetAllQueryEvents(this._sdk, { query: { MoveEventType: `${maker_display}::config::InitEvent` } }))
      ?.data

    const initEvent: MakerInitEvent = {
      maker_config_id: '',
      maker_pool_handle: '',
    }

    if (initEventObjects.length > 0) {
      initEventObjects.forEach((item: any) => {
        const fields = item.parsedJson
        if (fields) {
          initEvent.maker_config_id = fields.config_id
        }
      })
    }

    initEvent.maker_pool_handle = await this.getPoolHandleId(initEvent.maker_config_id)

    return initEvent
  }

  /**
   * Gets the list of marker positions for a given whale NFTs handle and maker pool periods.
   *
   * @param {SuiObjectIdType} whale_nfts_handle The whale NFTs handle.
   * @param {MakerPoolPeriod[]} makerPoolPeriods The maker pool periods.
   * @param {boolean} forceRefresh Whether to force a refresh of the cache.
   * @returns {Promise<Record<number, MarkerPosition[]>>} A promise that resolves to a record of marker positions keyed by period.
   */
  async getPoolMarkerPositionList(
    whale_nfts_handle: SuiObjectIdType,
    makerPoolPeriods: MakerPoolPeriod[],
    forceRefresh = false
  ): Promise<Record<number, MarkerPosition[]>> {
    const recordMarkerPosition: Record<number, MarkerPosition[]> = {}

    const notFindMakerPoolPeriods: MakerPoolPeriod[] = []
    if (!forceRefresh) {
      makerPoolPeriods.forEach((item) => {
        const cacheKey = `${whale_nfts_handle}_${item.period}_getPoolMarkerPositionList`
        const cacheData = this.getCache<MarkerPosition[]>(cacheKey)
        if (cacheData !== undefined) {
          recordMarkerPosition[item.period] = cacheData
        } else {
          recordMarkerPosition[item.period] = []
          notFindMakerPoolPeriods.push(item)
        }
      })
    }
    try {
      if (notFindMakerPoolPeriods.length > 0) {
        const results = await multiGetObjects(
          this._sdk,
          notFindMakerPoolPeriods.map((item) => item.id),
          { showContent: true }
        )

        results.forEach((item) => {
          const fields = getObjectFields(item)
          const bonusInfoList = MakerUtil.buildMarkerPositions(fields)
          if (bonusInfoList.length > 0) {
            const { period_id } = bonusInfoList[0]
            const findPeriod = makerPoolPeriods.filter((item) => item.id === period_id)[0]
            recordMarkerPosition[findPeriod.period] = bonusInfoList
          }
        })
      }

      const allList: MarkerPosition[] = []
      for (const key in recordMarkerPosition) {
        const markerPosition = recordMarkerPosition[key]
        markerPosition.forEach((position) => {
          allList.push(position)
        })
      }

      if (allList.length > 0) {
        const positionList = await this._sdk.Position.getSipmlePositionList(
          allList.map((item) => {
            return item.id
          })
        )
        for (const bonusInfo of allList) {
          for (const position of positionList) {
            if (bonusInfo.id === position.pos_object_id) {
              bonusInfo.clmm_position = position
              break
            }
          }
        }
      }
    } catch (error) {
      console.log(error)
    }

    for (const key in recordMarkerPosition) {
      const cacheKey = `${whale_nfts_handle}_${key}_getPoolMarkerPositionList`
      this.updateCache(cacheKey, recordMarkerPosition[key], cacheTime24h)
    }

    return recordMarkerPosition
  }

  /**
   * Updates the XCetus rewarder and fee for a given maker pool, position list, and maker pool period.
   *
   * @param {MakerPool} pool The maker pool.
   * @param {MarkerPosition[]} positionList The list of marker positions.
   * @param {MakerPoolPeriod} makerPoolPeriod The maker pool period.
   * @returns {MarkerPosition[]} The updated list of marker positions.
   */
  async updateXCetusRewarderAndFee(pool: MakerPool, positionList: MarkerPosition[], makerPoolPeriod: MakerPoolPeriod) {
    const total_points_after_multiper = await this.calculateTotalPointsAfterMultiper(pool, makerPoolPeriod)
    for (const position of positionList) {
      await this.calculateXCetusRewarder(pool, position, makerPoolPeriod.period, total_points_after_multiper)
    }
    return positionList
  }

  async calculateXCetusRewarder(pool: MakerPool, position: MarkerPosition, period: number, total_points_after_multiper: string) {
    const rewarder_info = await this.getPoolBonusInfo(pool.rewarders.rewarder_handle, period)
    const { fee_share_rate } = this.calculateFeeShareRate(pool, position, total_points_after_multiper)
    const bonus_num = d(fee_share_rate).mul(rewarder_info.total_bonus)
    if (position.is_redeemed) {
      position.bonus_num = '0'
    } else {
      position.bonus_num = bonus_num.toString()
    }
    return position.bonus_num
  }

  /**
   * Calculates the fee share rate for a given maker pool, position, and total points after multiplier.
   *
   * @param {MakerPool} pool The maker pool.
   * @param {MarkerPosition} position The position.
   * @param {string} total_points_after_multiper The total points after multiplier.
   * @returns {Object} An object with the fee share rate and points after multiplier.
   */
  calculateFeeShareRate(
    pool: MakerPool,
    position: MarkerPosition,
    total_points_after_multiper: string
  ): { fee_share_rate: number; points_after_multiper: string } {
    const bonus_percent = MakerUtil.getBonusPercent(pool.config, position.percent)
    const points_after_multiper = d(position.point).mul(bonus_percent)
    const fee_share_rate = d(points_after_multiper).div(total_points_after_multiper)
    position.point_after_multiplier = points_after_multiper.toString()
    position.fee_share_rate = Number(fee_share_rate)
    return { fee_share_rate: Number(fee_share_rate), points_after_multiper: points_after_multiper.toString() }
  }

  /**
   * Calculates the total points after multiplier for a given maker pool and maker pool period.
   *
   * @param {MakerPool} pool The maker pool.
   * @param {MakerPoolPeriod} makerPoolPeriod The maker pool period.
   * @returns {Promise<string>} A promise that resolves to the total points after multiplier.
   */
  async calculateTotalPointsAfterMultiper(pool: MakerPool, makerPoolPeriod: MakerPoolPeriod): Promise<string> {
    const positionListMap = await this.getPoolMarkerPositionList(pool.whale_nfts.whale_nfts_handle, [makerPoolPeriod])
    let total_points_after_multiper = d(0)
    const positionList = positionListMap[makerPoolPeriod.period]
    for (const position of positionList) {
      const bonus_percent = MakerUtil.getBonusPercent(pool.config, position.percent)
      const points_after_multiper = d(position.point).mul(bonus_percent)
      total_points_after_multiper = total_points_after_multiper.add(points_after_multiper)
    }

    return total_points_after_multiper.toString()
  }

  /**
   * Calculates the XCetus rewarder for all given maker pools.
   *
   * @param {MakerPool[]} pools The list of maker pools.
   * @returns {Object} An object with the total claimable amount and the list of NFT IDs that can be claimed.
   */
  async calculateAllXCetusRewarder(pools: MakerPool[]) {
    const ownerAddress = this._sdk.senderAddress
    let claimtotal = d(0)
    // key: pool_id value: nft_ids
    const claimRecord: {
      bonus_type: SuiAddressType
      pool_id: SuiObjectIdType
      nft_ids: SuiObjectIdType[]
    }[] = []

    for (const pool of pools) {
      const makerPoolPeriods = await this._sdk.MakerModule.getMakerPoolPeriods(pool)
      const positionList = await this._sdk.MakerModule.getPoolMarkerPositionList(pool.whale_nfts.whale_nfts_handle, makerPoolPeriods)

      const owner_position_ids: string[] = []
      for (const makerPoolPeriod of makerPoolPeriods) {
        const ownerList = positionList[makerPoolPeriod.period].filter((item) => {
          if (ownerAddress.length === 0) {
            return false
          }
          return item.clmm_position?.owner === ownerAddress
        })

        if (ownerList.length > 0) {
          await this._sdk.MakerModule.updateXCetusRewarderAndFee(pool, ownerList, makerPoolPeriod)
          // eslint-disable-next-line no-loop-func
          ownerList.forEach((item) => {
            if (item.clmm_position?.position_status === ClmmPositionStatus.Exists && d(item.bonus_num).greaterThan(0)) {
              claimtotal = claimtotal.add(item.bonus_num)
              if (!owner_position_ids.includes(item.clmm_position.pos_object_id)) {
                owner_position_ids.push(item.clmm_position.pos_object_id)
              }
            }
          })
        }
      }
      claimRecord.push({
        bonus_type: pool.bonus_type,
        pool_id: pool.pool_id,
        nft_ids: owner_position_ids,
      })
    }

    return {
      claimtotal,
      claimRecord,
    }
  }

  /**
   * Gets the pool bonus information for the given rewarder handle and period.
   *
   * @param {SuiObjectIdType} rewarder_handle The rewarder handle.
   * @param {number} period The period.
   * @param {boolean} forceRefresh Whether to force a refresh of the cache.
   * @returns {Promise<PoolBonusInfo>} A promise that resolves to the pool bonus information.
   */
  async getPoolBonusInfo(rewarder_handle: SuiObjectIdType, period: number, forceRefresh = false): Promise<PoolBonusInfo> {
    const cacheKey = `${rewarder_handle}_${period}_getPoolBonusInfo`
    const cacheData = this.getCache<PoolBonusInfo>(cacheKey, forceRefresh)

    if (cacheData !== undefined) {
      return cacheData
    }

    const results = await this.sdk.fullClient.getDynamicFieldObject({
      parentId: rewarder_handle,
      name: {
        type: 'u64',
        value: period.toString(),
      },
    })

    const fields = getObjectFields(results)
    const bonusInfo = MakerUtil.buildPoolBonusInfo(fields)
    this.updateCache(cacheKey, bonusInfo, cacheTime5min)
    return bonusInfo
  }

  /**
   * Creates a transaction payload for claiming a maker bonus.
   *
   * @param {ClaimMakerParams} params The parameters for the claim.
   * @returns {TransactionBlock} The transaction payload.
   */
  claimPayload(params: ClaimMakerParams): TransactionBlock {
    const { maker_bonus, xcetus } = this.sdk.sdkOptions

    const tx = new TransactionBlock()

    tx.moveCall({
      target: `${maker_bonus.maker_router}::${MakerRouterModule}::claim`,
      typeArguments: [params.bonus_type],
      arguments: [
        tx.pure(maker_bonus.config.maker_config_id),
        tx.pure(params.market_pool_id),
        tx.pure(params.position_nft_id),
        tx.pure(params.phase),
        tx.pure(xcetus.config.lock_manager_id),
        tx.pure(xcetus.config.xcetus_manager_id),
        tx.pure(params.ve_nft_id),
      ],
    })

    return tx
  }

  /**
   * Creates a transaction payload for claiming all bonuses for a given set of whale NFTs.
   *
   * @param {ClaimAllParams} params The parameters for the claim.
   * @returns {TransactionBlock} The transaction payload.
   */
  claimAllPayload(params: ClaimAllParams): TransactionBlock {
    const { maker_bonus, xcetus } = this.sdk.sdkOptions

    const tx = new TransactionBlock()

    params.whale_nfts.forEach((item) => {
      item.nft_ids.forEach((nft_id) => {
        tx.moveCall({
          target: `${maker_bonus.maker_router}::${MakerRouterModule}::claim_all`,
          typeArguments: [item.bonus_type],
          arguments: [
            tx.object(maker_bonus.config.maker_config_id),
            tx.object(item.pool_id),
            tx.object(nft_id),
            tx.object(xcetus.config.lock_manager_id),
            tx.object(xcetus.config.xcetus_manager_id),
            tx.object(params.ve_nft_id),
          ],
        })
      })
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
