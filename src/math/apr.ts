/* eslint-disable camelcase */
import BN from 'bn.js'
import Decimal from 'decimal.js'
import { TickData } from '../types/clmmpool'
import { getDeltaA, getDeltaB } from './clmm'
import { TickMath } from './tick'
import { MathUtil } from './utils'

const D365 = new BN(365)
const H24 = new BN(24)
const S3600 = new BN(3600)
const B05 = new BN(0.5)

export function estPoolAPR(preBlockReward: BN, rewardPrice: BN, totalTradingFee: BN, totalLiquidityValue: BN): BN {
  const annualRate = D365.mul(H24).mul(S3600).mul(B05)

  const APR = annualRate.mul(preBlockReward.mul(rewardPrice).add(totalTradingFee).div(totalLiquidityValue))

  return APR
}

// Get token amount from liquidity.
function getCoinAmountsFromLiquidity(liquidity: BN, curSqrtPrice: BN, lowerSqrtPrice: BN, upperSqrtPrice: BN, roundUp: boolean) {
  let coinA = new BN(0)
  let coinB = new BN(0)
  if (curSqrtPrice.lt(lowerSqrtPrice)) {
    coinA = getDeltaA(lowerSqrtPrice, upperSqrtPrice, liquidity, roundUp)
  } else if (curSqrtPrice.lt(upperSqrtPrice)) {
    coinA = getDeltaA(curSqrtPrice, upperSqrtPrice, liquidity, roundUp)
    coinB = getDeltaB(lowerSqrtPrice, curSqrtPrice, liquidity, roundUp)
  } else {
    coinB = getDeltaB(lowerSqrtPrice, upperSqrtPrice, liquidity, roundUp)
  }

  return {
    coinA,
    coinB,
  }
}

type Amounts = {
  amountA: BN
  amountB: BN
}

function calSpecifiedTickRangeAmount(
  lowerSqrtPriceX64: BN,
  upperSqrtPriceX64: BN,
  currentSqrtPriceX64: BN,
  currentLiqidity: BN,
  tickDatas: Array<TickData>
): Amounts {
  let amountA = new BN(0)
  let amountB = new BN(0)
  if (currentSqrtPriceX64.lt(lowerSqrtPriceX64)) {
    let liquidity = currentLiqidity
    const ticks = tickDatas.sort((a, b) => {
      return Number(a.index) - Number(b.index)
    })
    for (let i = 0; i < ticks.length; i += 1) {
      const tick = ticks[i]
      if (tick.sqrtPrice.lt(currentSqrtPriceX64)) {
        continue
      }
      liquidity = liquidity.add(tick.liquidityNet)
      if (lowerSqrtPriceX64.lt(tick.sqrtPrice)) {
        continue
      }
      if (upperSqrtPriceX64.lt(tick.sqrtPrice)) {
        break
      }
      const amounts = getCoinAmountsFromLiquidity(liquidity, currentSqrtPriceX64, tick.sqrtPrice, ticks[i + 1].sqrtPrice, false)
      amountA = amountA.add(amounts.coinA)
      amountB = amountB.add(amounts.coinB)
    }
  } else if (currentSqrtPriceX64.gt(upperSqrtPriceX64)) {
    let liquidity = currentLiqidity
    const ticks = tickDatas.sort((a, b) => {
      return Number(b.index) - Number(a.index)
    })
    for (let i = 0; i < ticks.length; i += 1) {
      const tick = ticks[i]
      if (tick.sqrtPrice.gt(currentSqrtPriceX64)) {
        continue
      }
      liquidity = liquidity.sub(tick.liquidityNet)
      if (upperSqrtPriceX64.lt(tick.sqrtPrice)) {
        continue
      }
      if (lowerSqrtPriceX64.gte(tick.sqrtPrice)) {
        break
      }
      const amounts = getCoinAmountsFromLiquidity(liquidity, currentSqrtPriceX64, ticks[i + 1].sqrtPrice, tick.sqrtPrice, false)
      amountA = amountA.add(amounts.coinA)
      amountB = amountB.add(amounts.coinB)
    }
  } else {
    // calculate lower<->current
    // let ticks: TickData[] = []
    let ticks = tickDatas.sort((a, b) => {
      return Number(b.index) - Number(a.index)
    })
    let liquidity = currentLiqidity
    for (let i = 0; i < tickDatas.length; i += 1) {
      const tick = ticks[i]
      if (tick.sqrtPrice.gt(currentSqrtPriceX64)) {
        continue
      }
      liquidity = liquidity.sub(tick.liquidityNet)
      if (lowerSqrtPriceX64.gte(tick.sqrtPrice)) {
        break
      }

      const amounts = getCoinAmountsFromLiquidity(liquidity, currentSqrtPriceX64, ticks[i + 1].sqrtPrice, tick.sqrtPrice, false)
      amountA = amountA.add(amounts.coinA)
      amountB = amountB.add(amounts.coinB)
    }

    // calculate current<->upper
    ticks = tickDatas.sort((a, b) => {
      return Number(a.index) - Number(b.index)
    })
    liquidity = currentLiqidity
    for (let i = 0; i < ticks.length; i += 1) {
      const tick = ticks[i]
      if (tick.sqrtPrice.lt(currentSqrtPriceX64)) {
        continue
      }
      liquidity = liquidity.add(tick.liquidityNet)
      if (upperSqrtPriceX64.lt(tick.sqrtPrice)) {
        break
      }
      const amounts = getCoinAmountsFromLiquidity(liquidity, currentSqrtPriceX64, tick.sqrtPrice, ticks[i + 1].sqrtPrice, true)
      amountA = amountA.add(amounts.coinA)
      amountB = amountB.add(amounts.coinB)
    }
  }
  return {
    amountA,
    amountB,
  }
}

function calculatePoolValidTVL(
  amountA: BN,
  amountB: BN,
  decimalsA: number,
  decimalsB: number,
  coinAPrice: Decimal,
  coinBPrice: Decimal
): Decimal {
  // console.log({
  //   coinAmountsA: amountA.toString(),
  //   coinAmountsB: amountB.toString(),
  // })
  const poolValidAmountA = new Decimal(amountA.toString()).div(new Decimal(10 ** decimalsA))
  const poolValidAmountB = new Decimal(amountB.toString()).div(new Decimal(10 ** decimalsB))

  // console.log(poolValidAmountA, poolValidAmountB)
  const TVL = poolValidAmountA.mul(coinAPrice).add(poolValidAmountB.mul(coinBPrice))

  return TVL
}

export type estPosAPRResult = {
  feeAPR: Decimal
  posRewarder0APR: Decimal
  posRewarder1APR: Decimal
  posRewarder2APR: Decimal
}

export function estPositionAPRWithDeltaMethod(
  currentTickIndex: number,
  lowerTickIndex: number,
  upperTickIndex: number,
  currentSqrtPriceX64: BN,
  poolLiquidity: BN,
  decimalsA: number,
  decimalsB: number,
  decimalsRewarder0: number,
  decimalsRewarder1: number,
  decimalsRewarder2: number,
  feeRate: number,
  amountA_str: string,
  amountB_str: string,
  poolAmountA: BN,
  poolAmountB: BN,
  swapVolume_str: string,
  poolRewarders0_str: string,
  poolRewarders1_str: string,
  poolRewarders2_str: string,
  coinAPrice_str: string,
  coinBPrice_str: string,
  rewarder0Price_str: string,
  rewarder1Price_str: string,
  rewarder2Price_str: string
): estPosAPRResult {
  const amountA = new Decimal(amountA_str)
  const amountB = new Decimal(amountB_str)
  const swapVolume = new Decimal(swapVolume_str)
  const poolRewarders0 = new Decimal(poolRewarders0_str)
  const poolRewarders1 = new Decimal(poolRewarders1_str)
  const poolRewarders2 = new Decimal(poolRewarders2_str)
  const coinAPrice = new Decimal(coinAPrice_str)
  const coinBPrice = new Decimal(coinBPrice_str)
  const rewarder0Price = new Decimal(rewarder0Price_str)
  const rewarder1Price = new Decimal(rewarder1Price_str)
  const rewarder2Price = new Decimal(rewarder2Price_str)

  const lowerSqrtPriceX64 = TickMath.tickIndexToSqrtPriceX64(lowerTickIndex)
  const upperSqrtPriceX64 = TickMath.tickIndexToSqrtPriceX64(upperTickIndex)
  const lowerSqrtPrice_d = MathUtil.toX64_Decimal(MathUtil.fromX64(lowerSqrtPriceX64)).round()
  const upperSqrtPrice_d = MathUtil.toX64_Decimal(MathUtil.fromX64(upperSqrtPriceX64)).round()
  const currentSqrtPrice_d = MathUtil.toX64_Decimal(MathUtil.fromX64(currentSqrtPriceX64)).round()
  let deltaLiquidity
  const liquidityAmount0 = amountA
    .mul(new Decimal(10 ** decimalsA))
    .mul(upperSqrtPrice_d.mul(lowerSqrtPrice_d))
    .div(upperSqrtPrice_d.sub(lowerSqrtPrice_d))
    .round()
  const liquidityAmount1 = amountB
    .mul(new Decimal(10 ** decimalsB))
    .div(upperSqrtPrice_d.sub(lowerSqrtPrice_d))
    .round()
  if (currentTickIndex < lowerTickIndex) {
    deltaLiquidity = liquidityAmount0
  } else if (currentTickIndex > upperTickIndex) {
    deltaLiquidity = liquidityAmount1
  } else {
    deltaLiquidity = Decimal.min(liquidityAmount0, liquidityAmount1)
  }
  const deltaY = deltaLiquidity.mul(currentSqrtPrice_d.sub(lowerSqrtPrice_d))
  const deltaX = deltaLiquidity.mul(upperSqrtPrice_d.sub(currentSqrtPrice_d)).div(currentSqrtPrice_d.mul(upperSqrtPrice_d))
  const posValidTVL = deltaX
    .div(new Decimal(10 ** decimalsA))
    .mul(coinAPrice)
    .add(deltaY.div(new Decimal(10 ** decimalsB).mul(coinBPrice)))
  const poolValidTVL = calculatePoolValidTVL(poolAmountA, poolAmountB, decimalsA, decimalsB, coinAPrice, coinBPrice)
  const posValidRate = posValidTVL.div(poolValidTVL)

  const feeAPR = deltaLiquidity.eq(new Decimal(0))
    ? new Decimal(0)
    : new Decimal(feeRate / 10000)
        .mul(swapVolume)
        .mul(new Decimal(deltaLiquidity.toString()).div(new Decimal(poolLiquidity.toString()).add(new Decimal(deltaLiquidity.toString()))))
        .div(posValidTVL)

  const aprCoe = posValidRate.eq(new Decimal(0)) ? new Decimal(0) : posValidRate.mul(new Decimal(36500 / 7)).div(posValidTVL)
  const posRewarder0APR = poolRewarders0
    .div(new Decimal(10 ** decimalsRewarder0))
    .mul(rewarder0Price)
    .mul(aprCoe)
  const posRewarder1APR = poolRewarders1
    .div(new Decimal(10 ** decimalsRewarder1))
    .mul(rewarder1Price)
    .mul(aprCoe)
  const posRewarder2APR = poolRewarders2
    .div(new Decimal(10 ** decimalsRewarder2))
    .mul(rewarder2Price)
    .mul(aprCoe)
  return {
    feeAPR,
    posRewarder0APR,
    posRewarder1APR,
    posRewarder2APR,
  }
}

export function estPositionAPRWithMultiMethod(
  lowerUserPrice: number,
  upperUserPrice: number,
  lowerHistPrice: number,
  upperHistPrice: number
): Decimal {
  const retroLower = Math.max(lowerUserPrice, lowerHistPrice)
  const retroUpper = Math.min(upperUserPrice, upperHistPrice)
  const retroRange = retroUpper - retroLower
  const userRange = upperUserPrice - lowerUserPrice
  const histRange = upperHistPrice - lowerHistPrice
  const userRange_d = new Decimal(userRange.toString())
  const histRange_d = new Decimal(histRange.toString())
  const retroRange_d = new Decimal(retroRange.toString())

  let m = new Decimal('0')
  if (retroRange < 0) {
    m = new Decimal('0')
  } else if (userRange === retroRange) {
    m = histRange_d.div(retroRange_d)
  } else if (histRange === retroRange) {
    m = retroRange_d.div(userRange_d)
  } else {
    m = retroRange_d.mul(retroRange_d).div(histRange_d).div(userRange_d)
  }

  return m
}
