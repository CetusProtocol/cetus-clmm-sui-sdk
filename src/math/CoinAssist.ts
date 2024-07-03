import { SuiMoveObject, SuiTransactionBlockResponse } from '@mysten/sui/client'
import { CoinAsset, FaucetCoin } from '../types'
import { extractStructTagFromType, normalizeCoinType } from '../utils/contracts'
import { SuiAddressType } from '../types/sui'

const COIN_TYPE = '0x2::coin::Coin'
const COIN_TYPE_ARG_REGEX = /^0x2::coin::Coin<(.+)>$/
export const DEFAULT_GAS_BUDGET_FOR_SPLIT = 1000
export const DEFAULT_GAS_BUDGET_FOR_MERGE = 500
export const DEFAULT_GAS_BUDGET_FOR_TRANSFER = 100
export const DEFAULT_GAS_BUDGET_FOR_TRANSFER_SUI = 100
export const DEFAULT_GAS_BUDGET_FOR_STAKE = 1000
export const GAS_TYPE_ARG = '0x2::sui::SUI'
export const GAS_TYPE_ARG_LONG = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
export const GAS_SYMBOL = 'SUI'
export const DEFAULT_NFT_TRANSFER_GAS_FEE = 450
export const SUI_SYSTEM_STATE_OBJECT_ID = '0x0000000000000000000000000000000000000005'
/**
 * This class provides helper methods for working with coins.
 */
export class CoinAssist {
  /**
   * Get the coin type argument from a SuiMoveObject.
   *
   * @param obj The SuiMoveObject to get the coin type argument from.
   * @returns The coin type argument, or null if it is not found.
   */
  public static getCoinTypeArg(obj: SuiMoveObject) {
    const res = obj.type.match(COIN_TYPE_ARG_REGEX)
    return res ? res[1] : null
  }

  /**
   * Get whether a SuiMoveObject is a SUI coin.
   *
   * @param obj The SuiMoveObject to check.
   * @returns Whether the SuiMoveObject is a SUI coin.
   */
  public static isSUI(obj: SuiMoveObject) {
    const arg = CoinAssist.getCoinTypeArg(obj)
    return arg ? CoinAssist.getCoinSymbol(arg) === 'SUI' : false
  }

  /**
   * Get the coin symbol from a coin type argument.
   *
   * @param coinTypeArg The coin type argument to get the symbol from.
   * @returns The coin symbol.
   */
  public static getCoinSymbol(coinTypeArg: string) {
    return coinTypeArg.substring(coinTypeArg.lastIndexOf(':') + 1)
  }

  /**
   * Get the balance of a SuiMoveObject.
   *
   * @param obj The SuiMoveObject to get the balance from.
   * @returns The balance of the SuiMoveObject.
   */
  public static getBalance(obj: SuiMoveObject): bigint {
    return BigInt((obj.fields as any).balance)
  }

  /**
   * Get the total balance of a list of CoinAsset objects for a given coin address.
   *
   * @param objs The list of CoinAsset objects to get the total balance for.
   * @param coinAddress The coin address to get the total balance for.
   * @returns The total balance of the CoinAsset objects for the given coin address.
   */
  public static totalBalance(objs: CoinAsset[], coinAddress: SuiAddressType): bigint {
    let balanceTotal = BigInt(0)
    objs.forEach((obj) => {
      if (coinAddress === obj.coinAddress) {
        balanceTotal += BigInt(obj.balance)
      }
    })
    return balanceTotal
  }

  /**
   * Get the ID of a SuiMoveObject.
   *
   * @param obj The SuiMoveObject to get the ID from.
   * @returns The ID of the SuiMoveObject.
   */
  public static getID(obj: SuiMoveObject): string {
    return (obj.fields as any).id.id
  }

  /**
   * Get the coin type from a coin type argument.
   *
   * @param coinTypeArg The coin type argument to get the coin type from.
   * @returns The coin type.
   */
  public static getCoinTypeFromArg(coinTypeArg: string) {
    return `${COIN_TYPE}<${coinTypeArg}>`
  }

  /**
   * Get the FaucetCoin objects from a SuiTransactionBlockResponse.
   *
   * @param suiTransactionResponse The SuiTransactionBlockResponse to get the FaucetCoin objects from.
   * @returns The FaucetCoin objects.
   */
  public static getFaucetCoins(suiTransactionResponse: SuiTransactionBlockResponse): FaucetCoin[] {
    const { events } = suiTransactionResponse
    const faucetCoin: FaucetCoin[] = []

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

  /**
   * Get the CoinAsset objects for a given coin type.
   *
   * @param coinType The coin type to get the CoinAsset objects for.
   * @param allSuiObjects The list of all SuiMoveObjects.
   * @returns The CoinAsset objects for the given coin type.
   */
  public static getCoinAssets(coinType: string, allSuiObjects: CoinAsset[]): CoinAsset[] {
    const coins: CoinAsset[] = []
    allSuiObjects.forEach((anObj) => {
      if (normalizeCoinType(anObj.coinAddress) === normalizeCoinType(coinType)) {
        coins.push(anObj)
      }
    })
    return coins
  }

  /**
   * Get whether a coin address is a SUI coin.
   *
   * @param coinAddress The coin address to check.
   * @returns Whether the coin address is a SUI coin.
   */
  public static isSuiCoin(coinAddress: SuiAddressType) {
    return extractStructTagFromType(coinAddress).full_address === GAS_TYPE_ARG
  }

  /**
   * Select the CoinAsset objects from a list of CoinAsset objects that have a balance greater than or equal to a given amount.
   *
   * @param coins The list of CoinAsset objects to select from.
   * @param amount The amount to select CoinAsset objects with a balance greater than or equal to.
   * @param exclude A list of CoinAsset objects to exclude from the selection.
   * @returns The CoinAsset objects that have a balance greater than or equal to the given amount.
   */
  static selectCoinObjectIdGreaterThanOrEqual(
    coins: CoinAsset[],
    amount: bigint,
    exclude: string[] = []
  ): { objectArray: string[]; remainCoins: CoinAsset[]; amountArray: string[] } {
    const selectedResult = CoinAssist.selectCoinAssetGreaterThanOrEqual(coins, amount, exclude)
    const objectArray = selectedResult.selectedCoins.map((item) => item.coinObjectId)
    const remainCoins = selectedResult.remainingCoins
    const amountArray = selectedResult.selectedCoins.map((item) => item.balance.toString())
    return { objectArray, remainCoins, amountArray }
  }

  /**
   * Select the CoinAsset objects from a list of CoinAsset objects that have a balance greater than or equal to a given amount.
   *
   * @param coins The list of CoinAsset objects to select from.
   * @param amount The amount to select CoinAsset objects with a balance greater than or equal to.
   * @param exclude A list of CoinAsset objects to exclude from the selection.
   * @returns The CoinAsset objects that have a balance greater than or equal to the given amount.
   */
  static selectCoinAssetGreaterThanOrEqual(
    coins: CoinAsset[],
    amount: bigint,
    exclude: string[] = []
  ): { selectedCoins: CoinAsset[]; remainingCoins: CoinAsset[] } {
    const sortedCoins = CoinAssist.sortByBalance(coins.filter((c) => !exclude.includes(c.coinObjectId)))

    const total = CoinAssist.calculateTotalBalance(sortedCoins)

    if (total < amount) {
      return { selectedCoins: [], remainingCoins: sortedCoins }
    }
    if (total === amount) {
      return { selectedCoins: sortedCoins, remainingCoins: [] }
    }

    let sum = BigInt(0)
    const selectedCoins = []
    const remainingCoins = [...sortedCoins]
    while (sum < total) {
      const target = amount - sum
      const coinWithSmallestSufficientBalanceIndex = remainingCoins.findIndex((c) => c.balance >= target)
      if (coinWithSmallestSufficientBalanceIndex !== -1) {
        selectedCoins.push(remainingCoins[coinWithSmallestSufficientBalanceIndex])
        remainingCoins.splice(coinWithSmallestSufficientBalanceIndex, 1)
        break
      }

      const coinWithLargestBalance = remainingCoins.pop()!
      if (coinWithLargestBalance.balance > 0) {
        selectedCoins.push(coinWithLargestBalance)
        sum += coinWithLargestBalance.balance
      }
    }
    return { selectedCoins: CoinAssist.sortByBalance(selectedCoins), remainingCoins: CoinAssist.sortByBalance(remainingCoins) }
  }

  /**
   * Sort the CoinAsset objects by their balance.
   *
   * @param coins The CoinAsset objects to sort.
   * @returns The sorted CoinAsset objects.
   */
  static sortByBalance(coins: CoinAsset[]): CoinAsset[] {
    return coins.sort((a, b) => (a.balance < b.balance ? -1 : a.balance > b.balance ? 1 : 0))
  }

  static sortByBalanceDes(coins: CoinAsset[]): CoinAsset[] {
    return coins.sort((a, b) => (a.balance > b.balance ? -1 : a.balance < b.balance ? 0 : 1))
  }

  /**
   * Calculate the total balance of a list of CoinAsset objects.
   *
   * @param coins The list of CoinAsset objects to calculate the total balance for.
   * @returns The total balance of the CoinAsset objects.
   */
  static calculateTotalBalance(coins: CoinAsset[]): bigint {
    return coins.reduce((partialSum, c) => partialSum + c.balance, BigInt(0))
  }
}
