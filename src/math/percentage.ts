import BN from 'bn.js'
import type { Decimal } from 'decimal.js'

/**
 * Percentage - the util set for percentage struct.
 */
export class Percentage {
  readonly numerator: BN

  readonly denominator: BN

  constructor(numerator: BN, denominator: BN) {
    this.toString = () => {
      return `${this.numerator.toString()}/${this.denominator.toString()}`
    }
    this.numerator = numerator
    this.denominator = denominator
  }

  /**
   * Get the percentage of a number.
   *
   * @param number
   * @returns
   */
  static fromDecimal(number: Decimal): Percentage {
    return Percentage.fromFraction(number.toDecimalPlaces(1).mul(10).toNumber(), 1000)
  }

  /**
   * Get the percentage of a fraction.
   *
   * @param numerator
   * @param denominator
   * @returns
   */
  static fromFraction(numerator: BN | number, denominator: BN | number): Percentage {
    const num = typeof numerator === 'number' ? new BN(numerator.toString()) : numerator
    const denom = typeof denominator === 'number' ? new BN(denominator.toString()) : denominator
    return new Percentage(num, denom)
  }
}
