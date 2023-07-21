import { MoveCallTransaction, getObjectFields } from '@mysten/sui.js'
import { d } from '../utils/numbers'
import { SuiAddressType, BigNumber, SuiObjectIdType } from '../types/sui'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { CachedContent } from '../utils/cachedContent'
import {
  getCoinXYForLiquidity,
  getLiquidityAndCoinYByCoinX,
  LiquidityAndCoinYResult,
  POOL_NO_LIQUIDITY,
  withLiquiditySlippage,
} from '../math/LiquidityHelper'

// Params.
export const AMM_SWAP_MODULE = 'amm_swap'
export const POOL_STRUCT = 'Pool'

export type GetLiquidityForCoinInParams = {
  poolObjectId: SuiObjectIdType
  amountX: BigNumber
  direction: boolean
}

export type AddLiquidityParams = {
  coinX: SuiAddressType
  coinY: SuiAddressType
  coinXObjectId: SuiObjectIdType
  coinYObjectId: SuiObjectIdType
  poolObjectId: SuiObjectIdType
  coinXAmount: BigNumber
  coinYAmount: BigNumber
  slippage: number
}

export type GetCoinXYAmountForLiquidityParams = {
  liquidity: BigNumber
  poolObjectId: SuiObjectIdType
  direction: boolean
}
export type RemoveLiquidityParams = {
  coinX: SuiAddressType
  coinY: SuiAddressType
  liquidity: BigNumber
  lpObjectId: SuiObjectIdType
  poolObjectId: SuiObjectIdType
  slippage: number
  direction: true
}

export class LiquidityModule implements IModule {
  protected _sdk: SDK

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  /**
   * Calculate liquidity and coinY amount In the other direction
   * @param params
   * @returns
   */
  async getLiquidityAndCoinYByCoinX(params: GetLiquidityForCoinInParams): Promise<LiquidityAndCoinYResult | POOL_NO_LIQUIDITY> {
    if (d(params.amountX).lessThanOrEqualTo(0)) {
      throw new Error('amountX is less than zero')
    }
    const isSorted = params.direction

    const liquidityPoolResource = await this.sdk.Resources.getPoolObject(params.poolObjectId)

    if (!liquidityPoolResource) {
      throw new Error(`LiquidityPool (${params.poolObjectId}) not found`)
    }
    const liquidityPoolField = getObjectFields(liquidityPoolResource)

    if (liquidityPoolField === undefined) {
      throw new Error(`LiquidityPool (${params.poolObjectId}) field error`)
    }

    const coinXReserve = liquidityPoolField.coin_a
    const coinYReserve = liquidityPoolField.coin_b
    const lpSupply = liquidityPoolField.lp_supply.fields.value

    const [reserveIn, reserveOut] = isSorted ? [d(coinXReserve), d(coinYReserve)] : [d(coinYReserve), d(coinXReserve)]

    const outputTokens = getLiquidityAndCoinYByCoinX(d(params.amountX), reserveIn, reserveOut, d(lpSupply))
    return outputTokens
  }

  /// Create add liquidity transaction payload.
  async createAddLiquidityTransactionPayload(params: AddLiquidityParams, gasBudget = 1000): Promise<MoveCallTransaction> {
    if (params.slippage >= 1 || params.slippage <= 0) {
      throw new Error(`Invalid slippage (${params.slippage}) value`)
    }

    const { modules } = this.sdk.sdkOptions.networkOptions

    const coinXAmount = d(params.coinXAmount)
    const coinYAmount = d(params.coinYAmount)
    const coinXAmountMin = withLiquiditySlippage(coinXAmount, d(params.slippage), 'minus')
    const coinYAmountMin = withLiquiditySlippage(coinYAmount, d(params.slippage), 'minus')

    const globalPauseStatusObjectId = await this.sdk.getGlobalPauseStatusObjectId()

    const typeArguments = [params.coinX, params.coinY]
    const args = [
      params.poolObjectId,
      globalPauseStatusObjectId,
      params.coinXObjectId,
      params.coinYObjectId,
      d(coinXAmount).toString(),
      d(coinYAmount).toString(),
      d(coinXAmountMin).toString(),
      d(coinYAmountMin).toString(),
    ]
    return {
      packageObjectId: modules.LiquidswapDeployer,
      module: 'amm_script',
      function: 'add_liquidity',
      gasBudget,
      typeArguments,
      arguments: args,
    }
  }

  /// Get how much coinXAmount coinYAmount of opposite `params.liquidity ` coin you need to remove.
  async getCoinXYForLiquidity(params: GetCoinXYAmountForLiquidityParams) {
    const isSorted = params.direction

    const liquidityPoolResource = await this.sdk.Resources.getPoolObject(params.poolObjectId)
    const liquidityPoolField = getObjectFields(liquidityPoolResource)

    if (liquidityPoolField === undefined) {
      throw new Error(`LiquidityPool (${params.poolObjectId}) field error`)
    }

    const coinXReserve = liquidityPoolField.coin_a
    const coinYReserve = liquidityPoolField.coin_b

    const [reserveIn, reserveOut] = isSorted ? [d(coinXReserve), d(coinYReserve)] : [d(coinYReserve), d(coinXReserve)]

    const lpSuply = liquidityPoolField?.lp_supply?.fields?.value || 0

    return getCoinXYForLiquidity(d(params.liquidity), reserveIn, reserveOut, d(lpSuply))
  }

  /// Create  remove_liquidity transaction payload.
  async removeLiquidityTransactionPayload(params: RemoveLiquidityParams, gasBudget = 1000): Promise<MoveCallTransaction> {
    if (params.slippage >= 1 || params.slippage <= 0) {
      throw new Error(`Invalid slippage (${params.slippage}) value`)
    }

    const { modules } = this.sdk.sdkOptions.networkOptions
    const { coinXAmount, coinYAmount } = await this.getCoinXYForLiquidity({
      liquidity: params.liquidity,
      poolObjectId: params.poolObjectId,
      direction: params.direction,
    })

    const coinXAmountMin = withLiquiditySlippage(coinXAmount, d(params.slippage), 'minus')
    const coinYAmountMin = withLiquiditySlippage(coinYAmount, d(params.slippage), 'minus')

    const globalPauseStatusObjectId = await this.sdk.getGlobalPauseStatusObjectId()

    const typeArguments = [params.coinX, params.coinY]
    const args = [
      params.poolObjectId,
      globalPauseStatusObjectId,
      params.lpObjectId,
      d(params.liquidity).toString(),
      d(coinXAmountMin).toString(),
      d(coinYAmountMin).toString(),
    ]
    return {
      packageObjectId: modules.LiquidswapDeployer,
      module: 'amm_script',
      function: 'remove_liquidity',
      gasBudget,
      typeArguments,
      arguments: args,
    }
  }
}
