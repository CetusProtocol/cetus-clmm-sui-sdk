import { PoolModule } from './modules/poolModule'
import { PositionModule } from './modules/positionModule'
import { RewarderModule } from './modules/rewarderModule'
import { RouterModule } from './modules/routerModule'
import { SwapModule } from './modules/swapModule'
import { TokenModule } from './modules/tokenModule'
import { RouterModuleV2 } from './modules/routerModuleV2'
import { extractStructTagFromType, patchFixSuiObjectId } from './utils'
import { CetusConfigs, ClmmConfig, CoinAsset, Package, TokenConfig } from './types'
import { ConfigModule } from './modules'
import { RpcModule } from './modules/rpcModule'
import { PaginatedCoins } from '@mysten/sui.js/dist/cjs/client/types/generated'

export type SdkOptions = {
  fullRpcUrl: string
  faucetURL?: string
  simulationAccount: {
    address: string
  }
  faucet?: Package
  token?: Package<TokenConfig>
  cetus_config: Package<CetusConfigs>
  clmm_pool: Package<ClmmConfig>
  integrate: Package
  deepbook: Package
  deepbook_endpoint_v2: Package
  aggregatorUrl: string
}

/**
 * The entry class of CetusClmmSDK, which is almost responsible for all interactions with CLMM.
 */
export class CetusClmmSDK {
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

  protected _router_v2: RouterModuleV2

  /**
   * Provide interact with pool and token config (contain token base info for metadat).
   */
  protected _token: TokenModule

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
    this._rpcModule = new RpcModule(
      {
        url: options.fullRpcUrl
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

  get senderAddress() {
    return this._senderAddress
  }

  set senderAddress(value: string) {
    this._senderAddress = value
  }

  get Swap() {
    return this._swap
  }

  get fullClient() {
    return this._rpcModule
  }

  get sdkOptions() {
    return this._sdkOptions
  }

  get Pool() {
    return this._pool
  }

  get Position() {
    return this._position
  }

  get Rewarder() {
    return this._rewarder
  }

  get Router() {
    return this._router
  }

  get RouterV2() {
    return this._router_v2
  }

  /**
   * @deprecated Token is no longer maintained. Please use CetusConfig instead
   */
  get Token() {
    return this._token
  }

  get CetusConfig() {
    return this._config
  }

  /**
   * Gets all coin assets for the given owner and coin type.
   *
   * @param suiAddress The address of the owner.
   * @param coinType The type of the coin.
   * @returns an array of coin assets.
   */
  async getOwnerCoinAssets(suiAddress: string, coinType?: string | null): Promise<CoinAsset[]> {
    const allCoinAsset: CoinAsset[] = []
    let nextCursor: string | null | undefined = null

    while (true) {
      const allCoinObject: PaginatedCoins = await (coinType
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
    return allCoinAsset
  }
}
