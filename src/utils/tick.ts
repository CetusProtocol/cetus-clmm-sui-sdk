/* eslint-disable camelcase */
import BN from 'bn.js'
import { Pool } from '../types'
import { MathUtil } from '../math/utils'
import { TickData } from '../types/clmmpool'
import { MIN_TICK_INDEX, MAX_TICK_INDEX } from '../types/constants'

export class TickUtil {
  /**
   * Get min tick index.
   *
   * @param tick_spacing - tick spacing
   * @retruns min tick index
   */
  static getMinIndex(tickSpacing: number): number {
    return MIN_TICK_INDEX + (Math.abs(MIN_TICK_INDEX) % tickSpacing)
  }

  /**
   * Get max tick index.
   * @param tick_spacing - tick spacing
   * @retruns max tick index
   */
  // eslint-disable-next-line camelcase
  static getMaxIndex(tickSpacing: number): number {
    return MAX_TICK_INDEX - (MAX_TICK_INDEX % tickSpacing)
  }
}

/**
 * Get nearest tick by current tick.
 *
 * @param tickIndex
 * @param tickSpacing
 * @returns
 */
export function getNearestTickByTick(tickIndex: number, tickSpacing: number): number {
  const mod = Math.abs(tickIndex) % tickSpacing
  if (tickIndex > 0) {
    if (mod > tickSpacing / 2) {
      return tickIndex + tickSpacing - mod
    }
    return tickIndex - mod
  }
  if (mod > tickSpacing / 2) {
    return tickIndex - tickSpacing + mod
  }
  return tickIndex + mod
}

export function getRewardInTickRange(
  pool: Pool,
  tickLower: TickData,
  tickUpper: TickData,
  tickLowerIndex: number,
  tickUpperIndex: number,
  growthGlobal: BN[]
) {
  const rewarderInfos: any = pool.rewarder_infos
  const rewarderGrowthInside: BN[] = []

  for (let i = 0; i < rewarderInfos.length; i += 1) {
    let rewarder_growth_below = growthGlobal[i]
    if (tickLower !== null) {
      if (pool.current_tick_index < tickLowerIndex) {
        rewarder_growth_below = growthGlobal[i].sub(new BN(tickLower.rewardersGrowthOutside[i]))
      } else {
        rewarder_growth_below = tickLower.rewardersGrowthOutside[i]
      }
    }
    let rewarder_growth_above = new BN(0)
    if (tickUpper !== null) {
      if (pool.current_tick_index >= tickUpperIndex) {
        rewarder_growth_above = growthGlobal[i].sub(new BN(tickUpper.rewardersGrowthOutside[i]))
      } else {
        rewarder_growth_above = tickUpper.rewardersGrowthOutside[i]
      }
    }
    const rewGrowthInside = MathUtil.subUnderflowU128(
      MathUtil.subUnderflowU128(new BN(growthGlobal[i]), new BN(rewarder_growth_below)),
      new BN(rewarder_growth_above)
    )

    rewarderGrowthInside.push(rewGrowthInside)
  }
  return rewarderGrowthInside
}
