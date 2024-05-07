// eslint-disable-next-line import/no-import-module-exports
import { ClmmpoolsError, TypesErrorCode } from '../errors/errors'

const HEX_REGEXP = /^[-+]?[0-9A-Fa-f]+\.?[0-9A-Fa-f]*?$/

export function addHexPrefix(hex: string): string {
  return !hex.startsWith('0x') ? `0x${hex}` : hex
}

export function removeHexPrefix(hex: string): string {
  return hex.startsWith('0x') ? `${hex.slice(2)}` : hex
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
      throw new ClmmpoolsError(`Invalid type`, TypesErrorCode.InvalidType)
    }
  }
  return v
}

export function bufferToHex(buffer: Buffer): string {
  return addHexPrefix(toBuffer(buffer).toString('hex'))
}
/**
 * '\x02\x00\x00\x00' to 2
 * @param binaryData
 */
export function hexToNumber(binaryData: string) {
  const buffer = new ArrayBuffer(4)
  const view = new DataView(buffer)

  for (let i = 0; i < binaryData.length; i++) {
    view.setUint8(i, binaryData.charCodeAt(i))
  }

  const number = view.getUint32(0, true) //

  return number
}

export function utf8to16(str: string) {
  let out
  let i
  let c
  let char2
  let char3
  out = ''
  const len = str.length
  i = 0
  while (i < len) {
    c = str.charCodeAt(i++)
    switch (c >> 4) {
      case 0:
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
        out += str.charAt(i - 1)
        break
      case 12:
      case 13:
        char2 = str.charCodeAt(i++)
        out += String.fromCharCode(((c & 0x1f) << 6) | (char2 & 0x3f))
        break
      case 14:
        char2 = str.charCodeAt(i++)
        char3 = str.charCodeAt(i++)
        out += String.fromCharCode(((c & 0x0f) << 12) | ((char2 & 0x3f) << 6) | ((char3 & 0x3f) << 0))
        break
    }
  }
  return out
}

export function hexToString(str: string) {
  let val = ''
  const newStr = removeHexPrefix(str)

  const len = newStr.length / 2
  for (let i = 0; i < len; i++) {
    val += String.fromCharCode(parseInt(newStr.substr(i * 2, 2), 16))
  }
  return utf8to16(val)
}
