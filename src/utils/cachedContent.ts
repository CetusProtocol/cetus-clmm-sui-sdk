import { SuiResource } from '../types/sui'

export const cacheTime5min = 5 * 60 * 1000
export const cacheTime24h = 24 * 60 * 60 * 1000

export function getFutureTime(interval: number) {
  return Date.parse(new Date().toString()) + interval
}

/**
 * Defines the structure of a CachedContent object, used for caching resources in memory.
 */
export class CachedContent {
  overdueTime: number

  value: SuiResource | null

  constructor(value: SuiResource | null, overdueTime = 0) {
    this.overdueTime = overdueTime
    this.value = value
  }

  isValid(): boolean {
    if (this.value === null) {
      return false
    }
    if (this.overdueTime === 0) {
      return true
    }
    if (Date.parse(new Date().toString()) > this.overdueTime) {
      return false
    }
    return true
  }
}
