/* eslint-disable camelcase */
import BN from 'bn.js'
import { TransactionBlock } from '@mysten/sui.js'
import {
  CalculateRatesParams,
  CalculateRatesResult,
  Pool,
  PreSwapParams,
  PreSwapWithMultiPoolParams,
  SwapParams,
  TransPreSwapWithMultiPoolParams,
} from '../types'
import { Percentage, U64_MAX, ZERO } from '../math'
import { findAdjustCoin, TransactionUtil } from '../utils/transaction-util'
import { extractStructTagFromType } from '../utils/contracts'
import { ClmmFetcherModule } from '../types/sui'
import { TickData, transClmmpoolDataWithoutTicks } from '../types/clmmpool'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { SwapUtils } from '../math/swap'
import { computeSwap } from '../math/clmm'
import { TickMath } from '../math/tick'

export const AMM_SWAP_MODULE = 'amm_swap'
export const POOL_STRUCT = 'Pool'

/**
 * Helper class to help interact with clmm pool swap with a swap router interface.
 */
export class SwapModule implements IModule {
  protected _sdk: SDK

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  /**
   * Performs a pre-swap with multiple pools.
   *
   * @param {PreSwapWithMultiPoolParams} params The parameters for the pre-swap.
   * @returns {Promise<SwapWithMultiPoolData>} A promise that resolves to the swap data.
   */
  async preSwapWithMultiPool(params: PreSwapWithMultiPoolParams) {
    const { clmm, simulationAccount } = this.sdk.sdkOptions
    const tx = new TransactionBlock()

    const typeArguments = [params.coinTypeA, params.coinTypeB]
    for (let i = 0; i < params.poolAddresses.length; i += 1) {
      const args = [tx.pure(params.poolAddresses[i]), tx.pure(params.a2b), tx.pure(params.byAmountIn), tx.pure(params.amount)]
      tx.moveCall({
        target: `${clmm.clmm_router.cetus}::${ClmmFetcherModule}::calculate_swap_result`,
        arguments: args,
        typeArguments,
      })
    }

    const simulateRes = await this.sdk.fullClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: simulationAccount.address,
    })

    const valueData: any = simulateRes.events?.filter((item: any) => {
      return extractStructTagFromType(item.type).name === `CalculatedSwapResultEvent`
    })
    if (valueData.length === 0) {
      return null
    }

    if (valueData.length !== params.poolAddresses.length) {
      throw new Error('valueData.length !== params.pools.length')
    }

    let tempMaxAmount = params.byAmountIn ? ZERO : U64_MAX
    let tempIndex = 0
    for (let i = 0; i < valueData.length; i += 1) {
      if (valueData[i].parsedJson.data.is_exceed) {
        continue
      }

      if (params.byAmountIn) {
        const amount = new BN(valueData[i].parsedJson.data.amount_out)
        if (amount.gt(tempMaxAmount)) {
          tempIndex = i
          tempMaxAmount = amount
        }
      } else {
        const amount = new BN(valueData[i].parsedJson.data.amount_out)
        if (amount.lt(tempMaxAmount)) {
          tempIndex = i
          tempMaxAmount = amount
        }
      }
    }

    return this.transformSwapWithMultiPoolData(
      {
        poolAddress: params.poolAddresses[tempIndex],
        a2b: params.a2b,
        byAmountIn: params.byAmountIn,
        amount: params.amount,
        coinTypeA: params.coinTypeA,
        coinTypeB: params.coinTypeB,
      },
      valueData[tempIndex].parsedJson
    )
  }

  /**
   * Performs a pre-swap.
   *
   * @param {PreSwapParams} params The parameters for the pre-swap.
   * @returns {Promise<SwapData>} A promise that resolves to the swap data.
   */
  async preswap(params: PreSwapParams) {
    const { clmm, simulationAccount } = this.sdk.sdkOptions

    const tx = new TransactionBlock()

    const typeArguments = [params.coinTypeA, params.coinTypeB]
    const args = [tx.pure(params.pool.poolAddress), tx.pure(params.a2b), tx.pure(params.by_amount_in), tx.pure(params.amount)]

    tx.moveCall({
      target: `${clmm.clmm_router.cetus}::${ClmmFetcherModule}::calculate_swap_result`,
      arguments: args,
      typeArguments,
    })
    const simulateRes = await this.sdk.fullClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: simulationAccount.address,
    })

    const valueData: any = simulateRes.events?.filter((item: any) => {
      return extractStructTagFromType(item.type).name === `CalculatedSwapResultEvent`
    })
    if (valueData.length === 0) {
      return null
    }
    return this.transformSwapData(params, valueData[0].parsedJson.data)
  }

  // eslint-disable-next-line class-methods-use-this
  private transformSwapData(params: PreSwapParams, data: any) {
    const estimatedAmountIn = data.amount_in && data.fee_amount ? new BN(data.amount_in).add(new BN(data.fee_amount)).toString() : ''
    return {
      poolAddress: params.pool.poolAddress,
      currentSqrtPrice: params.current_sqrt_price,
      estimatedAmountIn,
      estimatedAmountOut: data.amount_out,
      estimatedEndSqrtPrice: data.after_sqrt_price,
      estimatedFeeAmount: data.fee_amount,
      isExceed: data.is_exceed,
      amount: params.amount,
      aToB: params.a2b,
      byAmountIn: params.by_amount_in,
    }
  }

  // eslint-disable-next-line class-methods-use-this
  private transformSwapWithMultiPoolData(params: TransPreSwapWithMultiPoolParams, jsonData: any) {
    const { data } = jsonData
    const estimatedAmountIn = data.amount_in && data.fee_amount ? new BN(data.amount_in).add(new BN(data.fee_amount)).toString() : ''
    return {
      poolAddress: params.poolAddress,
      estimatedAmountIn,
      estimatedAmountOut: data.amount_out,
      estimatedEndSqrtPrice: data.after_sqrt_price,
      estimatedStartSqrtPrice: jsonData.current_sqrt_price,
      estimatedFeeAmount: data.fee_amount,
      isExceed: data.is_exceed,
      amount: params.amount,
      aToB: params.a2b,
      byAmountIn: params.byAmountIn,
    }
  }

  /**
   * Calculates the rates for a swap.
   *
   * @param {CalculateRatesParams} params The parameters for the calculation.
   * @returns {CalculateRatesResult} The results of the calculation.
   */
  // eslint-disable-next-line class-methods-use-this
  calculateRates(params: CalculateRatesParams): CalculateRatesResult {
    const { currentPool } = params
    const poolData = transClmmpoolDataWithoutTicks(currentPool)

    let ticks
    if (params.a2b) {
      ticks = params.swapTicks.sort((a, b) => {
        return b.index - a.index
      })
    } else {
      ticks = params.swapTicks.sort((a, b) => {
        return a.index - b.index
      })
    }

    const swapResult = computeSwap(params.a2b, params.byAmountIn, params.amount, poolData, ticks)

    let isExceed = false
    if (params.byAmountIn) {
      console.log(swapResult.amountIn.toString(), params.amount.toString(), params.byAmountIn)
      isExceed = swapResult.amountIn.lt(params.amount)
    } else {
      console.log(swapResult.amountOut.toString(), params.amount.toString(), params.byAmountIn)
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

  /**
   * create swap transaction payload
   * @param params
   * @param gasEstimateArg When the fix input amount is SUI, gasEstimateArg can control whether to recalculate the number of SUI to prevent insufficient gas.
   * If this parameter is not passed, gas estimation is not performed
   * @returns
   */
  async createSwapTransactionPayload(
    params: SwapParams,
    gasEstimateArg?: {
      byAmountIn: boolean
      slippage: Percentage
      decimalsA: number
      decimalsB: number
      swapTicks: Array<TickData>
      currentPool: Pool
    }
  ): Promise<TransactionBlock> {
    if (this._sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }
    const allCoinAsset = await this._sdk.getOwnerCoinAssets(this._sdk.senderAddress)

    if (gasEstimateArg) {
      const { isAdjustCoinA, isAdjustCoinB } = findAdjustCoin(params)

      if ((params.a2b && isAdjustCoinA) || (!params.a2b && isAdjustCoinB)) {
        const tx = await TransactionUtil.buildSwapTransactionForGas(this._sdk, params, allCoinAsset, gasEstimateArg)
        return tx
      }
    }

    return TransactionUtil.buildSwapTransaction(this.sdk, params, allCoinAsset)
  }
}
