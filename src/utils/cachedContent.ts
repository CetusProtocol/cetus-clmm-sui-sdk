import { SuiResource } from '../types/sui'

export class CachedContent {
  overdueTime: number

  value: SuiResource | null

  constructor(value: SuiResource | null, overdueTime = 0) {
    this.overdueTime = overdueTime
    this.value = value
  }

  getCacheData(): SuiResource | null {
    if (this.value === null) {
      return null
    }
    if (this.overdueTime === 0) {
      return this.value
    }
    if (Date.parse(new Date().toString()) > this.overdueTime) {
      return null
    }
    return this.value
  }
}
