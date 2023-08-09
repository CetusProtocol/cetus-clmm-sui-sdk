import { normalizeSuiObjectId } from '@mysten/sui.js/utils'
import { TransactionArgument, TransactionBlock } from '@mysten/sui.js/transactions'
import { getDefaultSuiInputType, SuiInputTypes, SuiTxArg } from '../types/sui'

export class TxBlock {
  public txBlock: TransactionBlock

  constructor() {
    this.txBlock = new TransactionBlock()
  }

  transferSuiToMany(recipients: string[], amounts: number[]) {
    const tx = this.txBlock
    const coins = tx.splitCoins(
      tx.gas,
      amounts.map((amount) => tx.pure(amount))
    )
    recipients.forEach((recipient, index) => {
      tx.transferObjects([coins[index]], tx.pure(recipient))
    })
    return this
  }

  transferSui(recipient: string, amount: number) {
    return this.transferSuiToMany([recipient], [amount])
  }

  transferCoin(recipient: string, amount: number, coinObjectIds: string[]) {
    const tx = this.txBlock
    const [primaryCoinA, ...mergeCoinAs] = coinObjectIds
    const primaryCoinAInput = tx.object(primaryCoinA)

    if (mergeCoinAs.length > 0) {
      tx.mergeCoins(
        primaryCoinAInput,
        mergeCoinAs.map((coin) => tx.object(coin))
      )
    }

    const spitAmount = tx.splitCoins(primaryCoinAInput, [tx.pure(amount)])
    tx.transferObjects([spitAmount], tx.pure(recipient))
    return this
  }

  transferObjects(objects: SuiTxArg[], recipient: string) {
    const tx = this.txBlock
    tx.transferObjects(this.convertArgs(objects), tx.pure(recipient))
    return this
  }

  /**
   * @description Move call
   * @param target `${string}::${string}::${string}`, e.g. `0x3::sui_system::request_add_stake`
   * @param args the arguments of the move call, such as `['0x1', '0x2']`
   * @param typeArguments the type arguments of the move call, such as `['0x2::sui::SUI']`
   */
  moveCall(target: string, typeArguments: string[] = [], args: any[] = []) {
    // a regex for pattern `${string}::${string}::${string}`
    const regex = /(?<package>[a-zA-Z0-9]+)::(?<module>[a-zA-Z0-9_]+)::(?<function>[a-zA-Z0-9_]+)/
    const match = target.match(regex)
    if (match === null) throw new Error('Invalid target format. Expected `${string}::${string}::${string}`')
    const convertedArgs = this.convertArgs(args)
    const tx = this.txBlock
    return tx.moveCall({
      target: target as `${string}::${string}::${string}`,
      arguments: convertedArgs,
      typeArguments,
    })
  }

  address(value: string) {
    return this.txBlock.pure(value)
  }

  pure(value: any) {
    return this.txBlock.pure(value)
  }

  object(value: string) {
    return this.txBlock.object(value)
  }

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
  makeMoveVec(args: SuiTxArg[], type?: SuiInputTypes) {
    if (args.length === 0) throw new Error('Transaction builder error: Empty array is not allowed')
    if (type === 'object' && args.some((arg) => typeof arg !== 'string')) {
      throw new Error('Transaction builder error: Object id must be string')
    }
    const defaultSuiType = getDefaultSuiInputType(args[0])
    if (type === 'object' || defaultSuiType === 'object') {
      return this.txBlock.makeMoveVec({
        objects: args.map((arg) => this.txBlock.object(normalizeSuiObjectId(arg as string))),
      })
    }
    return this.txBlock.makeMoveVec({
      objects: args.map((arg) => this.txBlock.pure(arg)),
    })
  }

  private convertArgs(args: any[]): TransactionArgument[] {
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
