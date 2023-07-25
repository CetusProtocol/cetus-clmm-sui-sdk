import BN from 'bn.js'
import { TransactionArgument, TransactionBlock, getObjectFields, isValidSuiObjectId } from '@mysten/sui.js'
import {
  AddLiquidityFixTokenParams,
  AddLiquidityParams,
  ClosePositionParams,
  CollectFeeParams,
  OpenPositionParams,
  Position,
  PositionReward,
  RemoveLiquidityParams,
  getPackagerConfigs,
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
  getOwnedObjects,
  multiGetObjects,
} from '../utils'
import { findAdjustCoin, TransactionUtil } from '../utils/transaction-util'
import { ClmmIntegratePoolModule, CLOCK_ADDRESS, SuiObjectIdType, SuiResource } from '../types/sui'
import { CetusClmmSDK } from '../sdk'
import { IModule } from '../interfaces/IModule'

/**
 * Helper class to help interact with clmm position with a position router interface.
 */
export class PositionModule implements IModule {
  protected _sdk: CetusClmmSDK

  private readonly _cache: Record<string, CachedContent> = {}

  constructor(sdk: CetusClmmSDK) {
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
    const cetusClmm = this._sdk.sdkOptions.clmm_pool.package_id
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

    const ownerRes: any = await getOwnedObjects(this._sdk, accountAddress, {
      options: { showType: true, showContent: true, showDisplay: true, showOwner: true },
      filter: { Package: this._sdk.sdkOptions.clmm_pool.package_id },
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
  async getPositionRewarders(positionHandle: string, posObjectId: string): Promise<PositionReward | undefined> {
    try {
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
    } catch (error) {
      console.log(error)
      return undefined
    }
  }

  /**
   * create add liquidity transaction payload with fix token
   * @param params
   * @param gasEstimateArg : When the fix input amount is SUI, gasEstimateArg can control whether to recalculate the number of SUI to prevent insufficient gas.
   * If this parameter is not passed, gas estimation is not performed
   * @returns
   */
  async createAddLiquidityFixTokenPayload(
    params: AddLiquidityFixTokenParams,
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
          const tx = await TransactionUtil.buildAddLiquidityFixTokenForGas(this._sdk, allCoinAsset, params, gasEstimateArg)
          return tx
        }
      }
    }

    return TransactionUtil.buildAddLiquidityFixToken(this._sdk, allCoinAsset, params)
  }

  /**
   * create add liquidity transaction payload
   * @param params
   * @returns
   */
  async createAddLiquidityPayload(params: AddLiquidityParams): Promise<TransactionBlock> {
    const { integrate, clmm_pool } = this._sdk.sdkOptions
    if (this._sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }
    const allCoinAsset = await this._sdk.getOwnerCoinAssets(this._sdk.senderAddress)
    const tick_lower = asUintN(BigInt(params.tick_lower)).toString()
    const tick_upper = asUintN(BigInt(params.tick_upper)).toString()

    const typeArguments = [params.coinTypeA, params.coinTypeB]

    const tx = new TransactionBlock()

    const needOpenPosition = !isValidSuiObjectId(params.pos_id)

    let positionNft: TransactionArgument[] = []

    if (needOpenPosition) {
      positionNft = tx.moveCall({
        target: `${integrate.published_at}::pool::open_position`,
        typeArguments,
        arguments: [
          tx.object(getPackagerConfigs(clmm_pool).global_config_id),
          tx.object(params.pool_id),
          tx.pure(tick_lower),
          tx.pure(tick_upper),
        ],
      })
    } else {
      this._sdk.Rewarder.collectRewarderTransactionPayload(
        {
          pool_id: params.pool_id,
          pos_id: params.pos_id,
          coinTypeA: params.coinTypeA,
          coinTypeB: params.coinTypeB,
          collect_fee: params.collect_fee,
          rewarder_coin_types: params.rewarder_coin_types,
        },
        tx
      )
    }

    const max_amount_a = BigInt(params.max_amount_a)
    const max_amount_b = BigInt(params.max_amount_b)

    const warpInputs: {
      coinInput: TransactionArgument
      amount: string
    }[] = []

    let funName = ''

    if (max_amount_a > 0) {
      const primaryCoinAInputs: any = TransactionUtil.buildCoinInputForAmount(
        tx,
        allCoinAsset,
        max_amount_a,
        params.coinTypeA
      )?.transactionArgument
      warpInputs.push({
        coinInput: primaryCoinAInputs,
        amount: max_amount_a.toString(),
      })
      funName = 'add_liquidity_only_a'
    }
    if (max_amount_b > 0) {
      const primaryCoinBInputs: any = TransactionUtil.buildCoinInputForAmount(
        tx,
        allCoinAsset,
        max_amount_b,
        params.coinTypeB
      )?.transactionArgument
      warpInputs.push({
        coinInput: primaryCoinBInputs,
        amount: max_amount_b.toString(),
      })
      funName = 'add_liquidity_only_b'
    }

    if (max_amount_a > 0 && max_amount_b > 0) {
      funName = 'add_liquidity_with_all'
    }

    tx.moveCall({
      target: `${integrate.published_at}::${ClmmIntegratePoolModule}::${funName}`,
      typeArguments,
      arguments: [
        tx.object(getPackagerConfigs(clmm_pool).global_config_id),
        tx.object(params.pool_id),
        needOpenPosition ? positionNft[0] : tx.object(params.pos_id),
        ...warpInputs.map((item) => item.coinInput),
        ...warpInputs.map((item) => tx.pure(item.amount)),
        tx.pure(params.delta_liquidity),
        tx.object(CLOCK_ADDRESS),
      ],
    })
    if (needOpenPosition) {
      tx.transferObjects([positionNft[0]], tx.object(this._sdk.senderAddress))
    }
    return tx
  }

  /**
   * Remove liquidity from a position.
   * @param params
   * @param gasBudget
   * @returns
   */
  removeLiquidityTransactionPayload(params: RemoveLiquidityParams): TransactionBlock {
    const { clmm_pool, integrate } = this.sdk.sdkOptions

    const functionName = 'remove_liquidity'

    const tx = new TransactionBlock()

    const typeArguments = [params.coinTypeA, params.coinTypeB]

    this._sdk.Rewarder.collectRewarderTransactionPayload(
      {
        pool_id: params.pool_id,
        pos_id: params.pos_id,
        coinTypeA: params.coinTypeA,
        coinTypeB: params.coinTypeB,
        collect_fee: params.collect_fee,
        rewarder_coin_types: params.rewarder_coin_types,
      },
      tx
    )

    const args = [
      tx.object(getPackagerConfigs(clmm_pool).global_config_id),
      tx.object(params.pool_id),
      tx.object(params.pos_id),
      tx.pure(params.delta_liquidity),
      tx.pure(params.min_amount_a),
      tx.pure(params.min_amount_b),
      tx.object(CLOCK_ADDRESS),
    ]

    tx.moveCall({
      target: `${integrate.published_at}::${ClmmIntegratePoolModule}::${functionName}`,
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
    const { clmm_pool, integrate } = this.sdk.sdkOptions

    const tx = new TransactionBlock()

    const typeArguments = [params.coinTypeA, params.coinTypeB]

    this._sdk.Rewarder.collectRewarderTransactionPayload(
      {
        pool_id: params.pool_id,
        pos_id: params.pos_id,
        coinTypeA: params.coinTypeA,
        coinTypeB: params.coinTypeB,
        collect_fee: params.collect_fee,
        rewarder_coin_types: params.rewarder_coin_types,
      },
      tx
    )

    tx.moveCall({
      target: `${integrate.published_at}::${ClmmIntegratePoolModule}::close_position`,
      typeArguments,
      arguments: [
        tx.object(getPackagerConfigs(clmm_pool).global_config_id),
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
    const { clmm_pool, integrate } = this.sdk.sdkOptions

    const tx = new TransactionBlock()

    const typeArguments = [params.coinTypeA, params.coinTypeB]
    const tick_lower = asUintN(BigInt(params.tick_lower)).toString()
    const tick_upper = asUintN(BigInt(params.tick_upper)).toString()
    const args = [
      tx.pure(getPackagerConfigs(clmm_pool).global_config_id),
      tx.pure(params.pool_id),
      tx.pure(tick_lower),
      tx.pure(tick_upper),
    ]

    tx.moveCall({
      target: `${integrate.published_at}::${ClmmIntegratePoolModule}::open_position`,
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
  collectFeeTransactionPayload(params: CollectFeeParams, tx?: TransactionBlock): TransactionBlock {
    const { clmm_pool, integrate } = this.sdk.sdkOptions

    tx = tx === undefined ? new TransactionBlock() : tx

    const typeArguments = [params.coinTypeA, params.coinTypeB]
    const args = [tx.object(getPackagerConfigs(clmm_pool).global_config_id), tx.object(params.pool_id), tx.object(params.pos_id)]

    tx.moveCall({
      target: `${integrate.published_at}::${ClmmIntegratePoolModule}::collect_fee`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  async calculateFee(params: CollectFeeParams) {
    const paylod = this.collectFeeTransactionPayload(params, new TransactionBlock())

    const res = await this._sdk.fullClient.devInspectTransactionBlock({
      transactionBlock: paylod,
      sender: this._sdk.senderAddress,
    })
    for (const event of res.events) {
      if (extractStructTagFromType(event.type).name === 'CollectFeeEvent') {
        const json = event.parsedJson as any
        return {
          feeOwedA: json.amount_a,
          feeOwedB: json.amount_b,
        }
      }
    }

    return {
      feeOwedA: '0',
      feeOwedB: '0',
    }
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
