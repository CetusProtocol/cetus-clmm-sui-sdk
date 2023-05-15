import { Connection, JsonRpcProvider } from '@mysten/sui.js'
import { BoosterModule } from './modules/boosterModule'
import { LaunchpadModule } from './modules/launchpadModule'
import { MakerModule } from './modules/makerModule'
import { PoolModule } from './modules/poolModule'
import { PositionModule } from './modules/positionModule'
import { ResourcesModule } from './modules/resourcesModule'
import { RewarderModule } from './modules/rewarderModule'
import { RouterModule } from './modules/routerModule'
import { SwapModule } from './modules/swapModule'
import { TokenModule } from './modules/tokenModule'
import { XCetusModule } from './modules/xcetusModule'
import { SuiObjectIdType } from './types/sui'

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
    config_display: SuiObjectIdType
    config: {
      pools_id: SuiObjectIdType
      admin_cap_id: SuiObjectIdType
      config_cap_id: SuiObjectIdType
      config_pools_id: SuiObjectIdType
    }
  }
  xcetus: {
    xcetus_display: SuiObjectIdType
    xcetus_router: SuiObjectIdType
    dividends_display: SuiObjectIdType
    dividends_router: SuiObjectIdType
    cetus_faucet: SuiObjectIdType
    config: {
      xcetus_manager_id: SuiObjectIdType
      lock_manager_id: SuiObjectIdType
      lock_handle_id: SuiObjectIdType
      dividend_manager_id: SuiObjectIdType
    }
  }
  booster: {
    booster_display: SuiObjectIdType
    booster_router: SuiObjectIdType
    config: {
      booster_config_id: SuiObjectIdType
      booster_pool_handle: SuiObjectIdType
    }
  }
  maker_bonus: {
    maker_display: SuiObjectIdType
    maker_router: SuiObjectIdType
    config: {
      maker_config_id: SuiObjectIdType
      maker_pool_handle: SuiObjectIdType
    }
  }
  clmm: {
    clmm_display: SuiObjectIdType
    config: {
      global_config_id: SuiObjectIdType
      global_vault_id: SuiObjectIdType
      pools_id: SuiObjectIdType
    }
    clmm_router: {
      cetus: SuiObjectIdType
      deepbook: SuiObjectIdType
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

  protected _xcetusModule: XCetusModule

  protected _boosterModule: BoosterModule

  protected _makerModule: MakerModule

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
    this._resources = new ResourcesModule(this)
    this._pool = new PoolModule(this)
    this._position = new PositionModule(this)
    this._rewarder = new RewarderModule(this)
    this._router = new RouterModule(this)
    this._token = new TokenModule(this)
    this._launchpad = new LaunchpadModule(this)
    this._xcetusModule = new XCetusModule(this)
    this._boosterModule = new BoosterModule(this)
    this._makerModule = new MakerModule(this)
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

  get XCetusModule() {
    return this._xcetusModule
  }

  get BoosterModule() {
    return this._boosterModule
  }

  get MakerModule() {
    return this._makerModule
  }
}
