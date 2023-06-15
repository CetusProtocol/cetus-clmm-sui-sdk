import { ObjectContentFields } from '@mysten/sui.js'
import BN from 'bn.js'
import { NFT, SuiAddressType, SuiObjectIdType } from './sui'
import { TickData } from './clmmpool'

export const intervalFaucetTime = 12 * 60 * 60 * 1000

export enum ClmmPositionStatus {
  'Deleted' = 'Deleted',
  'Exists' = 'Exists',
  'NotExists' = 'NotExists',
}
export type Position = {
  pos_object_id: SuiObjectIdType
  owner: SuiObjectIdType
  pool: SuiObjectIdType
  type: SuiAddressType
  coin_type_a: SuiAddressType
  coin_type_b: SuiAddressType
  index: number
  liquidity: string
  tick_lower_index: number
  tick_upper_index: number
  position_status: ClmmPositionStatus
} & NFT &
  PositionReward

export type PositionReward = {
  pos_object_id: SuiObjectIdType
  liquidity: string
  tick_lower_index: number
  tick_upper_index: number
  fee_growth_inside_a: string
  fee_owed_a: string
  fee_growth_inside_b: string
  fee_owed_b: string
  reward_amount_owed_0: string
  reward_amount_owed_1: string
  reward_amount_owed_2: string
  reward_growth_inside_0: string
  reward_growth_inside_1: string
  reward_growth_inside_2: string
}

export type CoinPairType = {
  coinTypeA: SuiAddressType
  coinTypeB: SuiAddressType
}

export type PoolImmutables = {
  poolAddress: string
  tickSpacing: string
} & CoinPairType

export type Pool = {
  poolType: string
  coinAmountA: number
  coinAmountB: number
  /// The current sqrt price
  current_sqrt_price: number
  /// The current tick index
  current_tick_index: number
  /// The global fee growth of coin a,b as Q64.64
  fee_growth_global_b: number
  fee_growth_global_a: number
  /// The amounts of coin a,b owend to protocol
  fee_protocol_coin_a: number
  fee_protocol_coin_b: number
  /// The numerator of fee rate, the denominator is 1_000_000.
  fee_rate: number
  /// is the pool pause
  is_pause: boolean
  /// The liquidity of current tick index
  liquidity: number
  /// The pool index
  index: number
  position_manager: {
    positions_handle: string
    size: number
  }
  rewarder_infos: Array<Rewarder>
  rewarder_last_updated_time: string
  ticks_handle: string
  uri: string
  name: string
} & PoolImmutables

export type Rewarder = {
  coinAddress: string
  emissions_per_second: number
  growth_global: number
  emissionsEveryDay: number
}

export type ClmmConfig = {
  pools_id: SuiObjectIdType
  global_config_id: SuiObjectIdType
  admin_cap_id: SuiObjectIdType
  global_vault_id: SuiObjectIdType
  partners_id?: SuiObjectIdType
}

export type CreatePartnerEvent = {
  name: string
  recipient: SuiAddressType
  partner_id: SuiObjectIdType
  partner_cap_id: SuiObjectIdType
  fee_rate: string
  start_epoch: string
  end_epoch: string
}

export type CoinAsset = {
  coinAddress: SuiAddressType
  coinObjectId: SuiObjectIdType
  balance: bigint
}

export type FaucetCoin = {
  transactionModule: string
  suplyID: SuiObjectIdType
  decimals: number
} & ObjectContentFields

export type CreatePoolParams = {
  tick_spacing: number
  initialize_sqrt_price: string
  uri: string
} & CoinPairType

export type CreatePoolAddLiquidityParams = {
  amount_a: number | string
  amount_b: number | string
  fix_amount_a: boolean
  tick_lower: number
  tick_upper: number
} & CreatePoolParams

export type FetchParams = {
  pool_id: SuiObjectIdType
} & CoinPairType

type CommonParams = {
  pool_id: SuiObjectIdType
  pos_id: SuiObjectIdType
}

export type AddLiquidityFixTokenParams = {
  amount_a: number | string
  amount_b: number | string
  fix_amount_a: boolean
  is_open: boolean // control whether or not to create a new position or add liquidity on existed position.
} & AddLiquidityCommonParams

export type AddLiquidityParams = {
  delta_liquidity: string
  max_amount_a: number | string
  max_amount_b: number | string
} & AddLiquidityCommonParams

export type AddLiquidityCommonParams = {
  tick_lower: string | number
  tick_upper: string | number
  collect_fee: boolean
  rewarder_coin_types: SuiAddressType[]
} & CoinPairType &
  CommonParams

export type OpenPositionParams = {
  tick_lower: string
  tick_upper: string
  pool_id: SuiObjectIdType
} & CoinPairType

export type RemoveLiquidityParams = {
  delta_liquidity: string
  min_amount_a: string
  min_amount_b: string
  collect_fee: boolean
  rewarder_coin_types: string[]
} & CommonParams &
  CoinPairType

export type ClosePositionParams = {
  rewarder_coin_types: SuiAddressType[]
  min_amount_a: string
  min_amount_b: string
  collect_fee: boolean
} & CoinPairType &
  CommonParams

export type CollectFeeParams = CommonParams & CoinPairType

export type createTestTransferTxPayloadParams = {
  account: string
  value: number
}

export type CalculateRatesParams = {
  decimalsA: number
  decimalsB: number
  a2b: boolean
  byAmountIn: boolean
  amount: BN
  swapTicks: Array<TickData>
  currentPool: Pool
}

export type CalculateRatesResult = {
  estimatedAmountIn: BN
  estimatedAmountOut: BN
  estimatedEndSqrtPrice: BN
  estimatedFeeAmount: BN
  isExceed: boolean
  extraComputeLimit: number
  aToB: boolean
  byAmountIn: boolean
  amount: BN
  priceImpactPct: number
}

export type SwapParams = {
  pool_id: SuiObjectIdType
  a2b: boolean
  by_amount_in: boolean
  amount: string
  amount_limit: string
  swap_partner?: string
} & CoinPairType

export type PreSwapParams = {
  pool: Pool
  current_sqrt_price: number
  decimalsA: number
  decimalsB: number
  a2b: boolean
  by_amount_in: boolean
  amount: string
} & CoinPairType

export type PreSwapWithMultiPoolParams = {
  poolAddresses: string[]
  a2b: boolean
  byAmountIn: boolean
  amount: string
} & CoinPairType

export type TransPreSwapWithMultiPoolParams = {
  poolAddress: string
  a2b: boolean
  byAmountIn: boolean
  amount: string
} & CoinPairType

export type CollectRewarderParams = {
  pool_id: SuiObjectIdType
  pos_id: SuiObjectIdType
  collect_fee: boolean //
  rewarder_coin_types: SuiAddressType[]
} & CoinPairType

export type RewarderAmountOwed = {
  amount_owed: BN
  coin_address: string
}

export type CalculateSwapFeeParams = {
  from_type: string
  from_amount: string
  to_amount: string
  pool_address: string
  router?: {
    pool_address: string
    raw_amount_limit: string
  }
}
