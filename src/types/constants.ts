import BN from 'bn.js'

/**
 * The maximum tick index supported by the clmmpool program.
 * @category Constants
 */
export const MAX_TICK_INDEX = 443636

/**
 * The minimum tick index supported by the clmmpool program.
 * @category Constants
 */
export const MIN_TICK_INDEX = -443636

/**
 * The maximum sqrt-price supported by the clmmpool program.
 * @category Constants
 */
export const MAX_SQRT_PRICE = '79226673515401279992447579055'

/**
 * The number of initialized ticks that a tick-array account can hold.
 * @category Constants
 */
export const TICK_ARRAY_SIZE = 64

/**
 * The minimum sqrt-price supported by the clmmpool program.
 * @category Constants
 */
export const MIN_SQRT_PRICE = '4295048016'

/**
 * The denominator which the fee rate is divided on.
 * @category Constants
 */
export const FEE_RATE_DENOMINATOR = new BN(1_000_000)
