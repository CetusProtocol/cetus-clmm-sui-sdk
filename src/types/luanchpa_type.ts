import { SuiObjectIdType, SuiAddressType } from './sui'

export const LaunchpadRouterModule = 'router'
export const CONST_DENOMINATOR = 1_000_000_000

export type LaunchpadCoinPairType = {
  coin_type_sale: SuiAddressType
  coin_type_raise: SuiAddressType
}

export type LaunchpadInitEvent = {
  pools_id: SuiObjectIdType
  admin_cap_id: SuiObjectIdType
  config_cap_id: SuiObjectIdType
}
export type LaunchpadInitLockEvent = {
  lock_manager_id: SuiObjectIdType
}
export type LaunchpadInitConfigEvent = {
  config_pools_id: SuiObjectIdType
}

export type LockNFTEvent = {
  locked_time: number
  end_lock_time: number
  nft_type: string
  lock_nft_id: SuiObjectIdType
  recipient: SuiObjectIdType
}

export type LaunchpadPoolImmutables = {
  coin_type_sale: SuiAddressType // The pool SaleCoin type
  coin_type_raise: SuiAddressType // The pool RaiseCoin type
  pool_address: SuiObjectIdType
}

export type LaunchpadPoolState = {
  pool_type: SuiAddressType
  is_settle: boolean /// Whether the pool has been settled
  current_price: string
  min_price: string
  max_price: string
  sale_coin_amount: string
  raise_coin_amount: string
  sale_total: string /// The maximum value of coins sold in the pool
  min_purchase: string /// each user Minimum purchase amount
  max_purchase: string /// each user max purchase amount
  least_raise_amount: string /// each user max purchase amount
  softcap: string
  hardcap: string
  liquidity_rate: number /// real rate = liquidity_rate / 100
  activity_start_time: number /// Pool start selling time
  activity_end_time: number
  settle_end_time: number
  locked_duration: number
  activity_duration: number
  settle_duration: number
  is_cancel: boolean
  white_summary: {
    white_handle: string
    white_hard_cap_total: string
    white_purchase_total: string
    size: number
  }
  unused_sale: string
  harvest_raise: string /// Amount of raise coin recipienter can withdraw
  tick_spacing: number
  recipient: SuiAddressType
  purchase_summary: {
    purchase_handle: string
    size: number
  }
  reality_raise_total: string
  pool_status: LaunchpadPoolActivityState
}

export type LaunchpadPool = LaunchpadPoolImmutables & LaunchpadPoolState

export enum LaunchpadPoolActivityState {
  Upcoming = 'Upcoming',
  Live = 'Live',
  Settle = 'Settle',
  Ended = 'Ended',
  Failed = 'Failed',
  Canceled = 'Canceled',
}

export type CreateLaunchpadPoolParams = {
  recipient: SuiObjectIdType
  initialize_price: string
  sale_total: string
  min_purchase: string
  max_purchase: string
  least_raise_amount: string
  hardcap: string
  liquidity_rate: number
  start_time: number
  activity_duration: number
  settle_duration: number
  locked_duration: number
  sale_decimals: number
  raise_decimals: number
  tick_spacing: number
} & LaunchpadCoinPairType

export type PurchaseParams = {
  pool_address: SuiObjectIdType
  purchase_amount: string
} & LaunchpadCoinPairType

export type ClaimParams = {
  pool_address: SuiObjectIdType
} & LaunchpadCoinPairType

export type SettleParams = {
  pool_address: SuiObjectIdType
  clmm_args?: {
    clmm_pool_address: SuiObjectIdType
    current_price: string
    clmm_sqrt_price: string
    sale_decimals: number
    raise_decimals: number
    opposite: boolean
  }
} & LaunchpadCoinPairType

export type SettleForCreateClmmPoolParams = {
  pool_address: SuiObjectIdType
  recipient: SuiObjectIdType
  tick_spacing: string
  initialize_sqrt_price: string
  uri: string
} & LaunchpadCoinPairType

export type WithdrawParams = {
  pool_address: SuiObjectIdType
  sale_amount: bigint
  raise_amount: bigint
} & LaunchpadCoinPairType

export type AddUserToWhitelistParams = {
  pool_address: SuiObjectIdType
  user_addrs: SuiObjectIdType[]
  safe_limit_amount: string
} & LaunchpadCoinPairType

export type UpdateWhitelistCapParams = {
  pool_address: SuiObjectIdType
  white_list_member: SuiObjectIdType
  safe_limit_amount: number
  hard_cap_total: number // hard_cap_total < hardcap
} & LaunchpadCoinPairType

export type RemoveWhitelistParams = {
  pool_address: SuiObjectIdType
  user_addrs: SuiObjectIdType[]
} & LaunchpadCoinPairType

export type UnlockNftParams = {
  lock_nft: SuiObjectIdType
  nft_type: SuiAddressType
}

export type CancelLaunchPadParams = {
  pool_address: SuiObjectIdType
} & LaunchpadCoinPairType

export type UpdateRecipientParams = {
  pool_address: SuiObjectIdType
  new_recipient: SuiObjectIdType
} & LaunchpadCoinPairType

export type UpdatePoolDurationParams = {
  pool_address: SuiObjectIdType
  activity_duration: number
  settle_duration: number
  lock_duration: number
} & LaunchpadCoinPairType

export type PurchaseMark = {
  id: SuiObjectIdType
  pool_id: SuiObjectIdType
  /// Purchase total raise amount
  purchase_total: string
  /// Claim get sale amount
  obtain_sale_amount: string
  /// Claim draw raise amount
  used_raise_amount: string
}

export type SettleEvent = {
  pool_id: SuiObjectIdType
  settle_price: string
  unused_sale: string
  unused_raise: string
  white_purchase_total: string
}

export type LaunchpadPoolConfig = {
  id: SuiObjectIdType
  banners: string[]
  introduction: string
  is_close: boolean
  pool_address: string
  project_details: string
  regulation: string
  social_media: {
    name: string
    link: string
  }[]
  terms: string
  tokenomics: string
  website: string
  white_list_terms: string
}
