import { Connection, JsonRpcProvider, PaginatedCoins } from '@mysten/sui.js'
import { PoolModule } from './modules/poolModule'
import { PositionModule } from './modules/positionModule'
import { RewarderModule } from './modules/rewarderModule'
import { RouterModule } from './modules/routerModule'
import { SwapModule } from './modules/swapModule'
import { TokenModule } from './modules/tokenModule'
import { SuiObjectIdType } from './types/sui'
import { extractStructTagFromType, patchFixSuiObjectId } from './utils'
import { ClmmConfig, CoinAsset, TokenConfig } from './types'

export type SdkOptions = {
  fullRpcUrl: string
  faucetURL: string
  simulationAccount: {
    address: string
  }
  token: {
    token_display: SuiObjectIdType
    config: TokenConfig
  }
  clmm: {
    clmm_display: SuiObjectIdType
    clmm_router: SuiObjectIdType
    config: ClmmConfig
  }
}
/**
 * The entry class of CetusClmmSDK, which is almost responsible for all interactions with CLMM.
 */
export class CetusClmmSDK {
  /**
   * RPC provider on the SUI chain
   */
  protected _fullClient: JsonRpcProvider

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
   * Provide interact with pool and token config (contain token base info for metadat).
   */
  protected _token: TokenModule

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
    this._fullClient = new JsonRpcProvider(
      new Connection({
        fullnode: options.fullRpcUrl,
        faucet: options.faucetURL,
      })
    )
    this._swap = new SwapModule(this)
    this._pool = new PoolModule(this)
    this._position = new PositionModule(this)
    this._rewarder = new RewarderModule(this)
    this._router = new RouterModule(this)
    this._token = new TokenModule(this)

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
    return this._fullClient
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
  async getOwnerCoinAssets(suiAddress: string, coinType?: string | null): Promise<CoinAsset[]> {
    const allCoinAsset: CoinAsset[] = []
    let nextCursor: string | null = null

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
