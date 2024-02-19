import BN from 'bn.js'
import Decimal from '../utils/decimal'

import { ClmmpoolsError, MathErrorCode } from '../errors/errors'

export const ZERO = new BN(0)

export const ONE = new BN(1)

export const TWO = new BN(2)

export const U128 = TWO.pow(new BN(128))

export const U64_MAX = TWO.pow(new BN(64)).sub(ONE)

export const U128_MAX = TWO.pow(new BN(128)).sub(ONE)

/**
 * @category MathUtil
 */
export class MathUtil {
  static toX64_BN(num: BN): BN {
    return num.mul(new BN(2).pow(new BN(64)))
  }

  static toX64_Decimal(num: Decimal): Decimal {
    return num.mul(Decimal.pow(2, 64))
  }

  static toX64(num: Decimal): BN {
    return new BN(num.mul(Decimal.pow(2, 64)).floor().toFixed())
  }

  static fromX64(num: BN): Decimal {
    return new Decimal(num.toString()).mul(Decimal.pow(2, -64))
  }

  static fromX64_Decimal(num: Decimal): Decimal {
    return num.mul(Decimal.pow(2, -64))
  }

  static fromX64_BN(num: BN): BN {
    return num.div(new BN(2).pow(new BN(64)))
  }

  static shiftRightRoundUp(n: BN): BN {
    let result = n.shrn(64)

    if (n.mod(U64_MAX).gt(ZERO)) {
      result = result.add(ONE)
    }

    return result
  }

  static divRoundUp(n0: BN, n1: BN): BN {
    const hasRemainder = !n0.mod(n1).eq(ZERO)
    if (hasRemainder) {
      return n0.div(n1).add(new BN(1))
    }
    return n0.div(n1)
  }

  static subUnderflowU128(n0: BN, n1: BN): BN {
    if (n0.lt(n1)) {
      return n0.sub(n1).add(U128_MAX)
    }

    return n0.sub(n1)
  }

  static checkUnsignedSub(n0: BN, n1: BN): BN {
    const n = n0.sub(n1)
    if (n.isNeg()) {
      throw new ClmmpoolsError('Unsigned integer sub overflow', MathErrorCode.UnsignedIntegerOverflow)
    }
    return n
  }

  static checkMul(n0: BN, n1: BN, limit: number): BN {
    const n = n0.mul(n1)
    if (this.isOverflow(n, limit)) {
      throw new ClmmpoolsError('Multiplication overflow', MathErrorCode.MulOverflow)
    }
    return n
  }

  static checkMulDivFloor(n0: BN, n1: BN, denom: BN, limit: number): BN {
    if (denom.eq(ZERO)) {
      throw new ClmmpoolsError('Devide by zero', MathErrorCode.DivideByZero)
    }
    const n = n0.mul(n1).div(denom)
    if (this.isOverflow(n, limit)) {
      throw new ClmmpoolsError('Multiplication div overflow', MathErrorCode.MulDivOverflow)
    }
    return n
  }

  static checkMulDivCeil(n0: BN, n1: BN, denom: BN, limit: number): BN {
    if (denom.eq(ZERO)) {
      throw new ClmmpoolsError('Devide by zero', MathErrorCode.DivideByZero)
    }
    const n = n0.mul(n1).add(denom.sub(ONE)).div(denom)
    if (this.isOverflow(n, limit)) {
      throw new ClmmpoolsError('Multiplication div overflow', MathErrorCode.MulDivOverflow)
    }
    return n
  }

  static checkMulDivRound(n0: BN, n1: BN, denom: BN, limit: number): BN {
    if (denom.eq(ZERO)) {
      throw new ClmmpoolsError('Devide by zero', MathErrorCode.DivideByZero)
    }
    const n = n0.mul(n1.add(denom.shrn(1))).div(denom)
    if (this.isOverflow(n, limit)) {
      throw new ClmmpoolsError('Multiplication div overflow', MathErrorCode.MulDivOverflow)
    }
    return n
  }

  static checkMulShiftRight(n0: BN, n1: BN, shift: number, limit: number): BN {
    const n = n0.mul(n1).div(new BN(2).pow(new BN(shift)))
    // const n = n0.mul(n1).shrn(shift)
    if (this.isOverflow(n, limit)) {
      throw new ClmmpoolsError('Multiplication shift right overflow', MathErrorCode.MulShiftRightOverflow)
    }
    return n
  }

  static checkMulShiftRight64RoundUpIf(n0: BN, n1: BN, limit: number, roundUp: boolean): BN {
    const p = n0.mul(n1)
    const shoudRoundUp = roundUp && p.and(U64_MAX).gt(ZERO)
    const result = shoudRoundUp ? p.shrn(64).add(ONE) : p.shrn(64)
    if (this.isOverflow(result, limit)) {
      throw new ClmmpoolsError('Multiplication shift right overflow', MathErrorCode.MulShiftRightOverflow)
    }
    return result
  }

  static checkMulShiftLeft(n0: BN, n1: BN, shift: number, limit: number): BN {
    const n = n0.mul(n1).shln(shift)
    if (this.isOverflow(n, limit)) {
      throw new ClmmpoolsError('Multiplication shift left overflow', MathErrorCode.MulShiftLeftOverflow)
    }
    return n
  }

  static checkDivRoundUpIf(n0: BN, n1: BN, roundUp: boolean): BN {
    if (n1.eq(ZERO)) {
      throw new ClmmpoolsError('Devide by zero', MathErrorCode.DivideByZero)
    }
    if (roundUp) {
      return this.divRoundUp(n0, n1)
    }
    return n0.div(n1)
  }

  static isOverflow(n: BN, bit: number): boolean {
    return n.gte(TWO.pow(new BN(bit)))
  }

  static sign(v: BN): number {
    const signBit = v.testn(127) ? 1 : 0
    return signBit
  }

  static is_neg(v: BN): boolean {
    return this.sign(v) === 1
  }

  static abs_u128(v: BN): BN {
    if (v.gt(ZERO)) {
      return v
    }
    return this.u128_neg(v.subn(1))
  }

  static u128_neg(v: BN): BN {
    return v.uxor(new BN('ffffffffffffffffffffffffffffffff', 16))
  }

  static neg(v: BN): BN {
    if (this.is_neg(v)) {
      return v.abs()
    }
    return this.neg_from(v)
  }

  static abs(v: BN): BN {
    if (this.sign(v) === 0) {
      return v
    }
    return this.u128_neg(v.sub(new BN(1)))
  }

  static neg_from(v: BN): BN {
    if (v.eq(ZERO)) {
      return v
    }
    return this.u128_neg(v).add(new BN(1)).or(new BN(1).shln(127))
  }
}
