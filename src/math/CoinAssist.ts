// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { ObjectId, SuiMoveObject, SuiTransactionBlockResponse } from '@mysten/sui.js'
import { FaucetCoin, CoinAsset } from '../modules/resourcesModule'
import { extractStructTagFromType } from '../utils/contracts'
import { SuiAddressType } from '../types/sui'
// import BN from 'bn.js'

const COIN_TYPE = '0x2::coin::Coin'
const COIN_TYPE_ARG_REGEX = /^0x2::coin::Coin<(.+)>$/
export const DEFAULT_GAS_BUDGET_FOR_SPLIT = 1000
export const DEFAULT_GAS_BUDGET_FOR_MERGE = 500
export const DEFAULT_GAS_BUDGET_FOR_TRANSFER = 100
export const DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI = 100
export const DEFAULT_GAS_BUDGET_FOR_STAKE = 1000
export const GAS_TYPE_ARG = '0x2::sui::SUI'
export const GAS_SYMBOL = 'SUI'
export const DEFAULT_NFT_TRANSFER_GAS_FEE = 450
export const SUI_SYSTEM_STATE_OBJECT_ID = '0x0000000000000000000000000000000000000005'

export class CoinAssist {
  public static getCoinTypeArg(obj: SuiMoveObject) {
    const res = obj.type.match(COIN_TYPE_ARG_REGEX)
    return res ? res[1] : null
  }

  public static isSUI(obj: SuiMoveObject) {
    const arg = CoinAssist.getCoinTypeArg(obj)
    return arg ? CoinAssist.getCoinSymbol(arg) === 'SUI' : false
  }

  public static getCoinSymbol(coinTypeArg: string) {
    return coinTypeArg.substring(coinTypeArg.lastIndexOf(':') + 1)
  }

  public static getBalance(obj: SuiMoveObject): bigint {
    return BigInt(obj.fields.balance)
  }

  public static totalBalance(objs: CoinAsset[], coinAddress: SuiAddressType): bigint {
    let balanceTotal = BigInt(0)
    objs.forEach((obj) => {
      if (coinAddress === obj.coinAddress) {
        balanceTotal += BigInt(obj.balance)
      }
    })
    return balanceTotal
  }

  public static getID(obj: SuiMoveObject): ObjectId {
    return obj.fields.id.id
  }

  public static getCoinTypeFromArg(coinTypeArg: string) {
    return `${COIN_TYPE}<${coinTypeArg}>`
  }

  public static getFaucetCoins(suiTransactionResponse: SuiTransactionBlockResponse): FaucetCoin[] {
    const { events } = suiTransactionResponse
    const faucetCoin: FaucetCoin[] = []
    console.log('events:', events)

    events?.forEach((item: any) => {
      const { type } = item
      if (extractStructTagFromType(type).name === 'InitEvent') {
        const fields = item.parsedJson as any
        faucetCoin.push({
          transactionModule: item.transactionModule,
          suplyID: fields.suplyID,
          decimals: fields.decimals,
        })
      }
    })
    return faucetCoin
  }

  public static getCoinAssets(coinType: string, allSuiObjects: CoinAsset[]): CoinAsset[] {
    const coins: CoinAsset[] = []
    allSuiObjects.forEach((anObj) => {
      if (anObj.coinAddress === coinType) {
        coins.push(anObj)
      }
    })
    return coins
  }

  public static isSuiCoin(coinAddress: SuiAddressType) {
    return extractStructTagFromType(coinAddress).full_address === GAS_TYPE_ARG
  }

  static selectCoinObjectIdGreaterThanOrEqual(coins: CoinAsset[], amount: bigint, exclude: ObjectId[] = []): ObjectId[] {
    return CoinAssist.selectCoinAssetGreaterThanOrEqual(coins, amount, exclude).map((item) => item.coinObjectId)
  }

  static selectCoinAssetGreaterThanOrEqual(coins: CoinAsset[], amount: bigint, exclude: ObjectId[] = []): CoinAsset[] {
    const sortedCoins = CoinAssist.sortByBalance(coins.filter((c) => !exclude.includes(c.coinObjectId)))

    const total = CoinAssist.calculateTotalBalance(sortedCoins)

    // return empty set if the aggregate balance of all coins is smaller than amount
    if (total < amount) {
      return []
    }
    if (total === amount) {
      return sortedCoins
    }

    let sum = BigInt(0)
    const ret = []
    while (sum < total) {
      // prefer to add a coin with smallest sufficient balance
      const target = amount - sum
      const coinWithSmallestSufficientBalance = sortedCoins.find((c) => c.balance >= target)
      if (coinWithSmallestSufficientBalance) {
        ret.push(coinWithSmallestSufficientBalance)
        break
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const coinWithLargestBalance = sortedCoins.pop()!
      if (coinWithLargestBalance.balance > 0) {
        ret.push(coinWithLargestBalance)
        sum += coinWithLargestBalance.balance
      }
    }
    return CoinAssist.sortByBalance(ret)
  }

  /**
   * Sort coin by balance in an ascending order
   */
  static sortByBalance(coins: CoinAsset[]): CoinAsset[] {
    // eslint-disable-next-line no-nested-ternary
    return coins.sort((a, b) => (a.balance < b.balance ? -1 : a.balance > b.balance ? 1 : 0))
  }

  static sortByBalanceDes(coins: CoinAsset[]): CoinAsset[] {
    // eslint-disable-next-line no-nested-ternary
    return coins.sort((a, b) => (a.balance > b.balance ? -1 : a.balance < b.balance ? 0 : 1))
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures
  static calculateTotalBalance(coins: CoinAsset[]): bigint {
    return coins.reduce((partialSum, c) => partialSum + c.balance, BigInt(0))
  }
}
