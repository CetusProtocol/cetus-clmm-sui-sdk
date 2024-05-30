import { CoinBalance } from '@mysten/sui/client'
import { PoolModule } from './modules/poolModule'
import { PositionModule } from './modules/positionModule'
import { RewarderModule } from './modules/rewarderModule'
import { RouterModule } from './modules/routerModule'
import { SwapModule } from './modules/swapModule'
import { TokenModule } from './modules/tokenModule'
import { RouterModuleV2 } from './modules/routerModuleV2'
import { CachedContent, cacheTime24h, extractStructTagFromType, getFutureTime, patchFixSuiObjectId } from './utils'
import { CetusConfigs, ClmmConfig, CoinAsset, Package, SuiResource, SuiAddressType, TokenConfig } from './types'
import { ConfigModule } from './modules'
import { RpcModule } from './modules/rpcModule'

/**
 * Represents options and configurations for an SDK.
 */
export type SdkOptions = {
  /**
   * The full URL for interacting with the RPC (Remote Procedure Call) service.
   */
  fullRpcUrl: string

  /**
   * Optional URL for the faucet service.
   */
  faucetURL?: string

  /**
   * Configuration for the simulation account.
   */
  simulationAccount: {
    /**
     * The address of the simulation account.
     */
    address: string
  }

  /**
   * Package containing faucet-related configurations.
   */
  faucet?: Package

  /**
   * Package containing token-related configurations.
   */
  token?: Package<TokenConfig>

  /**
   * Package containing Cetus protocol configurations.
   */
  cetus_config: Package<CetusConfigs>

  /**
   * Package containing Cryptocurrency Liquidity Mining Module (CLMM) pool configurations.
   */
  clmm_pool: Package<ClmmConfig>

  /**
   * Package containing integration-related configurations.
   */
  integrate: Package

  /**
   * Package containing DeepBook-related configurations.
   */
  deepbook: Package

  /**
   * Package containing DeepBook endpoint version 2 configurations.
   */
  deepbook_endpoint_v2: Package

  /**
   * The URL for the aggregator service.
   */
  aggregatorUrl: string

  /**
   * The URL for the swap count
   */
  swapCountUrl?: string
}

/**
 * The entry class of CetusClmmSDK, which is almost responsible for all interactions with CLMM.
 */
export class CetusClmmSDK {
  private readonly _cache: Record<string, CachedContent> = {}

  /**
   * RPC provider on the SUI chain
   */
  protected _rpcModule: RpcModule

  /**
   * Provide interact with clmm pools with a pool router interface.
   */
  protected _pool: PoolModule

  /**
   * Provide interact with clmm position with a position router interface.
   */
  protected _position: PositionModule

  /**
   * Provide interact with a pool swap router interface.
   */
  protected _swap: SwapModule

  /**
   * Provide interact  with a position rewarder interface.
   */
  protected _rewarder: RewarderModule

  /**
   * Provide interact with a pool router interface.
   */
  protected _router: RouterModule

  /**
   * Provide interact with a pool routerV2 interface.
   */
  protected _router_v2: RouterModuleV2

  /**
   * Provide interact with pool and token config (contain token base info for metadat).
   * @deprecated Please use CetusConfig instead
   */
  protected _token: TokenModule

  /**
   * Provide  interact with clmm pool and coin and launchpad pool config
   */
  protected _config: ConfigModule

  /**
   *  Provide sdk options
   */
  protected _sdkOptions: SdkOptions

  /**
   * After connecting the wallet, set the current wallet address to senderAddress.
   */
  protected _senderAddress = ''

  constructor(options: SdkOptions) {
    this._sdkOptions = options
    this._rpcModule = new RpcModule({
      url: options.fullRpcUrl,
    })

    this._swap = new SwapModule(this)
    this._pool = new PoolModule(this)
    this._position = new PositionModule(this)
    this._rewarder = new RewarderModule(this)
    this._router = new RouterModule(this)
    this._router_v2 = new RouterModuleV2(this)
    this._token = new TokenModule(this)
    this._config = new ConfigModule(this)

    patchFixSuiObjectId(this._sdkOptions)
  }

  /**
   * Getter for the sender address property.
   * @returns {SuiAddressType} The sender address.
   */
  get senderAddress(): SuiAddressType {
    return this._senderAddress
  }

  /**
   * Setter for the sender address property.
   * @param {string} value - The new sender address value.
   */
  set senderAddress(value: string) {
    this._senderAddress = value
  }

  /**
   * Getter for the Swap property.
   * @returns {SwapModule} The Swap property value.
   */
  get Swap(): SwapModule {
    return this._swap
  }

  /**
   * Getter for the fullClient property.
   * @returns {RpcModule} The fullClient property value.
   */
  get fullClient(): RpcModule {
    return this._rpcModule
  }

  /**
   * Getter for the sdkOptions property.
   * @returns {SdkOptions} The sdkOptions property value.
   */
  get sdkOptions(): SdkOptions {
    return this._sdkOptions
  }

  /**
   * Getter for the Pool property.
   * @returns {PoolModule} The Pool property value.
   */
  get Pool(): PoolModule {
    return this._pool
  }

  /**
   * Getter for the Position property.
   * @returns {PositionModule} The Position property value.
   */
  get Position(): PositionModule {
    return this._position
  }

  /**
   * Getter for the Rewarder property.
   * @returns {RewarderModule} The Rewarder property value.
   */
  get Rewarder(): RewarderModule {
    return this._rewarder
  }

  /**
   * Getter for the Router property.
   * @returns {RouterModule} The Router property value.
   */
  get Router(): RouterModule {
    return this._router
  }

  /**
   * Getter for the RouterV2 property.
   * @returns {RouterModuleV2} The RouterV2 property value.
   */
  get RouterV2(): RouterModuleV2 {
    return this._router_v2
  }

  /**
   * Getter for the CetusConfig property.
   * @returns {ConfigModule} The CetusConfig property value.
   */
  get CetusConfig(): ConfigModule {
    return this._config
  }

  /**
   * @deprecated Token is no longer maintained. Please use CetusConfig instead
   */
  get Token() {
    return this._token
  }

  /**
   * Gets all coin assets for the given owner and coin type.
   *
   * @param suiAddress The address of the owner.
   * @param coinType The type of the coin.
   * @returns an array of coin assets.
   */
  async getOwnerCoinAssets(suiAddress: string, coinType?: string | null, forceRefresh = true): Promise<CoinAsset[]> {
    const allCoinAsset: CoinAsset[] = []
    let nextCursor: string | null | undefined = null

    const cacheKey = `${this.sdkOptions.fullRpcUrl}_${suiAddress}_${coinType}_getOwnerCoinAssets`
    const cacheData = this.getCache<CoinAsset[]>(cacheKey, forceRefresh)
    if (cacheData) {
      return cacheData
    }

    while (true) {
      const allCoinObject: any = await (coinType
        ? this.fullClient.getCoins({
            owner: suiAddress,
            coinType,
            cursor: nextCursor,
          })
        : this.fullClient.getAllCoins({
            owner: suiAddress,
            cursor: nextCursor,
          }))

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
    this.updateCache(cacheKey, allCoinAsset, 30 * 1000)
    return allCoinAsset
  }

  /**
   * Gets all coin balances for the given owner and coin type.
   *
   * @param suiAddress The address of the owner.
   * @param coinType The type of the coin.
   * @returns an array of coin balances.
   */
  async getOwnerCoinBalances(suiAddress: string, coinType?: string | null): Promise<CoinBalance[]> {
    let allCoinBalance: CoinBalance[] = []

    if (coinType) {
      const res = await this.fullClient.getBalance({
        owner: suiAddress,
        coinType,
      })
      allCoinBalance = [res]
    } else {
      const res = await this.fullClient.getAllBalances({
        owner: suiAddress,
      })
      allCoinBalance = [...res]
    }
    return allCoinBalance
  }

  /**
   * Updates the cache for the given key.
   *
   * @param key The key of the cache entry to update.
   * @param data The data to store in the cache.
   * @param time The time in minutes after which the cache entry should expire.
   */
  updateCache(key: string, data: SuiResource, time = cacheTime24h) {
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
