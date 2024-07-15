import BN from 'bn.js'
import { NFT, SuiAddressType, SuiObjectIdType } from './sui'
import { TickData } from './clmmpool'
import { ClmmpoolsError, ConfigErrorCode } from '../errors/errors'
/**
 * Enumerates the possible status values of a position within a liquidity mining module.
 */
export enum ClmmPositionStatus {
  /**
   * The position has been deleted or removed.
   */
  'Deleted' = 'Deleted',
  /**
   * The position exists and is active.
   */
  'Exists' = 'Exists',
  /**
   * The position does not exist or is not active.
   */
  'NotExists' = 'NotExists',
}
/**
 * Represents a package containing specific configuration or data.
 * @template T - The type of configuration or data contained in the package.
 */
export type Package<T = undefined> = {
  /**
   * The unique identifier of the package.
   */
  package_id: string
  /**
   * the package was published.
   */
  published_at: string
  /**
   * The version number of the package (optional).
   */
  version?: number
  /**
   * The configuration or data contained in the package (optional).
   */
  config?: T
}
/**
 *  The Cetus clmmpool's position NFT.
 */
export type Position = {
  /**
   * The unique identifier of the position object.
   */
  pos_object_id: SuiObjectIdType
  /**
   * The owner of the position.
   */
  owner: SuiObjectIdType
  /**
   * The liquidity pool associated with the position.
   */
  pool: SuiObjectIdType
  /**
   * The type of position represented by an address.
   */
  type: SuiAddressType
  /**
   * The index of the position.
   */
  index: number
  /**
   * The amount of liquidity held by the position.
   */
  liquidity: string
  /**
   * The lower tick index of the position range.
   */
  tick_lower_index: number
  /**
   * The upper tick index of the position range.
   */
  tick_upper_index: number
  /**
   * The status of the position within the liquidity mining module.
   */
  position_status: ClmmPositionStatus

  /**
   * The address type of the first coin in the position.
   */
  coin_type_a: SuiAddressType
  /**
   * The address type of the second coin in the position.
   */
  coin_type_b: SuiAddressType
} & NFT &
  PositionReward

/**
 * Represents reward information associated with a liquidity mining position.
 */
export type PositionReward = {
  /**
   * The unique identifier of the position object.
   */
  pos_object_id: SuiObjectIdType

  /**
   * The amount of liquidity held by the position.
   */
  liquidity: string

  /**
   * The lower tick index of the position range.
   */
  tick_lower_index: number

  /**
   * The upper tick index of the position range.
   */
  tick_upper_index: number

  /**
   * The accumulated fee growth inside the first coin of the position.
   */
  fee_growth_inside_a: string

  /**
   * The accumulated fee owed in the first coin of the position.
   */
  fee_owed_a: string

  /**
   * The accumulated fee growth inside the second coin of the position.
   */
  fee_growth_inside_b: string

  /**
   * The accumulated fee owed in the second coin of the position.
   */
  fee_owed_b: string

  /**
   * The amount of reward owed in the first reward category.
   */
  reward_amount_owed_0: string

  /**
   * The amount of reward owed in the second reward category.
   */
  reward_amount_owed_1: string

  /**
   * The amount of reward owed in the third reward category.
   */
  reward_amount_owed_2: string

  /**
   * The accumulated reward growth inside the first reward category.
   */
  reward_growth_inside_0: string

  /**
   * The accumulated reward growth inside the second reward category.
   */
  reward_growth_inside_1: string

  /**
   * The accumulated reward growth inside the third reward category.
   */
  reward_growth_inside_2: string
}

/**
 * Represents a pair of coins used in a financial context.
 */
export type CoinPairType = {
  /**
   * The address type of the coin a in the pair.
   */
  coinTypeA: SuiAddressType

  /**
   * The address type of the coin b in the pair.
   */
  coinTypeB: SuiAddressType
}

/**
 * Represents immutable properties of a liquidity pool.
 */
export type PoolImmutables = {
  /**
   * The address of the liquidity pool.
   */
  poolAddress: string

  /**
   * The tick spacing value used in the pool.
   */
  tickSpacing: string
} & CoinPairType
/**
 * "Pool" is the core module of Clmm protocol, which defines the trading pairs of "clmmpool".
 */
export type Pool = {
  /**
   * Represents the type or category of a liquidity pool.
   */
  poolType: string
  /**
   * The amount of coin a.
   */
  coinAmountA: number
  /**
   * The amount of coin b.
   */
  coinAmountB: number
  /**
   * The current sqrt price
   */
  current_sqrt_price: number
  /**
   * The current tick index
   */
  current_tick_index: number
  /**
   * The global fee growth of coin a as Q64.64
   */
  fee_growth_global_b: number
  /**
   * The global fee growth of coin b as Q64.64
   */
  fee_growth_global_a: number
  /**
   * The amounts of coin a owend to protocol
   */
  fee_protocol_coin_a: number
  /**
   * The amounts of coin b owend to protocol
   */
  fee_protocol_coin_b: number
  /**
   * The numerator of fee rate, the denominator is 1_000_000.
   */
  fee_rate: number
  /**
   * is the pool pause
   */
  is_pause: boolean
  /**
   * The liquidity of current tick index
   */
  liquidity: number
  /**
   * The pool index
   */
  index: number
  /**
   * The positions manager
   */
  position_manager: {
    positions_handle: string
    size: number
  }
  /**
   * The rewarder manager
   */
  rewarder_infos: Array<Rewarder>
  rewarder_last_updated_time: string
  /**
   * The tick manager handle
   */
  ticks_handle: string
  /**
   * The url for pool and position
   */
  uri: string
  /**
   * The name for pool
   */
  name: string
} & PoolImmutables

export type Rewarder = {
  /**
   * The coin address where rewards will be distributed.
   */
  coinAddress: string
  /**
   * The rate of emissions in coins per second.
   */
  emissions_per_second: number
  /**
   * The global growth factor influencing reward emissions.
   */
  growth_global: number
  /**
   * The total emissions in coins that occur every day.
   */
  emissionsEveryDay: number
}
/**
 * Configuration settings for the Cryptocurrency Liquidity Mining Module (CLMM).
 */
export type ClmmConfig = {
  /**
   * Identifier of the pools for liquidity mining.
   */
  pools_id: SuiObjectIdType

  /**
   * Identifier of the global configuration for the module.
   */
  global_config_id: SuiObjectIdType

  /**
   * Identifier of the administrative capacity for the module.
   */
  admin_cap_id: SuiObjectIdType

  /**
   * Identifier of the global vault for the module.
   */
  global_vault_id: SuiObjectIdType

  /**
   * Optional identifier of partners for the liquidity mining module.
   */
  partners_id?: SuiObjectIdType
}

/**
 * Represents an event to create a liquidity mining partner.
 */
export type CreatePartnerEvent = {
  /**
   * The name of the liquidity mining partner.
   */
  name: string

  /**
   * The recipient's address for the partner.
   */
  recipient: SuiAddressType

  /**
   * Identifier of the partner.
   */
  partner_id: SuiObjectIdType

  /**
   * Identifier of the partner's capacity.
   */
  partner_cap_id: SuiObjectIdType

  /**
   * The fee rate associated with the partner.
   */
  fee_rate: string

  /**
   * The starting epoch of the partnership.
   */
  start_epoch: string

  /**
   * The ending epoch of the partnership.
   */
  end_epoch: string
}

/**
 * Represents a coin asset with address, object ID, and balance information.
 */
export type CoinAsset = {
  /**
   * The address type of the coin asset.
   */
  coinAddress: SuiAddressType

  /**
   * The object identifier of the coin asset.
   */
  coinObjectId: SuiObjectIdType

  /**
   * The balance amount of the coin asset.
   */
  balance: bigint
}

/**
 * Represents a faucet coin configuration.
 */
export type FaucetCoin = {
  /**
   * The name or identifier of the transaction module.
   */
  transactionModule: string

  /**
   * The supply ID or object identifier of the faucet coin.
   */
  suplyID: SuiObjectIdType

  /**
   * The number of decimal places used for the faucet coin.
   */
  decimals: number
}

/**
 * Represents parameters for creating a liquidity pool.
 */
export type CreatePoolParams = {
  /**
   * The tick spacing value used for the pool.
   */
  tick_spacing: number

  /**
   * The initial square root price value for the pool.
   */
  initialize_sqrt_price: string

  /**
   * The Uniform Resource Identifier (URI) associated with the pool.
   */
  uri: string
} & CoinPairType

/**
 * Represents parameters for adding liquidity to a created liquidity pool.
 * Extends the CreatePoolParams type.
 */
export type CreatePoolAddLiquidityParams = CreatePoolParams & {
  /**
   * The amount of the first coin to be added as liquidity.
   * Can be a number or a string.
   */
  amount_a: number | string

  /**
   * The amount of the second coin to be added as liquidity.
   * Can be a number or a string.
   */
  amount_b: number | string

  /**
   * Indicates whether the amount of the first coin is fixed.
   */
  fix_amount_a: boolean

  /**
   * The lower tick index for liquidity provision.
   */
  tick_lower: number

  /**
   * The upper tick index for liquidity provision.
   */
  tick_upper: number

  /**
   * The allowed slippage percentage for the liquidity provision.
   */
  slippage: number
}

export type FetchParams = {
  pool_id: SuiObjectIdType
} & CoinPairType

type CommonParams = {
  /**
   * The object id about which pool you want to operation.
   */
  pool_id: SuiObjectIdType
  /**
   * The object id about position.
   */
  pos_id: SuiObjectIdType
}

export type AddLiquidityFixTokenParams = {
  /**
   * If fixed amount A, you must set amount_a, amount_b will be auto calculated by ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts().
   */
  amount_a: number | string
  /**
   * If fixed amount B, you must set amount_b, amount_a will be auto calculated by ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts().
   */
  amount_b: number | string
  /**
   * Price slippage point.
   */
  slippage: number
  /**
   * true means fixed coinA amount, false means fixed coinB amount
   */
  fix_amount_a: boolean
  /**
   * control whether or not to create a new position or add liquidity on existed position.
   */
  is_open: boolean
} & AddLiquidityCommonParams

export type AddLiquidityParams = {
  /**
   * The actual change in liquidity that has been added.
   */
  delta_liquidity: string
  /**
   * The max limit about used coin a amount
   */
  max_amount_a: number | string
  /**
   * The max limit about used coin b amount.
   */
  max_amount_b: number | string
} & AddLiquidityCommonParams

export type AddLiquidityCommonParams = {
  /**
   * Represents the index of the lower tick boundary.
   */
  tick_lower: string | number
  /**
   * Represents the index of the upper tick boundary.
   */
  tick_upper: string | number
  /**
   * If you already has one position, you can select collect fees while adding liquidity.
   */
  collect_fee: boolean
  /**
   * If these not empty, it will collect rewarder in this position, if you already open the position.
   */
  rewarder_coin_types: SuiAddressType[]
} & CoinPairType &
  CommonParams

/**
 * Parameters for opening a position within a liquidity pool.
 * Extends the CoinPairType type.
 */
export type OpenPositionParams = CoinPairType & {
  /**
   * The lower tick index for the position.
   */
  tick_lower: string

  /**
   * The upper tick index for the position.
   */
  tick_upper: string

  /**
   * The object identifier of the liquidity pool.
   */
  pool_id: SuiObjectIdType
}

/**
 * Parameters for removing liquidity from a pool.
 * Extends the CoinPairType and CommonParams types.
 */
export type RemoveLiquidityParams = CoinPairType &
  CommonParams & {
    /**
     * The change in liquidity amount to be removed.
     */
    delta_liquidity: string

    /**
     * The minimum amount of the first coin to be received.
     */
    min_amount_a: string

    /**
     * The minimum amount of the second coin to be received.
     */
    min_amount_b: string

    /**
     * Indicates whether to collect fees during the removal.
     */
    collect_fee: boolean

    /**
     * Coin types associated with rewarder contracts.
     */
    rewarder_coin_types: string[]
  }

/**
 * Parameters for closing a position within a liquidity pool.
 * Extends the CoinPairType, CommonParams, and CommonParams types.
 */
export type ClosePositionParams = CoinPairType &
  CommonParams & {
    /**
     * Coin types associated with rewarder contracts.
     */
    rewarder_coin_types: SuiAddressType[]

    /**
     * The minimum amount of the first coin to be received.
     */
    min_amount_a: string

    /**
     * The minimum amount of the second coin to be received.
     */
    min_amount_b: string

    /**
     * Indicates whether to collect fees during the closing.
     */
    collect_fee: boolean
  } & CoinPairType &
  CommonParams
/**
 * Represents parameters for collecting fees.
 */
export type CollectFeeParams = CommonParams & CoinPairType

/**
 * Represents parameters for creating a test transfer transaction payload.
 */
export type createTestTransferTxPayloadParams = {
  /**
   * The recipient account address.
   */
  account: string

  /**
   * The value to transfer.
   */
  value: number
}

/**
 * Represents parameters for calculating rates in a swap.
 */
export type CalculateRatesParams = {
  /**
   * The number of decimal places for token A.
   */
  decimalsA: number

  /**
   * The number of decimal places for token B.
   */
  decimalsB: number

  /**
   * Specifies if the swap is from token A to token B.
   */
  a2b: boolean

  /**
   * Specifies if the swap amount is specified in token A.
   */
  byAmountIn: boolean

  /**
   * The amount to swap.
   */
  amount: BN

  /**
   * An array of tick data for swap ticks.
   */
  swapTicks: Array<TickData>

  /**
   * The current pool information.
   */
  currentPool: Pool
}

/**
 * Represents the result of calculating rates in a swap.
 */
export type CalculateRatesResult = {
  /**
   * The estimated amount in token A.
   */
  estimatedAmountIn: BN

  /**
   * The estimated amount in token B.
   */
  estimatedAmountOut: BN

  /**
   * The estimated ending square root price.
   */
  estimatedEndSqrtPrice: BN

  /**
   * The estimated fee amount.
   */
  estimatedFeeAmount: BN

  /**
   * Indicates if the estimated amount exceeds the limit.
   */
  isExceed: boolean

  /**
   * The extra compute limit.
   */
  extraComputeLimit: number

  /**
   * Specifies if the swap is from token A to token B.
   */
  aToB: boolean

  /**
   * Specifies if the swap amount is specified in token A.
   */
  byAmountIn: boolean

  /**
   * The amount to swap.
   */
  amount: BN

  /**
   * The price impact percentage.
   */
  priceImpactPct: number
}

/**
 * Represents parameters for a swap operation.
 */
export type SwapParams = {
  /**
   * The identifier of the pool.
   */
  pool_id: SuiObjectIdType

  /**
   * Specifies if the swap is from token A to token B.
   */
  a2b: boolean

  /**
   * Specifies if the swap amount is specified in token A.
   */
  by_amount_in: boolean

  /**
   * The swap amount.
   */
  amount: string

  /**
   * The amount limit for the swap.
   */
  amount_limit: string

  /**
   * The optional swap partner.
   */
  swap_partner?: string
} & CoinPairType

/**
 * Represents parameters for a pre-swap operation.
 */
export type PreSwapParams = {
  /**
   * The pool information for the pre-swap.
   */
  pool: Pool

  /**
   * The current square root price.
   */
  currentSqrtPrice: number

  /**
   * The number of decimal places for token A.
   */
  decimalsA: number

  /**
   * The number of decimal places for token B.
   */
  decimalsB: number

  /**
   * Specifies if the swap is from token A to token B.
   */
  a2b: boolean

  /**
   * Specifies if the swap amount is specified in token A.
   */
  byAmountIn: boolean

  /**
   * The swap amount.
   */
  amount: string
} & CoinPairType

/**
 * Represents parameters for a pre-swap operation with multiple pools.
 */
export type PreSwapWithMultiPoolParams = {
  /**
   * An array of pool addresses for the pre-swap.
   */
  poolAddresses: string[]

  /**
   * Specifies if the swap is from token A to token B.
   */
  a2b: boolean

  /**
   * Specifies if the swap amount is specified in token A.
   */
  byAmountIn: boolean

  /**
   * The swap amount.
   */
  amount: string
} & CoinPairType
/**
 * If changes in liquidity are required before the swap, then this parameter should be passed.
 */
export type PreSwapLpChangeParams = {
  /**
   * Unique identifier for the liquidity pool involved in the transaction.
   */
  pool_id: string

  /**
   * Lower bound of the liquidity range. In AMM models, like Uniswap V3, liquidity is provided within specific price ranges. This represents the lower limit of that range.
   */
  tick_lower: number

  /**
   * Upper bound of the liquidity range, corresponding to the lower bound. This defines the upper limit of the range where liquidity is provided.
   */
  tick_upper: number

  /**
   * The change in liquidity, which can be a large number and is thus represented as a string. It can be positive or negative, indicating an increase or decrease in liquidity.
   */
  delta_liquidity: number

  /**
   * A boolean value indicating whether the 'delta_liquidity' represents an increase (true) or decrease (false) in liquidity.
   */
  is_increase: boolean
}
/**
 * Represents parameters for a transitional pre-swap operation with multiple pools.
 */
export type TransPreSwapWithMultiPoolParams = {
  /**
   * The address of the pool for the transitional pre-swap.
   */
  poolAddress: string

  /**
   * Specifies if the swap is from token A to token B.
   */
  a2b: boolean

  /**
   * Specifies if the swap amount is specified in token A.
   */
  byAmountIn: boolean

  /**
   * The swap amount.
   */
  amount: string
} & CoinPairType

/**
 * Represents parameters for collecting rewarder fees.
 */
export type CollectRewarderParams = {
  /**
   * The identifier of the pool.
   */
  pool_id: SuiObjectIdType

  /**
   * The identifier of the position.
   */
  pos_id: SuiObjectIdType

  /**
   * Specifies if the fee should be collected.
   */
  collect_fee: boolean

  /**
   * An array of rewarder coin types.
   */
  rewarder_coin_types: SuiAddressType[]
} & CoinPairType

/**
 * Represents the amount owed by a rewarder.
 */
export type RewarderAmountOwed = {
  /**
   * The amount owed.
   */
  amount_owed: BN

  /**
   * The address of the coin.
   */
  coin_address: string
}

/**
 * Utility function to retrieve packager configurations from a package object.
 * @param {Package<T>} packageObj - The package object containing configurations.
 * @throws {Error} Throws an error if the package does not have a valid config.
 * @returns {T} The retrieved configuration.
 */
export function getPackagerConfigs<T>(packageObj: Package<T>) {
  if (packageObj.config === undefined) {
    throw new ClmmpoolsError(`package: ${packageObj.package_id}  not config in sdk SdkOptions`, ConfigErrorCode.InvalidConfig)
  }
  return packageObj.config
}
