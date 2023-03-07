import BN from 'bn.js'

export type DecreaseLiquidityInput = {
  tokenMinA: BN
  tokenMinB: BN
  liquidityAmount: BN
}

export type IncreaseLiquidityInput = {
  tokenMaxA: BN
  tokenMaxB: BN
  liquidityAmount: BN
}

export enum SwapDirection {
  A2B = 'a2b',
  B2A = 'b2a',
}
