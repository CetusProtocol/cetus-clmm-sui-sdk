import BN from 'bn.js'

/**
 * Represents input data for adding liquidity to a pool.
 */
export type LiquidityInput = {
  /**
   * The amount of coin A.
   */
  coinAmountA: BN

  /**
   * The amount of coin B.
   */
  coinAmountB: BN

  /**
   * The maximum amount of token A.
   */
  tokenMaxA: BN

  /**
   * The maximum amount of token B.
   */
  tokenMaxB: BN

  /**
   * The liquidity amount.
   */
  liquidityAmount: BN

  fix_amount_a: boolean
}

/**
 * Represents the direction of a swap.
 */
export enum SwapDirection {
  /**
   * Swap from coin A to coin B.
   */
  A2B = 'a2b',

  /**
   * Swap from coin B to coin A.
   */
  B2A = 'b2a',
}
