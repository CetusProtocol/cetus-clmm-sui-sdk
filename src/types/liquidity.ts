import BN from 'bn.js'

export type LiquidityInput = {
  coinAmountA: BN
  coinAmountB: BN
  tokenMaxA: BN
  tokenMaxB: BN
  liquidityAmount: BN
}

export enum SwapDirection {
  A2B = 'a2b',
  B2A = 'b2a',
}
