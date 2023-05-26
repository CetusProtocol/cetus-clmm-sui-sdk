import { CoinPairType, Position } from './clmm_type'
import { SuiAddressType, SuiObjectIdType } from './sui'

export const BoosterRouterModule = 'router'

export const CONFIG_PERCENT_MULTIPER = 10000

export type BoosterInitEvent = {
  booster_config_id: SuiObjectIdType
  booster_pool_handle: SuiObjectIdType
}

export type BoosterPoolImmutables = {
  booster_type: SuiAddressType
  clmm_pool_id: SuiObjectIdType
  pool_id: SuiObjectIdType
} & CoinPairType

export type BoosterPoolState = {
  // the minimum rewarder percent which is used when the lock time ends but the `Position` has not been redeemed.
  basic_percent: number
  // hold the CoinA which is used for mint xwhale rewarder.
  balances: {
    balances_handle: SuiObjectIdType
    size: number
  }
  // the rewarder config about this `BoosterPool`, stores the information about the rewarder percent in different lock days.
  // the config k,v multiper is 10000. For example, k is 12%, here the store value is 1200.
  config: LockMultiplier[]
  // lock_nft_id -> LockPositionInfo. store the lock position info.
  lock_positions: {
    lock_positions_handle: SuiObjectIdType
    size: number
  }
  pool_id: SuiObjectIdType
  is_open: boolean
  index: number
}

export type BoosterPool = BoosterPoolImmutables & BoosterPoolState

export type LockMultiplier = {
  lock_day: number
  multiplier: number
}

export type LockPositionInfo = {
  type: SuiAddressType
  // clmm position id
  position_id: SuiObjectIdType
  // start lock time.
  start_time: number
  // lock days
  lock_period: number
  // end lock time
  end_time: number
  // the previous settlement starting point(clmm position point)
  growth_rewarder: string
  // rewarder owned
  rewarder_owned: SuiObjectIdType
  // is or not be settled
  is_settled: boolean
}

export type LockNFT = {
  locked_nft_id: SuiObjectIdType
  lock_clmm_position: Position
}

export type BoosterPositionInfo = LockNFT & LockPositionInfo

export type LockPositionParams = {
  clmm_position_id: SuiObjectIdType
  booster_pool_id: SuiObjectIdType
  clmm_pool_id: SuiObjectIdType
  lock_day: number
  booster_type: SuiAddressType
} & CoinPairType

export type CancelParams = {
  booster_pool_id: SuiObjectIdType
  lock_nft_id: SuiObjectIdType
  booster_type: SuiAddressType
}

export type RedeemParams = {
  booster_pool_id: SuiObjectIdType
  clmm_pool_id: SuiObjectIdType
  lock_nft_id: SuiObjectIdType
  ve_nft_id: SuiObjectIdType
  booster_type: SuiAddressType
} & CoinPairType
