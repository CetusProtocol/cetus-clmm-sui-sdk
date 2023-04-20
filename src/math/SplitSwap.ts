import BN from 'bn.js'
import { ClmmpoolData, TickData, transClmmpoolDataWithoutTicks } from '../types/clmmpool'
import { Pool } from '../modules/resourcesModule'
import { computeSwapStep, SwapStepResult } from './clmm'
import { SwapUtils } from './swap'
import { ZERO } from './utils'

export enum SplitUnit {
  FIVE = 5,
  TEN = 10,
  TWENTY = 20,
  TWENTY_FIVE = 25,
  FIVETY = 50,
  HUNDRED = 100,
}

export function createSplitArray(minSplitUnit: SplitUnit): number[] {
  let unit
  switch (minSplitUnit) {
    case SplitUnit.FIVE:
      unit = 5
      break
    case SplitUnit.TEN:
      unit = 10
      break
    case SplitUnit.TWENTY:
      unit = 20
      break
    case SplitUnit.TWENTY_FIVE:
      unit = 25
      break
    case SplitUnit.FIVETY:
      unit = 50
      break
    case SplitUnit.HUNDRED:
      unit = 100
      break
    default:
      unit = 1
  }
  const length = 100 / unit + 1
  const splitArray = new Array<number>(length)
  for (let i = 0; i < length; i += 1) {
    splitArray[i] = i * unit
  }
  return splitArray
}

export function createSplitAmountArray(amount: BN, minSplitUnit: SplitUnit): BN[] {
  const splitArray = createSplitArray(minSplitUnit)
  const splitAmountArray = new Array<BN>(splitArray.length)

  for (let i = 0; i < splitArray.length; i += 1) {
    splitAmountArray[i] = amount.muln(splitArray[i]).divn(100)
  }

  return splitAmountArray
}

export type SplitSwapResult = {
  amountInArray: BN[]
  amountOutArray: BN[]
  feeAmountArray: BN[]
  nextSqrtPriceArray: BN[]
  isExceed: boolean[]
}

function updateSplitSwapResult(
  maxIndex: number,
  currentIndex: number,
  splitSwapResult: SplitSwapResult,
  stepResult: SwapStepResult
): SplitSwapResult {
  for (let index = currentIndex; index < maxIndex; index += 1) {
    splitSwapResult.amountInArray[index] = splitSwapResult.amountInArray[index].add(stepResult.amountIn)
    splitSwapResult.amountOutArray[index] = splitSwapResult.amountOutArray[index].add(stepResult.amountOut)
    splitSwapResult.feeAmountArray[index] = splitSwapResult.feeAmountArray[index].add(stepResult.feeAmount)
  }
  return splitSwapResult
}

function computeSplitSwap(
  a2b: boolean,
  byAmountIn: boolean,
  amounts: BN[],
  poolData: ClmmpoolData,
  swapTicks: TickData[]
): SplitSwapResult {
  let currentLiquidity = new BN(poolData.liquidity)
  let { currentSqrtPrice } = poolData

  let splitSwapResult: SplitSwapResult = {
    amountInArray: [],
    amountOutArray: [],
    feeAmountArray: [],
    nextSqrtPriceArray: [],
    isExceed: [],
  }

  amounts.forEach(() => {
    splitSwapResult.amountInArray.push(ZERO)
    splitSwapResult.amountOutArray.push(ZERO)
    splitSwapResult.feeAmountArray.push(ZERO)
    splitSwapResult.nextSqrtPriceArray.push(ZERO)
  })

  let targetSqrtPrice
  let signedLiquidityChange
  const sqrtPriceLimit = SwapUtils.getDefaultSqrtPriceLimit(a2b)

  const maxIndex = amounts.length
  let remainerAmount = amounts[1]
  let currentIndex = 1

  let ticks
  if (a2b) {
    ticks = swapTicks.sort((a, b) => {
      return b.index - a.index
    })
  } else {
    ticks = swapTicks.sort((a, b) => {
      return a.index - b.index
    })
  }

  for (const tick of ticks) {
    if (a2b) {
      if (poolData.currentTickIndex < tick.index) {
        continue
      }
    } else if (poolData.currentTickIndex > tick.index) {
      continue
    }
    if (tick === null) {
      continue
    }
    if ((a2b && sqrtPriceLimit.gt(tick.sqrtPrice)) || (!a2b && sqrtPriceLimit.lt(tick.sqrtPrice))) {
      targetSqrtPrice = sqrtPriceLimit
    } else {
      targetSqrtPrice = tick.sqrtPrice
    }

    let tempStepResult: SwapStepResult = {
      amountIn: ZERO,
      amountOut: ZERO,
      nextSqrtPrice: ZERO,
      feeAmount: ZERO,
    }

    const tempSqrtPrice = currentSqrtPrice
    const tempLiquidity = currentLiquidity
    let tempRemainerAmount = remainerAmount
    let currentTempIndex = currentIndex

    for (let i = currentIndex; i < maxIndex; i += 1) {
      const stepResult = computeSwapStep(
        currentSqrtPrice,
        targetSqrtPrice,
        currentLiquidity,
        remainerAmount,
        new BN(poolData.feeRate),
        byAmountIn
      )
      tempStepResult = stepResult

      if (!stepResult.amountIn.eq(ZERO)) {
        remainerAmount = byAmountIn
          ? remainerAmount.sub(stepResult.amountIn.add(stepResult.feeAmount))
          : remainerAmount.sub(stepResult.amountOut)
      }

      // splitSwapResult = updateSplitSwapResult(maxIndex, currentIndex, splitSwapResult, stepResult)
      if (remainerAmount.eq(ZERO)) {
        splitSwapResult.amountInArray[i] = splitSwapResult.amountInArray[i].add(stepResult.amountIn)
        splitSwapResult.amountOutArray[i] = splitSwapResult.amountOutArray[i].add(stepResult.amountOut)
        splitSwapResult.feeAmountArray[i] = splitSwapResult.feeAmountArray[i].add(stepResult.feeAmount)

        // When current index remainerAmount run out, we need to update the swapResult of current index amountIn
        if (stepResult.nextSqrtPrice.eq(tick.sqrtPrice)) {
          signedLiquidityChange = a2b ? tick.liquidityNet.mul(new BN(-1)) : tick.liquidityNet
          currentLiquidity = signedLiquidityChange.gt(ZERO)
            ? currentLiquidity.add(signedLiquidityChange)
            : currentLiquidity.sub(signedLiquidityChange.abs())
          currentSqrtPrice = tick.sqrtPrice
        } else {
          currentSqrtPrice = stepResult.nextSqrtPrice
        }
        splitSwapResult.amountInArray[i] = splitSwapResult.amountInArray[i].add(splitSwapResult.feeAmountArray[i])
        splitSwapResult.nextSqrtPriceArray[i] = currentSqrtPrice
        currentLiquidity = tempLiquidity
        currentSqrtPrice = tempSqrtPrice
        // remainerAmount = tempRemainerAmount.add(amounts[1].muln(i - currentTempIndex + 1))
        if (i !== maxIndex - 1) {
          remainerAmount = tempRemainerAmount.add(amounts[i + 1].sub(amounts[currentTempIndex]))
        }
        currentIndex += 1
      } else {
        splitSwapResult = updateSplitSwapResult(maxIndex, i, splitSwapResult, stepResult)
        tempRemainerAmount = remainerAmount
        currentTempIndex = currentIndex
        break
      }
    }

    if (currentIndex === maxIndex) {
      break
    }

    if (tempStepResult.nextSqrtPrice.eq(tick.sqrtPrice)) {
      signedLiquidityChange = a2b ? tick.liquidityNet.mul(new BN(-1)) : tick.liquidityNet
      currentLiquidity = signedLiquidityChange.gt(ZERO)
        ? currentLiquidity.add(signedLiquidityChange)
        : currentLiquidity.sub(signedLiquidityChange.abs())
      currentSqrtPrice = tick.sqrtPrice
    } else {
      currentSqrtPrice = tempStepResult.nextSqrtPrice
    }
  }

  if (byAmountIn) {
    amounts.forEach((a, i) => {
      splitSwapResult.isExceed.push(splitSwapResult.amountInArray[i].lt(a))
    })
  } else {
    amounts.forEach((a, i) => {
      splitSwapResult.isExceed.push(splitSwapResult.amountOutArray[i].lt(a))
    })
  }

  return splitSwapResult
}

export class SplitSwap {
  readonly minSplitUnit: number

  amountArray: BN[]

  private byAmountIn: boolean

  private a2b: boolean

  private clmmpool: Pool

  private ticks: TickData[]

  private splitSwapResult: SplitSwapResult

  constructor(amount: BN, unit: SplitUnit, clmmpool: Pool, a2b: boolean, byAmountIn: boolean, tickData: TickData[]) {
    this.minSplitUnit = unit
    this.a2b = a2b
    this.byAmountIn = byAmountIn
    this.clmmpool = clmmpool
    this.ticks = tickData
    this.amountArray = []
    this.createSplitSwapParams = this.createSplitSwapParams.bind(this)
    this.createSplitSwapParams(amount, unit)
    this.splitSwapResult = {
      amountInArray: [],
      amountOutArray: [],
      feeAmountArray: [],
      nextSqrtPriceArray: [],
      isExceed: [],
    }
    this.computeSwap = this.computeSwap.bind(this)
  }

  createSplitSwapParams(amount: BN, unit: SplitUnit) {
    const amountArray = createSplitAmountArray(amount, unit)
    this.amountArray = amountArray
  }

  computeSwap(): SplitSwapResult {
    const pool = transClmmpoolDataWithoutTicks(this.clmmpool)
    this.splitSwapResult = computeSplitSwap(this.a2b, this.byAmountIn, this.amountArray, pool, this.ticks)
    return this.splitSwapResult
  }
}
