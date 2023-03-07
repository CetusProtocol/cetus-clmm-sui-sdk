const HEX_REGEXP = /^[-+]?[0-9A-Fa-f]+\.?[0-9A-Fa-f]*?$/

export function addHexPrefix(hex: string): string {
  return !hex.startsWith('0x') ? `0x${hex}` : hex
}

export function shortString(str: string, start = 4, end = 4) {
  const slen = Math.max(start, 1)
  const elen = Math.max(end, 1)

  return `${str.slice(0, slen + 2)} ... ${str.slice(-elen)}`
}

export function shortAddress(address: string, start = 4, end = 4) {
  return shortString(addHexPrefix(address), start, end)
}

export function checkAddress(address: any, options: { leadingZero: boolean } = { leadingZero: true }): boolean {
  if (typeof address !== 'string') {
    return false
  }
  let str = address

  if (options.leadingZero) {
    if (!address.startsWith('0x')) {
      return false
    }
    str = str.substring(2)
  }

  return HEX_REGEXP.test(str)
}

/**
 * Attempts to turn a value into a `Buffer`. As input it supports `Buffer`, `String`, `Number`, null/undefined, `BN` and other objects with a `toArray()` method.
 * @param v the value
 */
export function toBuffer(v: any): Buffer {
  if (!Buffer.isBuffer(v)) {
    if (Array.isArray(v)) {
      v = Buffer.from(v)
    } else if (typeof v === 'string') {
      if (exports.isHexString(v)) {
        v = Buffer.from(exports.padToEven(exports.stripHexPrefix(v)), 'hex')
      } else {
        v = Buffer.from(v)
      }
    } else if (typeof v === 'number') {
      v = exports.intToBuffer(v)
    } else if (v === null || v === undefined) {
      v = Buffer.allocUnsafe(0)
    } else if (v.toArray) {
      // converts a BN to a Buffer
      v = Buffer.from(v.toArray())
    } else {
      throw new Error('invalid type')
    }
  }
  return v
}

export function bufferToHex(buffer: Buffer): string {
  return addHexPrefix(toBuffer(buffer).toString('hex'))
}
