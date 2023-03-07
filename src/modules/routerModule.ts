import Decimal from 'decimal.js'
import invariant from 'tiny-invariant'
import BN from 'bn.js'
import { Graph, GraphEdge, GraphVertex } from 'ss-graph'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { TickMath } from '../math/tick'
import { TokenInfo } from './tokenModule'

export interface CoinNode {
  address: string
  symbol: string
  decimals: number
}

export interface PathLink {
  base: string
  quote: string
  address: string
}
export interface PriceLink {
  quote: string
  base: string
  price: Decimal
}

export interface PathProvider {
  paths: PathLink[]
}

export interface PriceProvider {
  prices: PriceLink[]
}

export interface CoinProvider {
  tokens: CoinNode[]
}

export type PriceAndPath = {
  maxPrice: Decimal
  nodes: string[]
}

export type PriceResult = {
  pools: string[]
  directions: boolean[]
  maxIndex: number
} & PriceAndPath

export type AddressAndDirection = {
  address: string
  direction: boolean
}

function _pairSymbol(
  base: string,
  quote: string
): {
  pair: string
  reversePair: string
} {
  return {
    pair: `${base.toUpperCase()}-${quote.toUpperCase()}`,
    reversePair: `${quote.toUpperCase()}-${base.toUpperCase()}`,
  }
}

function findMaxPrice(prices: Decimal[]) {
  if (prices.length === 1) {
    return {
      maxPrice: prices[0],
      index: 0,
    }
  }
  let maxPrice = prices[0]
  let index = 0
  for (let i = 0; i < prices.length; i += 1) {
    if (maxPrice.lt(prices[i])) {
      index = i
      maxPrice = prices[i]
    }
  }

  return {
    maxPrice,
    index,
  }
}

export class RouterModule implements IModule {
  readonly priceProviders: PriceProvider[]

  readonly pathProviders: PathProvider[]

  readonly coinProviders: CoinProvider[]

  readonly graph: Graph

  private _rates: Map<string, Decimal>

  private _coinSymbolMapping: Map<string, CoinNode>

  private _coinAddressMapping: Map<string, CoinNode>

  private poolMapping: Map<string, string>

  protected _sdk: SDK

  constructor(sdk: SDK) {
    this.priceProviders = []
    this.pathProviders = []
    this.coinProviders = []
    this.graph = new Graph()
    this._rates = new Map()
    this._coinSymbolMapping = new Map()
    this._coinAddressMapping = new Map()
    this.poolMapping = new Map()
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  getPoolAddressAndDirection(base: string, quote: string): AddressAndDirection | undefined {
    const { pair, reversePair } = _pairSymbol(base, quote)
    let address: any = this.poolMapping.get(pair)

    if (address !== undefined) {
      return {
        address,
        direction: true,
      }
    }

    address = this.poolMapping.get(reversePair)
    if (address !== undefined) {
      return {
        address,
        direction: false,
      }
    }
    return undefined
  }

  async setCoinList(coins: TokenInfo[]) {
    coins.forEach((v) => {
      const coin: CoinNode = {
        address: v.address,
        symbol: v.symbol,
        decimals: v.decimals,
      }
      this._coinSymbolMapping.set(v.symbol, coin)
      this._coinAddressMapping.set(v.address, coin)
    })
  }

  async loadGraph(): Promise<RouterModule> {
    for (const provider of this.pathProviders) {
      const { paths } = provider

      for (let i = 0; i < paths.length; i += 1) {
        let vertexA
        let vertexB
        if (this.graph.getVertexByKey(paths[i].base) === undefined) {
          vertexA = new GraphVertex(paths[i].base)
        } else {
          vertexA = this.graph.getVertexByKey(paths[i].base)
        }
        if (this.graph.getVertexByKey(paths[i].quote) === undefined) {
          vertexB = new GraphVertex(paths[i].quote.toUpperCase())
        } else {
          vertexB = this.graph.getVertexByKey(paths[i].quote)
        }
        this.graph.addEdge(new GraphEdge(vertexA, vertexB))

        const coinA: any = this._coinSymbolMapping.get(paths[i].base)
        const coinB: any = this._coinSymbolMapping.get(paths[i].quote)

        if (coinA !== undefined && coinB !== undefined) {
          const poolSymbol = _pairSymbol(paths[i].base, paths[i].quote).pair
          this.poolMapping.set(poolSymbol, paths[i].address)
        }
      }
    }

    return this
  }

  addPathProvider(provider: PathProvider): RouterModule {
    this.pathProviders.push(provider)
    return this
  }

  addPriceProvider(provider: PriceProvider): RouterModule {
    this.priceProviders.push(provider)
    return this
  }

  addCoinProvider(provider: CoinProvider): RouterModule {
    this.coinProviders.push(provider)
    return this
  }

  tokenInfo(key: string): CoinNode | undefined {
    if (this._coinAddressMapping.has(key)) {
      return this._coinAddressMapping.get(key)
    }
    return this._coinSymbolMapping.get(key)
  }

  async price(base: string, quote: string): Promise<PriceResult | undefined> {
    const baseCoin = this.tokenInfo(base)
    const quoteCoin = this.tokenInfo(quote)

    if (baseCoin === undefined || quoteCoin === undefined) {
      return undefined
    }

    const sourceVertex = this.graph.getVertexByKey(baseCoin.symbol)
    // const targetVertex = new GraphVertex(quoteCoin.symbol)
    const targetVertex = this.graph.getVertexByKey(quoteCoin.symbol)

    // find all paths
    const pathIterator = this.graph.findAllPath(sourceVertex, targetVertex)
    const allPaths = Array.from(pathIterator)

    const pools: string[] = []
    for (const path of allPaths) {
      for (let i = 0; i < path.length - 1; i += 1) {
        const base = path[i].value.toString()
        const quote = path[i + 1].value.toString()
        const address = this.getPoolAddressAndDirection(base, quote)?.address
        if (address !== undefined) {
          pools.push(address)
        }
      }
    }

    // update pool info
    await this._updatePoolInfo(pools)

    // calculate price for each path
    const prices: Decimal[] = []
    const nodes = []
    for (const path of allPaths) {
      const price: any = this._price(path)
      nodes.push(price.nodes)
      prices.push(price.maxPrice)
    }

    // find the max price and its path
    const maxPrice = findMaxPrice(prices)

    const poolAddresses = []
    const swapDirections = []
    for (let i = 0; i < allPaths[maxPrice.index].length - 1; i += 1) {
      const base = allPaths[maxPrice.index][i].value.toString()
      const quote = allPaths[maxPrice.index][i + 1].value.toString()
      const address = this.getPoolAddressAndDirection(base, quote)?.address
      const direction = this.getPoolAddressAndDirection(base, quote)?.direction
      if (address !== undefined && direction !== undefined) {
        poolAddresses.push(address)
        swapDirections.push(direction)
      }
    }

    return {
      maxIndex: maxPrice.index,
      maxPrice: maxPrice.maxPrice,
      nodes,
      pools: poolAddresses,
      directions: swapDirections,
    }
  }

  private async _updatePoolInfo(poolAddresses: string[]) {
    for (const poolAddress of poolAddresses) {
      // eslint-disable-next-line no-await-in-loop
      const pool = await this._sdk.Resources.getPool(poolAddress)
      const base: any = this.tokenInfo(pool.coinTypeA)
      const quote: any = this.tokenInfo(pool.coinTypeB)
      const { pair } = _pairSymbol(base.symbol, quote.symbol)
      const price = TickMath.sqrtPriceX64ToPrice(new BN(pool.current_sqrt_price), base.decimals, quote.decimals)
      this._rates.set(pair, price)
    }
  }

  private _price(path: GraphVertex[]): PriceAndPath | undefined {
    let maxPrice = new Decimal(1)
    const nodes = []
    for (let i = 0; i < path.length - 1; i += 1) {
      const base = path[i].value.toString()
      const quote = path[i + 1].value.toString()
      nodes.push(base)
      invariant(base !== undefined && quote !== undefined, 'base and quote is undefined')
      const tempPrice = this._directPrice(base, quote)
      console.log('t', tempPrice?.maxPrice.toString())
      invariant(tempPrice !== undefined, `[${base}-${quote}] temp price is undefined`)
      maxPrice = maxPrice.mul(tempPrice.maxPrice)
      console.log('m', maxPrice.toString())
    }
    nodes.push(path[path.length - 1].value.toString())
    return {
      maxPrice,
      nodes,
    }
  }

  private _directPrice(base: string, quote: string): PriceAndPath | undefined {
    const nodes = [base, quote]
    const { pair, reversePair } = _pairSymbol(base, quote)
    if (this._rates.has(pair)) {
      const rate = this._rates.get(pair)
      if (rate === undefined) {
        return undefined
      }
      return {
        maxPrice: rate,
        nodes,
      }
    }
    if (this._rates.has(reversePair)) {
      const price = this._rates.get(reversePair)
      invariant(price !== undefined)
      return {
        maxPrice: new Decimal(1).div(price),
        nodes,
      }
    }
    return undefined
  }
}
