import { d } from './numbers'

export class GasConfig {
  price = 1

  GasBudgetLow = 60_000_000

  GasBudgetMiddle = 75_000_000

  GasBudgetMiddle2 = 90_000_000

  GasBudgetHigh = 105_000_000

  GasBudgetHigh2 = 240_000_000

  constructor(price = 1) {
    this.price = price
    this.GasBudgetLow = Number(d(this.GasBudgetLow).mul(this.price).toFixed(0))
    this.GasBudgetMiddle = Number(d(this.GasBudgetMiddle).mul(this.price).toFixed(0))
    this.GasBudgetMiddle2 = Number(d(this.GasBudgetMiddle2).mul(this.price).toFixed(0))
    this.GasBudgetHigh = Number(d(this.GasBudgetHigh).mul(this.price).toFixed(0))
    this.GasBudgetHigh2 = Number(d(this.GasBudgetHigh2).mul(this.price).toFixed(0))
  }
}
