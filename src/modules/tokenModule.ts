/* eslint-disable class-methods-use-this */
import { Base64 } from 'js-base64'
import { getObjectPreviousTransactionDigest, TransactionBlock } from '@mysten/sui.js'
import { SuiResource, SuiObjectIdType, SuiAddressType } from '../types/sui'
import { CachedContent } from '../utils/cachedContent'
import { extractStructTagFromType } from '../utils/contracts'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { loopToGetAllQueryEvents } from '../utils'

export const cacheTime5min = 5 * 60 * 1000
export const cacheTime24h = 24 * 60 * 60 * 1000
function getFutureTime(interval: number) {
  return Date.parse(new Date().toString()) + interval
}

export type TokenInfo = {
  name: string
  symbol: string
  official_symbol: string
  coingecko_id: string
  decimals: number
  project_url: string
  logo_url: string
  address: string
} & Record<string, any>

export type PoolInfo = {
  symbol: string
  name: string
  decimals: number
  fee: string
  tick_spacing: number
  type: string
  address: string
  coin_a_address: string
  coin_b_address: string
  project_url: string
  sort: number
  is_display_rewarder: boolean
  rewarder_display1: boolean
  rewarder_display2: boolean
  rewarder_display3: boolean
  is_stable: boolean
} & Record<string, any>

export type TokenConfigEvent = {
  coin_registry_id: SuiObjectIdType
  coin_list_owner: SuiObjectIdType
  pool_registry_id: SuiObjectIdType
  pool_list_owner: SuiObjectIdType
}

export class TokenModule implements IModule {
  protected _sdk: SDK

  private readonly _cache: Record<string, CachedContent> = {}

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  async getAllRegisteredTokenList(forceRefresh = false): Promise<TokenInfo[]> {
    const list = await this.factchTokenList('', forceRefresh)
    return list
  }

  async getOwnerTokenList(listOwnerAddr = '', forceRefresh = false): Promise<TokenInfo[]> {
    const list = await this.factchTokenList(listOwnerAddr, forceRefresh)
    return list
  }

  async getAllRegisteredPoolList(forceRefresh = false): Promise<PoolInfo[]> {
    const list = await this.factchPoolList('', forceRefresh)
    return list
  }

  async getOwnerPoolList(listOwnerAddr = '', forceRefresh = false): Promise<PoolInfo[]> {
    const list = await this.factchPoolList(listOwnerAddr, forceRefresh)
    return list
  }

  async getWarpPoolList(forceRefresh = false): Promise<PoolInfo[]> {
    const list = await this.factchWarpPoolList('', '', forceRefresh)
    return list
  }

  async getOwnerWarpPoolList(poolOwnerAddr = '', coinOwnerAddr = '', forceRefresh = false): Promise<PoolInfo[]> {
    const list = await this.factchWarpPoolList(poolOwnerAddr, coinOwnerAddr, forceRefresh)
    return list
  }

  async getTokenListByCoinTypes(coinTypes: SuiAddressType[]): Promise<Record<string, TokenInfo>> {
    const tokenMap: Record<string, TokenInfo> = {}
    const cacheKey = `getAllRegisteredTokenList`

    const cacheData = this.getCacheData(cacheKey)

    if (cacheData !== null) {
      const tokenList = cacheData as TokenInfo[]
      for (const coinType of coinTypes) {
        for (const token of tokenList) {
          if (coinType === token.address) {
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
      const metadata = this.getCacheData(metadataKey)
      if (metadata !== null) {
        tokenMap[coinType] = metadata as TokenInfo
      } else {
        // eslint-disable-next-line no-await-in-loop
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

    if (!forceRefresh) {
      const cacheData = this.getCacheData(cacheKey)
      if (cacheData !== null) {
        return cacheData as TokenInfo[]
      }
    }

    const isOwnerRequest = listOwnerAddr.length > 0

    const tx = new TransactionBlock()
    tx.moveCall({
      target: `${token.token_display}::coin_list::${isOwnerRequest ? 'fetch_full_list' : 'fetch_all_registered_coin_info'}`,
      arguments: isOwnerRequest
        ? [tx.pure(token.config.coin_registry_id), tx.pure(listOwnerAddr)]
        : [tx.pure(token.config.coin_registry_id)],
    })
    const simulateRes = await this.sdk.fullClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: simulationAccount.address,
    })

    const tokenList: TokenInfo[] = []

    simulateRes.events?.forEach((item: any) => {
      const formatType = extractStructTagFromType(item.type)
      if (formatType.full_address === `${token.token_display}::coin_list::FetchCoinListEvent`) {
        item.parsedJson.full_list.value_list.forEach((item: any) => {
          tokenList.push(this.transformData(item, false))
        })
      }
    })
    this.updateCache(cacheKey, tokenList, cacheTime24h)
    return tokenList
  }

  private async factchPoolList(listOwnerAddr = '', forceRefresh = false): Promise<PoolInfo[]> {
    const { simulationAccount, token } = this.sdk.sdkOptions
    const cacheKey = `getAllRegisteredPoolList`
    if (!forceRefresh) {
      const cacheData = this.getCacheData(cacheKey)
      if (cacheData !== null) {
        return cacheData as PoolInfo[]
      }
    }

    const isOwnerRequest = listOwnerAddr.length > 0

    const typeArguments: string[] = []
    const args = isOwnerRequest ? [token.config.pool_registry_id, listOwnerAddr] : [token.config.pool_registry_id]
    const payload = {
      packageObjectId: token.token_display,
      module: 'lp_list',
      function: isOwnerRequest ? 'fetch_full_list' : 'fetch_all_registered_coin_info',
      gasBudget: 10000,
      typeArguments,
      arguments: args,
    }
    console.log('payload: ', payload)

    const tx = new TransactionBlock()
    tx.moveCall({
      target: `${token.token_display}::lp_list::${isOwnerRequest ? 'fetch_full_list' : 'fetch_all_registered_coin_info'}`,
      arguments: isOwnerRequest
        ? [tx.pure(token.config.pool_registry_id), tx.pure(listOwnerAddr)]
        : [tx.pure(token.config.pool_registry_id)],
    })

    const simulateRes = await this.sdk.fullClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: simulationAccount.address,
    })

    const tokenList: PoolInfo[] = []
    simulateRes.events?.forEach((item: any) => {
      const formatType = extractStructTagFromType(item.type)
      if (formatType.full_address === `${token.token_display}::lp_list::FetchPoolListEvent`) {
        item.parsedJson.full_list.value_list.forEach((item: any) => {
          tokenList.push(this.transformData(item, true))
        })
      }
    })
    this.updateCache(cacheKey, tokenList, cacheTime24h)
    return tokenList
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

  async getTokenConfigEvent(forceRefresh = false): Promise<TokenConfigEvent> {
    const packageObjectId = this._sdk.sdkOptions.token.token_display
    const cacheKey = `${packageObjectId}_getTokenConfigEvent`

    const cacheData = this._cache[cacheKey]

    if (cacheData !== undefined && cacheData.getCacheData() && !forceRefresh) {
      return cacheData.value as TokenConfigEvent
    }

    const packageObject = await this._sdk.fullClient.getObject({
      id: packageObjectId,
      options: {
        showPreviousTransaction: true,
      },
    })

    const previousTx = getObjectPreviousTransactionDigest(packageObject) as string
    const objects = await loopToGetAllQueryEvents(this._sdk, {
      query: { Transaction: previousTx },
    })
    const tokenConfigEvent: TokenConfigEvent = {
      coin_registry_id: '',
      pool_registry_id: '',
      coin_list_owner: '',
      pool_list_owner: '',
    }
    // console.log(objects.data)

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
            // eslint-disable-next-line no-empty
          } catch (error) {}
        }
        token[key] = value
      }
      delete token.extensions
    }
    return token
  }

  public updateCache(key: string, data: SuiResource, time = cacheTime5min) {
    let cacheData = this._cache[key]
    if (cacheData) {
      cacheData.overdueTime = getFutureTime(time)
      cacheData.value = data
    } else {
      cacheData = new CachedContent(data, getFutureTime(time))
    }
    this._cache[key] = cacheData
  }

  private getCacheData(cacheKey: string): SuiResource | null {
    const cacheData = this._cache[cacheKey]
    if (cacheData !== undefined && cacheData.getCacheData()) {
      return cacheData.value
    }
    return null
  }
}
