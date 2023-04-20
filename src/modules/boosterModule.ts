/* eslint-disable camelcase */
import { getMoveObjectType, getObjectFields, ObjectContentFields, ObjectType, TransactionArgument, TransactionBlock } from '@mysten/sui.js'
import Decimal from 'decimal.js'
import { BoosterInitEvent } from '../types/booster_type'
import { XWhaleUtil } from '../utils/xwhale'
import {
  CancelRedeemParams,
  ConvertParams,
  DividendManager,
  DividendManagerEvent,
  DividendsRouterModule,
  EXCHANGE_RATE_MULTIPER,
  LockUpManagerEvent,
  LockWhale,
  RedeemLockParams,
  RedeemParams,
  REDEEM_NUM_MULTIPER,
  VeNFT,
  VeNFTDividendInfo,
  XwhaleInitEvent,
  XwhaleManager,
  XwhaleRouterModule,
} from '../types/xwhale_type'
import { buildNFT, TransactionUtil } from '../utils'
import { SuiResource, SuiAddressType, CLOCK_ADDRESS, SuiObjectIdType } from '../types/sui'
import { CachedContent } from '../utils/cachedContent'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { CoinAsset } from './resourcesModule'
import { d } from '../utils/numbers'
import { extractStructTagFromType } from '../utils/contracts'

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

  async getInitFactoryEvent(): Promise<BoosterInitEvent> {
    const { booster_router } = this.sdk.sdkOptions.xwhale

    const initEventObjects = (await this._sdk.fullClient.queryEvents({ query: { MoveEventType: `${booster_router}::config::InitEvent` } }))
      .data

    const initEvent: BoosterInitEvent = {
      booster_config_id: '',
    }

    if (initEventObjects.length > 0) {
      initEventObjects.forEach((item) => {
        const fields = item.parsedJson
        if (fields) {
          initEvent.booster_config_id = fields.config_id
        }
      })
    }
    return initEvent
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
