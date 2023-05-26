/* eslint-disable no-bitwise */
/* eslint-disable no-plusplus */
/* eslint-disable camelcase */
/* eslint-disable no-nested-ternary */
/* eslint-disable class-methods-use-this */
import BN from 'bn.js'
import { TransactionBlock, getObjectFields } from '@mysten/sui.js'
import {
  AddLiquidityFixTokenParams,
  AddLiquidityParams,
  ClosePositionParams,
  CollectFeeParams,
  OpenPositionParams,
  Position,
  PositionReward,
  RemoveLiquidityParams,
} from '../types'
import {
  CachedContent,
  asUintN,
  buildPosition,
  buildPositionReward,
  cacheTime24h,
  cacheTime5min,
  extractStructTagFromType,
  getFutureTime,
  multiGetObjects,
} from '../utils'
import { findAdjustCoin, TransactionUtil } from '../utils/transaction-util'
import { ClmmIntegratePoolModule, CLOCK_ADDRESS, SuiObjectIdType, SuiResource } from '../types/sui'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'

/**
 * Helper class to help interact with clmm position with a position router interface.
 */
export class PositionModule implements IModule {
  protected _sdk: SDK

  private readonly _cache: Record<string, CachedContent> = {}

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  /**
   * Builds the full address of the Position type.
   *
   * @returns The full address of the Position type.
   */
  buildPositionType() {
    const cetusClmm = this._sdk.sdkOptions.clmm.clmm_display
    return `${cetusClmm}::position::Position`
  }

  /**
   * Gets a list of positions for the given account address.
   *
   * @param accountAddress The account address to get positions for.
   * @param assignPoolIds An array of pool IDs to filter the positions by.
   * @returns array of Position objects.
   */
  async getPositionList(accountAddress: string, assignPoolIds: string[] = []): Promise<Position[]> {
    const allPosition: Position[] = []
    let cursor = null

    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const ownerRes: any = await this._sdk.fullClient.getOwnedObjects({
        owner: accountAddress,
        options: { showType: true, showContent: true, showDisplay: true, showOwner: true },
        cursor,
        filter: { Package: this._sdk.sdkOptions.clmm.clmm_display },
      })

      const hasAssignPoolIds = assignPoolIds.length > 0
      for (const item of ownerRes.data as any[]) {
        const type = extractStructTagFromType(item.data.type)

        if (type.full_address === this.buildPositionType()) {
          const position = buildPosition(item)
          const cacheKey = `${position.pos_object_id}_getPositionList`
          this.updateCache(cacheKey, position, cacheTime24h)
          if (hasAssignPoolIds) {
            if (assignPoolIds.includes(position.pool)) {
              allPosition.push(position)
            }
          } else {
            allPosition.push(position)
          }
        }
      }

      if (ownerRes.hasNextPage) {
        cursor = ownerRes.nextCursor
      } else {
        break
      }
    }

    return allPosition
  }

  /**
   * Gets a position by its handle and ID.
   *
   * @param positionHandle The handle of the position to get.
   * @param positionId The ID of the position to get.
   * @returns Position object.
   */
  async getPosition(positionHandle: string, positionId: string): Promise<Position> {
    let position = await this.getSipmlePosition(positionId)
    position = await this.updatePositionRewarders(positionHandle, position)
    return position
  }

  /**
   * Gets a position by its ID.
   *
   * @param positionId The ID of the position to get.
   * @returns Position object.
   */
  async getPositionById(positionId: string): Promise<Position> {
    const position = await this.getSipmlePosition(positionId)
    const pool = await this._sdk.Pool.getPool(position.pool, false)
    const result = await this.updatePositionRewarders(pool.position_manager.positions_handle, position)
    return result
  }

  /**
   * Gets a simple position for the given position ID.
   *
   * @param positionId The ID of the position to get.
   * @returns Position object.
   */
  async getSipmlePosition(positionId: string): Promise<Position> {
    const cacheKey = `${positionId}_getPositionList`

    let position = this.getSipmlePositionByCache(positionId)

    if (position === undefined) {
      const objectDataResponses = await this.sdk.fullClient.getObject({
        id: positionId,
        options: { showContent: true, showType: true, showDisplay: true, showOwner: true },
      })
      position = buildPosition(objectDataResponses)

      this.updateCache(cacheKey, position, cacheTime24h)
    }
    return position
  }

  private getSipmlePositionByCache(positionId: string): Position | undefined {
    const cacheKey = `${positionId}_getPositionList`
    return this.getCache<Position>(cacheKey)
  }

  /**
   * Gets a list of simple positions for the given position IDs.
   *
   * @param positionIds The IDs of the positions to get.
   * @returns A promise that resolves to an array of Position objects.
   */
  async getSipmlePositionList(positionIds: SuiObjectIdType[]): Promise<Position[]> {
    const positionList: Position[] = []
    const notFoundIds: SuiObjectIdType[] = []

    positionIds.forEach((id) => {
      const position = this.getSipmlePositionByCache(id)
      if (position) {
        positionList.push(position)
      } else {
        notFoundIds.push(id)
      }
    })

    if (notFoundIds.length > 0) {
      const objectDataResponses = await multiGetObjects(this._sdk, notFoundIds, {
        showOwner: true,
        showContent: true,
        showDisplay: true,
        showType: true,
      })

      objectDataResponses.forEach((info) => {
        const position = buildPosition(info)
        positionList.push(position)
        const cacheKey = `${position.pos_object_id}_getPositionList`
        this.updateCache(cacheKey, position, cacheTime24h)
      })
    }

    return positionList
  }

  private async updatePositionRewarders(positionHandle: string, position: Position): Promise<Position> {
    const positionReward = await this.getPositionRewarders(positionHandle, position.pos_object_id)
    return {
      ...position,
      ...positionReward,
    }
  }

  /**
   * Gets the position rewarders for the given position handle and position object ID.
   *
   * @param positionHandle The handle of the position.
   * @param posObjectId The ID of the position object.
   * @returns PositionReward object.
   */
  async getPositionRewarders(positionHandle: string, posObjectId: string): Promise<PositionReward> {
    const dynamicFieldObject = await this._sdk.fullClient.getDynamicFieldObject({
      parentId: positionHandle,
      name: {
        type: '0x2::object::ID',
        value: posObjectId,
      },
    })

    const objectFields = getObjectFields(dynamicFieldObject.data as any) as any

    const fields = objectFields.value.fields.value

    const positionReward = buildPositionReward(fields)
    return positionReward
  }

  /**
   * create add liquidity transaction payload
   * @param params
   * @param gasEstimateArg : When the fix input amount is SUI, gasEstimateArg can control whether to recalculate the number of SUI to prevent insufficient gas.
   * If this parameter is not passed, gas estimation is not performed
   * @returns
   */
  async createAddLiquidityTransactionPayload(
    params: AddLiquidityParams | AddLiquidityFixTokenParams,
    gasEstimateArg?: {
      slippage: number
      curSqrtPrice: BN
    }
  ): Promise<TransactionBlock> {
    if (this._sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }
    const allCoinAsset = await this._sdk.getOwnerCoinAssets(this._sdk.senderAddress)

    const isFixToken = !('delta_liquidity' in params)

    if (gasEstimateArg) {
      const { isAdjustCoinA, isAdjustCoinB } = findAdjustCoin(params)
      if (isFixToken) {
        params = params as AddLiquidityFixTokenParams
        if ((params.fix_amount_a && isAdjustCoinA) || (!params.fix_amount_a && isAdjustCoinB)) {
          const tx = await TransactionUtil.buildAddLiquidityTransactionForGas(this._sdk, allCoinAsset, params, gasEstimateArg)
          return tx
        }
      }
    }

    return TransactionUtil.buildAddLiquidityTransaction(this._sdk, allCoinAsset, params)
  }

  /**
   * Remove liquidity from a position.
   * @param params
   * @param gasBudget
   * @returns
   */
  removeLiquidityTransactionPayload(params: RemoveLiquidityParams): TransactionBlock {
    const { clmm } = this.sdk.sdkOptions

    const functionName = 'remove_liquidity'

    const tx = new TransactionBlock()

    const typeArguments = [params.coinTypeA, params.coinTypeB]

    if (params.collect_fee) {
      tx.moveCall({
        target: `${clmm.clmm_router.cetus}::${ClmmIntegratePoolModule}::collect_fee`,
        typeArguments,
        arguments: [tx.object(clmm.config.global_config_id), tx.object(params.pool_id), tx.object(params.pos_id)],
      })
    }

    const args = [
      tx.object(clmm.config.global_config_id),
      tx.object(params.pool_id),
      tx.object(params.pos_id),
      tx.pure(params.delta_liquidity),
      tx.pure(params.min_amount_a),
      tx.pure(params.min_amount_b),
      tx.object(CLOCK_ADDRESS),
    ]

    tx.moveCall({
      target: `${clmm.clmm_router.cetus}::${ClmmIntegratePoolModule}::${functionName}`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  /**
   * Close position and remove all liquidity and collect_reward
   * @param params
   * @param gasBudget
   * @returns
   */

  closePositionTransactionPayload(params: ClosePositionParams): TransactionBlock {
    const { clmm } = this.sdk.sdkOptions

    const tx = new TransactionBlock()

    const typeArguments = [params.coinTypeA, params.coinTypeB]

    if (params.collect_fee) {
      tx.moveCall({
        target: `${clmm.clmm_router.cetus}::${ClmmIntegratePoolModule}::collect_fee`,
        typeArguments,
        arguments: [tx.object(clmm.config.global_config_id), tx.object(params.pool_id), tx.object(params.pos_id)],
      })
    }

    params.rewarder_coin_types.forEach((type) => {
      tx.moveCall({
        target: `${clmm.clmm_router.cetus}::${ClmmIntegratePoolModule}::collect_reward`,
        typeArguments: [...typeArguments, type],
        arguments: [
          tx.object(clmm.config.global_config_id),
          tx.object(params.pool_id),
          tx.object(params.pos_id),
          tx.object(clmm.config.global_vault_id),
          tx.object(CLOCK_ADDRESS),
        ],
      })
    })

    tx.moveCall({
      target: `${clmm.clmm_router.cetus}::${ClmmIntegratePoolModule}::close_position`,
      typeArguments,
      arguments: [
        tx.object(clmm.config.global_config_id),
        tx.object(params.pool_id),
        tx.object(params.pos_id),
        tx.pure(params.min_amount_a),
        tx.pure(params.min_amount_b),
        tx.object(CLOCK_ADDRESS),
      ],
    })

    return tx
  }

  /**
   * Open position in clmmpool.
   * @param params
   * @returns
   */
  openPositionTransactionPayload(params: OpenPositionParams): TransactionBlock {
    const { clmm } = this.sdk.sdkOptions

    const tx = new TransactionBlock()

    const typeArguments = [params.coinTypeA, params.coinTypeB]
    const tick_lower = asUintN(BigInt(params.tick_lower)).toString()
    const tick_upper = asUintN(BigInt(params.tick_upper)).toString()
    const args = [tx.pure(clmm.config.global_config_id), tx.pure(params.pool_id), tx.pure(tick_lower), tx.pure(tick_upper)]

    tx.moveCall({
      target: `${clmm.clmm_router.cetus}::${ClmmIntegratePoolModule}::open_position`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  /**
   * Collect LP fee from Position.
   * @param params
   * @returns
   */
  collectFeeTransactionPayload(params: CollectFeeParams): TransactionBlock {
    const { clmm } = this.sdk.sdkOptions

    const tx = new TransactionBlock()

    const typeArguments = [params.coinTypeA, params.coinTypeB]
    const args = [tx.object(clmm.config.global_config_id), tx.pure(params.pool_id), tx.pure(params.pos_id)]

    tx.moveCall({
      target: `${clmm.clmm_router.cetus}::${ClmmIntegratePoolModule}::collect_fee`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  /**
   * Updates the cache for the given key.
   *
   * @param key The key of the cache entry to update.
   * @param data The data to store in the cache.
   * @param time The time in minutes after which the cache entry should expire.
   */
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

  /**
   * Gets the cache entry for the given key.
   *
   * @param key The key of the cache entry to get.
   * @param forceRefresh Whether to force a refresh of the cache entry.
   * @returns The cache entry for the given key, or undefined if the cache entry does not exist or is expired.
   */
  private getCache<T>(key: string, forceRefresh = false): T | undefined {
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
