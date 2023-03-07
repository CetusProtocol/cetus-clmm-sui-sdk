import BN from 'bn.js'
import { MAX_SQRT_PRICE, MIN_SQRT_PRICE } from '../types/constants'
import { MathUtil, U64_MAX, ZERO } from './utils'

export class SwapUtils {
  /**
   * Get the default sqrt price limit for a swap.
   *
   * @param a2b - true if the swap is A to B, false if the swap is B to A.
   * @returns The default sqrt price limit for the swap.
   */
  static getDefaultSqrtPriceLimit(a2b: boolean): BN {
    return new BN(a2b ? MIN_SQRT_PRICE : MAX_SQRT_PRICE)
  }

  /**
   * Get the default values for the otherAmountThreshold in a swap.
   *
   * @param amountSpecifiedIsInput - The direction of a swap
   * @returns The default values for the otherAmountThreshold parameter in a swap.
   */
  static getDefaultOtherAmountThreshold(amountSpecifiedIsInput: boolean): BN {
    return amountSpecifiedIsInput ? ZERO : U64_MAX
  }
}

/**
 * Get lower sqrt price from token A.
 *
 * @param amount - The amount of tokens the user wanted to swap from.
 * @param liquidity - The liquidity of the pool.
 * @param sqrtPriceX64 - The sqrt price of the pool.
 * @returns LowesqrtPriceX64
 */
export function getLowerSqrtPriceFromCoinA(amount: BN, liquidity: BN, sqrtPriceX64: BN): BN {
  const numerator = liquidity.mul(sqrtPriceX64).shln(64)
  const denominator = liquidity.shln(64).add(amount.mul(sqrtPriceX64))

  // always round up
  return MathUtil.divRoundUp(numerator, denominator)
}

/**
 * Get upper sqrt price from token A.
 *
 * @param amount - The amount of tokens the user wanted to swap from.
 * @param liquidity - The liquidity of the pool.
 * @param sqrtPriceX64 - The sqrt price of the pool.
 * @returns LowesqrtPriceX64
 */
export function getUpperSqrtPriceFromCoinA(amount: BN, liquidity: BN, sqrtPriceX64: BN): BN {
  const numerator = liquidity.mul(sqrtPriceX64).shln(64)
  const denominator = liquidity.shln(64).sub(amount.mul(sqrtPriceX64))

  // always round up
  return MathUtil.divRoundUp(numerator, denominator)
}

/**
 * Get lower sqrt price from coin B.
 *
 * @param amount - The amount of coins the user wanted to swap from.
 * @param liquidity - The liquidity of the pool.
 * @param sqrtPriceX64 - The sqrt price of the pool.
 * @returns LowesqrtPriceX64
 */
export function getLowerSqrtPriceFromCoinB(amount: BN, liquidity: BN, sqrtPriceX64: BN): BN {
  // always round down(rounding up a negative number)
  return sqrtPriceX64.sub(MathUtil.divRoundUp(amount.shln(64), liquidity))
}

/**
 * Get upper sqrt price from coin B.
 *
 * @param amount - The amount of coins the user wanted to swap from.
 * @param liquidity - The liquidity of the pool.
 * @param sqrtPriceX64 - The sqrt price of the pool.
 * @returns LowesqrtPriceX64
 */
export function getUpperSqrtPriceFromCoinB(amount: BN, liquidity: BN, sqrtPriceX64: BN): BN {
  // always round down (rounding up a negative number)
  return sqrtPriceX64.add(amount.shln(64).div(liquidity))
}
