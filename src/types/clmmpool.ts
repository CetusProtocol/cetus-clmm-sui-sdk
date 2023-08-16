import BN from 'bn.js'
import { ZERO } from '../math/utils'
import { Pool } from './clmm_type'

/**
 * Represents tick data for a liquidity pool.
 */
export type TickData = {
  /**
   * The object identifier of the tick data.
   */
  objectId: string

  /**
   * The index of the tick.
   */
  index: number

  /**
   * The square root price value for the tick.
   */
  sqrtPrice: BN

  /**
   * The net liquidity value for the tick.
   */
  liquidityNet: BN

  /**
   * The gross liquidity value for the tick.
   */
  liquidityGross: BN

  /**
   * The fee growth outside coin A for the tick.
   */
  feeGrowthOutsideA: BN

  /**
   * The fee growth outside coin B for the tick.
   */
  feeGrowthOutsideB: BN

  /**
   * An array of rewarders' growth outside values for the tick.
   */
  rewardersGrowthOutside: BN[]
}

/**
 * Represents a tick for a liquidity pool.
 */
export type Tick = {
  /**
   * The index of the tick.
   */
  index: Bits

  /**
   * The square root price value for the tick (string representation).
   */
  sqrt_price: string

  /**
   * The net liquidity value for the tick (Bits format).
   */
  liquidity_net: Bits

  /**
   * The gross liquidity value for the tick (string representation).
   */
  liquidity_gross: string

  /**
   * The fee growth outside coin A for the tick (string representation).
   */
  fee_growth_outside_a: string

  /**
   * The fee growth outside coin B for the tick (string representation).
   */
  fee_growth_outside_b: string

  /**
   * An array of rewarders' growth outside values for the tick (array of string representations).
   */
  rewarders_growth_outside: string[3]
}

/**
 * Represents bits information.
 */
export type Bits = {
  bits: string
}

/**
 * Represents data for a liquidity mining pool.
 */
export type ClmmpoolData = {
  coinA: string
  coinB: string
  currentSqrtPrice: BN
  currentTickIndex: number
  feeGrowthGlobalA: BN
  feeGrowthGlobalB: BN
  feeProtocolCoinA: BN
  feeProtocolCoinB: BN
  feeRate: BN
  liquidity: BN
  tickIndexes: number[]
  tickSpacing: number
  ticks: Array<TickData>
  collection_name: string
}

/**
 * Transforms a Pool object into ClmmpoolData format.
 * @param {Pool} pool - The liquidity pool object to transform.
 * @returns {ClmmpoolData} The transformed ClmmpoolData object.
 */
export function transClmmpoolDataWithoutTicks(pool: Pool): ClmmpoolData {
  const poolData: ClmmpoolData = {
    coinA: pool.coinTypeA, // string
    coinB: pool.coinTypeB, // string
    currentSqrtPrice: new BN(pool.current_sqrt_price), // BN
    currentTickIndex: pool.current_tick_index, // number
    feeGrowthGlobalA: new BN(pool.fee_growth_global_a), // BN
    feeGrowthGlobalB: new BN(pool.fee_growth_global_b), // BN
    feeProtocolCoinA: new BN(pool.fee_protocol_coin_a), // BN
    feeProtocolCoinB: new BN(pool.fee_protocol_coin_b), // BN
    feeRate: new BN(pool.fee_rate), // number
    liquidity: new BN(pool.liquidity), // BN
    tickIndexes: [], // number[]
    tickSpacing: Number(pool.tickSpacing), // number
    ticks: [], // Array<TickData>
    collection_name: '',
  }
  return poolData
}

/**
 * Creates a Bits object from an index.
 * @param {number | string} index - The index value.
 * @returns {Bits} The created Bits object.
 */
export function newBits(index: number | string): Bits {
  const index_BN = new BN(index)
  if (index_BN.lt(ZERO)) {
    return {
      bits: index_BN
        .neg()
        .xor(new BN(2).pow(new BN(64)).sub(new BN(1)))
        .add(new BN(1))
        .toString(),
    }
  }
  return {
    bits: index_BN.toString(),
  }
}
