import BN from 'bn.js'
import { Graph, GraphEdge, GraphVertex } from '@syntsugar/cc-graph'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { PreSwapWithMultiPoolParams } from '../types'
import { checkInvalidSuiAddress, extractStructTagFromType } from '../utils'
import { ClmmExpectSwapModule, ClmmIntegrateRouterModule, SuiAddressType } from '../types/sui'
import { CetusClmmSDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { U64_MAX, ZERO } from '../math'
import { ClmmpoolsError, ConfigErrorCode, RouterErrorCode } from '../errors/errors'

// coin node in coin map
export interface CoinNode {
  address: string
  decimals: number
}

// pass coin node to coin map
export interface CoinProvider {
  coins: CoinNode[]
}

// path link to coin map
export interface PathLink {
  base: string
  quote: string
  addressMap: Map<number, string>
}

// pass path link to coin map
export interface PathProvider {
  paths: PathLink[]
}

// simple path in router path
export type OnePath = {
  amountIn: BN
  amountOut: BN
  poolAddress: string[]
  a2b: boolean[]
  rawAmountLimit: BN[]
  isExceed: boolean
  coinType: string[]
}

// label address map with direction
export type AddressAndDirection = {
  addressMap: Map<number, string>
  direction: boolean
}

// use to build router swap transaction
export type SwapWithRouterParams = {
  paths: OnePath[]
  partner: string
  priceSlippagePoint: number
}

// use to do pre router swap param by sdk
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

// return the best path in pre swap result
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

// return the
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

// return the pool with tvl info by statistics API
type PoolWithTvl = {
  poolAddress: string
  tvl: number
}

/**
 * build pair symbol
 * @param base base coin
 * @param quote quote coin
 * @returns pair symbol
 */
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
    this.graph = new Graph(false)
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
    this.getPoolWithTVL = this.getPoolWithTVL.bind(this)
  }

  get sdk() {
    return this._sdk
  }

  /**
   * Get pool address map with direction
   * @param {string} base base coin
   * @param {string} quote quote coin
   * @returns {AddressAndDirection} address with direction
   */
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

  /**
   * set coin list in coin address map
   */
  private setCoinList() {
    this.coinProviders.coins.forEach((coin) => {
      this._coinAddressMap.set(coin.address, coin)
    })
  }

  /**
   * Find best router must load graph first
   * @param {CoinProvider} coins all coins
   * @param {PathProvider} paths all paths
   */
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

  /**
   * Add path provider to router graph
   * @param {PathProvider} provider path provider
   * @returns {RouterModule} module of router
   */
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

  /**
   * Add coin provider to router graph
   * @param {CoinProvider} provider  coin provider
   * @returns {RouterModule} module of router
   */
  private addCoinProvider(provider: CoinProvider): RouterModule {
    this.coinProviders = provider
    return this
  }

  /**
   * Get token info from coin address map
   * @param {string} key coin type
   * @returns {CoinNode | undefined}
   */
  tokenInfo(key: string): CoinNode | undefined {
    return this._coinAddressMap.get(key)
  }

  /**
   * Get fee rate info from pool address map
   * @param from from coin type
   * @param to to coin type
   * @param address pool address
   * @returns fee rate of pool
   */
  getFeeRate(from: string, to: string, address: string): number {
    const poolSymbol = _pairSymbol(from, to).pair
    const addressMap = this.poolAddressMap.get(poolSymbol)
    if (addressMap != null) {
      // get value by key from map
      for (const [key, value] of addressMap.entries()) {
        if (value === address) {
          return key * 100
        }
      }
    }
    const poolSymbolRev = _pairSymbol(from, to).reversePair
    const addressMapRev = this.poolAddressMap.get(poolSymbolRev)
    if (addressMapRev != null) {
      // get value by key from map
      for (const [key, value] of addressMapRev.entries()) {
        if (value === address) {
          return key * 100
        }
      }
    }
    return 0
  }

  /**
   * Get the best price from router graph.
   *
   * @param {string} from from coin type
   * @param {string} to to coin type
   * @param {BN} amount coin amount
   * @param {boolean} byAmountIn weather fixed inoput amount
   * @param {number} priceSlippagePoint price splippage point
   * @param {string} partner partner object id
   * @param {PreSwapWithMultiPoolParams} swapWithMultiPoolParams use to downgrade
   * @returns {Promise<PriceResult | undefined>} best swap router
   */
  async price(
    from: string,
    to: string,
    amount: BN,
    byAmountIn: boolean,
    priceSlippagePoint: number,
    partner: string,
    swapWithMultiPoolParams?: PreSwapWithMultiPoolParams
  ): Promise<PriceResult | undefined> {
    const fromCoin = this.tokenInfo(from)
    const toCoin = this.tokenInfo(to)

    if (fromCoin === undefined || toCoin === undefined) {
      throw new ClmmpoolsError('From/To coin is undefined', RouterErrorCode.InvalidCoin)
    }

    const fromVertex = this.graph.getVertexByKey(fromCoin.address)
    const toVertex = this.graph.getVertexByKey(toCoin.address)

    const pathIters = this.graph.findAllPath(fromVertex, toVertex)
    const allPaths = Array.from(pathIters)

    if (allPaths.length === 0) {
      throw new ClmmpoolsError('No find valid path in coin graph', RouterErrorCode.NotFoundPath)
    }

    let preRouterSwapParams: PreRouterSwapParams[] = []

    for (let i = 0; i < allPaths.length; i += 1) {
      const path = allPaths[i]

      // only consider one and two pair path
      if (path.length > 3) {
        continue
      }
      const fromAndTo = []
      const swapDirection = []

      const poolsAB: string[] = []
      const poolsBC: string[] = []

      for (let j = 0; j < path.length - 1; j += 1) {
        const subFrom = path[j].value.toString()
        const subTo = path[j + 1].value.toString()
        const addressMapAndDirection = this.getPoolAddressMapAndDirection(subFrom, subTo)
        const addressMap = addressMapAndDirection?.addressMap
        const direction = addressMapAndDirection?.direction

        if (addressMap != null && direction != null) {
          swapDirection.push(direction)
          fromAndTo.push(subFrom)
          fromAndTo.push(subTo)
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
              coinTypeA: fromAndTo[0],
              coinTypeB: fromAndTo[1],
              coinTypeC: fromAndTo[3],
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
            coinTypeA: fromAndTo[0],
            coinTypeB: fromAndTo[1],
            coinTypeC: undefined,
          }
          preRouterSwapParams.push(param)
        }
      }
    }

    // add one limit, must calculated two steps path.
    const stepNumsOne = preRouterSwapParams.filter((item) => item.stepNums === 1)
    const notStepNumsOne = preRouterSwapParams.filter((item) => item.stepNums !== 1)

    let poolWithTvls: PoolWithTvl[] = []
    try {
      poolWithTvls = await this.getPoolWithTVL()
    } catch (err) {
      poolWithTvls = []
    }

    if (poolWithTvls.length > 0) {
      const poolWithTvlsMap = new Map(poolWithTvls.map((item) => [item.poolAddress, item]))

      // sort notStepNumbsOne by tvl
      notStepNumsOne.sort((a, b) => {
        let aTvlMinimum = 0
        let bTvlMinimum = 0

        if (poolWithTvlsMap.has(a.poolAB) && poolWithTvlsMap.has(a.poolBC!)) {
          const aPoolAB = poolWithTvlsMap.get(a.poolAB)!
          const aPoolBC = poolWithTvlsMap.get(a.poolBC!)!
          aTvlMinimum = Math.min(aPoolAB.tvl, aPoolBC.tvl)
        }

        if (poolWithTvlsMap.has(b.poolAB) && poolWithTvlsMap.has(b.poolBC!)) {
          const bPoolAB = poolWithTvlsMap.get(b.poolAB)!
          const bPoolBC = poolWithTvlsMap.get(b.poolBC!)!
          bTvlMinimum = Math.min(bPoolAB.tvl, bPoolBC.tvl)
        }
        return bTvlMinimum - aTvlMinimum
      })
    }

    preRouterSwapParams = [...stepNumsOne, ...notStepNumsOne]

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
          coinType: [from, to],
        }

        const swapWithRouterParams = {
          paths: [onePath],
          partner,
          priceSlippagePoint,
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
          coinTypeA: from,
          coinTypeB: to,
          coinTypeC: undefined,
          createTxParams: swapWithRouterParams,
        }
        return result
      }
      throw new ClmmpoolsError('No parameters available for service downgrade', RouterErrorCode.NoDowngradeNeedParams)
    }

    const preSwapResult = await this.preRouterSwapA2B2C(preRouterSwapParams.slice(0, 16))
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
          coinType: [from, to],
        }

        const swapWithRouterParams = {
          paths: [onePath],
          partner,
          priceSlippagePoint,
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
          coinTypeA: from,
          coinTypeB: to,
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
      priceSlippagePoint,
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

  async priceUseV1(
    from: string,
    to: string,
    _amount: BN,
    byAmountIn: boolean,
    priceSlippagePoint: number,
    partner: string,
    swapWithMultiPoolParams?: PreSwapWithMultiPoolParams
  ) {
    if (swapWithMultiPoolParams != null) {
      const preSwapResult = await this.sdk.Swap.preSwapWithMultiPool(swapWithMultiPoolParams)

      const onePath: OnePath = {
        amountIn: new BN(preSwapResult!.estimatedAmountIn),
        amountOut: new BN(preSwapResult!.estimatedAmountOut),
        poolAddress: [preSwapResult!.poolAddress],
        a2b: [preSwapResult!.aToB],
        rawAmountLimit: byAmountIn ? [preSwapResult!.estimatedAmountOut] : [preSwapResult!.estimatedAmountIn],
        isExceed: preSwapResult!.isExceed,
        coinType: [from, to],
      }

      const swapWithRouterParams = {
        paths: [onePath],
        partner,
        priceSlippagePoint,
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
        coinTypeA: from,
        coinTypeB: to,
        coinTypeC: undefined,
        createTxParams: swapWithRouterParams,
      }
      return result
    }
    throw new ClmmpoolsError('No parameters available for service downgrade', RouterErrorCode.NoDowngradeNeedParams)
  }

  async preRouterSwapA2B2C(params: PreRouterSwapParams[]) {
    if (params.length === 0) {
      return null
    }

    const { integrate, simulationAccount } = this.sdk.sdkOptions

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

        tx.moveCall({
          target: `${integrate.published_at}::${ClmmIntegrateRouterModule}::calculate_router_swap_result`,
          typeArguments,
          arguments: args,
        })
      } else {
        const args = [tx.pure(param.poolAB), tx.pure(param.a2b), tx.pure(param.byAmountIn), tx.pure(param.amount.toString())]
        const typeArguments = param.a2b ? [param.coinTypeA, param.coinTypeB] : [param.coinTypeB, param.coinTypeA]
        tx.moveCall({
          target: `${integrate.published_at}::${ClmmExpectSwapModule}::get_expect_swap_result`,
          arguments: args,
          typeArguments,
        })
      }
    }

    if (!checkInvalidSuiAddress(simulationAccount.address)) {
      throw new ClmmpoolsError('this config simulationAccount is not set right', ConfigErrorCode.InvalidSimulateAccount)
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

  async getPoolWithTVL(): Promise<PoolWithTvl[]> {
    const result: PoolWithTvl[] = []

    const { swapCountUrl } = this._sdk.sdkOptions
    if (!swapCountUrl) {
      return result
    }

    let response
    try {
      response = await fetch(swapCountUrl)
    } catch (e) {
      throw new ClmmpoolsError(`Failed to get pool list with liquidity from ${swapCountUrl}.`, RouterErrorCode.InvalidSwapCountUrl)
    }

    let json
    try {
      json = await response.json()
    } catch (e) {
      throw new ClmmpoolsError(`Failed tp [arse response from ${swapCountUrl}].`, RouterErrorCode.InvalidSwapCountUrl)
    }

    if (json.code !== 200) {
      throw new ClmmpoolsError(
        `Failed to get pool list from ${swapCountUrl}. Statu code is ${json.code}.`,
        RouterErrorCode.InvalidSwapCountUrl
      )
    }

    const { pools } = json.data

    for (const pool of pools) {
      result.push({
        poolAddress: pool.swap_account,
        tvl: Number(pool.tvl_in_usd),
      })
    }

    return result
  }
}
