import Decimal from 'decimal.js'

export function d(value?: Decimal.Value): Decimal.Instance {
  if (Decimal.isDecimal(value)) {
    return value as Decimal
  }

  return new Decimal(value === undefined ? 0 : value)
}

export function decimalsMultiplier(decimals?: Decimal.Value): Decimal.Instance {
  return d(10).pow(d(decimals).abs())
}
