/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable camelcase */
import {
  bcs,
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
import { fromHEX } from '@mysten/bcs'
import { TransactionUtil } from '../utils/transaction-util'
import { CoinAssist, TickMath } from '../math'
import { d, hexToNumber, hexToString } from '../utils'
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
  LaunchpadInitLockEvent,
  LockNFTEvent,
  UnlockNftParams,
  SettleParams,
  CancelParams,
  ResertRecipientParams,
  ResertResetStartParams,
  ResertPoolDurationParams,
  RemoveWhitelistParams,
  ConfigWhitelistParams,
  PurchaseMark,
  SettleEvent,
} from '../types/luanchpa_type'
import { SuiResource, SuiObjectIdType, SuiAddressType, PoolLiquidityCoinType, CLOCK_ADDRESS } from '../types/sui'
import { CachedContent } from '../utils/cachedContent'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { composeType, extractStructTagFromType, isSortedSymbols } from '../utils/contracts'
import { CoinAsset, Position } from './resourcesModule'
import { buildPosition } from '../utils/common'

export const cacheTime5min = 5 * 60 * 1000
export const cacheTime24h = 24 * 60 * 60 * 1000
export const intervalFaucetTime = 12 * 60 * 60 * 1000

function getFutureTime(interval: number) {
  return Date.parse(new Date().toString()) + interval
}

export class LaunchpadModule implements IModule {
  protected _sdk: SDK

  private readonly _cache: Record<string, CachedContent> = {}

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  async getPoolImmutables(assignPools: string[] = [], offset = 0, limit = 100, forceRefresh = false): Promise<LaunchpadPoolImmutables[]> {
    const { ido_display } = this._sdk.sdkOptions.launchpad

    if (ido_display === undefined) {
      throw Error('sdk.sdkOptions.launchpad is undefined')
    }

    const cacheKey = `${ido_display}_getInitPoolEvent`
    const cacheData = this._cache[cacheKey]

    const allPools: LaunchpadPoolImmutables[] = []
    const filterPools: LaunchpadPoolImmutables[] = []

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      allPools.push(...(cacheData.value as LaunchpadPoolImmutables[]))
    }

    if (allPools.length === 0) {
      try {
        const objects = (
          await this._sdk.fullClient.queryEvents({
            query: { MoveEventType: `${ido_display}::factory::CreatePoolEvent` },
          })
        ).data
        objects.forEach((object) => {
          const fields = object.parsedJson

          if (fields) {
            allPools.push({
              pool_address: fields.pool_id,
              coin_type_sale: extractStructTagFromType(fields.sale_coin).full_address,
              coin_type_raise: extractStructTagFromType(fields.raise_coin).full_address,
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
    const objectDataResponses = await this.sdk.fullClient.multiGetObjects({
      ids: poolObjectIds,
      options: { showType: true, showContent: true },
    })
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

  async getPool(poolObjectId: string, forceRefresh = true): Promise<LaunchpadPool> {
    const cacheKey = `${poolObjectId}_getPoolObject`
    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      const pool = cacheData.value as LaunchpadPool
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

  async getInitFactoryEvent(forceRefresh = false): Promise<LaunchpadInitEvent> {
    const packageObjectId = this._sdk.sdkOptions.launchpad.ido_display
    const cacheKey = `${packageObjectId}_getInitEvent`
    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      return cacheData.value as LaunchpadInitEvent
    }

    const packageObject = await this._sdk.fullClient.getObject({ id: packageObjectId, options: { showPreviousTransaction: true } })

    const previousTx = getObjectPreviousTransactionDigest(packageObject) as string

    const objects = (await this._sdk.fullClient.queryEvents({ query: { Transaction: previousTx } })).data
    const initEvent: LaunchpadInitEvent = {
      pools_id: '',
      admin_cap_id: '',
      config_cap_id: '',
    }

    if (objects.length > 0) {
      objects.forEach((item) => {
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

  async getInitLockEvent(forceRefresh = false): Promise<LaunchpadInitLockEvent> {
    const { lock_display } = this._sdk.sdkOptions.launchpad
    const cacheKey = `${lock_display}_getInitLockEvent`
    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      return cacheData.value as LaunchpadInitLockEvent
    }

    const lockEvent: LaunchpadInitLockEvent = {
      lock_manager_id: '',
    }

    try {
      const objects = (await this._sdk.fullClient.queryEvents({ query: { MoveEventType: `${lock_display}::lock::InitManagerEvent` } })).data
      objects.forEach((object) => {
        const fields = object.parsedJson
        if (fields) {
          lockEvent.lock_manager_id = fields.lock_manager_id
        }
      })
      this.updateCache(cacheKey, lockEvent, cacheTime24h)
    } catch (error) {
      console.log('getInitLockEvent', error)
    }

    return lockEvent
  }

  async getLockNFT(nft_id: SuiObjectIdType, forceRefresh = false): Promise<Position | undefined> {
    const cacheKey = `${nft_id}_getLockNFT`
    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      return cacheData.value as Position
    }
    const objects = await this._sdk.fullClient.getObject({
      id: nft_id,
      options: {
        showType: true,
        showContent: true,
        showDisplay: true,
      },
    })
    if (objects.error) {
      return undefined
    }

    return buildPosition(objects)
  }

  async getLockNFTEvent(
    poolType: SuiAddressType,
    tickSpacing: number,
    recipient: SuiObjectIdType,
    forceRefresh = false
  ): Promise<LockNFTEvent | undefined> {
    const { sdkOptions } = this._sdk
    const cacheKey = `${poolType}_getInitLockEvent`
    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      return cacheData.value as LockNFTEvent
    }

    try {
      const objects = (
        await this._sdk.fullClient.queryEvents({ query: { MoveEventType: `${sdkOptions.launchpad.lock_display}::lock::LockNFTEvent` } })
      ).data
      const poolTypeWarp = extractStructTagFromType(poolType)

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
          const description = fields.description.split(',')

          const tick_spacing = hexToNumber(description[2])
          const nftTypeA = extractStructTagFromType(description[0]).full_address
          const nftTypeB = extractStructTagFromType(description[1]).full_address

          if (
            recipient === lockNFTEvent.recipient &&
            `${sdkOptions.clmm.clmm_display}` === extractStructTagFromType(lockNFTEvent.nft_type).address &&
            tickSpacing === tick_spacing
          ) {
            if (
              (poolTypeWarp.type_arguments[0] === nftTypeA && poolTypeWarp.type_arguments[1] === nftTypeB) ||
              (poolTypeWarp.type_arguments[0] === nftTypeB && poolTypeWarp.type_arguments[1] === nftTypeA)
            ) {
              // 0x41858a1159fb07efe53bf05ab9beaa6bdd26df336b2e9dd34b2d628335a832ef
              this.updateCache(cacheKey, lockNFTEvent, cacheTime24h)
              return lockNFTEvent
            }
          }
        }
      }
    } catch (error) {
      console.log('getLockNFTEvent:', error)
    }

    return undefined
  }

  async creatPoolTransactionPayload(params: CreateLaunchpadPoolParams): Promise<TransactionBlock> {
    const { launchpad, clmm } = this.sdk.sdkOptions
    const launchpadEvent = launchpad.config

    this.assertLuanchpadConfig()

    if (this._sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    const needCeateClmmPool = params.clmm_args !== undefined

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

    let args: any = []

    if (needCeateClmmPool) {
      const clmmEvent = clmm.config

      let initialize_sqrt_price

      if (isSortedSymbols(normalizeSuiAddress(params.coin_type_sale), normalizeSuiAddress(params.coin_type_raise))) {
        initialize_sqrt_price = TickMath.priceToSqrtPriceX64(
          d(1).div(params.initialize_price),
          params.raise_decimals,
          params.sale_decimals
        ).toString()
      } else {
        initialize_sqrt_price = TickMath.priceToSqrtPriceX64(
          d(params.initialize_price), // 0.01
          params.sale_decimals,
          params.raise_decimals
        ).toString()
      }
      tx.setGasBudget(this._sdk.gasConfig.GasBudgetHigh2)
      args = [
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
        tx.pure((params.liquidity_rate * 100).toString()),
        tx.pure(params.start_time.toString()),
        tx.pure(params.activity_duration.toString()),
        tx.pure(params.settle_duration.toString()),
        tx.pure(params.locked_duration.toString()),
        tx.pure(clmmEvent.global_config_id),
        tx.pure(params.tick_spacing.toString()),
        tx.pure(initialize_sqrt_price),
        tx.pure(clmmEvent.pools_id),
        tx.pure(params.clmm_args?.url),
        tx.pure(CLOCK_ADDRESS),
      ]
    } else {
      tx.setGasBudget(this._sdk.gasConfig.GasBudgetHigh2)
      args = [
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
        tx.pure((params.liquidity_rate * 100).toString()),
        tx.pure(params.start_time.toString()),
        tx.pure(params.activity_duration.toString()),
        tx.pure(params.settle_duration.toString()),
        tx.pure(params.locked_duration.toString()),
        tx.pure(params.tick_spacing.toString()),
        tx.pure(CLOCK_ADDRESS),
      ]
    }

    const typeArguments = [params.coin_type_sale, params.coin_type_raise]

    tx.moveCall({
      target: `${launchpad.ido_router}::${LaunchpadRouterModule}::${
        needCeateClmmPool ? 'create_clmm_and_launchpad_pool' : 'create_launch_pool_single'
      }`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  async creatPurchasePayload(params: PurchaseParams): Promise<Promise<TransactionBlock>> {
    const { launchpad } = this.sdk.sdkOptions

    if (this._sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    const tx = new TransactionBlock()
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetMiddle)

    const primaryCoinInputs = (await TransactionUtil.syncBuildCoinInputForAmount(
      this._sdk,
      tx,
      BigInt(params.purchase_amount),
      params.coin_type_raise
    )) as TransactionArgument

    const purchaseMark = await this.getPurchaseMark(this._sdk.senderAddress, params.pool_address, false)

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
      target: `${launchpad.ido_router}::${LaunchpadRouterModule}::${purchaseMark === undefined ? 'purchase' : 'mark_purchase'}`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  async creatClaimPayload(params: ClaimParams): Promise<TransactionBlock> {
    const { launchpad } = this.sdk.sdkOptions

    if (this._sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    const purchaseMark = await this.getPurchaseMark(this._sdk.senderAddress, params.pool_address, false)
    const tx = new TransactionBlock()

    tx.setGasBudget(this._sdk.gasConfig.GasBudgetHigh2)

    const typeArguments = [params.coin_type_sale, params.coin_type_raise]
    const args = [
      tx.pure(params.pool_address),
      tx.pure(launchpad.config.config_cap_id),
      tx.pure(purchaseMark?.id),
      tx.pure(params.amount_lp.toString()),
      tx.pure(CLOCK_ADDRESS),
    ]

    tx.moveCall({
      target: `${launchpad.ido_router}::${LaunchpadRouterModule}::claim`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  async creatSettlePayload(params: SettleParams): Promise<TransactionBlock> {
    const { launchpad, clmm } = this.sdk.sdkOptions

    if (this._sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    this.assertLuanchpadConfig()

    const clmmEvent = clmm.config

    const initialize_sqrt_price = params.opposite
      ? TickMath.priceToSqrtPriceX64(
          d(d(1).div(params.current_price).toFixed(9)), // 0.01
          params.raise_decimals,
          params.sale_decimals
        ).toString()
      : TickMath.priceToSqrtPriceX64(
          d(params.current_price), // 0.01
          params.sale_decimals,
          params.raise_decimals
        ).toString()

    const a2b = BigInt(initialize_sqrt_price) < BigInt(params.clmm_sqrt_price)
    // eslint-disable-next-line no-nested-ternary
    const needCoinType = params.opposite
      ? a2b
        ? params.coin_type_raise
        : params.coin_type_sale
      : a2b
      ? params.coin_type_sale
      : params.coin_type_raise

    const coinAssets = await this._sdk.Resources.getOwnerCoinAssets(this._sdk.senderAddress, needCoinType)

    const tx = new TransactionBlock()
    tx.setSender(this.sdk.senderAddress)
    let needAmount = CoinAssist.calculateTotalBalance(coinAssets)
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetHigh)
    if (CoinAssist.isSuiCoin(needCoinType)) {
      needAmount -= BigInt(this._sdk.gasConfig.GasBudgetHigh)
    }

    const primaryCoinInputs = TransactionUtil.buildCoinInputForAmount(tx, coinAssets, needAmount, needCoinType) as TransactionArgument

    // eslint-disable-next-line no-nested-ternary
    const funName = params.opposite
      ? a2b
        ? 'opposite_settle_only_with_a'
        : 'opposite_settle_only_with_b'
      : a2b
      ? 'settle_only_with_a'
      : 'settle_only_with_b'

    const typeArguments = [params.coin_type_sale, params.coin_type_raise]
    const args = [
      tx.pure(params.pool_address),
      tx.pure(launchpad.config.config_cap_id),
      tx.pure(params.clmm_pool_address),
      tx.pure(clmmEvent.global_config_id),
      tx.pure(launchpad.config!.lock_manager_id),
      tx.pure(initialize_sqrt_price),
      primaryCoinInputs,
      tx.pure(CLOCK_ADDRESS),
    ]

    tx.moveCall({
      target: `${launchpad.ido_router}::${LaunchpadRouterModule}::${funName}`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  creatWithdrawPayload(params: WithdrawParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    const tx = new TransactionBlock()
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetMiddle)

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

  configWhitelistPayload(params: ConfigWhitelistParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    this.assertLuanchpadConfig()

    const tx = new TransactionBlock()
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetMiddle)
    const typeArguments = [params.coin_type_sale, params.coin_type_raise]
    if (params.each_safe_cap > 0) {
      tx.moveCall({
        target: `${launchpad.ido_router}::${LaunchpadRouterModule}::config_white_list_each_safe_cap`,
        typeArguments,
        arguments: [
          tx.object(launchpad.config!.admin_cap_id),
          tx.object(launchpad.config!.config_cap_id),
          tx.object(params.pool_address),
          tx.pure(params.each_safe_cap),
          tx.object(CLOCK_ADDRESS),
        ],
      })
    }

    if (params.hard_cap_total > 0) {
      tx.moveCall({
        target: `${launchpad.ido_router}::${LaunchpadRouterModule}::config_white_list_hard_cap_total`,
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

    if (params.each_safe_cap === 0 && params.hard_cap_total === 0) {
      params.user_addrs.forEach((user_addr) => {
        const args = [
          tx.object(launchpad.config!.admin_cap_id),
          tx.object(launchpad.config!.config_cap_id),
          tx.object(params.pool_address),
          tx.object(user_addr),
          tx.object(CLOCK_ADDRESS),
        ]

        tx.moveCall({
          target: `${launchpad.ido_router}::${LaunchpadRouterModule}::add_user_to_whitelist`,
          typeArguments,
          arguments: args,
        })
      })
    }

    return tx
  }

  creatRemoveWhitelistPayload(params: RemoveWhitelistParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    this.assertLuanchpadConfig()

    const tx = new TransactionBlock()
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetMiddle)

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

  creatCancelPoolPayload(params: CancelParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    this.assertLuanchpadConfig()

    const tx = new TransactionBlock()
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetLow)

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

  creatResertRecipientPayload(params: ResertRecipientParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    this.assertLuanchpadConfig()

    const tx = new TransactionBlock()
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetLow)

    const typeArguments = [params.coin_type_sale, params.coin_type_raise]
    const args = [
      tx.pure(launchpad.config!.admin_cap_id),
      tx.pure(launchpad.config!.config_cap_id),
      tx.pure(params.pool_address),
      tx.pure(params.new_recipient),
      tx.pure(CLOCK_ADDRESS),
    ]

    tx.moveCall({
      target: `${launchpad.ido_router}::${LaunchpadRouterModule}::resert_recipient_address`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  creatResertStartTimePayload(params: ResertResetStartParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    this.assertLuanchpadConfig()

    const tx = new TransactionBlock()
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetLow)

    const typeArguments = [params.coin_type_sale, params.coin_type_raise]
    const args = [
      tx.pure(launchpad.config!.admin_cap_id),
      tx.pure(params.pool_address),
      tx.pure(params.new_start_time),
      tx.pure(CLOCK_ADDRESS),
    ]

    tx.moveCall({
      target: `${launchpad.ido_router}::${LaunchpadRouterModule}::reset_start_time`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  creatResertPoolDuractionPayload(params: ResertPoolDurationParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    this.assertLuanchpadConfig()

    const tx = new TransactionBlock()
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetLow)

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
      target: `${launchpad.ido_router}::${LaunchpadRouterModule}::resert_pool_duraction`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  creatUnlockNftPayload(params: UnlockNftParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    if (launchpad.config === undefined) {
      throw Error('launchpad.config  is null')
    }

    const tx = new TransactionBlock()
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetLow)

    const typeArguments = [params.nft_type]
    const args = [tx.pure(launchpad.config.lock_manager_id), tx.pure(params.lock_nft), tx.pure(CLOCK_ADDRESS)]

    tx.moveCall({
      target: `${launchpad.lock_router}::lock::unlock_nft`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  async getOwnerLaunchpadCoins(walletAddress: SuiObjectIdType, poolType?: string): Promise<CoinAsset[]> {
    let warpType: string | null = null
    if (poolType) {
      const warpTypeStruct = extractStructTagFromType(poolType)
      warpType = this.buildLaunchpadCoinType(warpTypeStruct.type_arguments[0], warpTypeStruct.type_arguments[1])
    }

    const coins = await this._sdk.Resources.getOwnerCoinAssets(walletAddress, warpType)

    if (poolType) {
      return coins.filter((item) => {
        return item.coinAddress === warpType
      })
    }
    return coins.filter((item) => {
      return (
        extractStructTagFromType(item.coinAddress).full_address ===
        composeType(this._sdk.sdkOptions.launchpad.ido_display, 'pool', PoolLiquidityCoinType)
      )
    })
  }

  async isAdminCap(walletAddress: SuiObjectIdType): Promise<boolean> {
    const { launchpad } = this._sdk.sdkOptions
    if (launchpad.config === undefined) {
      throw Error('launchpad config is empty')
    }
    const object = await this._sdk.fullClient.getObject({
      id: launchpad.config.admin_cap_id,
      options: { showType: true, showOwner: true },
    })
    console.log(object)

    const type = getObjectType(object)
    const owner = getObjectOwner(object)

    if (owner && type && extractStructTagFromType(type).source_address === `${launchpad.ido_display}::config::AdminCap`) {
      const addressOwner = owner as { AddressOwner: string }
      return normalizeSuiAddress(addressOwner.AddressOwner) === normalizeSuiAddress(walletAddress)
    }

    return false
  }

  async isWhiteListUser(whitetHandle: SuiObjectIdType, walletAddress: SuiObjectIdType): Promise<boolean> {
    const name = {
      type: 'address',
      value: walletAddress,
    }
    try {
      await this._sdk.fullClient.getDynamicFieldObject({ parentId: whitetHandle, name })
      return true
    } catch (error) {
      return false
    }
  }

  async getPurchaseAmount(purchaseHandle: SuiObjectIdType, walletAddress: SuiObjectIdType): Promise<string> {
    const name = {
      type: 'address',
      value: walletAddress,
    }
    try {
      const result = await this._sdk.fullClient.getDynamicFieldObject({ parentId: purchaseHandle, name })
      const fields = getObjectFields(result)
      if (fields) {
        return fields.value
      }
      return '0'
    } catch (error) {
      return '0'
    }
  }

  async getPurchaseMark(accountAddress: string, poolAddress: SuiObjectIdType, forceRefresh = true): Promise<PurchaseMark | undefined> {
    const { launchpad } = this._sdk.sdkOptions

    const cacheKey = `${poolAddress}_getPurchaseMark`
    const cacheData = this._cache[cacheKey]

    if (!forceRefresh && cacheData !== undefined && cacheData.getCacheData()) {
      return cacheData.value as PurchaseMark
    }
    let cursor = null
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
        // console.log('fields: ', item)
        const type = extractStructTagFromType(getMoveObjectType(item) as ObjectType).source_address
        if (type === `${launchpad.ido_display}::pool::PurchaseMark`) {
          if (poolAddress === extractStructTagFromType(fields.pool_info).address) {
            const purchaseMark: PurchaseMark = {
              id: fields.id.id,
              pool_id: fields.pool_info,
              current_amount: fields.current_amount,
              total_amount: fields.total_amount,
              claim_raise: fields.claim_raise,
              claim_sale: fields.claim_sale,
            }
            this.updateCache(cacheKey, purchaseMark, cacheTime24h)
            return purchaseMark
          }
        }
      }

      if (ownerRes.hasNextPage) {
        cursor = ownerRes.nextCursor
      } else {
        break
      }
    }

    return undefined
  }

  async getSettleEvent(poolAddress: SuiObjectIdType): Promise<SettleEvent | undefined> {
    const { launchpad } = this._sdk.sdkOptions

    const cacheKey = `${poolAddress}_getPurchaseMark`
    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData()) {
      return cacheData.value as SettleEvent
    }

    const ownerRes = await this._sdk.fullClient.queryEvents({ query: { MoveEventType: `${launchpad.ido_display}::pool::SettleEvent` } })

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
}
