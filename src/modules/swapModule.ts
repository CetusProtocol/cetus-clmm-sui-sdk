import BN from 'bn.js'
import { MoveCallTransaction } from '@mysten/sui.js'
import { extractStructTagFromType } from '../utils/contracts'
import { ClmmFetcherModule, ClmmIntegrateModule, LiquidityGasBudget, SuiObjectIdType } from '../types/sui'
import { TickData, ClmmpoolData } from '../types/clmmpool'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { CachedContent } from '../utils/cachedContent'
import { SwapUtils } from '../math/swap'
import { computeSwap } from '../math/clmm'
import { TickMath } from '../math/tick'
import { CoinPairType, Pool } from './resourcesModule'

export const AMM_SWAP_MODULE = 'amm_swap'
export const POOL_STRUCT = 'Pool'

export type createTestTransferTxPayloadParams = {
  account: string
  value: number
}

export type CalculateRatesParams = {
  decimalsA: number
  decimalsB: number
  a2b: boolean
  byAmountIn: boolean
  amount: BN
  swapTicks: Array<TickData>
  currentPool: Pool
}

export type CalculateRatesResult = {
  estimatedAmountIn: BN
  estimatedAmountOut: BN
  estimatedEndSqrtPrice: BN
  estimatedFeeAmount: BN
  isExceed: boolean
  extraComputeLimit: number
  aToB: boolean
  byAmountIn: boolean
  amount: BN
  priceImpactPct: number
}

export type SwapParams = {
  pool_id: SuiObjectIdType
  coin_object_ids_a: SuiObjectIdType[]
  coin_object_ids_b: SuiObjectIdType[]
  a2b: boolean
  by_amount_in: boolean
  amount: string
  amount_limit: string
} & CoinPairType

export type PreSwapParams = {
  pool: Pool
  current_sqrt_price: number
  decimalsA: number
  decimalsB: number
  a2b: boolean
  by_amount_in: boolean
  amount: string
} & CoinPairType

export class SwapModule implements IModule {
  protected _sdk: SDK

  private readonly _cache: Record<string, CachedContent> = {}

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  async preswap(params: PreSwapParams) {
    const { modules, simulationAccount } = this.sdk.sdkOptions.networkOptions

    const typeArguments = [params.coinTypeA, params.coinTypeB]
    const args = [params.pool.poolAddress, params.a2b, params.by_amount_in, params.amount]

    const payload = {
      packageObjectId: modules.cetus_integrate,
      module: ClmmFetcherModule,
      function: 'calculate_swap_result',
      typeArguments,
      arguments: args,
    }
    const simulateRes = await this.sdk.fullClient.devInspectTransaction(simulationAccount.address, {
      kind: 'moveCall',
      data: payload,
    })

    console.log('preswap###simulateRes####', simulateRes)

    const valueData: any = simulateRes.effects.events?.filter((item) => {
      if ('moveEvent' in item) {
        return extractStructTagFromType(item.moveEvent.type).name === `CalculatedSwapResultEvent`
      }
      return false
    })
    if (valueData.length === 0) {
      return null
    }
    return this.transformSwapData(params, valueData[0].moveEvent.fields.data.fields)
  }

  // eslint-disable-next-line class-methods-use-this
  private transformSwapData(params: PreSwapParams, data: any) {
    const prePrice = TickMath.sqrtPriceX64ToPrice(new BN(params.pool.current_sqrt_price), params.decimalsA, params.decimalsB).toNumber()
    const afterPrice = TickMath.sqrtPriceX64ToPrice(new BN(data.after_sqrt_price), params.decimalsA, params.decimalsB).toNumber()

    const priceImpactPct = (Math.abs(prePrice - afterPrice) / prePrice) * 100
    const estimatedAmountIn = data.amount_in && data.fee_amount ? new BN(data.amount_in).add(new BN(data.fee_amount)).toString() : ''
    return {
      estimatedAmountIn,
      estimatedAmountOut: data.amount_out,
      estimatedEndSqrtPrice: data.after_sqrt_price,
      estimatedFeeAmount: data.fee_amount,
      isExceed: data.is_exceed,
      amount: params.amount,
      aToB: params.a2b,
      byAmountIn: params.by_amount_in,
      priceImpactPct,
    }
  }

  /* eslint-disable class-methods-use-this */
  calculateRates(params: CalculateRatesParams): CalculateRatesResult {
    const { currentPool } = params
    const poolData: ClmmpoolData = {
      coinA: currentPool.coinTypeA, // string
      coinB: currentPool.coinTypeB, // string
      currentSqrtPrice: new BN(currentPool.current_sqrt_price), // BN
      currentTickIndex: Number(currentPool.current_tick_index), // number
      feeGrowthGlobalA: new BN(currentPool.fee_growth_global_a), // BN
      feeGrowthGlobalB: new BN(currentPool.fee_growth_global_b), // BN
      feeProtocolCoinA: new BN(currentPool.fee_protocol_coin_a), // BN
      feeProtocolCoinB: new BN(currentPool.fee_protocol_coin_b), // BN
      feeRate: new BN(currentPool.fee_rate), // number
      liquidity: new BN(currentPool.liquidity), // BN
      tickIndexes: [], // number[]
      tickSpacing: Number(currentPool.tickSpacing), // number
      ticks: [], // Array<TickData>
      collection_name: '',
    }

    let ticks
    if (params.a2b) {
      ticks = params.swapTicks.sort((a, b) => {
        return Number(b.index) - Number(a.index)
      })
    } else {
      ticks = params.swapTicks.sort((a, b) => {
        return Number(a.index) - Number(b.index)
      })
    }

    const swapResult = computeSwap(params.a2b, params.byAmountIn, params.amount, poolData, ticks)

    let isExceed = false
    if (params.byAmountIn) {
      isExceed = swapResult.amountIn.lt(params.amount)
    } else {
      isExceed = swapResult.amountOut.lt(params.amount)
    }
    const sqrtPriceLimit = SwapUtils.getDefaultSqrtPriceLimit(params.a2b)
    if (params.a2b && swapResult.nextSqrtPrice.lt(sqrtPriceLimit)) {
      isExceed = true
    }

    if (!params.a2b && swapResult.nextSqrtPrice.gt(sqrtPriceLimit)) {
      isExceed = true
    }

    let extraComputeLimit = 0
    if (swapResult.crossTickNum > 6 && swapResult.crossTickNum < 40) {
      extraComputeLimit = 22000 * (swapResult.crossTickNum - 6)
    }

    if (swapResult.crossTickNum > 40) {
      isExceed = true
    }

    const prePrice = TickMath.sqrtPriceX64ToPrice(poolData.currentSqrtPrice, params.decimalsA, params.decimalsB).toNumber()
    const afterPrice = TickMath.sqrtPriceX64ToPrice(swapResult.nextSqrtPrice, params.decimalsA, params.decimalsB).toNumber()

    const priceImpactPct = (Math.abs(prePrice - afterPrice) / prePrice) * 100

    return {
      estimatedAmountIn: swapResult.amountIn,
      estimatedAmountOut: swapResult.amountOut,
      estimatedEndSqrtPrice: swapResult.nextSqrtPrice,
      estimatedFeeAmount: swapResult.feeAmount,
      isExceed,
      extraComputeLimit,
      amount: params.amount,
      aToB: params.a2b,
      byAmountIn: params.byAmountIn,
      priceImpactPct,
    }
  }

  createSwapTransactionPayload(params: SwapParams, gasBudget = LiquidityGasBudget): MoveCallTransaction {
    const { modules } = this.sdk.sdkOptions.networkOptions
    const sqrtPriceLimit = SwapUtils.getDefaultSqrtPriceLimit(params.a2b)
    const typeArguments = [params.coinTypeA, params.coinTypeB]

    if (modules.swap_partner.length === 0) {
      throw Error('Please configure swap_partner')
    }

    const args = [
      params.pool_id,
      modules.swap_partner,
      params.coin_object_ids_a,
      params.coin_object_ids_b,
      params.a2b,
      params.by_amount_in,
      params.amount,
      params.amount_limit,
      sqrtPriceLimit.toString(),
    ]
    return {
      packageObjectId: modules.cetus_integrate,
      module: ClmmIntegrateModule,
      function: 'swap_with_partner',
      gasBudget,
      typeArguments,
      arguments: args,
    }
  }
}
