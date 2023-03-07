import { Connection, JsonRpcProvider } from '@mysten/sui.js'
import { PoolModule } from './modules/poolModule'
import { PositionModule } from './modules/positionModule'
import { ResourcesModule } from './modules/resourcesModule'
import { RewarderModule } from './modules/rewarderModule'
import { RouterModule } from './modules/routerModule'
import { SwapModule } from './modules/swapModule'
import { TokenConfigEvent, TokenModule } from './modules/tokenModule'
import { SuiObjectIdType } from './types/sui'

export type SdkOptions = {
  fullRpcUrl: string
  faucetURL: string
  networkOptions: {
    simulationAccount: {
      address: string
    }
    token: {
      token_deployer: SuiObjectIdType
      config: TokenConfigEvent
    }
    modules: {
      cetus_clmm: SuiObjectIdType
      cetus_integrate: SuiObjectIdType
      integer_mate: SuiObjectIdType
      swap_partner: SuiObjectIdType
      config?: {
        global_config_id: SuiObjectIdType
        pools_id: SuiObjectIdType
      }
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

  constructor(options: SdkOptions) {
    this._sdkOptions = options
    this._fullClient = new JsonRpcProvider(
      new Connection({
        fullnode: options.fullRpcUrl,
        faucet: options.fullRpcUrl,
      })
    )
    this._swap = new SwapModule(this)
    this._resources = new ResourcesModule(this)
    this._pool = new PoolModule(this)
    this._position = new PositionModule(this)
    this._rewarder = new RewarderModule(this)
    this._router = new RouterModule(this)
    this._token = new TokenModule(this)
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
}
