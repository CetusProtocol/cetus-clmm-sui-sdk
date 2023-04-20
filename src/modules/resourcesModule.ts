/* eslint-disable no-constant-condition */
import {
  Coin,
  getMoveObject,
  getObjectFields,
  getObjectPreviousTransactionDigest,
  ObjectContentFields,
  PaginatedCoins,
  SuiMoveObject,
  SuiObjectResponse,
  SuiTransactionBlockResponse,
  TransactionDigest,
} from '@mysten/sui.js'
import { CachedContent } from '../utils/cachedContent'
import { buildPool, buildPosition, buildPositionReward } from '../utils/common'
import { SuiAddressType, SuiObjectIdType, SuiResource, NFT } from '../types/sui'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { extractStructTagFromType } from '../utils/contracts'
import { addHexPrefix } from '../utils/hex'
import { CoinAssist } from '../math/CoinAssist'

export const cacheTime5min = 5 * 60 * 1000
export const cacheTime24h = 24 * 60 * 60 * 1000
export const intervalFaucetTime = 12 * 60 * 60 * 1000

export type PositionRewarder = {
  growth_inside: string
  amount_owed: string
}
export type Position = {
  pos_object_id: SuiObjectIdType
  pool: SuiObjectIdType
  type: SuiAddressType
  coin_type_a: SuiAddressType
  coin_type_b: SuiAddressType
  index: number
  liquidity: string
  tick_lower_index: number
  tick_upper_index: number
  fee_growth_inside_a: string
  fee_owed_a: string
  fee_growth_inside_b: string
  fee_owed_b: string
  reward_amount_owed_0: string
  reward_amount_owed_1: string
  reward_amount_owed_2: string
  reward_growth_inside_0: string
  reward_growth_inside_1: string
  reward_growth_inside_2: string
} & NFT

export type CoinPairType = {
  coinTypeA: SuiAddressType
  coinTypeB: SuiAddressType
}

export type PoolImmutables = {
  poolAddress: string
  tickSpacing: string
} & CoinPairType

export type Pool = {
  poolType: string
  coinAmountA: number
  coinAmountB: number
  /// The current sqrt price
  current_sqrt_price: number
  /// The current tick index
  current_tick_index: number
  /// The global fee growth of coin a,b as Q64.64
  fee_growth_global_b: number
  fee_growth_global_a: number
  /// The amounts of coin a,b owend to protocol
  fee_protocol_coin_a: number
  fee_protocol_coin_b: number
  /// The numerator of fee rate, the denominator is 1_000_000.
  fee_rate: number
  /// is the pool pause
  is_pause: boolean
  /// The liquidity of current tick index
  liquidity: number
  /// The pool index
  index: number
  positions_handle: string
  rewarder_infos: Array<Rewarder>
  rewarder_last_updated_time: string
  ticks_handle: string
  uri: string
  name: string
} & PoolImmutables

export type Rewarder = {
  coinAddress: string
  emissions_per_second: number
  growth_global: number
  emissionsEveryDay: number
}

export type InitEvent = {
  pools_id: SuiObjectIdType
  global_config_id: SuiObjectIdType
  global_vault_id: SuiObjectIdType
}

export type CreatePartnerEvent = {
  name: string
  recipient: SuiAddressType
  partner_id: SuiObjectIdType
  partner_cap_id: SuiObjectIdType
  fee_rate: string
  start_epoch: string
  end_epoch: string
}

export type FaucetEvent = {
  id: string
  time: number
}

export type CoinAsset = {
  coinAddress: SuiAddressType
  coinObjectId: SuiObjectIdType
  balance: bigint
}

export type WarpSuiObject = {
  coinAddress: SuiAddressType
  balance: number
} & SuiMoveObject

export type FaucetCoin = {
  transactionModule: string
  suplyID: SuiObjectIdType
  decimals: number
} & ObjectContentFields

function getFutureTime(interval: number) {
  return Date.parse(new Date().toString()) + interval
}

export class ResourcesModule implements IModule {
  protected _sdk: SDK

  private readonly _cache: Record<string, CachedContent> = {}

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  async getSuiTransactionResponse(digest: TransactionDigest, forceRefresh = false): Promise<SuiTransactionBlockResponse | null> {
    const cacheKey = `${digest}_getSuiTransactionResponse`
    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      return cacheData.value as SuiTransactionBlockResponse
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

  async getFaucetEvent(packageObjectId: SuiObjectIdType, walletAddress: SuiAddressType, forceRefresh = true): Promise<FaucetEvent | null> {
    const cacheKey = `${packageObjectId}_${walletAddress}_getFaucetEvent`
    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      return cacheData.value as FaucetEvent
    }
    const objects = (
      await this._sdk.fullClient.queryEvents({
        query: { MoveEventType: `${packageObjectId}::faucet::FaucetEvent` },
      })
    ).data
    let findFaucetEvent: FaucetEvent = {
      id: '',
      time: 0,
    }
    objects.forEach((eventObject) => {
      if (addHexPrefix(walletAddress) === eventObject.sender) {
        const fields = eventObject.parsedJson
        if (fields) {
          const faucetEvent = {
            id: fields.id,
            time: Number(fields.time),
          }
          const findTime = findFaucetEvent.time
          if (findTime > 0) {
            if (faucetEvent.time > findTime) {
              findFaucetEvent = faucetEvent
            }
          } else {
            findFaucetEvent = faucetEvent
          }
        }
      }
    })
    if (findFaucetEvent.time > 0) {
      this.updateCache(cacheKey, findFaucetEvent, cacheTime24h)
      return findFaucetEvent
    }
    return null
  }

  async getInitEvent(forceRefresh = false): Promise<InitEvent> {
    const packageObjectId = this._sdk.sdkOptions.clmm.clmm_display
    const cacheKey = `${packageObjectId}_getInitEvent`
    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      return cacheData.value as InitEvent
    }
    const packageObject = await this._sdk.fullClient.getObject({
      id: packageObjectId,
      options: { showPreviousTransaction: true },
    })

    const previousTx = getObjectPreviousTransactionDigest(packageObject) as string

    const objects = (
      await this._sdk.fullClient.queryEvents({
        query: { Transaction: previousTx },
      })
    ).data

    // console.log('objects: ', objects)

    const initEvent: InitEvent = {
      pools_id: '',
      global_config_id: '',
      global_vault_id: '',
    }

    if (objects.length > 0) {
      objects.forEach((item) => {
        const fields = item.parsedJson as any
        if (item.type) {
          switch (extractStructTagFromType(item.type).full_address) {
            case `${packageObjectId}::config::InitConfigEvent`:
              initEvent.global_config_id = fields.global_config_id
              break
            case `${packageObjectId}::factory::InitFactoryEvent`:
              initEvent.pools_id = fields.pools_id
              break
            case `${packageObjectId}::rewarder::RewarderInitEvent`:
              initEvent.global_vault_id = fields.global_vault_id
              break
            default:
              break
          }
        }
      })
      this.updateCache(cacheKey, initEvent, cacheTime24h)
      return initEvent
    }

    return initEvent
  }

  async getCreatePartnerEvent(forceRefresh = false): Promise<CreatePartnerEvent[]> {
    const packageObjectId = this._sdk.sdkOptions.clmm.clmm_display
    const cacheKey = `${packageObjectId}_getInitEvent`
    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      return cacheData.value as CreatePartnerEvent[]
    }
    const objects = (
      await this._sdk.fullClient.queryEvents({
        query: { MoveEventType: `${packageObjectId}::partner::CreatePartnerEvent` },
      })
    ).data
    const events: CreatePartnerEvent[] = []

    if (objects.length > 0) {
      objects.forEach((item) => {
        events.push(item.parsedJson as CreatePartnerEvent)
      })
      this.updateCache(cacheKey, events, cacheTime24h)
    }

    return events
  }

  async getPoolImmutables(assignPools: string[] = [], offset = 0, limit = 100, forceRefresh = false): Promise<PoolImmutables[]> {
    const clmmIntegrate = this._sdk.sdkOptions.clmm.clmm_display
    const cacheKey = `${clmmIntegrate}_getInitPoolEvent`
    const cacheData = this._cache[cacheKey]

    const allPools: PoolImmutables[] = []
    const filterPools: PoolImmutables[] = []

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      allPools.push(...(cacheData.value as PoolImmutables[]))
    }

    if (allPools.length === 0) {
      try {
        const objects = await this._sdk.fullClient.queryEvents({
          query: { MoveEventType: `${clmmIntegrate}::factory::CreatePoolEvent` },
        })
        // console.log('objects: ', objects)

        objects.data.forEach((object) => {
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

    const hasassignPools = assignPools.length > 0

    for (let index = 0; index < allPools.length; index += 1) {
      const item = allPools[index]

      if (hasassignPools && !assignPools.includes(item.poolAddress)) {
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

  async getPools(assignPools: string[] = [], offset = 0, limit = 100): Promise<Pool[]> {
    const allPool: Pool[] = []
    let poolObjectIds: string[] = []

    if (assignPools.length > 0) {
      poolObjectIds = [...assignPools]
    } else {
      const poolImmutables = await this.getPoolImmutables([], offset, limit, false)
      poolImmutables.forEach((item) => {
        poolObjectIds.push(item.poolAddress)
      })
    }
    const objectDataResponses = await this.sdk.fullClient.multiGetObjects({
      ids: poolObjectIds,
      options: {
        showContent: true,
        showType: true,
      },
    })
    // eslint-disable-next-line no-restricted-syntax
    for (const suiObj of objectDataResponses) {
      const pool = buildPool(suiObj)
      allPool.push(pool)
      const cacheKey = `${pool.poolAddress}_getPoolObject`
      this.updateCache(cacheKey, pool, cacheTime24h)
    }
    return allPool
  }

  async getPool(poolObjectId: string, forceRefresh = true): Promise<Pool> {
    const cacheKey = `${poolObjectId}_getPoolObject`
    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      return cacheData.value as Pool
    }
    const objects = (await this._sdk.fullClient.getObject({
      id: poolObjectId,
      options: {
        showType: true,
        showContent: true,
      },
    })) as SuiObjectResponse
    const pool = buildPool(objects)
    this.updateCache(cacheKey, pool)
    return pool
  }

  async getPositionList(accountAddress: string, assignPoolIds: string[] = []): Promise<Position[]> {
    const cetusClmm = this._sdk.sdkOptions.clmm.clmm_display
    const allPosition: Position[] = []
    let cursor = null

    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const ownerRes: any = await this._sdk.fullClient.getOwnedObjects({
        owner: accountAddress,
        options: { showType: true, showContent: true, showDisplay: true },
        cursor,
        // filter: { Package: cetusClmm },
      })

      const hasAssignPoolIds = assignPoolIds.length > 0
      for (const item of ownerRes.data as any[]) {
        const type = extractStructTagFromType(item.data.type)

        if (type.full_address === `${cetusClmm}::position::Position`) {
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

  async getPosition(positionHandle: string, positionId: string): Promise<Position> {
    let position = await this.getSipmlePosition(positionId)
    position = await this.updatePositionRewarders(positionHandle, position)
    return position
  }

  async getPositionById(positionId: string): Promise<Position> {
    const position = await this.getSipmlePosition(positionId)
    const pool = await this.getPool(position.pool, false)
    const result = await this.updatePositionRewarders(pool.positions_handle, position)
    return result
  }

  async getSipmlePosition(positionId: string): Promise<Position> {
    const cacheKey = `${positionId}_getPositionList`
    const cacheData = this._cache[cacheKey]
    let position: Position | null = null
    if (cacheData !== undefined && cacheData.getCacheData()) {
      position = cacheData.value as Position
    }

    if (position === null) {
      const objectDataResponses = await this.sdk.fullClient.getObject({
        id: positionId,
        options: { showContent: true, showType: true, showDisplay: true },
      })
      position = buildPosition(objectDataResponses)
    }
    return position
  }

  private async updatePositionRewarders(positionHandle: string, position: Position): Promise<Position> {
    // const res = await sdk.fullClient.getDynamicFields({parentId: "0x70aca04c93afb16bbe8e7cf132aaa40186e4b3e8197aa239619f662e3eb46a3a"})
    const res = await this._sdk.fullClient.getDynamicFieldObject({
      parentId: positionHandle,
      name: {
        type: '0x2::object::ID',
        value: position.pos_object_id,
      },
    })
    const fields = (getObjectFields(res.data as any) as any).value.fields.value
    return buildPositionReward(fields, position)
  }

  async getOwnerCoinAssets(suiAddress: string, coinType?: string | null): Promise<CoinAsset[]> {
    const allCoinAsset: CoinAsset[] = []
    let nextCursor: string | null = null

    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const allCoinObject: PaginatedCoins = await (coinType
        ? this._sdk.fullClient.getCoins({
            owner: suiAddress,
            coinType,
            cursor: nextCursor,
          })
        : this._sdk.fullClient.getAllCoins({
            owner: suiAddress,
            cursor: nextCursor,
          }))

      // eslint-disable-next-line no-loop-func
      allCoinObject.data.forEach((coin: any) => {
        if (BigInt(coin.balance) > 0) {
          allCoinAsset.push({
            coinAddress: extractStructTagFromType(coin.coinType).source_address,
            coinObjectId: coin.coinObjectId,
            balance: BigInt(coin.balance),
          })
        }
      })
      nextCursor = allCoinObject.nextCursor

      if (!allCoinObject.hasNextPage) {
        break
      }
    }
    return allCoinAsset
  }

  async getSuiObjectOwnedByAddress(suiAddress: string): Promise<WarpSuiObject[]> {
    const allSuiObjects: WarpSuiObject[] = []
    const allObjectRefs = await this._sdk.fullClient.getOwnedObjects({
      owner: suiAddress,
    })

    const objectIDs = allObjectRefs.data.map((anObj: any) => anObj.objectId)
    const allObjRes = await this._sdk.fullClient.multiGetObjects({
      ids: objectIDs,
    })
    allObjRes.forEach((objRes) => {
      const moveObject = getMoveObject(objRes)
      if (moveObject) {
        const coinAddress = CoinAssist.getCoinTypeArg(moveObject) as SuiAddressType
        const balance = Coin.getBalance(moveObject) as unknown as number
        const coinAsset: WarpSuiObject = {
          coinAddress,
          balance,
          ...moveObject,
        }
        allSuiObjects.push(coinAsset)
      }
    })
    return allSuiObjects
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
