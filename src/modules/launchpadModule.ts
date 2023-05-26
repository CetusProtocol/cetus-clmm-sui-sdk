/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable camelcase */
import {
  getMoveObjectType,
  getObjectFields,
  getObjectOwner,
  getObjectPreviousTransactionDigest,
  getObjectType,
  normalizeSuiAddress,
  normalizeSuiObjectId,
  ObjectType,
  SuiObjectResponse,
  TransactionArgument,
  TransactionBlock,
} from '@mysten/sui.js'
import { Position } from '../types'
import { TransactionUtil } from '../utils/transaction-util'
import { CoinAssist, TickMath } from '../math'
import { d, loopToGetAllQueryEvents } from '../utils'
import { LauncpadUtil } from '../utils/launchpad'
import {
  CONST_DENOMINATOR,
  CreateLaunchpadPoolParams,
  LaunchpadInitEvent,
  LaunchpadPoolImmutables,
  LaunchpadRouterModule,
  LaunchpadPool,
  PurchaseParams,
  ClaimParams,
  WithdrawParams,
  LaunchpadInitConfigEvent,
  LockNFTEvent,
  UnlockNftParams,
  SettleParams,
  RemoveWhitelistParams,
  PurchaseMark,
  SettleEvent,
  UpdateWhitelistCapParams,
  AddUserToWhitelistParams,
  UpdateRecipientParams,
  UpdatePoolDurationParams,
  LaunchpadPoolConfig,
  CancelLaunchPadParams,
} from '../types/luanchpa_type'
import { SuiResource, SuiObjectIdType, SuiAddressType, PoolLiquidityCoinType, CLOCK_ADDRESS } from '../types/sui'
import { CachedContent, cacheTime24h, cacheTime5min, getFutureTime } from '../utils/cachedContent'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { composeType, extractStructTagFromType } from '../utils/contracts'
import { buildPosition, getDynamicFields, multiGetObjects } from '../utils/common'

/**
 * Helper class to help interact with launchpad pools with a router interface.
 */
export class LaunchpadModule implements IModule {
  protected _sdk: SDK

  private readonly _cache: Record<string, CachedContent> = {}

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  /**
   * Gets the immutables for all launchpad pools.
   *
   * @param {string[]} assignPools An array of pool addresses to filter the results by.
   * @param {number} offset The offset to start the results at.
   * @param {number} limit The number of results to return.
   * @param {boolean} forceRefresh Whether to force a refresh of the cache.
   * @returns {Promise<LaunchpadPoolImmutables[]>} A promise that resolves to the immutables for all launchpad pools.
   */
  async getPoolImmutables(assignPools: string[] = [], offset = 0, limit = 100, forceRefresh = false): Promise<LaunchpadPoolImmutables[]> {
    const { ido_display } = this._sdk.sdkOptions.launchpad

    if (ido_display === undefined) {
      throw Error('sdk.sdkOptions.launchpad is undefined')
    }

    const cacheKey = `${ido_display}_getInitPoolEvent`
    const cacheData = this.getCache<LaunchpadPoolImmutables[]>(cacheKey, forceRefresh)

    const allPools: LaunchpadPoolImmutables[] = []
    const filterPools: LaunchpadPoolImmutables[] = []

    if (cacheData !== undefined) {
      allPools.push(...cacheData)
    }

    if (allPools.length === 0) {
      try {
        const objects = (
          await loopToGetAllQueryEvents(this._sdk, {
            query: { MoveEventType: `${ido_display}::factory::CreatePoolEvent` },
          })
        )?.data

        objects.forEach((object: any) => {
          const fields = object.parsedJson

          if (fields) {
            allPools.push({
              pool_address: fields.pool_id,
              coin_type_sale: extractStructTagFromType(fields.sale_coin.name).full_address,
              coin_type_raise: extractStructTagFromType(fields.raise_coin.name).full_address,
            })
          }
        })
        this.updateCache(cacheKey, allPools, cacheTime24h)
      } catch (error) {
        console.log('getPoolImmutables', error)
      }
    }

    const hasassignPools = assignPools.length > 0

    for (let index = 0; index < allPools.length; index += 1) {
      const item = allPools[index]

      if (hasassignPools && !assignPools.includes(item.pool_address)) {
        continue
      }
      if (!hasassignPools) {
        const itemIndex = index
        if (itemIndex < offset || itemIndex >= offset + limit) {
          continue
        }
      }
      filterPools.push(item)
    }
    return filterPools
  }

  /**
   * Gets all launchpad pools.
   *
   * @param {string[]} assignPools An array of pool addresses to filter the results by.
   * @param {number} offset The offset to start the results at.
   * @param {number} limit The number of results to return.
   * @returns {Promise<LaunchpadPool[]>} A promise that resolves to an array of launchpad pools.
   */
  async getPools(assignPools: string[] = [], offset = 0, limit = 100): Promise<LaunchpadPool[]> {
    const allPool: LaunchpadPool[] = []
    let poolObjectIds: string[] = []

    if (assignPools.length > 0) {
      poolObjectIds = [...assignPools]
    } else {
      const poolImmutables = await this.getPoolImmutables([], offset, limit, false)
      poolImmutables.forEach((item) => {
        poolObjectIds.push(item.pool_address)
      })
    }
    const objectDataResponses = await multiGetObjects(this.sdk, poolObjectIds, { showType: true, showContent: true })
    // eslint-disable-next-line no-restricted-syntax
    for (const suiObj of objectDataResponses) {
      const pool = LauncpadUtil.buildLaunchPadPool(suiObj)
      // eslint-disable-next-line no-await-in-loop
      await LauncpadUtil.calculatePoolPrice(this._sdk, pool)
      allPool.push(pool)
      const cacheKey = `${pool.pool_address}_getPoolObject`
      this.updateCache(cacheKey, pool, cacheTime24h)
    }
    return allPool
  }

  /**
   * Gets a launchpad pool.
   *
   * @param {string} poolObjectId The ID of the launchpad pool.
   * @param {boolean} forceRefresh Whether to force a refresh of the cache.
   * @returns {Promise<LaunchpadPool>} A promise that resolves to the launchpad pool.
   */
  async getPool(poolObjectId: string, forceRefresh = true): Promise<LaunchpadPool> {
    const cacheKey = `${poolObjectId}_getPoolObject`
    const cacheData = this.getCache<LaunchpadPool>(cacheKey, forceRefresh)

    if (cacheData !== undefined) {
      const pool = cacheData
      LauncpadUtil.updatePoolStatus(pool)
      return pool
    }
    const objects = (await this._sdk.fullClient.getObject({
      id: poolObjectId,
      options: { showContent: true, showType: true },
    })) as SuiObjectResponse
    const pool = LauncpadUtil.buildLaunchPadPool(objects)
    await LauncpadUtil.calculatePoolPrice(this._sdk, pool)
    this.updateCache(cacheKey, pool)
    return pool
  }

  /**
   * Gets the init factory event for the launchpad.
   *
   * @param {boolean} forceRefresh Whether to force a refresh of the cache.
   * @returns {Promise<LaunchpadInitEvent>} A promise that resolves to the init factory event.
   */
  async getInitFactoryEvent(forceRefresh = false): Promise<LaunchpadInitEvent> {
    const packageObjectId = this._sdk.sdkOptions.launchpad.ido_display
    const cacheKey = `${packageObjectId}_getInitEvent`
    const cacheData = this.getCache<LaunchpadInitEvent>(cacheKey, forceRefresh)

    if (cacheData !== undefined) {
      return cacheData
    }

    const packageObject = await this._sdk.fullClient.getObject({ id: packageObjectId, options: { showPreviousTransaction: true } })

    const previousTx = getObjectPreviousTransactionDigest(packageObject) as string

    const objects = (await loopToGetAllQueryEvents(this._sdk, { query: { Transaction: previousTx } }))?.data
    const initEvent: LaunchpadInitEvent = {
      pools_id: '',
      admin_cap_id: '',
      config_cap_id: '',
    }

    if (objects.length > 0) {
      objects.forEach((item: any) => {
        const fields = item.parsedJson
        if (fields) {
          switch (extractStructTagFromType(item.type).full_address) {
            case `${packageObjectId}::config::InitConfigEvent`:
              initEvent.admin_cap_id = fields.admin_cap_id
              initEvent.config_cap_id = fields.config_cap_id
              break
            case `${packageObjectId}::factory::InitFactoryEvent`:
              initEvent.pools_id = fields.pools_id
              break
            default:
              break
          }
        }
      })
      this.updateCache(cacheKey, initEvent, cacheTime24h)
    }

    return initEvent
  }

  /**
   * Gets the init config event for the launchpad.
   *
   * @returns {Promise<LaunchpadInitConfigEvent>} A promise that resolves to the init config event.
   */
  async getInitConfigEvent(): Promise<LaunchpadInitConfigEvent> {
    const { config_display } = this._sdk.sdkOptions.launchpad
    const cacheKey = `${config_display}_getInitConfigEvent`
    const cacheData = this.getCache<LaunchpadInitConfigEvent>(cacheKey)

    if (cacheData !== undefined) {
      return cacheData
    }

    const configEvent: LaunchpadInitConfigEvent = {
      config_pools_id: '',
    }

    try {
      const objects = (await this._sdk.fullClient.queryEvents({ query: { MoveEventType: `${config_display}::config::InitEvent` } })).data

      for (const object of objects) {
        const fields = object.parsedJson
        if (fields) {
          // eslint-disable-next-line no-await-in-loop
          configEvent.config_pools_id = await this.getPoolConfigId(fields.conf_id)
        }
      }
      this.updateCache(cacheKey, configEvent, cacheTime24h)
    } catch (error) {
      console.log('getInitConfigEvent', error)
    }

    return configEvent
  }

  /**
   * Gets the config ID for the given pool ID.
   *
   * @param {SuiObjectIdType} conf_id The ID of the pool.
   * @returns {Promise<string>} A promise that resolves to the config ID.
   */
  private async getPoolConfigId(conf_id: SuiObjectIdType): Promise<string> {
    const object = await this._sdk.fullClient.getObject({ id: conf_id, options: { showContent: true } })

    const fields = getObjectFields(object)
    if (fields) {
      return fields.pools.fields.id.id
    }

    return ''
  }

  /**
   * Gets the pool configurations
   *
   * @param {boolean} forceRefresh Whether to force a refresh of the cache.
   * @returns {Promise<LaunchpadPoolConfig[]>} A promise that resolves to an array of pool configurations.
   */
  async getPoolConfigs(forceRefresh = false): Promise<LaunchpadPoolConfig[]> {
    const { config_pools_id } = this._sdk.sdkOptions.launchpad.config
    const cacheKey = `${config_pools_id}_getPoolConfigs`
    const cacheData = this.getCache<LaunchpadPoolConfig[]>(cacheKey, forceRefresh)

    if (cacheData !== undefined) {
      return cacheData
    }

    const mList: LaunchpadPoolConfig[] = []

    const objects = await getDynamicFields(this._sdk, config_pools_id)
    const warpIds = objects.data.map((item: any) => {
      return item.objectId
    })

    const multiObjects = await multiGetObjects(this._sdk, warpIds, { showContent: true })

    multiObjects.forEach((item) => {
      const poolConfig = LauncpadUtil.buildLaunchPadPoolConfig(item)
      this.updateCache(`${poolConfig.pool_address}_getPoolConfig`, poolConfig, cacheTime24h)
      mList.push(poolConfig)
    })
    this.updateCache(cacheKey, mList, cacheTime24h)
    return mList
  }

  /**
   * Gets the pool configuration for the given pool address.
   *
   * @param {string} pool_address The address of the pool.
   * @param {boolean} forceRefresh Whether to force a refresh of the cache.
   * @returns {Promise<LaunchpadPoolConfig>} A promise that resolves to the pool configuration.
   */
  async getPoolConfig(pool_address: string, forceRefresh = false): Promise<LaunchpadPoolConfig> {
    const cacheKey = `${pool_address}_getPoolConfig`
    const cacheData = this.getCache<LaunchpadPoolConfig>(cacheKey, forceRefresh)

    if (cacheData !== undefined) {
      return cacheData
    }
    const { config_pools_id } = this._sdk.sdkOptions.launchpad.config
    const object = await this.sdk.fullClient.getDynamicFieldObject({
      parentId: config_pools_id,
      name: {
        type: 'address',
        value: pool_address,
      },
    })

    const poolConfig = LauncpadUtil.buildLaunchPadPoolConfig(object)
    this.updateCache(cacheKey, poolConfig, cacheTime24h)
    return poolConfig
  }

  /**
   * Gets the lock NFT for the given NFT ID.
   *
   * @param {SuiObjectIdType} nft_id The ID of the NFT.
   * @param {boolean} forceRefresh Whether to force a refresh of the cache.
   * @returns {Promise<Position | undefined>} A promise that resolves to the lock NFT or undefined if the NFT is not found.
   */
  async getLockNFT(nft_id: SuiObjectIdType, forceRefresh = false): Promise<Position | undefined> {
    const cacheKey = `${nft_id}_getLockNFT`
    const cacheData = this.getCache<Position>(cacheKey, forceRefresh)

    if (cacheData !== undefined) {
      return cacheData
    }
    const objects = await this._sdk.fullClient.getObject({
      id: nft_id,
      options: {
        showType: true,
        showContent: true,
        showDisplay: true,
        showOwner: true,
      },
    })
    if (objects.error) {
      return undefined
    }

    return buildPosition(objects)
  }

  /**
   * Gets a list of lock NFTs for the given pool type and recipient.
   *
   * @param {SuiAddressType} poolType The type of the pool.
   * @param {SuiObjectIdType} recipient The recipient of the lock NFTs.
   * @returns {Promise<Position[]>} A promise that resolves to an array of lock NFTs.
   */
  async getLockNFTList(poolType: SuiAddressType, recipient: SuiObjectIdType): Promise<Position[]> {
    const { sdkOptions } = this._sdk

    const result: any = []
    const poolTypeWarp = extractStructTagFromType(poolType)

    try {
      const objects = (
        await loopToGetAllQueryEvents(this._sdk, { query: { MoveEventType: `${sdkOptions.launchpad.ido_display}::lock::LockNFTEvent` } })
      )?.data

      for (const object of objects) {
        const fields = object.parsedJson
        if (fields) {
          const lockNFTEvent: LockNFTEvent = {
            locked_time: Number(fields.locked_time),
            end_lock_time: Number(fields.end_lock_time),
            nft_type: fields.nft_type_name.name,
            lock_nft_id: fields.lock_nft_id,
            recipient: fields.recipient,
          }
          if (
            recipient === lockNFTEvent.recipient &&
            `${sdkOptions.clmm.clmm_display}` === extractStructTagFromType(lockNFTEvent.nft_type).address
          ) {
            // eslint-disable-next-line no-await-in-loop
            const lockNftInfo = await this.getLockNFT(lockNFTEvent.lock_nft_id)
            if (lockNftInfo) {
              const nftTypeA = extractStructTagFromType(lockNftInfo.coin_type_a).full_address
              const nftTypeB = extractStructTagFromType(lockNftInfo.coin_type_b).full_address
              if (
                (poolTypeWarp.type_arguments[0] === nftTypeA && poolTypeWarp.type_arguments[1] === nftTypeB) ||
                (poolTypeWarp.type_arguments[0] === nftTypeB && poolTypeWarp.type_arguments[1] === nftTypeA)
              ) {
                result.push({
                  ...lockNftInfo,
                  coin_type_a: nftTypeA,
                  coin_type_b: nftTypeB,
                  ...lockNFTEvent,
                })
              }
            }
          }
        }
      }

      return result
    } catch (error) {
      console.log('getLockNFTList:', error)
      return []
    }
  }

  /**
   * Creates a transaction payload for creating a launchpad pool.
   *
   * @param {CreateLaunchpadPoolParams} params The parameters for creating the pool.
   * @returns {Promise<TransactionBlock>} A promise that resolves to the transaction payload.
   */
  async creatPoolTransactionPayload(params: CreateLaunchpadPoolParams): Promise<TransactionBlock> {
    const { launchpad } = this.sdk.sdkOptions
    const launchpadEvent = launchpad.config

    this.assertLuanchpadConfig()

    if (this._sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    const fixPrice = LauncpadUtil.priceRealToFix(Number(params.initialize_price), params.sale_decimals, params.raise_decimals)

    const tx = new TransactionBlock()

    const min_sale_amount = d(params.sale_total)
      .add(d(params.sale_total).mul(d(params.liquidity_rate)))
      .toNumber()

    const primaryCoinInputs = (await TransactionUtil.syncBuildCoinInputForAmount(
      this._sdk,
      tx,
      BigInt(min_sale_amount),
      params.coin_type_sale
    )) as TransactionArgument

    const args = [
      tx.pure(launchpadEvent!.admin_cap_id),
      tx.pure(launchpadEvent!.config_cap_id),
      tx.pure(launchpadEvent!.pools_id),
      tx.pure(normalizeSuiAddress(params.recipient)),
      tx.pure((fixPrice * CONST_DENOMINATOR).toString()),
      primaryCoinInputs,
      tx.pure(params.sale_total.toString()),
      tx.pure(params.min_purchase.toString()),
      tx.pure(params.max_purchase.toString()),
      tx.pure(params.least_raise_amount.toString()),
      tx.pure(params.hardcap.toString()),
      tx.pure((params.liquidity_rate * 1000).toString()),
      tx.pure(params.start_time.toString()),
      tx.pure(params.activity_duration.toString()),
      tx.pure(params.settle_duration.toString()),
      tx.pure(params.locked_duration.toString()),
      tx.pure(params.tick_spacing.toString()),
      tx.pure(CLOCK_ADDRESS),
    ]

    const typeArguments = [params.coin_type_sale, params.coin_type_raise]

    tx.moveCall({
      target: `${launchpad.ido_router}::${LaunchpadRouterModule}::create_launch_pool`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  /**
   * Creates a transaction payload for purchasing tokens from a launchpad pool.
   *
   * @param {PurchaseParams} params The parameters for the purchase.
   * @returns {Promise<TransactionBlock>} A promise that resolves to the transaction payload.
   */
  async creatPurchasePayload(params: PurchaseParams): Promise<Promise<TransactionBlock>> {
    const { launchpad } = this.sdk.sdkOptions

    if (this._sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    const tx = new TransactionBlock()

    const primaryCoinInputs = (await TransactionUtil.syncBuildCoinInputForAmount(
      this._sdk,
      tx,
      BigInt(params.purchase_amount),
      params.coin_type_raise
    )) as TransactionArgument

    const purchaseMark = (await this.getPurchaseMarks(this._sdk.senderAddress, [params.pool_address], false))[0]

    const typeArguments = [params.coin_type_sale, params.coin_type_raise]
    let args
    if (purchaseMark) {
      args = [
        tx.pure(params.pool_address),
        tx.pure(launchpad.config.config_cap_id),
        tx.pure(purchaseMark.id),
        primaryCoinInputs,
        tx.pure(params.purchase_amount.toString()),
        tx.pure(CLOCK_ADDRESS),
      ]
    } else {
      args = [
        tx.pure(params.pool_address),
        tx.pure(launchpad.config.config_cap_id),
        primaryCoinInputs,
        tx.pure(params.purchase_amount.toString()),
        tx.pure(CLOCK_ADDRESS),
      ]
    }

    tx.moveCall({
      target: `${launchpad.ido_router}::${LaunchpadRouterModule}::${purchaseMark === undefined ? 'create_and_purchase' : 'purchase'}`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  /**
   * Creates a transaction payload for claiming tokens from a launchpad pool.
   *
   * @param {ClaimParams} params The parameters for the claim.
   * @returns {Promise<TransactionBlock>} A promise that resolves to the transaction payload.
   */
  async creatClaimPayload(params: ClaimParams): Promise<TransactionBlock> {
    const { launchpad } = this.sdk.sdkOptions

    if (this._sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    const purchaseMark = (await this.getPurchaseMarks(this._sdk.senderAddress, [params.pool_address], false))[0]
    const tx = new TransactionBlock()

    const typeArguments = [params.coin_type_sale, params.coin_type_raise]
    const args = [tx.pure(params.pool_address), tx.pure(launchpad.config.config_cap_id), tx.pure(purchaseMark?.id), tx.pure(CLOCK_ADDRESS)]

    tx.moveCall({
      target: `${launchpad.ido_router}::${LaunchpadRouterModule}::claim`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  /**
   * Creates a transaction payload for settling tokens from a launchpad pool.
   *
   * @param {SettleParams} params The parameters for the settlement.
   * @returns {Promise<TransactionBlock>} A promise that resolves to the transaction payload.
   */
  async creatSettlePayload(params: SettleParams): Promise<TransactionBlock> {
    const { launchpad, clmm } = this.sdk.sdkOptions

    if (this._sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    this.assertLuanchpadConfig()

    const clmmEvent = clmm.config

    const { clmm_args } = params

    const tx = new TransactionBlock()
    tx.setSender(this.sdk.senderAddress)
    const typeArguments = [params.coin_type_sale, params.coin_type_raise]
    if (clmm_args) {
      const initialize_sqrt_price = clmm_args.opposite
        ? TickMath.priceToSqrtPriceX64(
            d(1).div(clmm_args.current_price), // 0.01
            clmm_args.raise_decimals,
            clmm_args.sale_decimals
          ).toString()
        : TickMath.priceToSqrtPriceX64(
            d(clmm_args.current_price), // 0.01
            clmm_args.sale_decimals,
            clmm_args.raise_decimals
          ).toString()

      const a2b = BigInt(initialize_sqrt_price) < BigInt(clmm_args.clmm_sqrt_price)

      // eslint-disable-next-line no-nested-ternary
      const needCoinType = clmm_args.opposite
        ? a2b
          ? params.coin_type_raise
          : params.coin_type_sale
        : a2b
        ? params.coin_type_sale
        : params.coin_type_raise

      const coinAssets = await this._sdk.getOwnerCoinAssets(this._sdk.senderAddress, needCoinType)

      let needAmount = CoinAssist.calculateTotalBalance(coinAssets)
      if (CoinAssist.isSuiCoin(needCoinType)) {
        needAmount -= BigInt(200000000)
      }

      const primaryCoinInputsR: any = TransactionUtil.buildCoinInputForAmount(tx, coinAssets, needAmount, needCoinType)?.transactionArgument
      const primaryCoinInputs = primaryCoinInputsR as TransactionArgument

      // eslint-disable-next-line no-nested-ternary
      const funName = clmm_args.opposite
        ? a2b
          ? 'settle_with_reverse_clmm_only_with_a'
          : 'settle_with_reverse_clmm_only_with_b'
        : a2b
        ? 'settle_only_with_a'
        : 'settle_only_with_b'

      const args = [
        tx.pure(params.pool_address),
        tx.pure(launchpad.config.config_cap_id),
        tx.pure(clmm_args.clmm_pool_address),
        tx.pure(clmmEvent.global_config_id),
        tx.pure(initialize_sqrt_price),
        primaryCoinInputs,
        tx.pure(CLOCK_ADDRESS),
      ]

      tx.moveCall({
        target: `${launchpad.ido_router}::${LaunchpadRouterModule}::${funName}`,
        typeArguments,
        arguments: args,
      })
    } else {
      tx.moveCall({
        target: `${launchpad.ido_router}::${LaunchpadRouterModule}::settle`,
        typeArguments,
        arguments: [tx.pure(params.pool_address), tx.pure(launchpad.config.config_cap_id), tx.pure(CLOCK_ADDRESS)],
      })
    }

    return tx
  }

  /**
   * Creates a transaction payload for withdrawing tokens from a launchpad pool.
   *
   * @param {WithdrawParams} params The parameters for the withdrawal.
   * @returns {TransactionBlock} The transaction payload.
   */
  creatWithdrawPayload(params: WithdrawParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    const tx = new TransactionBlock()

    const typeArguments = [params.coin_type_sale, params.coin_type_raise]
    const args = [tx.object(params.pool_address), tx.object(launchpad.config.config_cap_id), tx.object(CLOCK_ADDRESS)]

    if (params.sale_amount > BigInt(0)) {
      tx.moveCall({
        target: `${launchpad.ido_router}::${LaunchpadRouterModule}::withdraw_sale`,
        typeArguments,
        arguments: args,
      })
    }
    if (params.raise_amount > BigInt(0)) {
      tx.moveCall({
        target: `${launchpad.ido_router}::${LaunchpadRouterModule}::withdraw_raise`,
        typeArguments,
        arguments: args,
      })
    }

    return tx
  }

  /**
   * Creates a transaction payload for adding a user to the whitelist.
   *
   * @param {AddUserToWhitelistParams} params The parameters for the addition.
   * @returns {TransactionBlock} The transaction payload.
   */
  addUserToWhitelisPayload(params: AddUserToWhitelistParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    this.assertLuanchpadConfig()

    const tx = new TransactionBlock()
    const typeArguments = [params.coin_type_sale, params.coin_type_raise]

    params.user_addrs.forEach((user_addr) => {
      const args = [
        tx.object(launchpad.config!.admin_cap_id),
        tx.object(launchpad.config!.config_cap_id),
        tx.object(params.pool_address),
        tx.object(user_addr),
        tx.pure(params.safe_limit_amount),
        tx.object(CLOCK_ADDRESS),
      ]

      tx.moveCall({
        target: `${launchpad.ido_router}::${LaunchpadRouterModule}::add_user_to_whitelist`,
        typeArguments,
        arguments: args,
      })
    })

    return tx
  }

  /**
   * Creates a transaction payload for updating the whitelist cap.
   *
   * @param {UpdateWhitelistCapParams} params The parameters for the update.
   * @returns {TransactionBlock} The transaction payload.
   */
  updateWhitelistCapPayload(params: UpdateWhitelistCapParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    this.assertLuanchpadConfig()

    const tx = new TransactionBlock()
    const typeArguments = [params.coin_type_sale, params.coin_type_raise]
    if (params.safe_limit_amount > 0) {
      tx.moveCall({
        target: `${launchpad.ido_router}::${LaunchpadRouterModule}::update_whitelist_member_safe_limit_amount`,
        typeArguments,
        arguments: [
          tx.object(launchpad.config!.admin_cap_id),
          tx.object(launchpad.config!.config_cap_id),
          tx.object(params.pool_address),
          tx.pure(params.white_list_member),
          tx.pure(params.safe_limit_amount),
          tx.object(CLOCK_ADDRESS),
        ],
      })
    }

    if (params.hard_cap_total > 0) {
      tx.moveCall({
        target: `${launchpad.ido_router}::${LaunchpadRouterModule}::update_whitelist_hard_cap_total`,
        typeArguments,
        arguments: [
          tx.object(launchpad.config!.admin_cap_id),
          tx.object(launchpad.config!.config_cap_id),
          tx.object(params.pool_address),
          tx.pure(params.hard_cap_total),
          tx.object(CLOCK_ADDRESS),
        ],
      })
    }

    return tx
  }

  /**
   * Creates a transaction payload for removing a user from the whitelist.
   *
   * @param {RemoveWhitelistParams} params The parameters for the removal.
   * @returns {TransactionBlock} The transaction payload.
   */
  creatRemoveWhitelistPayload(params: RemoveWhitelistParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    this.assertLuanchpadConfig()

    const tx = new TransactionBlock()

    const typeArguments = [params.coin_type_sale, params.coin_type_raise]

    params.user_addrs.forEach((user_addr) => {
      const args = [
        tx.pure(launchpad.config!.admin_cap_id),
        tx.pure(launchpad.config!.config_cap_id),
        tx.pure(params.pool_address),
        tx.pure(user_addr),
        tx.pure(CLOCK_ADDRESS),
      ]

      tx.moveCall({
        target: `${launchpad.ido_router}::${LaunchpadRouterModule}::remove_user_from_whitelist`,
        typeArguments,
        arguments: args,
      })
    })

    return tx
  }

  /**
   * Creates a transaction payload for canceling a pool.
   *
   * @param {CancelLaunchPadParams} params The parameters for the cancellation.
   * @returns {TransactionBlock} The transaction payload.
   */
  creatCancelPoolPayload(params: CancelLaunchPadParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    this.assertLuanchpadConfig()

    const tx = new TransactionBlock()

    const typeArguments = [params.coin_type_sale, params.coin_type_raise]
    const args = [
      tx.pure(launchpad.config!.admin_cap_id),
      tx.pure(launchpad.config!.config_cap_id),
      tx.pure(params.pool_address),
      tx.pure(CLOCK_ADDRESS),
    ]

    tx.moveCall({
      target: `${launchpad.ido_router}::${LaunchpadRouterModule}::cancel`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  /**
   * Creates a transaction payload for updating the recipient address.
   *
   * @param {UpdateRecipientParams} params The parameters for the update.
   * @returns {TransactionBlock} The transaction payload.
   */
  updateRecipientPayload(params: UpdateRecipientParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    this.assertLuanchpadConfig()

    const tx = new TransactionBlock()

    const typeArguments = [params.coin_type_sale, params.coin_type_raise]
    const args = [
      tx.pure(launchpad.config!.admin_cap_id),
      tx.pure(launchpad.config!.config_cap_id),
      tx.pure(params.pool_address),
      tx.pure(params.new_recipient),
      tx.pure(CLOCK_ADDRESS),
    ]

    tx.moveCall({
      target: `${launchpad.ido_router}::${LaunchpadRouterModule}::update_recipient_address`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  /**
   * Creates a transaction payload for updating the pool duration.
   *
   * @param {UpdatePoolDurationParams} params The parameters for the update.
   * @returns {TransactionBlock} The transaction payload.
   */
  updatePoolDuractionPayload(params: UpdatePoolDurationParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    this.assertLuanchpadConfig()

    const tx = new TransactionBlock()

    const typeArguments = [params.coin_type_sale, params.coin_type_raise]
    const args = [
      tx.pure(launchpad.config!.admin_cap_id),
      tx.pure(launchpad.config!.config_cap_id),
      tx.pure(params.pool_address),
      tx.pure(params.activity_duration),
      tx.pure(params.settle_duration),
      tx.pure(params.lock_duration),
      tx.pure(CLOCK_ADDRESS),
    ]

    tx.moveCall({
      target: `${launchpad.ido_router}::${LaunchpadRouterModule}::update_pool_duration`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  /**
   * Creates a transaction payload for unlocking an NFT.
   *
   * @param {UnlockNftParams} params The parameters for the unlock.
   * @returns {TransactionBlock} The transaction payload.
   */
  creatUnlockNftPayload(params: UnlockNftParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    if (launchpad.config === undefined) {
      throw Error('launchpad.config  is null')
    }

    const tx = new TransactionBlock()

    const typeArguments = [params.nft_type]
    // const args = [tx.pure(launchpad.config.lock_manager_id), tx.pure(params.lock_nft), tx.pure(CLOCK_ADDRESS)]
    const args = [tx.pure(params.lock_nft), tx.pure(CLOCK_ADDRESS)]

    tx.moveCall({
      target: `${launchpad.ido_router}::lock::unlock_nft`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  /**
   * Determines if the given wallet address is the admin cap for the launchpad.
   *
   * @param {SuiObjectIdType} walletAddress The wallet address to check.
   * @returns {Promise<boolean>} A promise that resolves to true if the wallet address is the admin cap, or false otherwise.
   */
  async isAdminCap(walletAddress: SuiObjectIdType): Promise<boolean> {
    const { launchpad } = this._sdk.sdkOptions
    if (launchpad.config === undefined) {
      throw Error('launchpad config is empty')
    }
    const cacheKey = `${walletAddress}_isAdminCap`
    const cacheData = this.getCache<boolean>(cacheKey)
    if (cacheData) {
      return cacheData
    }
    const object = await this._sdk.fullClient.getObject({
      id: launchpad.config.admin_cap_id,
      options: { showType: true, showOwner: true },
    })
    console.log(object)

    const type = getObjectType(object)
    const owner = getObjectOwner(object)

    let isAdminCap = false

    if (owner && type && extractStructTagFromType(type).source_address === `${launchpad.ido_display}::config::AdminCap`) {
      const addressOwner = owner as { AddressOwner: string }
      isAdminCap = normalizeSuiAddress(addressOwner.AddressOwner) === normalizeSuiAddress(walletAddress)
    }
    this.updateCache(cacheKey, isAdminCap, cacheTime24h)
    return isAdminCap
  }

  /**
   * Determines if the given wallet address is whitelisted.
   *
   * @param {SuiObjectIdType} whitetHandle The handle of the whitelist object.
   * @param {SuiObjectIdType} walletAddress The wallet address to check.
   * @returns {Promise<boolean>} A promise that resolves to true if the wallet address is whitelisted, or false otherwise.
   */
  async isWhiteListUser(whitetHandle: SuiObjectIdType, walletAddress: SuiObjectIdType): Promise<boolean> {
    const name = {
      type: 'address',
      value: walletAddress,
    }
    try {
      const res = await this._sdk.fullClient.getDynamicFieldObject({ parentId: whitetHandle, name })
      if (res && res.data) {
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  /**
   * Gets the purchase amount for the given wallet address.
   *
   * @param {SuiObjectIdType} purchaseHandle The handle of the purchase object.
   * @param {SuiObjectIdType} walletAddress The wallet address to get the purchase amount for.
   * @returns {Promise<{ safe_limit_amount: string; safe_purchased_amount: string }>} A promise that resolves to an object with the purchase amount fields.
   */
  async getPurchaseAmount(
    purchaseHandle: SuiObjectIdType,
    walletAddress: SuiObjectIdType
  ): Promise<{ safe_limit_amount: string; safe_purchased_amount: string }> {
    const name = {
      type: 'address',
      value: walletAddress,
    }
    try {
      const result = await this._sdk.fullClient.getDynamicFieldObject({ parentId: purchaseHandle, name })
      const fields = getObjectFields(result)
      console.log(fields)

      if (fields) {
        return fields?.value?.fields
      }
    } catch (error) {
      //
    }
    return { safe_limit_amount: '0', safe_purchased_amount: '0' }
  }

  /**
   * Gets the purchase marks for the given account address.
   *
   * @param {string} accountAddress The wallet address to get the purchase marks for.
   * @param {SuiObjectIdType[]} poolAddressArray An array of pool addresses to filter the purchase marks by.
   * @param {boolean} forceRefresh Whether to force a refresh of the cache.
   * @returns {Promise<PurchaseMark[]>} A promise that resolves to an array of purchase marks.
   */
  async getPurchaseMarks(accountAddress: string, poolAddressArray: SuiObjectIdType[] = [], forceRefresh = true): Promise<PurchaseMark[]> {
    const { launchpad } = this._sdk.sdkOptions

    const cacheKey = `${poolAddressArray}_getPurchaseMark`
    const cacheData = this.getCache<PurchaseMark[]>(cacheKey, forceRefresh)

    if (!forceRefresh && cacheData !== undefined) {
      return cacheData
    }
    let cursor = null
    const purchaseMarks: PurchaseMark[] = []
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const ownerRes: any = await this._sdk.fullClient.getOwnedObjects({
        owner: accountAddress,
        options: { showType: true, showContent: true, showDisplay: true },
        cursor,
        // filter: { StructType: `${launchpad.ido_display}::pool::PurchaseMark` },
      })

      for (const item of ownerRes.data) {
        const { fields } = (item as any).data.content
        const type = extractStructTagFromType(getMoveObjectType(item) as ObjectType).source_address

        if (type === `${launchpad.ido_display}::pool::PurchaseMark`) {
          console.log('fields: ', fields)

          const purchaseMark: PurchaseMark = {
            id: fields.id.id,
            pool_id: extractStructTagFromType(fields.pool_id).address,
            purchase_total: fields.purchase_total,
            obtain_sale_amount: fields.obtain_sale_amount,
            used_raise_amount: fields.used_raise_amount,
          }
          if (poolAddressArray.length > 0) {
            if (poolAddressArray.includes(purchaseMark.pool_id)) {
              purchaseMarks.push(purchaseMark)
            }
          } else {
            purchaseMarks.push(purchaseMark)
          }
        }
      }

      if (ownerRes.hasNextPage) {
        cursor = ownerRes.nextCursor
      } else {
        break
      }
    }
    this.updateCache(cacheKey, purchaseMarks, cacheTime24h)
    return purchaseMarks
  }

  /**
   * Gets the settle event for the given pool address.
   *
   * @param {SuiObjectIdType} poolAddress The pool address to get the settle event for.
   * @returns {Promise<SettleEvent | undefined>} A promise that resolves to the settle event or undefined if the event does not exist.
   */
  async getSettleEvent(poolAddress: SuiObjectIdType): Promise<SettleEvent | undefined> {
    const { launchpad } = this._sdk.sdkOptions

    const cacheKey = `${poolAddress}_getPurchaseMark`
    const cacheData = this.getCache<SettleEvent>(cacheKey)

    if (cacheData !== undefined) {
      return cacheData
    }

    const ownerRes = await loopToGetAllQueryEvents(this._sdk, { query: { MoveEventType: `${launchpad.ido_display}::pool::SettleEvent` } })

    for (const item of ownerRes.data) {
      const parsedJson = item.parsedJson as any
      if (poolAddress === normalizeSuiObjectId(parsedJson.pool_id)) {
        const settleEvent: SettleEvent = {
          pool_id: parsedJson.pool_id,
          settle_price: parsedJson.settle_price,
          unused_sale: parsedJson.unused_sale,
          unused_raise: parsedJson.unused_raise,
          white_purchase_total: parsedJson.white_purchase_total,
        }
        this.updateCache(cacheKey, settleEvent, cacheTime24h)
        return settleEvent
      }
    }

    return undefined
  }

  /**
   * Builds a launchpad coin type from the given sale coin type and raise coin type.
   *
   * @param {SuiAddressType} coinTypeSale The sale coin type.
   * @param {SuiAddressType} coinTypeRaise The raise coin type.
   * @returns {string} The launchpad coin type.
   */
  buildLaunchpadCoinType(coin_type_sale: SuiAddressType, coin_type_raise: SuiAddressType): string {
    return composeType(this._sdk.sdkOptions.launchpad.ido_display, 'pool', PoolLiquidityCoinType, [coin_type_sale, coin_type_raise])
  }

  private assertLuanchpadConfig() {
    const { launchpad } = this.sdk.sdkOptions

    if (launchpad.config === undefined) {
      throw Error('sdk launchpad.config is null')
    }
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
