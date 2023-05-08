import { CoinPairType, Position } from '../modules/resourcesModule'
import { SuiAddressType, SuiObjectIdType } from './sui'

export const MakerRouterModule = 'router'

export const CONFIG_PERCENT_MULTIPER = 10000

export type MakerInitEvent = {
  maker_config_id: SuiObjectIdType
  maker_pool_handle: SuiObjectIdType
}

export type MakerPoolPeriod = {
  id: SuiObjectIdType
  start_time: number
  end_time: number
  period: number
}

export type MakerPoolImmutables = {
  bonus_type: SuiAddressType
  clmm_pool_id: SuiObjectIdType
  pool_id: SuiObjectIdType
} & CoinPairType

export type MakerPoolState = {
  start_time: number
  interval_day: number
  is_open: boolean
  minimum_percent_to_reward: number
  balance: string
  config: RewarderMultiplier[]
  rewarders: {
    rewarder_handle: SuiObjectIdType
    size: number
  }
  whale_nfts: {
    whale_nfts_handle: SuiObjectIdType
    size: number
  }

  points: {
    point_handle: SuiObjectIdType
    size: number
  }
  index: number
}

export type MakerPool = MakerPoolImmutables & MakerPoolState

export type RewarderMultiplier = {
  rate: number
  multiplier: number
}

export type MarkerPosition = {
  period_id: SuiObjectIdType
  id: SuiObjectIdType
  bonus_num: string
  point: string
  is_burn: boolean
  is_redeemed: boolean
  point_after_multiplier: string
  percent: number
  fee_share_rate: number
  clmm_position?: Position
}

export type PoolBonusInfo = {
  type: string
  time: number
  settle_time: number
  settled_num: string
  is_settled: boolean
  basis_bonus: string
  total_bonus: string
  is_vacant: boolean
  redeemed_num: string
}

export type ClaimParams = {
  market_pool_id: SuiObjectIdType
  position_nft_id: SuiObjectIdType
  ve_nft_id: SuiObjectIdType
  bonus_type: SuiAddressType
  phase: number
}

export type ClaimAllParams = {
  whale_nfts: {
    bonus_type: SuiAddressType
    pool_id: SuiObjectIdType
    nft_ids: SuiObjectIdType[]
  }[]
  ve_nft_id: SuiObjectIdType
}
