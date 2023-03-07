// Copyright (c) 2022, Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import {
  Coin,
  GetObjectDataResponse,
  getTransactionEffects,
  isValidSuiObjectId,
  SuiExecuteTransactionResponse,
  SuiTransactionResponse,
  TransactionEffects,
} from '@mysten/sui.js'

import type { ObjectId, SuiObject, SuiMoveObject, RawSigner, SuiAddress } from '@mysten/sui.js'
import { SDK } from '../sdk'
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

  public static getFaucetCoins(suiTransactionResponse: SuiTransactionResponse): FaucetCoin[] {
    const { events } = suiTransactionResponse.effects
    const faucetCoin: FaucetCoin[] = []
    events?.forEach((item) => {
      if ('moveEvent' in item) {
        const { type } = item.moveEvent
        if (extractStructTagFromType(type).name === 'InitEvent') {
          const fields = item.moveEvent.fields as any
          faucetCoin.push({
            transactionModule: item.moveEvent.transactionModule,
            address: fields.address,
            suplyID: fields.suplyID,
            decimals: fields.decimals,
          })
        }
      }
    })
    faucetCoin.forEach((coin) => {
      events?.forEach((item) => {
        if ('moveEvent' in item) {
          const { type } = item.moveEvent
          const struct = extractStructTagFromType(type)
          if (struct.name === 'CurrencyCreated' && coin.transactionModule === item.moveEvent.transactionModule) {
            const { fields } = item.moveEvent as any
            // eslint-disable-next-line prefer-destructuring
            coin.address = struct.type_arguments[0]
            coin.decimals = fields.decimals
          }
        }
      })
    })
    return faucetCoin
  }

  /**
   * Transfer `amount` of Coin<T> to `recipient`.
   *
   * @param signer A signer with connection to the gateway:e.g., new RawSigner(keypair, new JsonRpcProvider(endpoint))
   * @param coins A list of Coins owned by the signer with the same generic type(e.g., 0x2::Sui::Sui)
   * @param amount The amount to be transfer
   * @param recipient The sui address of the recipient
   */
  public static async transferCoin(
    signer: RawSigner,
    coins: SuiMoveObject[],
    amount: bigint,
    recipient: SuiAddress,
    sdk: SDK
  ): Promise<SuiExecuteTransactionResponse> {
    const coin = await CoinAssist.selectCoin(signer, coins, amount, sdk)
    return signer.transferObject({
      objectId: coin,
      gasBudget: DEFAULT_GAS_BUDGET_FOR_TRANSFER,
      recipient,
    })
  }

  /**
   * Transfer `amount` of Coin<Sui> to `recipient`.
   *
   * @param signer A signer with connection to the gateway:e.g., new RawSigner(keypair, new JsonRpcProvider(endpoint))
   * @param coins A list of Sui Coins owned by the signer
   * @param amount The amount to be transferred
   * @param recipient The sui address of the recipient
   */
  public static async transferSui(
    signer: RawSigner,
    coins: SuiMoveObject[],
    amount: bigint,
    recipient: SuiAddress,
    sdk: SDK
  ): Promise<SuiExecuteTransactionResponse> {
    const coin = await CoinAssist.prepareCoinWithEnoughBalance(signer, coins, amount + BigInt(DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI), sdk)
    return signer.transferSui({
      suiObjectId: CoinAssist.getID(coin),
      gasBudget: DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI,
      recipient,
      amount: Number(amount),
    })
  }

  public static getSuiMoveObjects(coinTypeArg: string, allSuiObjects: SuiObject[]): SuiMoveObject[] {
    const coinType = CoinAssist.getCoinTypeFromArg(coinTypeArg)
    const coins: SuiMoveObject[] = []
    allSuiObjects.forEach((anObj) => {
      // console.log('getSuiMoveObjects: 2---', anObj)
      if ('type' in anObj.data) {
        if (anObj.data.type === coinType) {
          coins.push(anObj.data)
        }
      }
    })
    return coins
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

  public static async selectCoinAssets(signer: RawSigner, coins: CoinAsset[], amount: bigint, sdk: SDK): Promise<ObjectId[]> {
    if (coins.length === 0) {
      throw new Error(`Insufficient balance`)
    }
    if (CoinAssist.isSuiCoin(coins[0].coinAddress)) {
      return [await CoinAssist.selectCoinAsset(signer, coins, amount, sdk)]
    }
    return CoinAssist.selectCoinObjectIdGreaterThanOrEqual(coins, amount)
  }

  private static isSuiCoin(coinAddress: SuiAddressType) {
    return extractStructTagFromType(coinAddress).name === 'SUI'
  }

  public static async selectCoinAsset(signer: RawSigner, coins: CoinAsset[], amount: bigint, sdk: SDK): Promise<ObjectId> {
    const coin = await CoinAssist.prepareCoinAssetWithEnoughBalance(signer, coins, amount, sdk)
    const coinID = coin.coinObjectId
    const { balance } = coin
    if (balance === amount) {
      return coinID
    }
    if (balance > amount) {
      await signer.splitCoin({
        coinObjectId: coinID,
        gasBudget: DEFAULT_GAS_BUDGET_FOR_SPLIT,
        splitAmounts: [Number(balance - amount)],
      })
      return coinID
    }
    throw new Error(`Insufficient balance`)
  }

  public static async selectCoin(signer: RawSigner, coins: SuiMoveObject[], amount: bigint, sdk: SDK): Promise<ObjectId> {
    const coin = await CoinAssist.prepareCoinWithEnoughBalance(signer, coins, amount, sdk)
    const coinID = CoinAssist.getID(coin)
    const balance = CoinAssist.getBalance(coin)
    if (balance === amount) {
      return coinID
    }
    if (balance > amount) {
      await signer.splitCoin({
        coinObjectId: coinID,
        gasBudget: DEFAULT_GAS_BUDGET_FOR_SPLIT,
        splitAmounts: [Number(balance - amount)],
      })
      return coinID
    }
    throw new Error(`Insufficient balance`)
  }

  private static async prepareCoinWithEnoughBalance(
    signer: RawSigner,
    coins: SuiMoveObject[],
    amount: bigint,
    sdk: SDK
  ): Promise<SuiMoveObject> {
    // Sort coins by balance in an ascending order
    coins.sort((a, b) => (CoinAssist.getBalance(a) - CoinAssist.getBalance(b) > 0 ? 1 : -1))

    // return the coin with the smallest balance that is greater than or equal to the amount
    const coinWithSufficientBalance = coins.find((c) => CoinAssist.getBalance(c) >= amount)
    if (coinWithSufficientBalance) {
      return coinWithSufficientBalance
    }

    // merge coins to have a coin with sufficient balance
    // we will start from the coins with the largest balance
    // and end with the coin with the second smallest balance(i.e., i > 0 instead of i >= 0)
    // we cannot merge coins with the smallest balance because we
    // need to have a separate coin to pay for the gas
    // TODO: there's some edge cases here. e.g., the total balance is enough before spliting/merging
    // but not enough if we consider the cost of splitting and merging.
    const primaryCoin = coins[coins.length - 1]
    for (let i = coins.length - 2; i > 0; i -= 1) {
      // eslint-disable-next-line no-await-in-loop
      const mergeTxn = await signer.mergeCoin({
        primaryCoin: CoinAssist.getID(primaryCoin),
        coinToMerge: CoinAssist.getID(coins[i]),
        gasBudget: DEFAULT_GAS_BUDGET_FOR_MERGE,
      })

      // eslint-disable-next-line no-await-in-loop
      const objects = (await sdk.fullClient.getObject(CoinAssist.getID(primaryCoin))) as GetObjectDataResponse
      // const mergeAmount = Coin.getBalance(objects)?.toNumber() as number
      const mergeAmount = Number(Coin.getBalance(objects)?.toString())
      if (mergeAmount >= amount) {
        return primaryCoin
      }
    }
    // primary coin might have a balance smaller than the `amount`
    return primaryCoin
  }

  private static async prepareCoinAssetWithEnoughBalance(
    signer: RawSigner,
    coins: CoinAsset[],
    amount: bigint,
    sdk: SDK
  ): Promise<CoinAsset> {
    const isSuiCoin = CoinAssist.isSuiCoin(coins[0].coinAddress)
    // Sort coins by balance in an ascending order
    coins.sort((a, b) => (a.balance - b.balance > 0 ? 1 : -1))

    // return the coin with the smallest balance that is greater than or equal to the amount
    const coinWithSufficientBalance = coins.find((c) => c.balance >= amount)
    if (coinWithSufficientBalance) {
      return coinWithSufficientBalance
    }

    const mergeCoins = CoinAssist.selectCoinAssetGreaterThanOrEqual(coins, amount)
    const mergeCoinIds = mergeCoins.map((item) => item.coinObjectId)
    if (isSuiCoin) {
      await signer.payAllSui({
        inputCoins: mergeCoinIds,
        recipient: await signer.getAddress(),
        gasBudget: 1000,
      })
      return mergeCoins[0]
    }
    const payResult = (await signer.pay({
      inputCoins: mergeCoinIds,
      recipients: [await signer.getAddress()],
      amounts: [Number(amount)],
      gasBudget: 1000,
    })) as SuiExecuteTransactionResponse

    const transactionEffects = getTransactionEffects(payResult)
    if (transactionEffects !== undefined && transactionEffects.created !== undefined) {
      const mergObjectId = transactionEffects.created[0].reference.objectId
      const objects = (await sdk.fullClient.getObject(mergObjectId)) as GetObjectDataResponse
      const mergeAmount = Number(Coin.getBalance(objects)?.toString())

      return {
        coinAddress: '',
        coinObjectId: mergObjectId,
        balance: BigInt(mergeAmount),
      }
    }

    throw new Error(`prepareCoinAssetWithEnoughBalance fail #{mergeCoinIds} `)
  }

  static selectCoinObjectIdGreaterThanOrEqual(coins: CoinAsset[], amount: bigint, exclude: ObjectId[] = []): ObjectId[] {
    return CoinAssist.selectCoinAssetGreaterThanOrEqual(coins, amount, exclude).map((item) => item.coinObjectId)
  }

  static selectCoinAssetGreaterThanOrEqual(coins: CoinAsset[], amount: bigint, exclude: ObjectId[] = []): CoinAsset[] {
    const sortedCoins = CoinAssist.sortByBalanceDes(coins.filter((c) => !exclude.includes(c.coinObjectId)))

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

      ret.push(coinWithLargestBalance)
      sum += coinWithLargestBalance.balance
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
