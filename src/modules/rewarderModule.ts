/* eslint-disable no-bitwise */
/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
/* eslint-disable camelcase */
import BN from 'bn.js'
import { TransactionBlock } from '@mysten/sui.js'
import { type } from 'superstruct'
import { asIntN, asUintN } from '../utils'
import { ClmmIntegratePoolModule, SuiAddressType, SuiObjectIdType, CLOCK_ADDRESS } from '../types/sui'
import { getRewardInTickRange } from '../utils/tick'
import { MathUtil, ONE, ZERO } from '../math/utils'
import { CoinPairType, Pool, Position } from './resourcesModule'
import { TickData } from '../types/clmmpool'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'

export type CollectRewarderParams = {
  pool_id: SuiObjectIdType
  pos_id: SuiObjectIdType
  collect_fee: boolean //
  rewarder_coin_types: SuiAddressType[]
} & CoinPairType

export type RewarderAmountOwed = {
  amount_owed: BN
  coin_address: string
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
        coin_address: rewarderInfo.coinAddress,
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

  async posRewardersAmount(poolObjectId: string, positionHandle: string, positionId: string) {
    const currentTime = Date.parse(new Date().toString())
    const pool: Pool = await this.updatePoolRewarder(poolObjectId, new BN(currentTime))
    const position = await this.sdk.Resources.getPosition(positionHandle, positionId)

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

  private posRewardersAmountInternal(pool: Pool, position: Position, tickLower: TickData, tickUpper: TickData): RewarderAmountOwed[] {
    const tickLowerIndex = position.tick_lower_index
    const tickUpperIndex = position.tick_upper_index
    const rewardersInside = getRewardInTickRange(pool, tickLower, tickUpper, tickLowerIndex, tickUpperIndex, this.growthGlobal)

    const growthInside = []
    const AmountOwed = []

    if (rewardersInside.length > 0) {
      let growthDelta_0 = MathUtil.subUnderflowU128(rewardersInside[0], new BN(position.reward_growth_inside_0))

      if (growthDelta_0.gt(new BN('3402823669209384634633745948738404'))) {
        growthDelta_0 = ONE
      }

      const amountOwed_0 = MathUtil.checkMulShiftRight(new BN(position.liquidity), growthDelta_0, 64, 128)
      growthInside.push(rewardersInside[0])
      AmountOwed.push({
        amount_owed: new BN(position.reward_amount_owed_0).add(amountOwed_0),
        coin_address: pool.rewarder_infos[0].coinAddress,
      })
    }

    if (rewardersInside.length > 1) {
      let growthDelta_1 = MathUtil.subUnderflowU128(rewardersInside[1], new BN(position.reward_growth_inside_1))
      if (growthDelta_1.gt(new BN('3402823669209384634633745948738404'))) {
        growthDelta_1 = ONE
      }

      const amountOwed_1 = MathUtil.checkMulShiftRight(new BN(position.liquidity), growthDelta_1, 64, 128)
      growthInside.push(rewardersInside[1])

      AmountOwed.push({
        amount_owed: new BN(position.reward_amount_owed_1).add(amountOwed_1),
        coin_address: pool.rewarder_infos[1].coinAddress,
      })
    }

    if (rewardersInside.length > 2) {
      let growthDelta_2 = MathUtil.subUnderflowU128(rewardersInside[2], new BN(position.reward_growth_inside_2))
      if (growthDelta_2.gt(new BN('3402823669209384634633745948738404'))) {
        growthDelta_2 = ONE
      }

      const amountOwed_2 = MathUtil.checkMulShiftRight(new BN(position.liquidity), growthDelta_2, 64, 128)
      growthInside.push(rewardersInside[2])

      AmountOwed.push({
        amount_owed: new BN(position.reward_amount_owed_2).add(amountOwed_2),
        coin_address: pool.rewarder_infos[2].coinAddress,
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

  /**
   * Collect rewards from Position.
   * @param params
   * @param gasBudget
   * @returns
   */
  collectRewarderTransactionPayload(params: CollectRewarderParams): TransactionBlock {
    const { clmm } = this.sdk.sdkOptions

    const typeArguments = [params.coinTypeA, params.coinTypeB]

    const tx = new TransactionBlock()
    tx.setGasBudget(this._sdk.gasConfig.GasBudgetLow)

    if (params.collect_fee) {
      tx.moveCall({
        target: `${clmm.clmm_router.cetus}::${ClmmIntegratePoolModule}::collect_fee`,
        typeArguments,
        arguments: [tx.object(clmm.config.global_config_id), tx.object(params.pool_id), tx.object(params.pos_id)],
      })
    }

    params.rewarder_coin_types.forEach((type) => {
      tx.moveCall({
        target: `${clmm.clmm_router.cetus}::${ClmmIntegratePoolModule}::collect_reward`,
        typeArguments: [...typeArguments, type],
        arguments: [
          tx.object(clmm.config.global_config_id),
          tx.object(params.pool_id),
          tx.object(params.pos_id),
          tx.object(clmm.config.global_vault_id),
          tx.object(CLOCK_ADDRESS),
        ],
      })
    })

    return tx
  }
}
