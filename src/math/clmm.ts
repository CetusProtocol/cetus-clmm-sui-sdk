import BN from 'bn.js'
import { IncreaseLiquidityInput } from '../types/liquidity'
import { ClmmpoolsError, MathErrorCode, CoinErrorCode } from '../errors/errors'
import type { ClmmpoolData, TickData } from '../types/clmmpool'
import { FEE_RATE_DENOMINATOR, MAX_SQRT_PRICE, MIN_SQRT_PRICE } from '../types/constants'
import Decimal from '../utils/decimal'
import { SwapUtils } from './swap'
import { TickMath } from './tick'
import { MathUtil, ONE, U64_MAX, ZERO } from './utils'

export type SwapStepResult = {
  amountIn: BN
  amountOut: BN
  nextSqrtPrice: BN
  feeAmount: BN
}

export type SwapResult = {
  amountIn: BN
  amountOut: BN
  feeAmount: BN
  refAmount: BN
  nextSqrtPrice: BN
  crossTickNum: number
}

export type CoinAmounts = {
  coinA: BN
  coinB: BN
}

export function toCoinAmount(a: number, b: number): CoinAmounts {
  return {
    coinA: new BN(a.toString()),
    coinB: new BN(b.toString()),
  }
}

/**
 * Get the amount A delta about two prices, for give amount of liquidity.
 * `delta_a = (liquidity * delta_sqrt_price) / sqrt_price_upper * sqrt_price_lower)`
 *
 * @param sqrtPrice0 - A sqrt price
 * @param sqrtPrice1 - Another sqrt price
 * @param liquidity - The amount of usable liquidity
 * @param roundUp - Whether to round the amount up or down
 * @returns
 */
export function getDeltaA(sqrtPrice0: BN, sqrtPrice1: BN, liquidity: BN, roundUp: boolean): BN {
  const sqrtPriceDiff = sqrtPrice0.gt(sqrtPrice1) ? sqrtPrice0.sub(sqrtPrice1) : sqrtPrice1.sub(sqrtPrice0)
  const numberator = liquidity.mul(sqrtPriceDiff).shln(64)
  const denomminator = sqrtPrice0.mul(sqrtPrice1)
  const quotient = numberator.div(denomminator)
  const remainder = numberator.mod(denomminator)
  const result = roundUp && !remainder.eq(ZERO) ? quotient.add(new BN(1)) : quotient
  // if (MathUtil.isOverflow(result, 64)) {
  //   throw new ClmmpoolsError('Result large than u64 max', MathErrorCode.IntegerDowncastOverflow)
  // }
  return result
}

/**
 * Get the amount B delta about two prices, for give amount of liquidity.
 * `delta_a = (liquidity * delta_sqrt_price) / sqrt_price_upper * sqrt_price_lower)`
 *
 * @param sqrtPrice0 - A sqrt price
 * @param sqrtPrice1 - Another sqrt price
 * @param liquidity - The amount of usable liquidity
 * @param roundUp - Whether to round the amount up or down
 * @returns
 */
export function getDeltaB(sqrtPrice0: BN, sqrtPrice1: BN, liquidity: BN, roundUp: boolean): BN {
  const sqrtPriceDiff = sqrtPrice0.gt(sqrtPrice1) ? sqrtPrice0.sub(sqrtPrice1) : sqrtPrice1.sub(sqrtPrice0)
  if (liquidity.eq(ZERO) || sqrtPriceDiff.eq(ZERO)) {
    return ZERO
  }
  const p = liquidity.mul(sqrtPriceDiff)
  const shoudRoundUp = roundUp && p.and(U64_MAX).gt(ZERO)
  const result = shoudRoundUp ? p.shrn(64).add(ONE) : p.shrn(64)
  if (MathUtil.isOverflow(result, 64)) {
    throw new ClmmpoolsError('Result large than u64 max', MathErrorCode.IntegerDowncastOverflow)
  }
  return result
}

/**
 * Get the next sqrt price from give a delta of token_a.
 * `new_sqrt_price = (sqrt_price * liquidity) / (liquidity +/- amount * sqrt_price)`
 *
 * @param sqrtPrice - The start sqrt price
 * @param liquidity - The amount of usable liquidity
 * @param amount - The amount of token_a
 * @param byAmountIn - Weather to fixed input
 */
export function getNextSqrtPriceAUp(sqrtPrice: BN, liquidity: BN, amount: BN, byAmountIn: boolean): BN {
  if (amount.eq(ZERO)) {
    return sqrtPrice
  }
  const numberator = MathUtil.checkMulShiftLeft(sqrtPrice, liquidity, 64, 256)
  const liquidityShl64 = liquidity.shln(64)
  const product = MathUtil.checkMul(sqrtPrice, amount, 256)
  if (!byAmountIn && liquidityShl64.lte(product)) {
    throw new ClmmpoolsError('getNextSqrtPriceAUp - Unable to divide liquidityShl64 by product', MathErrorCode.DivideByZero)
  }
  const nextSqrtPrice = byAmountIn
    ? MathUtil.checkDivRoundUpIf(numberator, liquidityShl64.add(product), true)
    : MathUtil.checkDivRoundUpIf(numberator, liquidityShl64.sub(product), true)
  if (nextSqrtPrice.lt(new BN(MIN_SQRT_PRICE))) {
    throw new ClmmpoolsError('getNextSqrtPriceAUp - Next sqrt price less than min sqrt price', CoinErrorCode.CoinAmountMinSubceeded)
  }
  if (nextSqrtPrice.gt(new BN(MAX_SQRT_PRICE))) {
    throw new ClmmpoolsError('getNextSqrtPriceAUp - Next sqrt price greater than max sqrt price', CoinErrorCode.CoinAmountMaxExceeded)
  }

  return nextSqrtPrice
}

/**
 * Get the next sqrt price from give a delta of token_b.
 * `new_sqrt_price = (sqrt_price +(delta_b / liquidity)`
 *
 * @param sqrtPrice - The start sqrt price
 * @param liquidity - The amount of usable liquidity
 * @param amount - The amount of token_a
 * @param byAmountIn - Weather to fixed input
 */
export function getNextSqrtPriceBDown(sqrtPrice: BN, liquidity: BN, amount: BN, byAmountIn: boolean): BN {
  const deltaSqrtPrice = MathUtil.checkDivRoundUpIf(amount.shln(64), liquidity, !byAmountIn)
  const nextSqrtPrice = byAmountIn ? sqrtPrice.add(deltaSqrtPrice) : sqrtPrice.sub(deltaSqrtPrice)

  if (nextSqrtPrice.lt(new BN(MIN_SQRT_PRICE)) || nextSqrtPrice.gt(new BN(MAX_SQRT_PRICE))) {
    throw new ClmmpoolsError('getNextSqrtPriceAUp - Next sqrt price out of bounds', CoinErrorCode.SqrtPriceOutOfBounds)
  }

  return nextSqrtPrice
}

/**
 * Get next sqrt price from input parameter.
 *
 * @param sqrtPrice
 * @param liquidity
 * @param amount
 * @param aToB
 * @returns
 */
export function getNextSqrtPriceFromInput(sqrtPrice: BN, liquidity: BN, amount: BN, aToB: boolean): BN {
  return aToB ? getNextSqrtPriceAUp(sqrtPrice, liquidity, amount, true) : getNextSqrtPriceBDown(sqrtPrice, liquidity, amount, true)
}

/**
 * Get the next sqrt price from output parameters.
 *
 * @param sqrtPrice
 * @param liquidity
 * @param amount
 * @param aToB
 * @returns
 */
export function getNextSqrtPriceFromOutput(sqrtPrice: BN, liquidity: BN, amount: BN, aToB: boolean): BN {
  return aToB ? getNextSqrtPriceBDown(sqrtPrice, liquidity, amount, false) : getNextSqrtPriceAUp(sqrtPrice, liquidity, amount, false)
}

/**
 * Get the amount of delta_a or delta_b from input parameters, and round up result.
 *
 * @param currentSqrtPrice
 * @param targetSqrtPrice
 * @param liquidity
 * @param aToB
 * @returns
 */
export function getDeltaUpFromInput(currentSqrtPrice: BN, targetSqrtPrice: BN, liquidity: BN, aToB: boolean): BN {
  return aToB
    ? getDeltaA(targetSqrtPrice, currentSqrtPrice, liquidity, true)
    : getDeltaB(currentSqrtPrice, targetSqrtPrice, liquidity, true)
}

/**
 * Get the amount of delta_a or delta_b from output parameters, and round down result.
 *
 * @param currentSqrtPrice
 * @param targetSqrtPrice
 * @param liquidity
 * @param aTob
 * @returns
 */
export function getDeltaDownFromOutput(currentSqrtPrice: BN, targetSqrtPrice: BN, liquidity: BN, aTob: boolean): BN {
  return aTob
    ? getDeltaB(targetSqrtPrice, currentSqrtPrice, liquidity, false)
    : getDeltaA(currentSqrtPrice, targetSqrtPrice, liquidity, false)
}

/**
 * Simulate per step of swap on every tick.
 *
 * @param currentSqrtPrice
 * @param targetSqrtPrice
 * @param liquidity
 * @param amount
 * @param feeRate
 * @param byAmountIn
 * @returns
 */
export function computeSwapStep(
  currentSqrtPrice: BN,
  targetSqrtPrice: BN,
  liquidity: BN,
  amount: BN,
  feeRate: BN,
  byAmountIn: boolean
): SwapStepResult {
  if (liquidity === ZERO) {
    return {
      amountIn: ZERO,
      amountOut: ZERO,
      nextSqrtPrice: targetSqrtPrice,
      feeAmount: ZERO,
    }
  }
  const a2b = currentSqrtPrice.gte(targetSqrtPrice)
  let amountIn: BN
  let amountOut: BN
  let nextSqrtPrice: BN
  let feeAmount: BN
  if (byAmountIn) {
    const amountRemain = MathUtil.checkMulDivFloor(
      amount,
      MathUtil.checkUnsignedSub(FEE_RATE_DENOMINATOR, feeRate),
      FEE_RATE_DENOMINATOR,
      64
    )
    const maxAmountIn = getDeltaUpFromInput(currentSqrtPrice, targetSqrtPrice, liquidity, a2b)
    if (maxAmountIn.gt(amountRemain)) {
      amountIn = amountRemain
      feeAmount = MathUtil.checkUnsignedSub(amount, amountRemain)
      nextSqrtPrice = getNextSqrtPriceFromInput(currentSqrtPrice, liquidity, amountRemain, a2b)
    } else {
      amountIn = maxAmountIn
      feeAmount = MathUtil.checkMulDivCeil(amountIn, feeRate, FEE_RATE_DENOMINATOR.sub(feeRate), 64)
      nextSqrtPrice = targetSqrtPrice
    }
    amountOut = getDeltaDownFromOutput(currentSqrtPrice, nextSqrtPrice, liquidity, a2b)
  } else {
    const maxAmountOut = getDeltaDownFromOutput(currentSqrtPrice, targetSqrtPrice, liquidity, a2b)
    if (maxAmountOut.gt(amount)) {
      amountOut = amount
      nextSqrtPrice = getNextSqrtPriceFromOutput(currentSqrtPrice, liquidity, amount, a2b)
    } else {
      amountOut = maxAmountOut
      nextSqrtPrice = targetSqrtPrice
    }
    amountIn = getDeltaUpFromInput(currentSqrtPrice, nextSqrtPrice, liquidity, a2b)
    feeAmount = MathUtil.checkMulDivCeil(amountIn, feeRate, FEE_RATE_DENOMINATOR.sub(feeRate), 64)
  }
  return {
    amountIn,
    amountOut,
    nextSqrtPrice,
    feeAmount,
  }
}

/**
 * Simulate swap by imput lots of ticks.
 * @param aToB
 * @param byAmountIn
 * @param amount
 * @param poolData
 * @param swapTicks
 * @returns
 */
export function computeSwap(
  aToB: boolean,
  byAmountIn: boolean,
  amount: BN,
  poolData: ClmmpoolData,
  swapTicks: Array<TickData>
): SwapResult {
  let remainerAmount = amount
  let currentLiquidity = poolData.liquidity
  let { currentSqrtPrice } = poolData
  const swapResult: SwapResult = {
    amountIn: ZERO,
    amountOut: ZERO,
    feeAmount: ZERO,
    refAmount: ZERO,
    nextSqrtPrice: ZERO,
    crossTickNum: 0,
  }
  let targetSqrtPrice
  let signedLiquidityChange
  const sqrtPriceLimit = SwapUtils.getDefaultSqrtPriceLimit(aToB)
  for (const tick of swapTicks) {
    if (aToB && poolData.currentTickIndex < Number(tick.index)) {
      continue
    }
    if (!aToB && poolData.currentTickIndex > Number(tick.index)) {
      continue
    }
    if (tick === null) {
      continue
    }
    if ((aToB && sqrtPriceLimit.gt(tick.sqrtPrice)) || (!aToB && sqrtPriceLimit.lt(tick.sqrtPrice))) {
      targetSqrtPrice = sqrtPriceLimit
    } else {
      targetSqrtPrice = tick.sqrtPrice
    }
    const stepResult = computeSwapStep(currentSqrtPrice, targetSqrtPrice, currentLiquidity, remainerAmount, poolData.feeRate, byAmountIn)
    if (!stepResult.amountIn.eq(ZERO)) {
      remainerAmount = byAmountIn
        ? remainerAmount.sub(stepResult.amountIn.add(stepResult.feeAmount))
        : remainerAmount.sub(stepResult.amountOut)
    }
    swapResult.amountIn = swapResult.amountIn.add(stepResult.amountIn)
    swapResult.amountOut = swapResult.amountOut.add(stepResult.amountOut)
    swapResult.feeAmount = swapResult.feeAmount.add(stepResult.feeAmount)
    if (stepResult.nextSqrtPrice.eq(tick.sqrtPrice)) {
      signedLiquidityChange = aToB ? tick.liquidityNet.mul(new BN(-1)) : tick.liquidityNet
      currentLiquidity = signedLiquidityChange.gt(ZERO)
        ? currentLiquidity.add(signedLiquidityChange)
        : currentLiquidity.sub(signedLiquidityChange.abs())
      currentSqrtPrice = tick.sqrtPrice
    } else {
      currentSqrtPrice = stepResult.nextSqrtPrice
    }
    swapResult.crossTickNum += 1
    if (remainerAmount.eq(ZERO)) {
      break
    }
  }
  swapResult.amountIn = swapResult.amountIn.add(swapResult.feeAmount)
  swapResult.nextSqrtPrice = currentSqrtPrice
  return swapResult
}

/**
 * Estimate liquidity for coin A
 * @param sqrtPriceX - coin A sqrtprice
 * @param sqrtPriceY - coin B sqrtprice
 * @param coinAmount - token amount
 * @return
 */
export function estimateLiquidityForCoinA(sqrtPriceX: BN, sqrtPriceY: BN, coinAmount: BN) {
  const lowerSqrtPriceX64 = BN.min(sqrtPriceX, sqrtPriceY)
  const upperSqrtPriceX64 = BN.max(sqrtPriceX, sqrtPriceY)
  const num = MathUtil.fromX64_BN(coinAmount.mul(upperSqrtPriceX64).mul(lowerSqrtPriceX64))
  const dem = upperSqrtPriceX64.sub(lowerSqrtPriceX64)
  return num.div(dem)
}

/**
 * Estimate liquidity for coin B
 * @param sqrtPriceX - coin A sqrtprice
 * @param sqrtPriceY - coin B sqrtprice
 * @param coinAmount - token amount
 * @return
 */
export function estimateLiquidityForCoinB(sqrtPriceX: BN, sqrtPriceY: BN, coinAmount: BN) {
  const lowerSqrtPriceX64 = BN.min(sqrtPriceX, sqrtPriceY)
  const upperSqrtPriceX64 = BN.max(sqrtPriceX, sqrtPriceY)
  const delta = upperSqrtPriceX64.sub(lowerSqrtPriceX64)
  return coinAmount.shln(64).div(delta)
}

export class ClmmPoolUtil {
  /**
   * Update fee rate.
   * @param clmm - clmmpool data
   * @param feeAmount - fee Amount
   * @param refRate - ref rate
   * @param protocolFeeRate - protocol fee rate
   * @param iscoinA - is token A
   * @returns percentage
   */
  static updateFeeRate(clmm: ClmmpoolData, feeAmount: BN, refRate: number, protocolFeeRate: number, iscoinA: boolean) {
    const protocolFee = MathUtil.checkMulDivCeil(feeAmount, new BN(protocolFeeRate), FEE_RATE_DENOMINATOR, 64)
    const refFee = refRate === 0 ? ZERO : MathUtil.checkMulDivFloor(feeAmount, new BN(refRate), FEE_RATE_DENOMINATOR, 64)
    const poolFee = feeAmount.mul(protocolFee).mul(refFee)
    if (iscoinA) {
      clmm.feeProtocolCoinA = clmm.feeProtocolCoinA.add(protocolFee)
    } else {
      clmm.feeProtocolCoinB = clmm.feeProtocolCoinB.add(protocolFee)
    }
    if (poolFee.eq(ZERO) || clmm.liquidity.eq(ZERO)) {
      return { refFee, clmm }
    }
    const growthFee = poolFee.shln(64).div(clmm.liquidity)
    if (iscoinA) {
      clmm.feeGrowthGlobalA = clmm.feeGrowthGlobalA.add(growthFee)
    } else {
      clmm.feeGrowthGlobalB = clmm.feeGrowthGlobalB.add(growthFee)
    }
    return { refFee, clmm }
  }

  /**
   * Get token amount fron liquidity.
   * @param liquidity - liquidity
   * @param curSqrtPrice - Pool current sqrt price
   * @param lowerPrice - lower price
   * @param upperPrice - upper price
   * @param roundUp - is round up
   * @returns
   */
  static getCoinAmountFromLiquidity(liquidity: BN, curSqrtPrice: BN, lowerPrice: BN, upperPrice: BN, roundUp: boolean): CoinAmounts {
    const liq = new Decimal(liquidity.toString())
    const curSqrtPriceStr = new Decimal(curSqrtPrice.toString())
    const lowerPriceStr = new Decimal(lowerPrice.toString())
    const upperPriceStr = new Decimal(upperPrice.toString())
    let coinA
    let coinB
    if (curSqrtPrice.lt(lowerPrice)) {
      coinA = MathUtil.toX64_Decimal(liq).mul(upperPriceStr.sub(lowerPriceStr)).div(lowerPriceStr.mul(upperPriceStr))
      coinB = new Decimal(0)
    } else if (curSqrtPrice.lt(upperPrice)) {
      coinA = MathUtil.toX64_Decimal(liq).mul(upperPriceStr.sub(curSqrtPriceStr)).div(curSqrtPriceStr.mul(upperPriceStr))

      coinB = MathUtil.fromX64_Decimal(liq.mul(curSqrtPriceStr.sub(lowerPriceStr)))
    } else {
      coinA = new Decimal(0)
      coinB = MathUtil.fromX64_Decimal(liq.mul(upperPriceStr.sub(lowerPriceStr)))
    }
    if (roundUp) {
      return {
        coinA: new BN(coinA.ceil().toString()),
        coinB: new BN(coinB.ceil().toString()),
      }
    }
    return {
      coinA: new BN(coinA.floor().toString()),
      coinB: new BN(coinB.floor().toString()),
    }
  }

  /**
   * Estimate liquidity from token amounts
   * @param curSqrtPrice - current sqrt price.
   * @param lowerTick - lower tick
   * @param upperTick - upper tick
   * @param tokenAmount - token amount
   * @return
   */
  static estimateLiquidityFromcoinAmounts(curSqrtPrice: BN, lowerTick: number, upperTick: number, tokenAmount: CoinAmounts): BN {
    if (lowerTick > upperTick) {
      throw new Error('lower tick cannot be greater than lower tick')
    }
    const currTick = TickMath.sqrtPriceX64ToTickIndex(curSqrtPrice)
    const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick)
    const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick)
    if (currTick < lowerTick) {
      return estimateLiquidityForCoinA(lowerSqrtPrice, upperSqrtPrice, tokenAmount.coinA)
    }
    if (currTick >= upperTick) {
      return estimateLiquidityForCoinB(upperSqrtPrice, lowerSqrtPrice, tokenAmount.coinB)
    }
    const estimateLiquidityAmountA = estimateLiquidityForCoinA(curSqrtPrice, upperSqrtPrice, tokenAmount.coinA)
    const estimateLiquidityAmountB = estimateLiquidityForCoinB(curSqrtPrice, lowerSqrtPrice, tokenAmount.coinB)
    return BN.min(estimateLiquidityAmountA, estimateLiquidityAmountB)
  }

  /**
   * Estimate liquidity and token amount from one amounts
   * @param lowerTick - lower tick
   * @param upperTick - upper tick
   * @param coinAmount - token amount
   * @param iscoinA - is token A
   * @param roundUp - is round up
   * @param isIncrease - is increase
   * @param slippage - slippage percentage
   * @param curSqrtPrice - current sqrt price.
   * @return IncreaseLiquidityInput
   */
  static estLiquidityAndcoinAmountFromOneAmounts(
    lowerTick: number,
    upperTick: number,
    coinAmount: BN,
    iscoinA: boolean,
    roundUp: boolean,
    slippage: number,
    curSqrtPrice: BN
  ): IncreaseLiquidityInput {
    const currentTick = TickMath.sqrtPriceX64ToTickIndex(curSqrtPrice)
    const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick)
    const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick)
    let liquidity
    if (currentTick <= lowerTick) {
      if (!iscoinA) {
        throw new Error('lower tick cannot calculate liquidity by coinB')
      }
      liquidity = estimateLiquidityForCoinA(lowerSqrtPrice, upperSqrtPrice, coinAmount)
    } else if (currentTick >= upperTick) {
      if (iscoinA) {
        throw new Error('upper tick cannot calculate liquidity by coinA')
      }
      liquidity = estimateLiquidityForCoinB(upperSqrtPrice, lowerSqrtPrice, coinAmount)
    } else if (iscoinA) {
      liquidity = estimateLiquidityForCoinA(curSqrtPrice, upperSqrtPrice, coinAmount)
    } else {
      liquidity = estimateLiquidityForCoinB(curSqrtPrice, lowerSqrtPrice, coinAmount)
    }
    const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(liquidity, curSqrtPrice, lowerSqrtPrice, upperSqrtPrice, roundUp)
    const tokenMaxA = coinAmounts.coinA.mul(new BN(1 + slippage))
    const tokenMaxB = coinAmounts.coinB.mul(new BN(1 + slippage))
    return {
      tokenMaxA,
      tokenMaxB,
      liquidityAmount: liquidity,
    }
  }
}
