import { normalizeSuiObjectId } from '@mysten/sui/utils'
import { TransactionArgument, Transaction, TransactionObjectArgument, TransactionResult } from '@mysten/sui/transactions'
import { getDefaultSuiInputType, SuiInputTypes, SuiTxArg } from '../types/sui'
import { ClmmpoolsError, UtilsErrorCode } from '../errors/errors'

/**
 * Check if the address is a valid sui address.
 * @param {string}address
 * @returns
 */
export function checkInvalidSuiAddress(address: string): boolean {
  if (!address.startsWith('0x') || address.length !== 66) {
    return false
  }
  return true
}
export class TxBlock {
  public txBlock: Transaction

  constructor() {
    this.txBlock = new Transaction()
  }

  /**
   * Transfer sui to many recipoents.
   * @param {string[]}recipients The recipient addresses.
   * @param {number[]}amounts The amounts of sui coins to be transferred.
   * @returns this
   */
  transferSuiToMany(recipients: string[], amounts: number[]) {
    if (recipients.length !== amounts.length) {
      throw new ClmmpoolsError('The length of recipients and amounts must be the same', UtilsErrorCode.InvalidRecipientAndAmountLength)
    }

    for (const recipient of recipients) {
      if (!checkInvalidSuiAddress(recipient) === false) {
        throw new ClmmpoolsError('Invalid recipient address', UtilsErrorCode.InvalidRecipientAddress)
      }
    }

    const tx = this.txBlock
    const coins = tx.splitCoins(
      tx.gas,
      amounts.map((amount) => tx.pure.u64(amount))
    )
    recipients.forEach((recipient, index) => {
      tx.transferObjects([coins[index]], tx.pure.address(recipient))
    })
    return this
  }

  /**
   * Transfer sui to one recipient.
   * @param {string}recipient recipient cannot be empty or invalid sui address.
   * @param {number}amount
   * @returns this
   */
  transferSui(recipient: string, amount: number) {
    if (!checkInvalidSuiAddress(recipient) === false) {
      throw new ClmmpoolsError('Invalid recipient address', UtilsErrorCode.InvalidRecipientAddress)
    }

    return this.transferSuiToMany([recipient], [amount])
  }

  /**
   * Transfer coin to many recipients.
   * @param {string}recipient recipient cannot be empty or invalid sui address.
   * @param {number}amount amount cannot be empty or invalid sui address.
   * @param {string[]}coinObjectIds object ids of coins to be transferred.
   * @returns this
   * @deprecated use transferAndDestoryZeroCoin instead
   */
  transferCoin(recipient: string, amount: number, coinObjectIds: string[]) {
    if (!checkInvalidSuiAddress(recipient) === false) {
      throw new ClmmpoolsError('Invalid recipient address', UtilsErrorCode.InvalidRecipientAddress)
    }

    const tx = this.txBlock
    const [primaryCoinA, ...mergeCoinAs] = coinObjectIds
    const primaryCoinAInput = tx.object(primaryCoinA)

    if (mergeCoinAs.length > 0) {
      tx.mergeCoins(
        primaryCoinAInput,
        mergeCoinAs.map((coin) => tx.object(coin))
      )
    }

    const spitAmount = tx.splitCoins(primaryCoinAInput, [tx.pure.u64(amount)])
    tx.transferObjects([spitAmount], tx.pure.address(recipient))
    return this
  }
}
