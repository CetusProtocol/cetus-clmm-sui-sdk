import BN from 'bn.js'
import { OneStep } from '../modules/routerModule'
import { U64_MAX, ZERO } from './utils'

// TODO: recursion to find the max amout out router
export function findBestSplitSteps(
  routerTable: BN[][],
  feeRateArray: number[],
  poolAddresses: string[],
  exceedTable: boolean[][],
  a2b: boolean[],
  byAmountIn: boolean
): OneStep {
  const numRows = routerTable.length

  if (!numRows) {
    throw new Error('routerTable is empty')
  }
  if (numRows !== feeRateArray.length) {
    throw new Error('routerTable length not equal to feeRateArray length')
  }

  const numCols = routerTable[0].length
  const unit = 100 / (numCols - 1)
  let tempAmount = byAmountIn ? ZERO : U64_MAX
  let tempPath = []

  switch (numRows) {
    case 1: {
      // tempAmount = routerTable[0][routerTable[0].length - 1]
      if (!exceedTable[0][numCols - 1]) {
        if ((routerTable[0][numCols - 1].gt(tempAmount) && byAmountIn) || (routerTable[0][numCols - 1].lt(tempAmount) && !byAmountIn)) {
          // eslint-disable-next-line prefer-destructuring
          tempAmount = routerTable[0][numCols - 1]
          tempPath.push({
            feeRate: feeRateArray[0],
            pool: poolAddresses[0],
            a2b: a2b[0],
            splitStepPercent: 100,
            splitStepAmount: routerTable[0][numCols - 1].toString(),
          })
        }
      }
      break
    }
    case 2: {
      for (let a = 0; a < numCols; a += 1) {
        const b = numCols - a - 1
        const sum = routerTable[0][a].add(routerTable[1][b])
        if ((sum.gt(tempAmount) && byAmountIn) || (sum.lt(tempAmount) && !byAmountIn)) {
          if (!exceedTable[0][a] && !exceedTable[1][b]) {
            tempPath = []
            tempAmount = sum
            if (a > 0) {
              tempPath.push({
                feeRate: feeRateArray[0],
                pool: poolAddresses[0],
                a2b: a2b[0],
                splitStepPercent: a * unit,
                splitStepAmount: routerTable[0][a].toString(),
              })
            }
            if (b > 0) {
              tempPath.push({
                feeRate: feeRateArray[1],
                pool: poolAddresses[1],
                a2b: a2b[1],
                splitStepPercent: b * unit,
                splitStepAmount: routerTable[1][b].toString(),
              })
            }
          } else {
            continue
          }
        }
      }
      break
    }
    case 3: {
      for (let a = 0; a < numCols; a += 1) {
        for (let b = 0; b < numCols - a; b += 1) {
          const c = numCols - a - b - 1
          const sum = routerTable[0][a].add(routerTable[1][b]).add(routerTable[2][c])
          if ((sum.gt(tempAmount) && byAmountIn) || (sum.lt(tempAmount) && !byAmountIn)) {
            if (exceedTable[0][a] || exceedTable[1][b] || exceedTable[2][c]) {
              continue
            }
            tempPath = []
            tempAmount = sum
            if (a > 0) {
              tempPath.push({
                feeRate: feeRateArray[0],
                pool: poolAddresses[0],
                a2b: a2b[0],
                splitStepPercent: a * unit,
                splitStepAmount: routerTable[0][a].toString(),
              })
            }
            if (b > 0) {
              tempPath.push({
                feeRate: feeRateArray[1],
                pool: poolAddresses[1],
                a2b: a2b[1],
                splitStepPercent: b * unit,
                splitStepAmount: routerTable[1][b].toString(),
              })
            }
            if (c > 0) {
              tempPath.push({
                feeRate: feeRateArray[2],
                pool: poolAddresses[2],
                a2b: a2b[2],
                splitStepPercent: c * unit,
                splitStepAmount: routerTable[2][c].toString(),
              })
            }
          }
        }
      }
      break
    }
    case 4: {
      for (let a = 0; a < numCols; a += 1) {
        for (let b = 0; b < numCols - a; b += 1) {
          for (let c = 0; c < numCols - a - b; c += 1) {
            const d = numCols - a - b - c - 1
            const sum = routerTable[0][a].add(routerTable[1][b]).add(routerTable[2][c]).add(routerTable[3][d])
            if ((sum.gt(tempAmount) && byAmountIn) || (sum.lt(tempAmount) && !byAmountIn)) {
              if (exceedTable[0][a] || exceedTable[1][b] || exceedTable[2][c] || exceedTable[3][d]) {
                continue
              }
              tempPath = []
              tempAmount = sum
              if (a > 0) {
                tempPath.push({
                  feeRate: feeRateArray[0],
                  pool: poolAddresses[0],
                  a2b: a2b[0],
                  splitStepPercent: a * unit,
                  splitStepAmount: routerTable[0][a].toString(),
                })
              }
              if (b > 0) {
                tempPath.push({
                  feeRate: feeRateArray[1],
                  pool: poolAddresses[1],
                  a2b: a2b[1],
                  splitStepPercent: b * unit,
                  splitStepAmount: routerTable[1][b].toString(),
                })
              }
              if (c > 0) {
                tempPath.push({
                  feeRate: feeRateArray[2],
                  pool: poolAddresses[2],
                  a2b: a2b[2],
                  splitStepPercent: c * unit,
                  splitStepAmount: routerTable[2][c].toString(),
                })
              }
              if (d > 0) {
                tempPath.push({
                  feeRate: feeRateArray[3],
                  pool: poolAddresses[3],
                  a2b: a2b[3],
                  splitStepPercent: d * unit,
                  splitStepAmount: routerTable[3][d].toString(),
                })
              }
            }
          }
        }
      }
      break
    }
    default: {
      break
    }
  }

  if (tempPath.length === 0 || tempAmount.eq(ZERO)) {
    return {
      stepAmount: ZERO,
      splitSteps: [],
      isExceed: true,
    }
  }

  return {
    stepAmount: tempAmount,
    splitSteps: tempPath,
    isExceed: false,
  }
}
