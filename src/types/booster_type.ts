import { SuiObjectIdType } from './sui'

export const BoosterRouterModule = 'router'

export type BoosterInitEvent = {
  booster_config_id: SuiObjectIdType
}

export type BoosterPool = {
  id: SuiObjectIdType
  clmm_pool_id: SuiObjectIdType
  // the minimum rewarder percent which is used when the lock time ends but the `Position` has not been redeemed.
  basic_percent: number
  // hold the CoinA which is used for mint xwhale rewarder.
  balance: string
  boost_type: string
  // the rewarder config about this `BoosterPool`, stores the information about the rewarder percent in different lock days.
  // the config k,v multiper is 10000. For example, k is 12%, here the store value is 1200.
  config: []
  lock_positions: string
  is_open: boolean
}

export type LockPositionInfo = {
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
  // xwhale rewarder owned
  xwhale_owned: SuiObjectIdType
  // is or not be settled
  is_settled: boolean
}
