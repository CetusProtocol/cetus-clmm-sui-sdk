/* eslint-disable camelcase */
import { getObjectFields, getObjectId, ObjectContentFields } from '@mysten/sui.js'
import { extractStructTagFromType } from './contracts'
import {
  BoosterPoolImmutables,
  BoosterPoolState,
  CONFIG_PERCENT_MULTIPER,
  LockMultiplier,
  LockNFT,
  LockPositionInfo,
} from '../types/booster_type'
import { d } from './numbers'
import { buildPosition } from './common'

export class BoosterUtil {
  static buildPoolImmutables(data: any): BoosterPoolImmutables {
    const { fields } = data.value.fields.value
    const pool: BoosterPoolImmutables = {
      clmm_pool_id: extractStructTagFromType(fields.clmm_pool_id).address,
      booster_type: extractStructTagFromType(fields.booster_type.fields.name).source_address,
      pool_id: extractStructTagFromType(fields.pool_id).address,
      coinTypeA: extractStructTagFromType(fields.coin_type_a.fields.name).source_address,
      coinTypeB: extractStructTagFromType(fields.coin_type_b.fields.name).source_address,
    }

    return pool
  }

  static buildPoolState(data: any): BoosterPoolState {
    const fields = getObjectFields(data) as ObjectContentFields

    const lockMultipliers: LockMultiplier[] = []

    fields.config.fields.contents.forEach((item: any) => {
      lockMultipliers.push({
        lock_day: Number(item.fields.key),
        multiplier: Number(d(item.fields.value).div(CONFIG_PERCENT_MULTIPER)),
      })
    })

    const pool: BoosterPoolState = {
      basic_percent: Number(d(fields.basic_percent).div(CONFIG_PERCENT_MULTIPER)),
      balance: fields.balance,
      config: lockMultipliers,
      lock_positions: {
        lock_positions_handle: fields.lock_positions.fields.id.id,
        size: fields.lock_positions.fields.size,
      },
      is_open: fields.is_open,
      index: Number(fields.index),
    }

    return pool
  }

  static buildLockNFT(data: any): LockNFT | undefined {
    const locked_nft_id = extractStructTagFromType(getObjectId(data)).address

    const fields = getObjectFields(data) as ObjectContentFields
    if (fields) {
      const lock_clmm_position = buildPosition(data)
      const lockNFT: LockNFT = {
        lock_clmm_position,
        locked_nft_id,
        locked_time: Number(fields.locked_time),
        end_lock_time: Number(fields.end_lock_time),
      }

      return lockNFT
    }

    return undefined
  }

  static buildLockPositionInfo(data: any): LockPositionInfo | undefined {
    const id = extractStructTagFromType(getObjectId(data)).address

    const fields = getObjectFields(data) as ObjectContentFields

    if (fields) {
      const { value } = fields.value.fields
      const lockNFT: LockPositionInfo = {
        id,
        type: value.type,
        position_id: value.fields.position_id,
        start_time: Number(value.fields.start_time),
        lock_period: Number(value.fields.lock_period),
        end_time: Number(value.fields.end_time),
        growth_rewarder: value.fields.growth_rewarder,
        xcetus_owned: value.fields.xcetus_owned,
        is_settled: value.fields.is_settled,
      }

      return lockNFT
    }

    return undefined
  }

  static isLocked(lock: LockNFT): boolean {
    return lock.end_lock_time > Date.parse(new Date().toString()) / 1000
  }
}
