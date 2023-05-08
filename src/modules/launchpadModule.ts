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
import { TransactionUtil } from '../utils/transaction-util'
import { CoinAssist, TickMath } from '../math'
import { d, hexToNumber, loopToGetAllQueryEvents } from '../utils'
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
  RemoveWhitelistParams,
  PurchaseMark,
  SettleEvent,
  UpdateWhitelistCapParams,
  AddUserToWhitelistParams,
  UpdateRecipientParams,
  UpdatePoolDurationParams,
} from '../types/luanchpa_type'
import { SuiResource, SuiObjectIdType, SuiAddressType, PoolLiquidityCoinType, CLOCK_ADDRESS } from '../types/sui'
import { CachedContent } from '../utils/cachedContent'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { composeType, extractStructTagFromType, isSortedSymbols } from '../utils/contracts'
import { buildPosition, multiGetObjects } from '../utils/common'
import { Position } from './resourcesModule'

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

  // async getInitLockEvent(forceRefresh = false): Promise<LaunchpadInitLockEvent> {
  //   const { lock_display } = this._sdk.sdkOptions.launchpad
  //   const cacheKey = `${lock_display}_getInitLockEvent`
  //   const cacheData = this._cache[cacheKey]

  //   if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
  //     return cacheData.value as LaunchpadInitLockEvent
  //   }

  //   const lockEvent: LaunchpadInitLockEvent = {
  //     lock_manager_id: '',
  //   }

  //   try {
  //     const objects = (await this._sdk.fullClient.queryEvents({ query: { MoveEventType: `${lock_display}::lock::InitManagerEvent` } })).data
  //     console.log(objects)

  //     objects.forEach((object) => {
  //       const fields = object.parsedJson
  //       if (fields) {
  //         lockEvent.lock_manager_id = fields.lock_manager_id
  //       }
  //     })
  //     this.updateCache(cacheKey, lockEvent, cacheTime24h)
  //   } catch (error) {
  //     console.log('getInitLockEvent', error)
  //   }

  //   return lockEvent
  // }

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
        showOwner: true,
      },
    })
    if (objects.error) {
      return undefined
    }

    return buildPosition(objects)
  }

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

  async creatPoolTransactionPayload(params: CreateLaunchpadPoolParams): Promise<TransactionBlock> {
    const { launchpad, clmm } = this.sdk.sdkOptions
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

    tx.setGasBudget(this._sdk.gasConfig.GasBudgetHigh2)
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

  async creatPurchasePayload(params: PurchaseParams): Promise<Promise<TransactionBlock>> {
    const { launchpad } = this.sdk.sdkOptions

    if (this._sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    const tx = new TransactionBlock()
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetHigh2)

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

  async creatClaimPayload(params: ClaimParams): Promise<TransactionBlock> {
    const { launchpad } = this.sdk.sdkOptions

    if (this._sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    const purchaseMark = (await this.getPurchaseMarks(this._sdk.senderAddress, [params.pool_address], false))[0]
    const tx = new TransactionBlock()

    tx.setGasBudget(this._sdk.gasConfig.GasBudgetHigh2)

    const typeArguments = [params.coin_type_sale, params.coin_type_raise]
    const args = [tx.pure(params.pool_address), tx.pure(launchpad.config.config_cap_id), tx.pure(purchaseMark?.id), tx.pure(CLOCK_ADDRESS)]

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

      console.log('creatSettlePayload###initialize_sqrt_price###', initialize_sqrt_price)
      console.log('creatSettlePayload###clmm_args.clmm_sqrt_price###', clmm_args.clmm_sqrt_price)
      console.log('creatSettlePayload###a2b###', a2b)

      // eslint-disable-next-line no-nested-ternary
      const needCoinType = clmm_args.opposite
        ? a2b
          ? params.coin_type_raise
          : params.coin_type_sale
        : a2b
        ? params.coin_type_sale
        : params.coin_type_raise

      const coinAssets = await this._sdk.Resources.getOwnerCoinAssets(this._sdk.senderAddress, needCoinType)

      let needAmount = CoinAssist.calculateTotalBalance(coinAssets)
      tx.setGasBudget(this._sdk.gasConfig.GasBudgetHigh)
      if (CoinAssist.isSuiCoin(needCoinType)) {
        needAmount -= BigInt(this._sdk.gasConfig.GasBudgetHigh)
      }

      console.log('creatSettlePayload###coinAssets###', coinAssets)
      console.log('creatSettlePayload###needAmount###', needAmount)
      console.log('creatSettlePayload###needCoinType###', needCoinType)

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

      console.log('creatSettlePayload###funName###', funName)
      console.log('creatSettlePayload###primaryCoinInputs###', primaryCoinInputs)
      const args = [
        tx.pure(params.pool_address),
        tx.pure(launchpad.config.config_cap_id),
        tx.pure(clmm_args.clmm_pool_address),
        tx.pure(clmmEvent.global_config_id),
        // tx.pure(launchpad.config!.lock_manager_id),
        tx.pure(initialize_sqrt_price),
        primaryCoinInputs,
        tx.pure(CLOCK_ADDRESS),
      ]

      console.log('creatSettlePayload###args###', args)

      tx.moveCall({
        target: `${launchpad.ido_router}::${LaunchpadRouterModule}::${funName}`,
        typeArguments,
        arguments: args,
      })
    } else {
      tx.setGasBudget(this._sdk.gasConfig.GasBudgetMiddle2)
      tx.moveCall({
        target: `${launchpad.ido_router}::${LaunchpadRouterModule}::settle`,
        typeArguments,
        arguments: [tx.pure(params.pool_address), tx.pure(launchpad.config.config_cap_id), tx.pure(CLOCK_ADDRESS)],
      })
    }

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

  addUserToWhitelisPayload(params: AddUserToWhitelistParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    this.assertLuanchpadConfig()

    const tx = new TransactionBlock()
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetHigh2)
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

  updateWhitelistCaPayload(params: UpdateWhitelistCapParams): TransactionBlock {
    const { launchpad } = this.sdk.sdkOptions

    this.assertLuanchpadConfig()

    const tx = new TransactionBlock()
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetHigh2)
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

  updateRecipientPayload(params: UpdateRecipientParams): TransactionBlock {
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
      target: `${launchpad.ido_router}::${LaunchpadRouterModule}::update_recipient_address`,
      typeArguments,
      arguments: args,
    })

    return tx
  }

  updatePoolDuractionPayload(params: UpdatePoolDurationParams): TransactionBlock {
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
      target: `${launchpad.ido_router}::${LaunchpadRouterModule}::update_pool_duration`,
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
    // const args = [tx.pure(launchpad.config.lock_manager_id), tx.pure(params.lock_nft), tx.pure(CLOCK_ADDRESS)]
    const args = [tx.pure(params.lock_nft), tx.pure(CLOCK_ADDRESS)]

    tx.moveCall({
      target: `${launchpad.ido_router}::lock::unlock_nft`,
      typeArguments,
      arguments: args,
    })

    return tx
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
      const res = await this._sdk.fullClient.getDynamicFieldObject({ parentId: whitetHandle, name })
      if (res && res.data) {
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

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

  async getPurchaseMarks(accountAddress: string, poolAddressArray: SuiObjectIdType[] = [], forceRefresh = true): Promise<PurchaseMark[]> {
    const { launchpad } = this._sdk.sdkOptions

    const cacheKey = `${poolAddressArray}_getPurchaseMark`
    const cacheData = this._cache[cacheKey]

    if (!forceRefresh && cacheData !== undefined && cacheData.getCacheData()) {
      return cacheData.value as PurchaseMark[]
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

  async getSettleEvent(poolAddress: SuiObjectIdType): Promise<SettleEvent | undefined> {
    const { launchpad } = this._sdk.sdkOptions

    const cacheKey = `${poolAddress}_getPurchaseMark`
    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData()) {
      return cacheData.value as SettleEvent
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
