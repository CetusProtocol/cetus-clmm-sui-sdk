/* eslint-disable no-await-in-loop */
/* eslint-disable camelcase */
import BN from 'bn.js'
import { MoveCallTransaction } from '@mysten/sui.js'
import { getRewardInTickRange } from '../utils/tick'
import { SuiObjectIdType, SuiAddressType, GasBudget, ClmmIntegrateModule } from '../types/sui'
import { MathUtil, ZERO } from '../math/utils'
import { Pool, Position } from './resourcesModule'
import { TickData } from '../types/clmmpool'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'

export type CollectRewarderParams = {
  pool_id: SuiObjectIdType
  pos_id: SuiObjectIdType
  coinType: SuiAddressType[]
}

export class RewarderModule implements IModule {
  protected _sdk: SDK

  private growthGlobal: BN[]

  constructor(sdk: SDK) {
    this._sdk = sdk
    this.growthGlobal = [ZERO, ZERO, ZERO]
  }

  get sdk() {
    return this._sdk
  }

  // `emissionsEveryDay` returns the number of emissions every day.
  async emissionsEveryDay(poolObjectId: string) {
    const currentPool: Pool = await this.sdk.Resources.getPool(poolObjectId)
    const rewarderInfos = currentPool.rewarder_infos
    if (!rewarderInfos) {
      return null
    }

    const emissionsEveryDay = []
    for (const rewarderInfo of rewarderInfos) {
      const emissionSeconds = MathUtil.fromX64(new BN(rewarderInfo.emissions_per_second))
      emissionsEveryDay.push({
        emissions: Math.floor(emissionSeconds.toNumber() * 60 * 60 * 24),
        coin_address: rewarderInfo.coin_name,
      })
    }

    return emissionsEveryDay
  }

  async updatePoolRewarder(poolObjectId: string, currentTime: BN): Promise<Pool> {
    // refresh pool rewarder
    const currentPool: Pool = await this.sdk.Resources.getPool(poolObjectId)
    const lastTime = currentPool.rewarder_last_updated_time
    currentPool.rewarder_last_updated_time = currentTime.toString()

    if (Number(currentPool.liquidity) === 0 || currentTime.eq(new BN(lastTime))) {
      return currentPool
    }
    const timeDelta = currentTime.div(new BN(1000)).sub(new BN(lastTime)).add(new BN(15))
    const rewarderInfos: any = currentPool.rewarder_infos

    for (let i = 0; i < rewarderInfos.length; i += 1) {
      const rewarderInfo = rewarderInfos[i]
      const rewarderGrowthDelta = MathUtil.checkMulDivFloor(
        timeDelta,
        new BN(rewarderInfo.emissions_per_second),
        new BN(currentPool.liquidity),
        128
      )
      this.growthGlobal[i] = new BN(rewarderInfo.growth_global).add(new BN(rewarderGrowthDelta))
    }

    return currentPool
  }

  async posRewardersAmount(poolObjectId: string, positionId: string) {
    const currentTime = Date.parse(new Date().toString())
    const pool: Pool = await this.updatePoolRewarder(poolObjectId, new BN(currentTime))
    const position = await this.sdk.Resources.getPosition(positionId)

    if (position === undefined) {
      return []
    }

    const ticksHandle = pool.ticks_handle
    const tickLower = await this.sdk.Pool.getTickDataByIndex(ticksHandle, position.tick_lower_index)
    const tickUpper = await this.sdk.Pool.getTickDataByIndex(ticksHandle, position.tick_upper_index)

    const amountOwed = await this.posRewardersAmountInternal(pool, position, tickLower, tickUpper)
    return amountOwed
  }

  async poolRewardersAmount(account: string, poolObjectId: string) {
    const currentTime = Date.parse(new Date().toString())
    const pool: Pool = await this.updatePoolRewarder(poolObjectId, new BN(currentTime))

    const positions = await this.sdk.Resources.getPositionList(account, [poolObjectId])
    const tickDatas = await this.getPoolLowerAndUpperTicks(pool.ticks_handle, positions)

    const rewarderAmount = [ZERO, ZERO, ZERO]

    for (let i = 0; i < positions.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const posRewarderInfo: any = await this.posRewardersAmountInternal(pool, positions[i], tickDatas[0][i], tickDatas[1][i])
      for (let j = 0; j < 3; j += 1) {
        rewarderAmount[j] = rewarderAmount[j].add(posRewarderInfo[j].amount_owed)
      }
    }

    return rewarderAmount
  }

  private posRewardersAmountInternal(pool: Pool, position: Position, tickLower: TickData, tickUpper: TickData) {
    const tickLowerIndex = parseInt(position.tick_lower_index, 10)
    const tickUpperIndex = parseInt(position.tick_upper_index, 10)
    const rewardersInside = getRewardInTickRange(pool, tickLower, tickUpper, tickLowerIndex, tickUpperIndex, this.growthGlobal)

    const growthInside = []
    const AmountOwed = []

    if (rewardersInside.length > 0) {
      const growthDelta_0 = MathUtil.subUnderflowU128(rewardersInside[0], new BN(position.reward_growth_inside_0))
      const amountOwed_0 = MathUtil.checkMulShiftRight(new BN(position.liquidity), growthDelta_0, 64, 256)
      growthInside.push(rewardersInside[0])
      AmountOwed.push({
        amount_owed: new BN(position.reward_amount_owed_0).add(amountOwed_0),
        coin_address: pool.rewarder_infos[0].coin_name,
      })
    }

    if (rewardersInside.length > 1) {
      const growthDelta_1 = MathUtil.subUnderflowU128(rewardersInside[1], new BN(position.reward_growth_inside_1))

      const amountOwed_1 = MathUtil.checkMulShiftRight(new BN(position.liquidity), growthDelta_1, 64, 256)
      growthInside.push(rewardersInside[1])

      AmountOwed.push({
        amount_owed: new BN(position.reward_amount_owed_1).add(amountOwed_1),
        coin_address: pool.rewarder_infos[1].coin_name,
      })
    }

    if (rewardersInside.length > 2) {
      const growthDelta_2 = MathUtil.subUnderflowU128(rewardersInside[2], new BN(position.reward_growth_inside_2))
      const amountOwed_2 = MathUtil.checkMulShiftRight(new BN(position.liquidity), growthDelta_2, 64, 256)
      growthInside.push(rewardersInside[2])
      AmountOwed.push({
        amount_owed: new BN(position.reward_amount_owed_2).add(amountOwed_2),
        coin_address: pool.rewarder_infos[2].coin_name,
      })
    }
    return AmountOwed
  }

  private async getPoolLowerAndUpperTicks(ticksHandle: string, positions: Position[]): Promise<TickData[][]> {
    const lowerTicks: TickData[] = []
    const upperTicks: TickData[] = []

    for (const pos of positions) {
      const tickLower = await this.sdk.Pool.getTickDataByIndex(ticksHandle, pos.tick_lower_index)
      const tickUpper = await this.sdk.Pool.getTickDataByIndex(ticksHandle, pos.tick_upper_index)
      lowerTicks.push(tickLower)
      upperTicks.push(tickUpper)
    }

    return [lowerTicks, upperTicks]
  }

  collectRewarderTransactionPayload(params: CollectRewarderParams, gasBudget = GasBudget): MoveCallTransaction {
    const { modules } = this.sdk.sdkOptions.networkOptions
    const functionNames = ['collect_rewarder', 'collect_rewarder_for_two', 'collect_rewarder_for_three']

    const typeArguments = [...params.coinType]

    const args = [params.pool_id, params.pos_id]
    return {
      packageObjectId: modules.cetus_integrate,
      module: ClmmIntegrateModule,
      function: functionNames[params.coinType.length - 2],
      gasBudget,
      typeArguments,
      arguments: args,
    }
  }
}
