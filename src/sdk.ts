import { Connection, JsonRpcProvider } from '@mysten/sui.js'
import { LaunchpadModule } from './modules/launchpadModule'
import { PoolModule } from './modules/poolModule'
import { PositionModule } from './modules/positionModule'
import { ResourcesModule } from './modules/resourcesModule'
import { RewarderModule } from './modules/rewarderModule'
import { RouterModule } from './modules/routerModule'
import { SwapModule } from './modules/swapModule'
import { TokenModule } from './modules/tokenModule'
import { XWhaleModule } from './modules/xwhaleModule'
import { SuiObjectIdType } from './types/sui'
import { GasConfig } from './utils/gas_config'

export type SdkOptions = {
  fullRpcUrl: string
  faucetURL: string
  simulationAccount: {
    address: string
  }
  token: {
    token_display: SuiObjectIdType
    config: {
      coin_registry_id: SuiObjectIdType
      coin_list_owner: SuiObjectIdType
      pool_registry_id: SuiObjectIdType
      pool_list_owner: SuiObjectIdType
    }
  }
  launchpad: {
    ido_display: SuiObjectIdType
    ido_router: SuiObjectIdType
    lock_display: SuiObjectIdType
    lock_router: SuiObjectIdType
    config: {
      pools_id: SuiObjectIdType
      admin_cap_id: SuiObjectIdType
      lock_manager_id: SuiObjectIdType
      config_cap_id: SuiObjectIdType
    }
  }
  xwhale: {
    xwhale_display: SuiObjectIdType
    xwhale_router: SuiObjectIdType
    dividends_display: SuiObjectIdType
    dividends_router: SuiObjectIdType
    booster_display: SuiObjectIdType
    booster_router: SuiObjectIdType
    whale_faucet: SuiObjectIdType
    config: {
      xwhale_manager_id: SuiObjectIdType
      lock_manager_id: SuiObjectIdType
      dividend_manager_id: SuiObjectIdType
    }
  }
  clmm: {
    clmm_display: SuiObjectIdType
    clmm_router: SuiObjectIdType
    config: {
      global_config_id: SuiObjectIdType
      global_vault_id: SuiObjectIdType
      pools_id: SuiObjectIdType
    }
  }
}

export class SDK {
  protected _fullClient: JsonRpcProvider

  protected _pool: PoolModule

  protected _position: PositionModule

  protected _swap: SwapModule

  protected _resources: ResourcesModule

  protected _rewarder: RewarderModule

  protected _router: RouterModule

  protected _token: TokenModule

  protected _sdkOptions: SdkOptions

  protected _launchpad: LaunchpadModule

  protected _xwhaleModule: XWhaleModule

  protected _senderAddress = ''

  protected _gasConfig: GasConfig

  constructor(options: SdkOptions) {
    this._sdkOptions = options
    this._fullClient = new JsonRpcProvider(
      new Connection({
        fullnode: options.fullRpcUrl,
        faucet: options.faucetURL,
      })
    )
    this._swap = new SwapModule(this)
    this._resources = new ResourcesModule(this)
    this._pool = new PoolModule(this)
    this._position = new PositionModule(this)
    this._rewarder = new RewarderModule(this)
    this._router = new RouterModule(this)
    this._token = new TokenModule(this)
    this._launchpad = new LaunchpadModule(this)
    this._xwhaleModule = new XWhaleModule(this)
    this._gasConfig = new GasConfig(1)
  }

  get senderAddress() {
    return this._senderAddress
  }

  set senderAddress(value: string) {
    this._senderAddress = value
  }

  set gasConfig(value: GasConfig) {
    this._gasConfig = value
  }

  get gasConfig() {
    return this._gasConfig
  }

  get Swap() {
    return this._swap
  }

  get fullClient() {
    return this._fullClient
  }

  get Resources() {
    return this._resources
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

  get Launchpad() {
    return this._launchpad
  }

  get XWhaleModule() {
    return this._xwhaleModule
  }
}
