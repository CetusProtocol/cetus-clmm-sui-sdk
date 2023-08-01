import BN from 'bn.js'
import Decimal from 'decimal.js'
import { CetusClmmSDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { PreSwapWithMultiPoolParams } from '../types'
import { TickMath } from '../math'

export type BasePath = {
  direction: boolean
  label: string
  poolAddress: string
  fromCoin: string
  toCoin: string
  feeRate: number
  outputAmount: number
  inputAmount: number
  currentSqrtPrice: BN
  fromDecimal: number
  toDecimal: number
  currentPrice: Decimal
}

export type SplitPath = {
  percent: number
  inputAmount: number
  outputAmount: number
  pathIndex: number
  lastQuoteOutput: number
  basePaths: BasePath[]
}

export type AggregatorResult = {
  isExceed: boolean
  isTimeout: boolean
  inputAmount: number
  outputAmount: number
  fromCoin: string
  toCoin: string
  byAmountIn: boolean
  splitPaths: SplitPath[]
}

export type Order = {
  quantity: number
  price: number
}

export class RouterModuleV2 implements IModule {
  protected _sdk: CetusClmmSDK

  constructor(sdk: CetusClmmSDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  private calculatePrice(currentSqrtPrice: BN, fromDecimals: number, toDecimals: number, a2b: boolean, label: string): Decimal {
    if (label === 'Cetus') {
      const decimalA = a2b ? fromDecimals : toDecimals
      const decimalB = a2b ? toDecimals : fromDecimals
      const price = TickMath.sqrtPriceX64ToPrice(currentSqrtPrice, decimalA, decimalB)
      return price
    }
    const price = new Decimal(currentSqrtPrice.toString()).div(new Decimal(1000000000))
    return price
  }

  private parseJsonResult(data: any): AggregatorResult {
    const result: AggregatorResult = {
      isExceed: data.is_exceed,
      isTimeout: data.is_timeout,
      inputAmount: data.input_amount,
      outputAmount: data.output_amount,
      fromCoin: data.from_coin,
      toCoin: data.to_coin,
      byAmountIn: data.by_amount_in,
      splitPaths: data.split_paths.map((path: any) => {
        const splitPath: SplitPath = {
          pathIndex: path.path_index,
          lastQuoteOutput: path.last_quote_output,
          percent: path.percent,
          basePaths: path.best_path.map((basePath: any) => {
            return {
              direction: basePath.direction,
              label: basePath.label,
              poolAddress: basePath.provider,
              fromCoin: basePath.from_coin,
              toCoin: basePath.to_coin,
              outputAmount: basePath.output_amount,
              inputAmount: basePath.input_amount,
              feeRate: basePath.fee_rate,
              currentSqrtPrice: new BN(basePath.current_sqrt_price.toString()),
              fromDecimal: basePath.from_decimal,
              toDecimal: basePath.to_decimal,
              currentPrice: this.calculatePrice(
                new BN(basePath.current_sqrt_price.toString()),
                basePath.from_decimal,
                basePath.to_decimal,
                basePath.direction,
                basePath.label
              ),
            }
          }),
          inputAmount: path.input_amount,
          outputAmount: path.output_amount,
        }
        return splitPath
      }),
    }
    return result
  }

  private async fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response | null> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (err) {
      return null
    }
  }

  private async fetchAndParseData(apiUrl: string): Promise<AggregatorResult | null> {
    try {
      const timeoutDuration = 3000
      const response: any = await this.fetchWithTimeout(apiUrl, {}, timeoutDuration)
      console.log(response)
      if (response == null) {
        return null
      }
      if (response.status === 200) {
        return this.parseJsonResult(await response.json())
      }
      return null
    } catch (error) {
      return null
    }
  }

  /**
   * Optimal routing method with fallback functionality.
   *
   * This method first attempts to find the optimal route using the routing backend. If the optimal route is available, it will return this route.
   * If the optimal route is not available (for example, due to network issues or API errors), this method will activate a fallback mechanism,
   * and try to find a suboptimal route using the routing algorithm built into the SDK, which only includes clmm pool. This way, even if the optimal route is not available, this method can still provide a usable route.
   *
   * This method uses a fallback strategy to ensure that it can provide the best available route when facing problems, rather than failing completely.
   */
  async getBestRouter(
    from: string,
    to: string,
    amount: number,
    byAmountIn: boolean,
    priceSplitPoint: number,
    partner: string,
    swapWithMultiPoolParams?: PreSwapWithMultiPoolParams,
    orderSplit = true,
    externalRouter = false
  ) {
    let result = null
    let version = 'v2'

    const apiUrl = `
    ${this.sdk.sdkOptions.aggregatorUrl}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&amount=${encodeURIComponent(
      amount
    )}&by_amount_in=${encodeURIComponent(byAmountIn)}&order_split=${encodeURIComponent(orderSplit)}&external_router=${encodeURIComponent(
      externalRouter
    )}
    `
    result = await this.fetchAndParseData(apiUrl)

    if (result?.isTimeout || result == null) {
      const priceResult: any = await this.sdk.Router.price(
        from,
        to,
        new BN(amount),
        byAmountIn,
        priceSplitPoint,
        partner,
        swapWithMultiPoolParams
      )

      const splitPaths: SplitPath[] = []

      for (const path of priceResult.paths) {
        const basePaths: BasePath[] = []
        if (path.poolAddress.length > 1) {
          const fromDecimal0 = this.sdk.Router.tokenInfo(path.coinType[0])!.decimals
          const toDecimal0 = this.sdk.Router.tokenInfo(path.coinType[1])!.decimals
          const currentPrice = path.a2b[0]
            ? TickMath.sqrtPriceX64ToPrice(new BN(priceResult.currentSqrtPrice[0]), fromDecimal0, toDecimal0)
            : TickMath.sqrtPriceX64ToPrice(new BN(priceResult.currentSqrtPrice[0]), toDecimal0, fromDecimal0)

          const path0: BasePath = {
            direction: path.a2b[0],
            label: 'Cetus',
            poolAddress: path.poolAddress[0],
            fromCoin: path.coinType[0],
            toCoin: path.coinType[1],
            feeRate: this.sdk.Router.getFeeRate(path.coinType[0], path.coinType[1], path.poolAddress[0]),
            outputAmount: priceResult.byAmountIn ? path.rawAmountLimit[0].toString() : path.rawAmountLimit[1].toString(),
            inputAmount: path.amountIn.toString(),
            currentSqrtPrice: priceResult.currentSqrtPrice[0],
            currentPrice,
            fromDecimal: fromDecimal0,
            toDecimal: toDecimal0,
          }

          const fromDecimal1 = this.sdk.Router.tokenInfo(path.coinType[1])!.decimals
          const toDecimal1 = this.sdk.Router.tokenInfo(path.coinType[2])!.decimals
          const currentPrice1 = path.a2b[1]
            ? TickMath.sqrtPriceX64ToPrice(new BN(priceResult.currentSqrtPrice[1]), fromDecimal1, toDecimal1)
            : TickMath.sqrtPriceX64ToPrice(new BN(priceResult.currentSqrtPrice[1]), toDecimal1, fromDecimal1)

          const path1: BasePath = {
            direction: path.a2b[1],
            label: 'Cetus',
            poolAddress: path.poolAddress[1],
            fromCoin: path.coinType[1],
            toCoin: path.coinType[2],
            feeRate: this.sdk.Router.getFeeRate(path.coinType[1], path.coinType[2], path.poolAddress[1]),
            outputAmount: path.amountOut.toString(),
            inputAmount: priceResult.byAmountIn ? path.rawAmountLimit[0].toString() : path.rawAmountLimit[1].toString(),
            currentSqrtPrice: priceResult.currentSqrtPrice[1],
            currentPrice: currentPrice1,
            fromDecimal: fromDecimal1,
            toDecimal: toDecimal1,
          }

          basePaths.push(path0, path1)
        } else {
          const fromDecimal = this.sdk.Router.tokenInfo(path.coinType[0])!.decimals
          const toDecimal = this.sdk.Router.tokenInfo(path.coinType[1])!.decimals
          const currentPrice = path.a2b[0]
            ? TickMath.sqrtPriceX64ToPrice(new BN(priceResult.currentSqrtPrice[0]), fromDecimal, toDecimal)
            : TickMath.sqrtPriceX64ToPrice(new BN(priceResult.currentSqrtPrice[0]), toDecimal, fromDecimal)

          const path0: BasePath = {
            direction: path.a2b[0],
            label: 'Cetus',
            poolAddress: path.poolAddress[0],
            fromCoin: path.coinType[0],
            toCoin: path.coinType[1],
            feeRate: this.sdk.Router.getFeeRate(path.coinType[0], path.coinType[1], path.poolAddress[0]),
            outputAmount: path.amountOut.toString(),
            inputAmount: path.amountIn.toString(),
            currentSqrtPrice: priceResult.currentSqrtPrice[0],
            currentPrice,
            fromDecimal,
            toDecimal,
          }
          basePaths.push(path0)
        }
        const splitPath: SplitPath = {
          percent: (Number(path.amountIn) / Number(priceResult.amountIn)) * 100,
          inputAmount: Number(path.amountIn.toString()),
          outputAmount: Number(path.amountOut.toString()),
          pathIndex: 0,
          lastQuoteOutput: 0,
          basePaths,
        }
        splitPaths.push(splitPath)
      }

      const aggregatorResult: AggregatorResult = {
        isExceed: priceResult.isExceed,
        isTimeout: true,
        inputAmount: Number(priceResult.amountIn.toString()),
        outputAmount: Number(priceResult.amountOut.toString()),
        fromCoin: priceResult.coinTypeA,
        toCoin: priceResult.coinTypeC != null ? priceResult.coinTypeC : priceResult.coinTypeB,
        byAmountIn: priceResult.byAmountIn,
        splitPaths,
      }
      version = 'v1'
      result = aggregatorResult
    }

    result.splitPaths.sort((a, b) => {
      return b.outputAmount - a.outputAmount
    })

    return { result, version }
  }
}
