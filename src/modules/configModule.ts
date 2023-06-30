import { Base64 } from 'js-base64'
import {
  getObjectFields,
  getObjectId,
  getObjectPreviousTransactionDigest,
  getObjectType,
  normalizeSuiObjectId,
  ObjectContentFields,
  ObjectType,
} from '@mysten/sui.js'
import { CetusConfigs, ClmmPoolConfig, CoinConfig, LaunchpadPoolConfig } from '../types'
import { SuiResource, SuiAddressType } from '../types/sui'
import { CachedContent, cacheTime24h, cacheTime5min, getFutureTime } from '../utils/cachedContent'
import { extractStructTagFromType, normalizeCoinType } from '../utils/contracts'
import { CetusClmmSDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { getDynamicFields, multiGetObjects, queryEvents } from '../utils'

/**
 * Helper class to help interact with clmm pool and coin and launchpad pool config
 */
export class ConfigModule implements IModule {
  protected _sdk: CetusClmmSDK

  private readonly _cache: Record<string, CachedContent> = {}

  constructor(sdk: CetusClmmSDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  async getTokenListByCoinTypes(coinTypes: SuiAddressType[]): Promise<Record<string, CoinConfig>> {
    const tokenMap: Record<string, CoinConfig> = {}
    const { coin_list_handle } = this.sdk.sdkOptions.cetus_config.config
    const cacheKey = `${coin_list_handle}_getCoinConfigs`
    const cacheData = this.getCache<CoinConfig[]>(cacheKey)

    if (cacheData !== undefined) {
      const tokenList = cacheData
      for (const coinType of coinTypes) {
        for (const token of tokenList) {
          if (normalizeCoinType(coinType) === normalizeCoinType(token.address)) {
            tokenMap[coinType] = token
            continue
          }
        }
      }
    }

    const unFindArray = coinTypes.filter((coinType: string) => {
      return tokenMap[coinType] === undefined
    })

    for (const coinType of unFindArray) {
      const metadataKey = `${coinType}_metadata`
      const metadata = this.getCache<CoinConfig>(metadataKey)
      if (metadata !== undefined) {
        tokenMap[coinType] = metadata as CoinConfig
      } else {
        const data = await this._sdk.fullClient.getCoinMetadata({
          coinType,
        })
        if (data) {
          const token: CoinConfig = {
            id: data.id as string,
            pyth_id: '',
            name: data.name,
            symbol: data.symbol,
            official_symbol: data.symbol,
            coingecko_id: '',
            decimals: data.decimals,
            project_url: '',
            logo_url: data.iconUrl as string,
            address: coinType,
          }
          tokenMap[coinType] = token

          this.updateCache(metadataKey, token, cacheTime24h)
        }
      }
    }

    return tokenMap
  }

  /**
   * Get coin config list.
   * @param forceRefresh
   * @returns
   */
  async getCoinConfigs(forceRefresh = false, transformExtensions = true): Promise<CoinConfig[]> {
    const { coin_list_handle } = this.sdk.sdkOptions.cetus_config.config
    const cacheKey = `${coin_list_handle}_getCoinConfigs`
    const cacheData = this.getCache<CoinConfig[]>(cacheKey, forceRefresh)
    if (cacheData) {
      return cacheData
    }
    const res = await getDynamicFields(this._sdk, coin_list_handle)
    const warpIds = res.data.map((item) => {
      return item.objectId
    })
    const objects = await multiGetObjects(this._sdk, warpIds, { showContent: true })
    const coinList: CoinConfig[] = []
    objects.forEach((object) => {
      let fields = getObjectFields(object) as ObjectContentFields
      fields = fields.value.fields
      const coin: any = { ...fields }

      coin.id = getObjectId(object)
      coin.address = extractStructTagFromType(fields.coin_type.fields.name).full_address
      if (fields.pyth_id) {
        coin.pyth_id = normalizeSuiObjectId(fields.pyth_id)
      }

      this.transformExtensions(coin, fields.extension_fields.fields.contents, transformExtensions)

      delete coin.coin_type

      coinList.push({ ...coin })
    })
    this.updateCache(cacheKey, coinList, cacheTime24h)
    return coinList
  }

  /**
   * Get clmm pool config list.
   * @param forceRefresh
   * @returns
   */
  async getClmmPoolConfigs(forceRefresh = false, transformExtensions = true): Promise<ClmmPoolConfig[]> {
    const { clmm_pools_handle } = this.sdk.sdkOptions.cetus_config.config
    const cacheKey = `${clmm_pools_handle}_getClmmPoolConfigs`
    const cacheData = this.getCache<ClmmPoolConfig[]>(cacheKey, forceRefresh)
    if (cacheData) {
      return cacheData
    }
    const res = await getDynamicFields(this._sdk, clmm_pools_handle)
    const warpIds = res.data.map((item) => {
      return item.objectId
    })
    const objects = await multiGetObjects(this._sdk, warpIds, { showContent: true })
    const poolList: ClmmPoolConfig[] = []
    objects.forEach((object) => {
      let fields = getObjectFields(object) as ObjectContentFields
      fields = fields.value.fields
      const pool: any = { ...fields }

      pool.id = getObjectId(object)
      pool.pool_address = normalizeSuiObjectId(fields.pool_address)

      this.transformExtensions(pool, fields.extension_fields.fields.contents, transformExtensions)

      poolList.push({ ...pool })
    })
    this.updateCache(cacheKey, poolList, cacheTime24h)
    return poolList
  }

  /**
   * Get launchpad pool config list.
   * @param forceRefresh
   * @returns
   */
  async getLaunchpadPoolConfigs(forceRefresh = false, transformExtensions = true): Promise<LaunchpadPoolConfig[]> {
    const { launchpad_pools_handle } = this.sdk.sdkOptions.cetus_config.config
    const cacheKey = `${launchpad_pools_handle}_getLaunchpadPoolConfigs`
    const cacheData = this.getCache<LaunchpadPoolConfig[]>(cacheKey, forceRefresh)
    if (cacheData) {
      return cacheData
    }
    const res = await getDynamicFields(this._sdk, launchpad_pools_handle)
    const warpIds = res.data.map((item) => {
      return item.objectId
    })
    const objects = await multiGetObjects(this._sdk, warpIds, { showContent: true })
    const poolList: LaunchpadPoolConfig[] = []
    objects.forEach((object) => {
      let fields = getObjectFields(object) as ObjectContentFields
      fields = fields.value.fields
      const pool: any = { ...fields }

      pool.id = getObjectId(object)
      pool.pool_address = normalizeSuiObjectId(fields.pool_address)

      this.transformExtensions(pool, fields.extension_fields.fields.contents, transformExtensions)
      const social_medias: {
        name: string
        link: string
      }[] = []
      fields.social_media.fields.contents.forEach((item: any) => {
        social_medias.push({
          name: item.fields.value.fields.name,
          link: item.fields.value.fields.link,
        })
      })
      pool.social_media = social_medias
      try {
        pool.regulation = decodeURIComponent(Base64.decode(pool.regulation).replace(/%/g, '%25'))
      } catch (error) {
        pool.regulation = Base64.decode(pool.regulation)
      }

      poolList.push({ ...pool })
    })
    this.updateCache(cacheKey, poolList, cacheTime24h)
    return poolList
  }

  private transformExtensions(coin: any, dataArray: any[], transformExtensions = true) {
    const extensions: any[] = []
    for (const item of dataArray) {
      const { key } = item.fields
      let { value } = item.fields
      if (key === 'labels') {
        try {
          value = JSON.parse(decodeURIComponent(Base64.decode(value)))
        } catch (error) {}
      }
      coin[key] = value
      extensions.push({
        key,
        value,
      })
    }

    delete coin.extension_fields

    if (!transformExtensions) {
      coin.extensions = extensions
    }
  }

  /**
   * Get the token config event.
   *
   * @param forceRefresh Whether to force a refresh of the event.
   * @returns The token config event.
   */
  async getCetusConfig(forceRefresh = false): Promise<CetusConfigs> {
    const packageObjectId = this._sdk.sdkOptions.cetus_config.config_display
    const cacheKey = `${packageObjectId}_getCetusConfig`

    const cacheData = this.getCache<CetusConfigs>(cacheKey, forceRefresh)

    if (cacheData !== undefined) {
      return cacheData
    }

    const packageObject = await this._sdk.fullClient.getObject({
      id: packageObjectId,
      options: {
        showPreviousTransaction: true,
      },
    })

    const previousTx = getObjectPreviousTransactionDigest(packageObject) as string
    const objects = await queryEvents(this._sdk, { Transaction: previousTx })
    let tokenConfig: CetusConfigs = {
      coin_list_id: '',
      launchpad_pools_id: '',
      clmm_pools_id: '',
      admin_cap_id: '',
      global_config_id: '',
      coin_list_handle: '',
      launchpad_pools_handle: '',
      clmm_pools_handle: '',
    }

    if (objects.data.length > 0) {
      for (const item of objects.data) {
        const formatType = extractStructTagFromType(item.type)
        switch (formatType.name) {
          case `InitCoinListEvent`:
            tokenConfig.coin_list_id = item.parsedJson.coin_list_id
            break
          case `InitLaunchpadPoolsEvent`:
            tokenConfig.launchpad_pools_id = item.parsedJson.launchpad_pools_id
            break
          case `InitClmmPoolsEvent`:
            tokenConfig.clmm_pools_id = item.parsedJson.pools_id
            break
          case `InitConfigEvent`:
            tokenConfig.global_config_id = item.parsedJson.global_config_id
            tokenConfig.admin_cap_id = item.parsedJson.admin_cap_id
            break
          default:
            break
        }
      }
    }
    tokenConfig = await this.getCetusConfigHandle(tokenConfig)
    if (tokenConfig.clmm_pools_id.length > 0) {
      this.updateCache(cacheKey, tokenConfig, cacheTime24h)
    }
    return tokenConfig
  }

  private async getCetusConfigHandle(tokenConfig: CetusConfigs): Promise<CetusConfigs> {
    const warpIds = [tokenConfig.clmm_pools_id, tokenConfig.coin_list_id, tokenConfig.launchpad_pools_id]

    const res = await this._sdk.fullClient.multiGetObjects({ ids: warpIds, options: { showContent: true } })

    res.forEach((item) => {
      const fields = getObjectFields(item) as ObjectContentFields
      const type = getObjectType(item) as ObjectType
      switch (extractStructTagFromType(type).name) {
        case 'ClmmPools':
          tokenConfig.clmm_pools_handle = fields.pools.fields.id.id
          break
        case 'CoinList':
          tokenConfig.coin_list_handle = fields.coins.fields.id.id
          break
        case 'LaunchpadPools':
          tokenConfig.launchpad_pools_handle = fields.pools.fields.id.id
          break
        default:
          break
      }
      console.log('type : ', type)
      console.log('fields : ', fields)
    })

    return tokenConfig
  }

  /**
   * Updates the cache for the given key.
   *
   * @param key The key of the cache entry to update.
   * @param data The data to store in the cache.
   * @param time The time in minutes after which the cache entry should expire.
   */
  updateCache(key: string, data: SuiResource, time = cacheTime5min) {
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
  getCache<T>(key: string, forceRefresh = false): T | undefined {
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
