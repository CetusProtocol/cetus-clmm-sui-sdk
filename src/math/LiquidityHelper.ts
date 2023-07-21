import Decimal from 'decimal.js'
import { d } from '../utils/numbers'

export function withLiquiditySlippage(value: Decimal.Instance, slippage: Decimal.Instance, mode: 'plus' | 'minus') {
  return d(value)[mode](d(value).mul(slippage)).toDP(0)
}

export type POOL_NO_LIQUIDITY = -1

export type LiquidityAndCoinYResult = {
  coinYAmount: Decimal
  lpAmount: Decimal
}

export function getLiquidityAndCoinYByCoinX(
  coinInVal: Decimal.Instance,
  reserveInSize: Decimal.Instance,
  reserveOutSize: Decimal.Instance,
  lpSupply: Decimal.Instance
): LiquidityAndCoinYResult | POOL_NO_LIQUIDITY {
  if (coinInVal.lessThanOrEqualTo(0)) {
    throw new Error('coinInVal is less than zero')
  }

  if (reserveInSize.lessThanOrEqualTo(0) || reserveOutSize.lessThanOrEqualTo(0)) {
    return -1
  }

  const coinYAmount = coinInVal.mul(reserveOutSize).div(reserveInSize)
  // const sqrtSupply = reserveInSize.mul(reserveOutSize).sqrt()
  const sqrtSupply = lpSupply

  const lpX = coinInVal.div(reserveInSize).mul(sqrtSupply)
  const lpY = coinYAmount.div(reserveOutSize).mul(sqrtSupply)
  const lpAmount = Decimal.min(lpX, lpY)
  return {
    coinYAmount,
    lpAmount,
  }
}

export function getCoinXYForLiquidity(
  liquidity: Decimal.Instance,
  reserveInSize: Decimal.Instance,
  reserveOutSize: Decimal.Instance,
  lpSuply: Decimal.Instance
) {
  if (liquidity.lessThanOrEqualTo(0)) {
    throw new Error('liquidity is less than zero')
  }

  if (reserveInSize.lessThanOrEqualTo(0) || reserveOutSize.lessThanOrEqualTo(0)) {
    throw new Error("reserves can't be equal or less than zero")
  }

  // const sqrtSupply = reserveInSize.mul(reserveOutSize).sqrt()
  const sqrtSupply = lpSuply
  const coinXAmount = liquidity.div(sqrtSupply).mul(reserveInSize)
  const coinYAmount = liquidity.div(sqrtSupply).mul(reserveOutSize)

  return {
    coinXAmount,
    coinYAmount,
  }
}
