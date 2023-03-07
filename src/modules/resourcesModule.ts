/* eslint-disable no-constant-condition */
import {
  Coin,
  GetObjectDataResponse,
  getObjectExistsResponse,
  getObjectPreviousTransactionDigest,
  MoveEvent,
  ObjectContentFields,
  PaginatedCoins,
  SuiEventEnvelope,
  SuiMoveObject,
  SuiObject,
  SuiTransactionResponse,
  TransactionDigest,
} from '@mysten/sui.js'
import { CachedContent } from '../utils/cachedContent'
import { buildPool, buildPosition } from '../utils/common'
import { SuiAddressType, SuiObjectIdType, SuiResource } from '../types/sui'
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
  name: string
  index: number
  uri: string
  liquidity: string
  tick_lower_index: string
  tick_upper_index: string
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
}

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
  current_sqrt_price: number
  current_tick_index: number
  fee_growth_global_a: number
  fee_growth_global_b: number
  fee_protocol_coin_a: number
  fee_protocol_coin_b: number
  fee_rate: number
  is_pause: boolean
  liquidity: number
  positionIndex: number
  positions_handle: string
  protocol_fee_rate: string
  rewarder_balances: string
  rewarder_infos: Array<Rewarder>
  rewarder_last_updated_time: string
  tick_indexes_handle: string
  ticks_handle: string
  uri: string
  name: string
} & PoolImmutables

export type Rewarder = {
  coin_name: string
  emissions_per_second: number
  growth_global: number
}

export type InitConfigEvent = {
  tx_sender: SuiAddressType
  admin_cap_id: SuiObjectIdType
  global_config_id: SuiObjectIdType
  protocol_fee_claim_cap_id: SuiObjectIdType
}

export type InitFactoryEvent = {
  tx_sender: SuiAddressType
  pools_id: SuiObjectIdType
}

export type InitPartnerEvent = {
  tx_sender: SuiAddressType
  partners_id: SuiObjectIdType
}

export type InitEvent = {
  initConfigEvent?: InitConfigEvent
  initFactoryEvent?: InitFactoryEvent
  initPartnerEvent?: InitPartnerEvent
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
} & SuiObject

export type FaucetCoin = {
  transactionModule: string
  address: SuiAddressType
  suplyID: SuiObjectIdType
  decimals: number
} & ObjectContentFields

type moveEvent = {
  moveEvent: MoveEvent
}

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

  async getSuiTransactionResponse(digest: TransactionDigest, forceRefresh = false): Promise<SuiTransactionResponse | null> {
    const cacheKey = `${digest}_getSuiTransactionResponse`
    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      return cacheData.value as SuiTransactionResponse
    }
    const objects = (await this._sdk.fullClient.getTransactionWithEffects(digest)) as SuiTransactionResponse
    this.updateCache(cacheKey, objects, cacheTime24h)
    return objects
  }

  async getFaucetEvent(packageObjectId: SuiObjectIdType, walletAddress: SuiAddressType, forceRefresh = true): Promise<FaucetEvent | null> {
    const cacheKey = `${packageObjectId}_${walletAddress}_getFaucetEvent`
    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      return cacheData.value as FaucetEvent
    }
    const objects = (await this._sdk.fullClient.getEvents({ MoveEvent: `${packageObjectId}::faucet::FaucetEvent` }, null, null))
      .data as SuiEventEnvelope[]
    let findFaucetEvent: FaucetEvent = {
      id: '',
      time: 0,
    }
    objects.forEach((object) => {
      const eventObject = object.event as moveEvent
      if (addHexPrefix(walletAddress) === eventObject.moveEvent.sender) {
        const { fields } = (object.event as moveEvent).moveEvent
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
    })
    if (findFaucetEvent.time > 0) {
      this.updateCache(cacheKey, findFaucetEvent, cacheTime24h)
      return findFaucetEvent
    }
    return null
  }

  async getInitEvent(forceRefresh = false): Promise<InitEvent> {
    const packageObjectId = this._sdk.sdkOptions.networkOptions.modules.cetus_clmm
    const cacheKey = `${packageObjectId}_getInitEvent`
    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      return cacheData.value as InitEvent
    }
    const packageObject = await this._sdk.fullClient.getObject(packageObjectId)
    const previousTx = getObjectPreviousTransactionDigest(packageObject) as string
    const objects = (await this._sdk.fullClient.getEvents({ Transaction: previousTx }, null, null)).data as SuiEventEnvelope[]

    const initEvent: InitEvent = {}

    if (objects.length > 0) {
      objects.forEach((item) => {
        if ('moveEvent' in item.event) {
          const { fields } = item.event.moveEvent
          switch (item.event.moveEvent.type) {
            case `${packageObjectId}::config::InitConfigEvent`:
              initEvent.initConfigEvent = fields as InitConfigEvent
              break
            case `${packageObjectId}::partner::InitPartnerEvent`:
              initEvent.initPartnerEvent = fields as InitPartnerEvent
              break
            case `${packageObjectId}::factory::InitFactoryEvent`:
              initEvent.initFactoryEvent = fields as InitFactoryEvent
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
    const packageObjectId = this._sdk.sdkOptions.networkOptions.modules.cetus_clmm
    const cacheKey = `${packageObjectId}_getInitEvent`
    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      return cacheData.value as CreatePartnerEvent[]
    }
    const objects = (await this._sdk.fullClient.getEvents({ MoveEvent: `${packageObjectId}::partner::CreatePartnerEvent` }, null, null))
      .data as SuiEventEnvelope[]
    const events: CreatePartnerEvent[] = []

    if (objects.length > 0) {
      objects.forEach((item) => {
        if ('moveEvent' in item.event) {
          events.push(item.event.moveEvent.fields as CreatePartnerEvent)
        }
      })
      this.updateCache(cacheKey, events, cacheTime24h)
    }

    return events
  }

  async getPoolImmutables(assignPools: string[] = [], offset = 0, limit = 100, forceRefresh = false): Promise<PoolImmutables[]> {
    const clmmIntegrate = this._sdk.sdkOptions.networkOptions.modules.cetus_clmm
    const cacheKey = `${clmmIntegrate}_getInitPoolEvent`
    const cacheData = this._cache[cacheKey]

    const allPools: PoolImmutables[] = []
    const filterPools: PoolImmutables[] = []

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      allPools.push(...(cacheData.value as PoolImmutables[]))
    }

    if (allPools.length === 0) {
      try {
        const objects = (await this._sdk.fullClient.getEvents({ MoveEvent: `${clmmIntegrate}::factory::CreatePoolEvent` }, null, null))
          .data as SuiEventEnvelope[]
        objects.forEach((object) => {
          if ('moveEvent' in object.event) {
            const { fields } = object.event.moveEvent
            allPools.push({
              poolAddress: fields.id,
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
        const itemIndex = Number(index)
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
    const poolObjectIds: string[] = []

    if (assignPools.length > 0) {
      poolObjectIds.push(...poolObjectIds)
    } else {
      const poolImmutables = await this.getPoolImmutables([], offset, limit, false)
      poolImmutables.forEach((item) => {
        poolObjectIds.push(item.poolAddress)
      })
    }
    const objectDataResponses = await this.sdk.fullClient.getObjectBatch(poolObjectIds)
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
    const objects = (await this._sdk.fullClient.getObject(poolObjectId)) as GetObjectDataResponse
    const pool = buildPool(objects)
    this.updateCache(cacheKey, pool)
    return pool
  }

  async getPositionList(accountAddress: string, assignPoolIds: string[] = []): Promise<Position[]> {
    const cetusClmm = this._sdk.sdkOptions.networkOptions.modules.cetus_clmm
    const allPosition: Position[] = []
    const ownerRes = await this._sdk.fullClient.getObjectsOwnedByAddress(accountAddress)

    const positionIds: string[] = []
    ownerRes.forEach((item) => {
      const type = extractStructTagFromType(item.type)
      if (type.full_address === `${cetusClmm}::pool::Position`) {
        positionIds.push(item.objectId)
      }
    })

    const hasAssignPoolIds = assignPoolIds.length > 0
    const objectDataResponses = await this.sdk.fullClient.getObjectBatch(positionIds)
    for (const suiObj of objectDataResponses) {
      if (suiObj.status === 'Exists') {
        const pool = buildPosition(suiObj)
        if (hasAssignPoolIds) {
          if (assignPoolIds.includes(pool.pool)) {
            allPosition.push(pool)
          }
        } else {
          allPosition.push(pool)
        }
      }
    }

    return allPosition
  }

  async getPosition(positionId: string): Promise<Position | undefined> {
    const objectDataResponses = await this.sdk.fullClient.getObject(positionId)
    if (objectDataResponses.status === 'Exists') {
      return buildPosition(objectDataResponses)
    }
    return undefined
  }

  async getOwnerCoinAssets(suiAddress: string): Promise<CoinAsset[]> {
    const allCoinAsset: CoinAsset[] = []
    let nextCursor: string | null = null

    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const allCoinObject: PaginatedCoins = await this._sdk.fullClient.getAllCoins(suiAddress, nextCursor, null)
      // eslint-disable-next-line no-loop-func
      allCoinObject.data.forEach((coin) => {
        allCoinAsset.push({
          coinAddress: coin.coinType,
          coinObjectId: coin.coinObjectId,
          balance: BigInt(coin.balance),
        })
      })
      nextCursor = allCoinObject.nextCursor

      if (nextCursor === null) {
        break
      }
    }
    return allCoinAsset
  }

  async getSuiObjectOwnedByAddress(suiAddress: string): Promise<WarpSuiObject[]> {
    const allSuiObjects: WarpSuiObject[] = []
    const allObjectRefs = await this._sdk.fullClient.getObjectsOwnedByAddress(suiAddress)

    const objectIDs = allObjectRefs.map((anObj) => anObj.objectId)
    const allObjRes = await this._sdk.fullClient.getObjectBatch(objectIDs)
    allObjRes.forEach((objRes) => {
      const suiObj = getObjectExistsResponse(objRes)
      if (suiObj) {
        const moveObject = suiObj.data as SuiMoveObject
        const coinAddress = CoinAssist.getCoinTypeArg(moveObject) as SuiAddressType
        const balance = Coin.getBalance(moveObject) as unknown as number
        const coinAsset: WarpSuiObject = {
          coinAddress,
          balance,
          ...suiObj,
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
