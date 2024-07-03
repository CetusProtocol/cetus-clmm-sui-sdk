import BN from 'bn.js'
import { TransactionArgument, Transaction } from '@mysten/sui/transactions'
import { SdkOptions } from '../sdk'
import { CLOCK_ADDRESS, DeepbookClobV2Moudle, DeepbookCustodianV2Moudle, DeepbookEndpointsV2Moudle } from '../types'
import SDK from '../main'
import { extractStructTagFromType } from './contracts'
import { TransactionUtil } from './transaction-util'
import { ZERO } from '../math'

const FLOAT_SCALING = new BN(1000000000)

export type Order = {
  quantity: number
  price: number
}

export type DeepbookPool = {
  poolID: string
  tickSize: number
  lotSize: number
  baseAsset: string
  quoteAsset: string
  takerFeeRate: number
  makerRebateRate: number
}

export class DeepbookUtils {
  static createAccountCap(senderAddress: string, sdkOptions: SdkOptions, tx: Transaction, isTransfer = false) {
    if (senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    const { deepbook } = sdkOptions

    const [cap] = tx.moveCall({
      target: `${deepbook.published_at}::${DeepbookClobV2Moudle}::create_account`,
      typeArguments: [],
      arguments: [],
    })

    if (isTransfer) {
      tx.transferObjects([cap], tx.pure.address(senderAddress))
    }

    return [cap, tx]
  }

  static deleteAccountCap(accountCap: string, sdkOptions: SdkOptions, tx: Transaction): Transaction {
    const { deepbook } = sdkOptions

    const args = [tx.object(accountCap)]

    tx.moveCall({
      target: `${deepbook.published_at}::${DeepbookCustodianV2Moudle}::delete_account_cap`,
      typeArguments: [],
      arguments: args,
    })
    return tx
  }

  static deleteAccountCapByObject(accountCap: TransactionArgument, sdkOptions: SdkOptions, tx: Transaction): Transaction {
    const { deepbook } = sdkOptions

    const args = [accountCap]

    tx.moveCall({
      target: `${deepbook.published_at}::${DeepbookCustodianV2Moudle}::delete_account_cap`,
      typeArguments: [],
      arguments: args,
    })
    return tx
  }

  static async getAccountCap(sdk: SDK, showDisplay = true): Promise<string> {
    const ownerRes: any = await sdk.fullClient.getOwnedObjectsByPage(sdk.senderAddress, {
      options: { showType: true, showContent: true, showDisplay, showOwner: true },
      filter: {
        MoveModule: {
          package: sdk.sdkOptions.deepbook.package_id,
          module: DeepbookCustodianV2Moudle,
        },
      },
    })

    if (ownerRes.data.length === 0) {
      return ''
    }

    const accountCap = ownerRes.data[0].data.objectId

    return accountCap
  }

  static async getPools(sdk: SDK): Promise<DeepbookPool[]> {
    const deepbook = sdk.sdkOptions.deepbook.package_id

    const allPools: DeepbookPool[] = []

    try {
      const objects = await sdk.fullClient.queryEventsByPage({ MoveEventType: `${deepbook}::clob_v2::PoolCreated` })

      objects.data.forEach((object: any) => {
        const fields = object.parsedJson
        if (fields) {
          allPools.push({
            poolID: fields.pool_id,
            tickSize: Number(fields.tick_size),
            lotSize: Number(fields.lot_size),
            takerFeeRate: Number(fields.taker_fee_rate),
            makerRebateRate: Number(fields.maker_rebate_rate),
            baseAsset: fields.base_asset.name,
            quoteAsset: fields.quote_asset.name,
          })
        }
      })
    } catch (error) {
      console.log('getPoolImmutables', error)
    }

    // console.log('allPools', allPools)
    return allPools
  }

  static async getPoolAsks(sdk: SDK, poolAddress: string, baseCoin: string, quoteCoin: string): Promise<Order[]> {
    const { simulationAccount } = sdk.sdkOptions
    const { deepbook_endpoint_v2 } = sdk.sdkOptions

    const tx = new Transaction()

    const asks: Order[] = []

    const typeArguments = [baseCoin, quoteCoin]
    const args = [tx.object(poolAddress), tx.pure.u64('0'), tx.pure.u64('999999999999'), tx.object(CLOCK_ADDRESS)]
    tx.moveCall({
      target: `${deepbook_endpoint_v2.published_at}::endpoints_v2::get_level2_book_status_ask_side`,
      arguments: args,
      typeArguments,
    })

    const simulateRes = await sdk.fullClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: simulationAccount.address,
    })

    const valueData: any = simulateRes.events?.filter((item: any) => {
      return extractStructTagFromType(item.type).name === `BookStatus`
    })
    if (valueData.length === 0) {
      return asks
    }

    for (let i = 0; i < valueData[0].parsedJson.depths.length; i++) {
      const price = valueData[0].parsedJson.price[i]
      const depth = valueData[0].parsedJson.depths[i]
      const ask: Order = {
        price: parseInt(price, 10),
        quantity: parseInt(depth, 10),
      }
      asks.push(ask)
    }

    return asks
  }

  static async getPoolBids(sdk: SDK, poolAddress: string, baseCoin: string, quoteCoin: string): Promise<Order[]> {
    const { simulationAccount } = sdk.sdkOptions
    const { deepbook_endpoint_v2 } = sdk.sdkOptions

    const tx = new Transaction()

    const bids: Order[] = []

    const typeArguments = [baseCoin, quoteCoin]
    const args = [tx.object(poolAddress), tx.pure.u64('0'), tx.pure.u64('999999999999'), tx.object(CLOCK_ADDRESS)]
    tx.moveCall({
      target: `${deepbook_endpoint_v2.published_at}::endpoints_v2::get_level2_book_status_bid_side`,
      arguments: args,
      typeArguments,
    })

    const simulateRes = await sdk.fullClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: simulationAccount.address,
    })

    const valueData: any = simulateRes.events?.filter((item: any) => {
      return extractStructTagFromType(item.type).name === `BookStatus`
    })
    if (valueData.length === 0) {
      return bids
    }

    for (let i = 0; i < valueData[0].parsedJson.depths.length; i++) {
      const price = valueData[0].parsedJson.price[i]
      const depth = valueData[0].parsedJson.depths[i]
      const bid: Order = {
        price: parseInt(price, 10),
        quantity: parseInt(depth, 10),
      }
      bids.push(bid)
    }

    return bids
  }

  static async preSwap(sdk: SDK, pool: DeepbookPool, a2b: boolean, amountIn: number) {
    let isExceed = false
    let amountOut = ZERO
    let remainAmount = new BN(amountIn)
    let feeAmount = ZERO
    const initAmountIn = new BN(amountIn)

    if (a2b) {
      let bids = await this.getPoolBids(sdk, pool.poolID, pool.baseAsset, pool.quoteAsset)
      if (bids === null) {
        isExceed = true
      }
      bids = bids.sort((a, b) => {
        return b.price - a.price
      })

      for (let i = 0; i < bids.length; i += 1) {
        const curBidAmount = new BN(bids[i].quantity)
        const curBidPrice = new BN(bids[i].price)
        const fee = curBidAmount.mul(new BN(curBidPrice)).mul(new BN(pool.takerFeeRate)).div(FLOAT_SCALING).div(FLOAT_SCALING)
        if (remainAmount.gt(curBidAmount)) {
          remainAmount = remainAmount.sub(curBidAmount)
          amountOut = amountOut.add(curBidAmount.mul(curBidPrice).div(FLOAT_SCALING).sub(fee))
          feeAmount = feeAmount.add(fee)
        } else {
          const curOut = remainAmount.mul(new BN(bids[i].price)).div(FLOAT_SCALING)
          const curFee = curOut.mul(new BN(pool.takerFeeRate)).div(FLOAT_SCALING)
          amountOut = amountOut.add(curOut.sub(curFee))
          remainAmount = remainAmount.sub(remainAmount)
          feeAmount = feeAmount.add(curFee)
        }
        if (remainAmount.eq(ZERO)) {
          break
        }
      }
    } else {
      const asks = await this.getPoolAsks(sdk, pool.poolID, pool.baseAsset, pool.quoteAsset)
      if (asks === null) {
        isExceed = true
      }

      for (let i = 0; i < asks.length; i += 1) {
        const curAskAmount = new BN(asks[i].price).mul(new BN(asks[i].quantity)).div(new BN(1000000000))
        const fee = curAskAmount.mul(new BN(pool.takerFeeRate)).div(FLOAT_SCALING)
        const curAskAmountWithFee = curAskAmount.add(fee)
        if (remainAmount.gt(curAskAmount)) {
          amountOut = amountOut.add(new BN(asks[i].quantity))
          remainAmount = remainAmount.sub(curAskAmountWithFee)
          feeAmount = feeAmount.add(fee)
        } else {
          const splitNums = new BN(asks[i].quantity).div(new BN(pool.lotSize))
          const splitAmount = curAskAmountWithFee.div(splitNums)
          const swapSplitNum = remainAmount.div(splitAmount)
          amountOut = amountOut.add(swapSplitNum.muln(pool.lotSize))
          remainAmount = remainAmount.sub(swapSplitNum.mul(splitAmount))
          feeAmount = feeAmount.add(swapSplitNum.div(splitNums).mul(fee))
        }
        if (remainAmount.eq(ZERO)) {
          break
        }
      }
    }

    return {
      poolAddress: pool.poolID,
      // currentSqrtPrice: current_sqrt_price,
      estimatedAmountIn: initAmountIn.sub(remainAmount).toNumber(),
      estimatedAmountOut: amountOut.toNumber(),
      // estimatedEndSqrtPrice: target_sqrt_price,
      estimatedFeeAmount: feeAmount,
      isExceed,
      amount: Number(amountIn),
      aToB: a2b,
      byAmountIn: true,
    }
  }

  static async simulateSwap(sdk: SDK, poolID: string, baseCoin: string, quoteCoin: string, a2b: boolean, amount: number) {
    const { deepbook_endpoint_v2 } = sdk.sdkOptions

    let tx = new Transaction()

    const accountCapStr = await this.getAccountCap(sdk)

    let accountCap
    if (accountCapStr === '') {
      const getAccoutCapResult = this.createAccountCap(sdk.senderAddress, sdk.sdkOptions, tx)
      const cap = getAccoutCapResult[0] as TransactionArgument
      tx = getAccoutCapResult[1] as Transaction
      accountCap = cap
    } else {
      accountCap = tx.object(accountCapStr)
    }

    const allCoins = await sdk.getOwnerCoinAssets(sdk.senderAddress)
    const primaryBaseInput = TransactionUtil.buildCoinForAmount(tx, allCoins, BigInt(amount), baseCoin, false)
    const baseAsset = primaryBaseInput?.targetCoin

    const primaryQuoteInput = TransactionUtil.buildCoinForAmount(tx, allCoins, BigInt(amount), quoteCoin, false)
    const quoteAsset = primaryQuoteInput?.targetCoin

    const typeArguments = [baseCoin, quoteCoin]
    const args: any = [
      tx.object(poolID),
      accountCap,
      tx.pure.u64(amount),
      tx.pure.u64(0),
      tx.pure.bool(a2b),
      baseAsset,
      quoteAsset,
      tx.object(CLOCK_ADDRESS),
    ]

    tx.moveCall({
      target: `${deepbook_endpoint_v2.published_at}::${DeepbookEndpointsV2Moudle}::swap`,
      arguments: args,
      typeArguments,
    })

    const { simulationAccount } = sdk.sdkOptions
    const simulateRes = await sdk.fullClient.devInspectTransactionBlock({
      transactionBlock: tx,
      sender: simulationAccount.address,
    })

    const valueData: any = simulateRes.events?.filter((item: any) => {
      return extractStructTagFromType(item.type).name === `DeepbookSwapEvent`
    })
    if (valueData.length === 0) {
      return null
    }
    const params: any = valueData[0].parsedJson
    return {
      poolAddress: params.pool,
      estimatedAmountIn: params.amount_in,
      estimatedAmountOut: params.amount_out,
      aToB: params.atob,
    }
  }
}
