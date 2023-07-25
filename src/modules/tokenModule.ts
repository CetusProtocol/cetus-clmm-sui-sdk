import { Base64 } from 'js-base64'
import { getObjectPreviousTransactionDigest, normalizeSuiObjectId, TransactionBlock } from '@mysten/sui.js'
import { getPackagerConfigs, PoolInfo, TokenConfigEvent, TokenInfo } from '../types'
import { SuiResource, SuiAddressType } from '../types/sui'
import { CachedContent, cacheTime24h, cacheTime5min, getFutureTime } from '../utils/cachedContent'
import { extractStructTagFromType, normalizeCoinType } from '../utils/contracts'
import { CetusClmmSDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { queryEvents } from '../utils'

/**
 * Helper class to help interact with pool and token config
 * @deprecated TokenModule is no longer maintained. Please use ConfigModule instead
 */
export class TokenModule implements IModule {
  protected _sdk: CetusClmmSDK

  private readonly _cache: Record<string, CachedContent> = {}

  constructor(sdk: CetusClmmSDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  /**
   * Get all registered token list.
   * @param forceRefresh
   * @returns
   */
  async getAllRegisteredTokenList(forceRefresh = false): Promise<TokenInfo[]> {
    const list = await this.factchTokenList('', forceRefresh)
    return list
  }

  /**
   * Get token list by owner address.
   * @param listOwnerAddr
   * @param forceRefresh
   * @returns
   */
  async getOwnerTokenList(listOwnerAddr = '', forceRefresh = false): Promise<TokenInfo[]> {
    const list = await this.factchTokenList(listOwnerAddr, forceRefresh)
    return list
  }

  /**
   * Get all registered pool list
   * @param forceRefresh
   * @returns
   */
  async getAllRegisteredPoolList(forceRefresh = false): Promise<PoolInfo[]> {
    const list = await this.factchPoolList('', forceRefresh)
    return list
  }

  /**
   * Get pool list by owner address.
   * @param listOwnerAddr
   * @param forceRefresh
   * @returns
   */
  async getOwnerPoolList(listOwnerAddr = '', forceRefresh = false): Promise<PoolInfo[]> {
    const list = await this.factchPoolList(listOwnerAddr, forceRefresh)
    return list
  }

  /**
   * Get warp pool list.
   * @param forceRefresh
   * @returns
   */
  async getWarpPoolList(forceRefresh = false): Promise<PoolInfo[]> {
    const list = await this.factchWarpPoolList('', '', forceRefresh)
    return list
  }

  /**
   * Get warp pool list by pool owner address and coin owner address.
   * @param poolOwnerAddr
   * @param coinOwnerAddr
   * @param forceRefresh
   * @returns
   */
  async getOwnerWarpPoolList(poolOwnerAddr = '', coinOwnerAddr = '', forceRefresh = false): Promise<PoolInfo[]> {
    const list = await this.factchWarpPoolList(poolOwnerAddr, coinOwnerAddr, forceRefresh)
    return list
  }

  /**
   * Get token list by coin types.
   * @param coinTypes
   * @returns
   */
  async getTokenListByCoinTypes(coinTypes: SuiAddressType[]): Promise<Record<string, TokenInfo>> {
    const tokenMap: Record<string, TokenInfo> = {}
    const cacheKey = `getAllRegisteredTokenList`
    const cacheData = this.getCache<TokenInfo[]>(cacheKey)

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
      const metadata = this.getCache<TokenInfo>(metadataKey)
      if (metadata !== undefined) {
        tokenMap[coinType] = metadata as TokenInfo
      } else {
        const data = await this._sdk.fullClient.getCoinMetadata({
          coinType,
        })
        if (data) {
          const token = {
            id: data.id,
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

  private async factchTokenList(listOwnerAddr = '', forceRefresh = false): Promise<TokenInfo[]> {
    const { simulationAccount, token } = this.sdk.sdkOptions

    const cacheKey = `getAllRegisteredTokenList`
    const cacheData = this.getCache<TokenInfo[]>(cacheKey, forceRefresh)

    if (cacheData !== undefined) {
      return cacheData
    }

    const isOwnerRequest = listOwnerAddr.length > 0
    const limit = 512
    let index = 0
    let allTokenList: TokenInfo[] = []

    if (token === undefined) {
      throw Error('please config token ofsdkOptions')
    }
    const tokenConfig = getPackagerConfigs(token)
    while (true) {
      const tx = new TransactionBlock()
      tx.moveCall({
        target: `${token.published_at}::coin_list::${
          isOwnerRequest ? 'fetch_full_list_with_limit' : 'fetch_all_registered_coin_info_with_limit'
        }`,
        arguments: isOwnerRequest
          ? [tx.pure(tokenConfig.coin_registry_id), tx.pure(listOwnerAddr), tx.pure(index), tx.pure(limit)]
          : [tx.pure(tokenConfig.coin_registry_id), tx.pure(index), tx.pure(limit)],
      })

      const simulateRes = await this.sdk.fullClient.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: simulationAccount.address,
      })

      const tokenList: TokenInfo[] = []

      simulateRes.events?.forEach((item: any) => {
        const formatType = extractStructTagFromType(item.type)
        if (formatType.full_address === `${token.published_at}::coin_list::FetchCoinListEvent`) {
          item.parsedJson.full_list.value_list.forEach((item: any) => {
            tokenList.push(this.transformData(item, false))
          })
        }
      })
      allTokenList = [...allTokenList, ...tokenList]
      if (tokenList.length < limit) {
        break
      } else {
        index = allTokenList.length
      }
    }

    return allTokenList
  }

  private async factchPoolList(listOwnerAddr = '', forceRefresh = false): Promise<PoolInfo[]> {
    const { simulationAccount, token } = this.sdk.sdkOptions
    const cacheKey = `getAllRegisteredPoolList`
    const cacheData = this.getCache<PoolInfo[]>(cacheKey, forceRefresh)

    if (cacheData !== undefined) {
      return cacheData
    }
    let allPoolList: PoolInfo[] = []
    const limit = 512
    let index = 0
    const isOwnerRequest = listOwnerAddr.length > 0

    if (token === undefined) {
      throw Error('please config token ofsdkOptions')
    }
    const tokenConfig = getPackagerConfigs(token)
    while (true) {
      const tx = new TransactionBlock()
      tx.moveCall({
        target: `${token.published_at}::lp_list::${
          isOwnerRequest ? 'fetch_full_list_with_limit' : 'fetch_all_registered_coin_info_with_limit'
        }`,
        arguments: isOwnerRequest
          ? [tx.pure(tokenConfig.pool_registry_id), tx.pure(listOwnerAddr), tx.pure(index), tx.pure(limit)]
          : [tx.pure(tokenConfig.pool_registry_id), tx.pure(index), tx.pure(limit)],
      })

      const simulateRes = await this.sdk.fullClient.devInspectTransactionBlock({
        transactionBlock: tx,
        sender: simulationAccount.address,
      })

      const poolList: PoolInfo[] = []
      simulateRes.events?.forEach((item: any) => {
        const formatType = extractStructTagFromType(item.type)
        if (formatType.full_address === `${token.published_at}::lp_list::FetchPoolListEvent`) {
          item.parsedJson.full_list.value_list.forEach((item: any) => {
            poolList.push(this.transformData(item, true))
          })
        }
      })

      allPoolList = [...allPoolList, ...poolList]
      if (poolList.length < limit) {
        break
      } else {
        index = allPoolList.length
      }
    }

    return allPoolList
  }

  private async factchWarpPoolList(poolOwnerAddr = '', coinOwnerAddr = '', forceRefresh = false): Promise<any[]> {
    const poolList = await this.factchPoolList(poolOwnerAddr, forceRefresh)
    if (poolList.length === 0) {
      return []
    }
    const tokenList = await this.factchTokenList(coinOwnerAddr, forceRefresh)

    const lpPoolArray: any[] = []
    for (const pool of poolList) {
      for (const token of tokenList) {
        if (token.address === pool.coin_a_address) {
          pool.coinA = token
        }
        if (token.address === pool.coin_b_address) {
          pool.coinB = token
        }
        continue
      }
      lpPoolArray.push(pool)
    }
    return lpPoolArray
  }

  /**
   * Get the token config event.
   *
   * @param forceRefresh Whether to force a refresh of the event.
   * @returns The token config event.
   */
  async getTokenConfigEvent(forceRefresh = false): Promise<TokenConfigEvent> {
    const packageObjectId = this._sdk.sdkOptions.token!.package_id
    const cacheKey = `${packageObjectId}_getTokenConfigEvent`

    const cacheData = this.getCache<TokenConfigEvent>(cacheKey, forceRefresh)

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
    const tokenConfigEvent: TokenConfigEvent = {
      coin_registry_id: '',
      pool_registry_id: '',
      coin_list_owner: '',
      pool_list_owner: '',
    }

    if (objects.data.length > 0) {
      objects.data.forEach((item: any) => {
        const formatType = extractStructTagFromType(item.type)
        if (item.transactionModule === 'coin_list') {
          switch (formatType.name) {
            case `InitListEvent`:
              tokenConfigEvent.coin_list_owner = item.parsedJson.list_id
              break
            case `InitRegistryEvent`:
              tokenConfigEvent.coin_registry_id = item.parsedJson.registry_id
              break
            default:
              break
          }
        } else if (item.transactionModule === 'lp_list') {
          switch (formatType.name) {
            case `InitListEvent<address>`:
              tokenConfigEvent.pool_list_owner = item.parsedJson.list_id
              break
            case `InitRegistryEvent<address>`:
              tokenConfigEvent.pool_registry_id = item.parsedJson.registry_id
              break
            default:
              break
          }
        }
      })
    }
    if (tokenConfigEvent.coin_registry_id.length > 0) {
      this.updateCache(cacheKey, tokenConfigEvent, cacheTime24h)
    }
    return tokenConfigEvent
  }

  private transformData(item: any, isPoolData: boolean): any {
    const token = { ...item }
    if (isPoolData) {
      try {
        token.coin_a_address = extractStructTagFromType(token.coin_a_address).full_address
        token.coin_b_address = extractStructTagFromType(token.coin_b_address).full_address
      } catch (error) {
        //
      }
    } else {
      token.address = extractStructTagFromType(token.address).full_address
    }
    if (item.extensions) {
      const extensionsDataArray = item.extensions.contents

      for (const item of extensionsDataArray) {
        const { key } = item
        let { value } = item
        if (key === 'labels') {
          try {
            value = JSON.parse(decodeURIComponent(Base64.decode(value)))
          } catch (error) {}
        }
        if (key === 'pyth_id') {
          value = normalizeSuiObjectId(value)
        }
        token[key] = value
      }
      delete token.extensions
    }
    return token
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
