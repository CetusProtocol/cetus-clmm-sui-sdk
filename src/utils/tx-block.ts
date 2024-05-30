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
    const coins = tx.splitCoins(tx.gas, amounts)
    recipients.forEach((recipient, index) => {
      tx.transferObjects([coins[index]], recipient)
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

    const spitAmount = tx.splitCoins(primaryCoinAInput, [amount])
    tx.transferObjects([spitAmount], recipient)
    return this
  }

  /**
   * Transfer objects to many recipients.
   * @param {SuiTxArg[]}objects The objects to be transferred.
   * @param {string}recipient The recipient address.
   * @returns
   */
  transferObjects(objects: (TransactionObjectArgument | string)[], recipient: string) {
    if (!checkInvalidSuiAddress(recipient) === false) {
      throw new ClmmpoolsError('Invalid recipient address', UtilsErrorCode.InvalidRecipientAddress)
    }

    this.txBlock.transferObjects(objects, recipient)
    return this
  }

  /**
   * @description Move call
   * @param {string}target `${string}::${string}::${string}`, e.g. `0x3::sui_system::request_add_stake`
   * @param {string[]}typeArguments the type arguments of the move call, such as `['0x2::sui::SUI']`
   * @param {any[]}args the arguments of the move call, such as `['0x1', '0x2']`
   * @returns {TransactionResult}
   */
  moveCall(target: string, typeArguments: string[] = [], args: any[] = []): TransactionResult {
    // a regex for pattern `${string}::${string}::${string}`
    const regex = /(?<package>[a-zA-Z0-9]+)::(?<module>[a-zA-Z0-9_]+)::(?<function>[a-zA-Z0-9_]+)/
    const match = target.match(regex)
    if (match === null)
      throw new ClmmpoolsError('Invalid target format. Expected `${string}::${string}::${string}`', UtilsErrorCode.InvalidTarget)
    const convertedArgs = this.convertArgs(args)
    const tx = this.txBlock
    return tx.moveCall({
      target: target as `${string}::${string}::${string}`,
      arguments: convertedArgs,
      typeArguments,
    })
  }

  /**
   * Create pure address arguments
   * @param {string}value
   * @returns
   */
  address(value: string) {
    return this.txBlock.pure.address(value)
  }

  /**
   * Create pure arguments
   * @param {any}value
   * @returns
   */
  pure(value: any) {
    return this.txBlock.pure(value)
  }

  /**
   * Create object arguments
   * @param {string}value
   * @returns
   */
  object(value: string) {
    return this.txBlock.object(value)
  }

  /**
   * Create move vec arguments
   * @param {number}gasBudget
   * @returns
   */
  setGasBudget(gasBudget: number) {
    this.txBlock.setGasBudget(gasBudget)
  }

  /**
   * Since we know the elements in the array are the same type
   * If type is not provided, we will try to infer the type from the first element
   * By default,
   *
   * string starting with `0x` =====> object id
   * number, bigint ====> u64
   * boolean =====> bool
   *
   *
   * If type is provided, we will use the type to convert the array
   * @param args
   * @param type 'address' | 'bool' | 'u8' | 'u16' | 'u32' | 'u64' | 'u128' | 'u256' | 'object'
   */
  makeMoveVec(args: SuiTxArg[], type: SuiInputTypes = getDefaultSuiInputType(args[0])) {
    if (args.length === 0)
      throw new ClmmpoolsError('Transaction builder error: Empty array is not allowed', UtilsErrorCode.InvalidTransactionBuilder)
    if (type === 'object' && args.some((arg) => typeof arg !== 'string')) {
      throw new ClmmpoolsError('Transaction builder error: Object id must be string', UtilsErrorCode.InvalidTransactionBuilder)
    }
    if (type === 'object') {
      return this.txBlock.makeMoveVec({
        elements: args.map((arg) => this.txBlock.object(normalizeSuiObjectId(arg as string))),
      })
    }
    return this.txBlock.makeMoveVec({
      type,
      elements: args.map((arg) => this.txBlock.pure[type](arg as never)),
    })
  }

  private convertArgs(args: any[]): TransactionArgument[] | TransactionObjectArgument[] {
    return args.map((arg) => {
      // We always treat string starting with `0x` as object id
      if (typeof arg === 'string' && arg.startsWith('0x')) {
        return this.txBlock.object(normalizeSuiObjectId(arg))
        // Other basic types such as string, number, boolean are converted to pure value
      }
      if (typeof arg !== 'object') {
        return this.txBlock.pure(arg)
        // if it's an array, we will convert it to move vec
      }
      if (Array.isArray(arg)) {
        return this.makeMoveVec(arg)
      }
      // We do nothing, because it's most likely already a move value
      return arg
    })
  }
}
