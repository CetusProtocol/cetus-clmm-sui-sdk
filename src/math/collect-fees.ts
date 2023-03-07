/* eslint-disable camelcase */
import BN from 'bn.js'
import { d } from '../utils/numbers'
import { Pool, Position } from '../modules/resourcesModule'
import { TickData } from '../types/clmmpool'
import { MathUtil } from './utils'

/**
 * @category CollectFeesQuoteParam
 */
export type CollectFeesQuoteParam = {
  clmmpool: Pool
  position: Position
  tickLower: TickData
  tickUpper: TickData
}

/**
 * @category CollectFeesQuote
 */
export type CollectFeesQuote = {
  feeOwedA: BN
  feeOwedB: BN
}

function getFeeInTickRange(clmmpool: Pool, tickLower: TickData, tickUpper: TickData): { fee_growth_inside_a: BN; fee_growth_inside_b: BN } {
  let fee_growth_below_a = new BN(0)
  let fee_growth_below_b = new BN(0)

  if (Number(clmmpool.current_tick_index) < Number(tickLower.index)) {
    fee_growth_below_a = MathUtil.subUnderflowU128(new BN(clmmpool.fee_growth_global_a), new BN(tickLower.feeGrowthOutsideA))
    fee_growth_below_b = MathUtil.subUnderflowU128(new BN(clmmpool.fee_growth_global_b), new BN(tickLower.feeGrowthOutsideB))
  } else {
    fee_growth_below_a = new BN(tickLower.feeGrowthOutsideA)
    fee_growth_below_b = new BN(tickLower.feeGrowthOutsideB)
  }

  let fee_growth_above_a = new BN(0)
  let fee_growth_above_b = new BN(0)

  if (Number(clmmpool.current_tick_index) < Number(tickUpper.index)) {
    fee_growth_above_a = new BN(tickUpper.feeGrowthOutsideA)
    fee_growth_above_b = new BN(tickUpper.feeGrowthOutsideB)
  } else {
    fee_growth_above_a = MathUtil.subUnderflowU128(new BN(clmmpool.fee_growth_global_a), new BN(tickUpper.feeGrowthOutsideA))
    fee_growth_above_b = MathUtil.subUnderflowU128(new BN(clmmpool.fee_growth_global_b), new BN(tickUpper.feeGrowthOutsideB))
  }
  const fee_growth_inside_a = MathUtil.subUnderflowU128(
    MathUtil.subUnderflowU128(new BN(clmmpool.fee_growth_global_a), fee_growth_below_a),
    fee_growth_above_a
  )
  const fee_growth_inside_b = MathUtil.subUnderflowU128(
    MathUtil.subUnderflowU128(new BN(clmmpool.fee_growth_global_b), fee_growth_below_b),
    fee_growth_above_b
  )

  // console.log('fee_growth_inside_a: ', fee_growth_inside_a.toString())
  // console.log('fee_growth_inside_b: ', fee_growth_inside_b.toString())
  return { fee_growth_inside_a, fee_growth_inside_b }
}

function updateFees(position: Position, fee_growth_inside_a: BN, fee_growth_inside_b: BN): CollectFeesQuote {
  const growth_delta_a = MathUtil.subUnderflowU128(fee_growth_inside_a, new BN(position.fee_growth_inside_a))
  const fee_delta_a = new BN(position.liquidity).mul(growth_delta_a).shrn(64)
  const growth_delta_b = MathUtil.subUnderflowU128(fee_growth_inside_b, new BN(position.fee_growth_inside_b))
  const fee_delta_b = new BN(position.liquidity).mul(growth_delta_b).shrn(64)

  // console.log('updateFees: ', { fee_delta_a, fee_delta_b })
  const fee_owed_a = new BN(position.fee_owed_a).add(fee_delta_a)
  const fee_owed_b = new BN(position.fee_owed_b).add(fee_delta_b)

  return {
    feeOwedA: fee_owed_a,
    feeOwedB: fee_owed_b,
  }
}
/**
 * Get a fee quote on the outstanding fees owed to a position.
 *
 * @category CollectFeesQuoteParam
 * @param param A collection of fetched Clmmpool accounts to faciliate the quote.
 * @returns A quote object containing the fees owed for each token in the pool.
 */
export function collectFeesQuote(param: CollectFeesQuoteParam): CollectFeesQuote {
  // Calculate the fee growths inside the position
  const { fee_growth_inside_a, fee_growth_inside_b } = getFeeInTickRange(param.clmmpool, param.tickLower, param.tickUpper)
  // Calculate the updated fees owed
  return updateFees(param.position, fee_growth_inside_a, fee_growth_inside_b)
}
