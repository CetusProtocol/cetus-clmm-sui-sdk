import BN from 'bn.js'
import { Graph, GraphEdge, GraphVertex } from '@syntsugar/cc-graph'
import { TransactionBlock } from '@mysten/sui.js'
import { PreSwapWithMultiPoolParams } from '../types'
import { extractStructTagFromType } from '../utils'
import { ClmmExpectSwapModule, ClmmIntegrateRouterModule, SuiAddressType } from '../types/sui'
import { CetusClmmSDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { U64_MAX, ZERO } from '../math'

// prepare router data
// includes coin and path
export interface CoinNode {
  address: string
  decimals: number
}

export interface CoinProvider {
  coins: CoinNode[]
}

export interface PathLink {
  base: string
  quote: string
  addressMap: Map<number, string>
}

export interface PathProvider {
  paths: PathLink[]
}

export type OnePath = {
  amountIn: BN
  amountOut: BN
  poolAddress: string[]
  a2b: boolean[]
  rawAmountLimit: BN[]
  isExceed: boolean
  coinType: string[]
}

export type AddressAndDirection = {
  addressMap: Map<number, string>
  direction: boolean
}

export type SwapWithRouterParams = {
  paths: OnePath[]
  partner: string
  priceSplitPoint: number
}

export type PreRouterSwapParams = {
  stepNums: number
  poolAB: string
  poolBC: string | undefined
  a2b: boolean
  b2c: boolean | undefined
  byAmountIn: boolean
  amount: BN
  coinTypeA: SuiAddressType
  coinTypeB: SuiAddressType
  coinTypeC: SuiAddressType | undefined
}

export type PreSwapResult = {
  index: number
  amountIn: BN
  amountMedium: BN
  amountOut: BN
  targetSqrtPrice: BN[]
  currentSqrtPrice: BN[]
  isExceed: boolean
  stepNum: number
}

export type PriceResult = {
  amountIn: BN
  amountOut: BN
  paths: OnePath[]
  a2b: boolean
  b2c: boolean | undefined
  byAmountIn: boolean
  isExceed: boolean
  targetSqrtPrice: BN[]
  currentSqrtPrice: BN[]
  coinTypeA: SuiAddressType
  coinTypeB: SuiAddressType
  coinTypeC: SuiAddressType | undefined
  createTxParams: SwapWithRouterParams | undefined
}

function _pairSymbol(
  base: string,
  quote: string
): {
  pair: string
  reversePair: string
} {
  return {
    pair: `${base}-${quote}`,
    reversePair: `${quote}-${base}`,
  }
}

export class RouterModule implements IModule {
  readonly graph: Graph

  readonly pathProviders: PathProvider[]

  private coinProviders: CoinProvider

  private _coinAddressMap: Map<string, CoinNode>

  private poolAddressMap: Map<string, Map<number, string>>

  protected _sdk: CetusClmmSDK

  constructor(sdk: CetusClmmSDK) {
    this.pathProviders = []
    this.coinProviders = {
      coins: [],
    }
    this.graph = new Graph()
    this._coinAddressMap = new Map()
    this.poolAddressMap = new Map()
    this._sdk = sdk

    this.getPoolAddressMapAndDirection = this.getPoolAddressMapAndDirection.bind(this)
    this.setCoinList = this.setCoinList.bind(this)
    this.loadGraph = this.loadGraph.bind(this)
    this.addCoinProvider = this.addCoinProvider.bind(this)
    this.addPathProvider = this.addPathProvider.bind(this)
    this.preRouterSwapA2B2C = this.preRouterSwapA2B2C.bind(this)
    this.price = this.price.bind(this)
  }

  get sdk() {
    return this._sdk
  }

  getPoolAddressMapAndDirection(base: string, quote: string): AddressAndDirection | undefined {
    const { pair, reversePair } = _pairSymbol(base, quote)
    let addressMap: any = this.poolAddressMap.get(pair)

    if (addressMap != null) {
      return {
        addressMap,
        direction: true,
      }
    }

    addressMap = this.poolAddressMap.get(reversePair)
    if (addressMap != null) {
      return {
        addressMap,
        direction: false,
      }
    }
    return undefined
  }

  private setCoinList() {
    this.coinProviders.coins.forEach((coin) => {
      this._coinAddressMap.set(coin.address, coin)
    })
  }

  loadGraph(coins: CoinProvider, paths: PathProvider) {
    this.addCoinProvider(coins)
    this.addPathProvider(paths)
    this.setCoinList()

    this.pathProviders.forEach((provider) => {
      const { paths } = provider
      paths.forEach((path) => {
        const vertexA = this.graph.getVertexByKey(path.base) ?? new GraphVertex(path.base)
        const vertexB = this.graph.getVertexByKey(path.quote) ?? new GraphVertex(path.quote)

        this.graph.addEdge(new GraphEdge(vertexA, vertexB))

        const coinA: any = this._coinAddressMap.get(path.base)
        const coinB: any = this._coinAddressMap.get(path.quote)

        if (coinA != null && coinB != null) {
          const poolSymbol = _pairSymbol(path.base, path.quote).pair
          this.poolAddressMap.set(poolSymbol, path.addressMap)
        }
      })
    })
  }

  private addPathProvider(provider: PathProvider): RouterModule {
    // fix all order about base and quote in paths
    for (let i = 0; i < provider.paths.length; i += 1) {
      const { base, quote } = provider.paths[i]
      const compareResult = base.localeCompare(quote)
      if (compareResult < 0) {
        provider.paths[i].base = quote
        provider.paths[i].quote = base
      }

      if (base === '0x2::sui::SUI') {
        provider.paths[i].base = quote
        provider.paths[i].quote = base
      }

      if (quote === '0x2::sui::SUI') {
        provider.paths[i].base = base
        provider.paths[i].quote = quote
      }
    }

    this.pathProviders.push(provider)
    return this
  }

  private addCoinProvider(provider: CoinProvider): RouterModule {
    this.coinProviders = provider
    return this
  }

  tokenInfo(key: string): CoinNode | undefined {
    return this._coinAddressMap.get(key)
  }

  async price(
    base: string,
    quote: string,
    amount: BN,
    byAmountIn: boolean,
    priceSplitPoint: number,
    partner: string,
    swapWithMultiPoolParams?: PreSwapWithMultiPoolParams
  ): Promise<PriceResult | undefined> {
    const baseCoin = this.tokenInfo(base)
    const quoteCoin = this.tokenInfo(quote)

    if (baseCoin === undefined || quoteCoin === undefined) {
      return undefined
    }

    const sourceVertex = this.graph.getVertexByKey(baseCoin.address)
    const targetVertex = this.graph.getVertexByKey(quoteCoin.address)

    // find all paths
    const pathIter = this.graph.findAllPath(sourceVertex, targetVertex)
    const allPaths = Array.from(pathIter)

    if (allPaths.length === 0) {
      return undefined
    }

    const preRouterSwapParams: PreRouterSwapParams[] = []

    for (let i = 0; i < allPaths.length; i += 1) {
      const path = allPaths[i]

      // only consider one and two pair path
      if (path.length > 3) {
        continue
      }
      const baseQuote = []
      const swapDirection = []

      const poolsAB: string[] = []
      const poolsBC: string[] = []

      for (let j = 0; j < path.length - 1; j += 1) {
        const base = path[j].value.toString()
        const quote = path[j + 1].value.toString()
        const addressMap = this.getPoolAddressMapAndDirection(base, quote)?.addressMap
        const direction = this.getPoolAddressMapAndDirection(base, quote)?.direction

        if (addressMap !== undefined && direction !== undefined) {
          swapDirection.push(direction)
          baseQuote.push(base)
          baseQuote.push(quote)
          addressMap.forEach((address) => {
            if (j === 0) {
              poolsAB.push(address)
            } else {
              poolsBC.push(address)
            }
          })
        }
      }

      for (const poolAB of poolsAB) {
        if (poolsBC.length > 0) {
          for (const poolBC of poolsBC) {
            const param: PreRouterSwapParams = {
              stepNums: 2,
              poolAB,
              poolBC,
              a2b: swapDirection[0],
              b2c: swapDirection[1],
              amount,
              byAmountIn,
              coinTypeA: baseQuote[0],
              coinTypeB: baseQuote[1],
              coinTypeC: baseQuote[3],
            }
            preRouterSwapParams.push(param)
          }
        } else {
          const param: PreRouterSwapParams = {
            stepNums: 1,
            poolAB,
            poolBC: undefined,
            a2b: swapDirection[0],
            b2c: undefined,
            amount,
            byAmountIn,
            coinTypeA: baseQuote[0],
            coinTypeB: baseQuote[1],
            coinTypeC: undefined,
          }
          preRouterSwapParams.push(param)
        }
      }
    }

    if (preRouterSwapParams.length === 0) {
      if (swapWithMultiPoolParams != null) {
        const preSwapResult = await this.sdk.Swap.preSwapWithMultiPool(swapWithMultiPoolParams)

        const onePath: OnePath = {
          amountIn: new BN(preSwapResult!.estimatedAmountIn),
          amountOut: new BN(preSwapResult!.estimatedAmountOut),
          poolAddress: [preSwapResult!.poolAddress],
          a2b: [preSwapResult!.aToB],
          rawAmountLimit: byAmountIn ? [preSwapResult!.estimatedAmountOut] : [preSwapResult!.estimatedAmountIn],
          isExceed: preSwapResult!.isExceed,
          coinType: [base, quote],
        }

        const swapWithRouterParams = {
          paths: [onePath],
          partner,
          priceSplitPoint,
        }

        const result: PriceResult = {
          amountIn: new BN(preSwapResult!.estimatedAmountIn),
          amountOut: new BN(preSwapResult!.estimatedAmountOut),
          paths: [onePath],
          a2b: preSwapResult!.aToB,
          b2c: undefined,
          byAmountIn,
          isExceed: preSwapResult!.isExceed,
          targetSqrtPrice: [preSwapResult!.estimatedEndSqrtPrice],
          currentSqrtPrice: [preSwapResult!.estimatedStartSqrtPrice],
          coinTypeA: base,
          coinTypeB: quote,
          coinTypeC: undefined,
          createTxParams: swapWithRouterParams,
        }
        return result
      }
      return undefined
    }

    const preSwapResult = await this.preRouterSwapA2B2C(preRouterSwapParams.slice(0, 64))
    if (preSwapResult == null) {
      if (swapWithMultiPoolParams != null) {
        const preSwapResult = await this.sdk.Swap.preSwapWithMultiPool(swapWithMultiPoolParams)

        const onePath: OnePath = {
          amountIn: new BN(preSwapResult!.estimatedAmountIn),
          amountOut: new BN(preSwapResult!.estimatedAmountOut),
          poolAddress: [preSwapResult!.poolAddress],
          a2b: [preSwapResult!.aToB],
          rawAmountLimit: byAmountIn ? [preSwapResult!.estimatedAmountOut] : [preSwapResult!.estimatedAmountIn],
          isExceed: preSwapResult!.isExceed,
          coinType: [base, quote],
        }

        const swapWithRouterParams = {
          paths: [onePath],
          partner,
          priceSplitPoint,
        }

        const result: PriceResult = {
          amountIn: new BN(preSwapResult!.estimatedAmountIn),
          amountOut: new BN(preSwapResult!.estimatedAmountOut),
          paths: [onePath],
          a2b: preSwapResult!.aToB,
          b2c: undefined,
          byAmountIn,
          isExceed: preSwapResult!.isExceed,
          targetSqrtPrice: [preSwapResult!.estimatedEndSqrtPrice],
          currentSqrtPrice: [preSwapResult!.estimatedStartSqrtPrice],
          coinTypeA: base,
          coinTypeB: quote,
          coinTypeC: undefined,
          createTxParams: swapWithRouterParams,
        }
        return result
      }
      const result: PriceResult = {
        amountIn: ZERO,
        amountOut: ZERO,
        paths: [],
        a2b: false,
        b2c: false,
        byAmountIn,
        isExceed: true,
        targetSqrtPrice: [],
        currentSqrtPrice: [],
        coinTypeA: '',
        coinTypeB: '',
        coinTypeC: undefined,
        createTxParams: undefined,
      }

      return result
    }

    const bestIndex = preSwapResult!.index

    const poolAddress =
      preRouterSwapParams[bestIndex].poolBC != null
        ? [preRouterSwapParams[bestIndex].poolAB, preRouterSwapParams[bestIndex].poolBC!]
        : [preRouterSwapParams[bestIndex].poolAB]

    const rawAmountLimit = byAmountIn
      ? [preSwapResult!.amountMedium, preSwapResult!.amountOut]
      : [preSwapResult!.amountIn, preSwapResult!.amountMedium]

    const a2bs = []
    a2bs.push(preRouterSwapParams[bestIndex].a2b)
    if (preSwapResult!.stepNum! > 1) {
      a2bs.push(preRouterSwapParams[bestIndex].b2c!)
    }

    const coinTypes = []
    coinTypes.push(preRouterSwapParams[bestIndex].coinTypeA)
    coinTypes.push(preRouterSwapParams[bestIndex].coinTypeB)
    if (preSwapResult!.stepNum! > 1) {
      coinTypes.push(preRouterSwapParams[bestIndex].coinTypeC!)
    }

    const onePath: OnePath = {
      amountIn: preSwapResult!.amountIn,
      amountOut: preSwapResult!.amountOut,
      poolAddress,
      a2b: a2bs,
      rawAmountLimit,
      isExceed: preSwapResult!.isExceed,
      coinType: coinTypes,
    }

    const swapWithRouterParams = {
      paths: [onePath],
      partner,
      priceSplitPoint,
    }

    const result: PriceResult = {
      amountIn: preSwapResult!.amountIn,
      amountOut: preSwapResult!.amountOut,
      paths: [onePath],
      a2b: preRouterSwapParams[bestIndex].a2b,
      b2c: preSwapResult!.stepNum! > 1 ? preRouterSwapParams[bestIndex].b2c! : undefined,
      byAmountIn,
      isExceed: preSwapResult!.isExceed,
      targetSqrtPrice: preSwapResult!.targetSqrtPrice,
      currentSqrtPrice: preSwapResult!.currentSqrtPrice,
      coinTypeA: preRouterSwapParams[bestIndex].coinTypeA,
      coinTypeB: preRouterSwapParams[bestIndex].coinTypeB,
      coinTypeC: preSwapResult!.stepNum! > 1 ? preRouterSwapParams[bestIndex].coinTypeC! : undefined,
      createTxParams: swapWithRouterParams,
    }
    return result
  }

  async preRouterSwapA2B2C(params: PreRouterSwapParams[]) {
    if (params.length === 0) {
      return null
    }

    const { clmm, simulationAccount } = this.sdk.sdkOptions

    const tx = new TransactionBlock()
    for (const param of params) {
      if (param.stepNums > 1) {
        const args = [
          tx.object(param.poolAB),
          tx.object(param.poolBC!),
          tx.pure(param.a2b),
          tx.pure(param.b2c),
          tx.pure(param.byAmountIn),
          tx.pure(param.amount.toString()),
        ]
        const typeArguments = []
        if (param.a2b) {
          typeArguments.push(param.coinTypeA, param.coinTypeB)
        } else {
          typeArguments.push(param.coinTypeB, param.coinTypeA)
        }

        if (param.b2c) {
          typeArguments.push(param.coinTypeB, param.coinTypeC!)
        } else {
          typeArguments.push(param.coinTypeC!, param.coinTypeB)
        }

        console.log(args, typeArguments)

        tx.moveCall({
          target: `${clmm.clmm_router}::${ClmmIntegrateRouterModule}::calculate_router_swap_result`,
          typeArguments,
          arguments: args,
        })
      } else {
        const args = [tx.pure(param.poolAB), tx.pure(param.a2b), tx.pure(param.byAmountIn), tx.pure(param.amount.toString())]
        const typeArguments = param.a2b ? [param.coinTypeA, param.coinTypeB] : [param.coinTypeB, param.coinTypeA]
        tx.moveCall({
          target: `${clmm.clmm_router}::${ClmmExpectSwapModule}::get_expect_swap_result`,
          arguments: args,
          typeArguments,
        })
      }
    }

    const simulateRes = await this.sdk.fullClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: simulationAccount.address,
    })

    const valueData: any = simulateRes.events?.filter((item: any) => {
      return (
        extractStructTagFromType(item.type).name === `CalculatedRouterSwapResultEvent` ||
        extractStructTagFromType(item.type).name === `ExpectSwapResultEvent`
      )
    })
    if (valueData.length === 0) {
      return null
    }

    let tempMaxAmount = params[0].byAmountIn ? ZERO : U64_MAX
    let tempIndex = 0

    for (let i = 0; i < valueData.length; i += 1) {
      if (valueData[i].parsedJson.data.is_exceed) {
        continue
      }

      if (params[0].byAmountIn) {
        const amount = new BN(valueData[i].parsedJson.data.amount_out)
        if (amount.gt(tempMaxAmount)) {
          tempIndex = i
          tempMaxAmount = amount
        }
      } else {
        const amount =
          params[i].stepNums > 1
            ? new BN(valueData[i].parsedJson.data.amount_in)
            : new BN(valueData[i].parsedJson.data.amount_in).add(new BN(valueData[i].parsedJson.data.fee_amount))
        if (amount.lt(tempMaxAmount)) {
          tempIndex = i
          tempMaxAmount = amount
        }
      }
    }

    const currentSqrtPrice = []
    const targetSqrtPrice = []
    if (params[tempIndex].stepNums > 1) {
      targetSqrtPrice.push(
        valueData[tempIndex].parsedJson.data.target_sqrt_price_ab,
        valueData[tempIndex].parsedJson.data.target_sqrt_price_cd
      )
      currentSqrtPrice.push(
        valueData[tempIndex].parsedJson.data.current_sqrt_price_ab,
        valueData[tempIndex].parsedJson.data.current_sqrt_price_cd
      )
    } else {
      targetSqrtPrice.push(valueData[tempIndex].parsedJson.data.after_sqrt_price)
      currentSqrtPrice.push(valueData[tempIndex].parsedJson.current_sqrt_price)
    }

    const result: PreSwapResult = {
      index: tempIndex,
      amountIn: params[0].byAmountIn ? params[tempIndex].amount : tempMaxAmount,
      amountMedium: valueData[tempIndex].parsedJson.data.amount_medium,
      amountOut: params[0].byAmountIn ? tempMaxAmount : params[tempIndex].amount,
      targetSqrtPrice,
      currentSqrtPrice,
      isExceed: valueData[tempIndex].parsedJson.data.is_exceed,
      stepNum: params[tempIndex].stepNums,
    }
    return result
  }
}
