/* eslint-disable camelcase */
import BN from 'bn.js'
import { ZERO } from '../math/utils'
import { Pool } from './clmm_type'

export type TickData = {
  objectId: string
  index: number
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
