/* eslint-disable camelcase */
import BN from 'bn.js'
import { ZERO } from '../math/utils'

export type TickData = {
  objectId: string
  index: string
  sqrtPrice: BN
  liquidityNet: BN
  liquidityGross: BN
  feeGrowthOutsideA: BN
  feeGrowthOutsideB: BN
  rewardersGrowthOutside: BN[]
}

export type Tick = {
  index: Bits
  sqrt_price: string
  liquidity_net: Bits
  liquidity_gross: string
  fee_growth_outside_a: string
  fee_growth_outside_b: string
  rewarders_growth_outside: string[3]
}

export type Bits = {
  bits: string
}

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
