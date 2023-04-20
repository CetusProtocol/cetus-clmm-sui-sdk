/* eslint-disable camelcase */
/* eslint-disable no-nested-ternary */
import {
  getTransactionEffects,
  JsonRpcProvider,
  RawSigner,
  TransactionArgument,
  TransactionBlock,
  TransactionEffects,
} from '@mysten/sui.js'
import BN from 'bn.js'
import { SwapParams } from '../modules/swapModule'
import { TickData } from '../types/clmmpool'
import { ClmmIntegrateModule, CLOCK_ADDRESS } from '../types/sui'
import { CoinAsset, CoinPairType, Pool } from '../modules/resourcesModule'
import { CoinAssist } from '../math/CoinAssist'
import { AddLiquidityFixTokenParams, AddLiquidityParams } from '../modules/positionModule'
import SDK, { adjustForSlippage, asUintN, ClmmPoolUtil, Percentage, SdkOptions, SwapUtils } from '../index'

export function findAdjustCoin(coinPair: CoinPairType): { isAdjustCoinA: boolean; isAdjustCoinB: boolean } {
  const isAdjustCoinA = CoinAssist.isSuiCoin(coinPair.coinTypeA)
  const isAdjustCoinB = CoinAssist.isSuiCoin(coinPair.coinTypeB)
  return { isAdjustCoinA, isAdjustCoinB }
}

export async function sendTransaction(
  signer: RawSigner,
  tx: TransactionBlock,
  onlyCalculateGas = false
): Promise<TransactionEffects | undefined> {
  try {
    console.log('gasConfig: ', tx.blockData.gasConfig)

    if (onlyCalculateGas) {
      tx.setSender(await signer.getAddress())
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      const gasAmount = await TransactionUtil.calculationTxGas(signer, tx)
      console.log('need gas : ', gasAmount)
      return undefined
    }

    const resultTxn = await signer.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    })
    return getTransactionEffects(resultTxn)
  } catch (error) {
    console.log('error: ', error)
  }
  return undefined
}

export async function printTransaction(tx: TransactionBlock) {
  tx.blockData.transactions.forEach((item, index) => {
    console.log(`transaction ${index}: `, item)
  })
}

export class TransactionUtil {
  /**
   * adjust transaction for gas
   * @param sdk
   * @param amount
   * @param tx
   * @returns
   */
  static async adjustTransactionForGas(
    sdk: SDK,
    allCoins: CoinAsset[],
    amount: bigint,
    tx: TransactionBlock
  ): Promise<{ fixAmount: bigint; fixCoinInput?: TransactionArgument; newTx?: TransactionBlock }> {
    tx.setSender(sdk.senderAddress)
    // amount coins
    const amountCoins = CoinAssist.selectCoinAssetGreaterThanOrEqual(allCoins, amount)
    if (amountCoins.length === 0) {
      throw new Error(`Insufficient balance`)
    }
    // If the remaining coin balance is greater than GasBudgetHigh2 * 2, no gas fee correction will be done
    if (CoinAssist.calculateTotalBalance(allCoins) - CoinAssist.calculateTotalBalance(amountCoins) > sdk.gasConfig.GasBudgetHigh2 * 2) {
      return { fixAmount: amount }
    }

    // payload Estimated gas consumption
    const estimateGas = await TransactionUtil.calculationTxGas(sdk.fullClient, tx)
    console.log('estimateGas: ', estimateGas)

    // Find estimateGas objectIds
    const gasCoins = CoinAssist.selectCoinAssetGreaterThanOrEqual(
      allCoins,
      BigInt(estimateGas),
      amountCoins.map((item) => item.coinObjectId)
    )

    // There is not enough gas and the amount needs to be adjusted
    if (gasCoins.length === 0) {
      // Readjust the amount , Reserve 500 gas for the spit
      amount -= BigInt(500)
      amount -= BigInt(estimateGas)
      if (amount < 0) {
        throw new Error(`gas Insufficient balance`)
      }
      const newTx = new TransactionBlock()
      const primaryCoinAInput = newTx.splitCoins(newTx.gas, [newTx.pure(amount)])
      newTx.setGasBudget(estimateGas + 500)
      return { fixAmount: amount, fixCoinInput: primaryCoinAInput, newTx }
    }
    return { fixAmount: amount }
  }

  // -----------------------------------------liquidity-----------------------------------------------
  /**
   * build add liquidity transaction
   * @param params
   * @param slippage
   * @param curSqrtPrice
   * @returns
   */
  static async buildAddLiquidityTransactionForGas(
    sdk: SDK,
    allCoins: CoinAsset[],
    params: AddLiquidityFixTokenParams,
    gasEstimateArg: {
      slippage: number
      curSqrtPrice: BN
    }
  ): Promise<TransactionBlock> {
    let tx = await TransactionUtil.buildAddLiquidityTransaction(sdk, allCoins, params)

    const { isAdjustCoinA } = findAdjustCoin(params)

    const suiAmount = isAdjustCoinA ? params.amount_a : params.amount_b

    const newResult = await TransactionUtil.adjustTransactionForGas(
      sdk,
      CoinAssist.getCoinAssets(isAdjustCoinA ? params.coinTypeA : params.coinTypeB, allCoins),
      BigInt(suiAmount),
      tx
    )

    const { fixAmount } = newResult
    const { fixCoinInput } = newResult
    const { newTx } = newResult

    if (fixCoinInput !== undefined && newTx !== undefined) {
      let primaryCoinAInputs: TransactionArgument | undefined
      let primaryCoinBInputs: TransactionArgument | undefined

      if (isAdjustCoinA) {
        params.amount_a = Number(fixAmount)
        primaryCoinAInputs = fixCoinInput
        primaryCoinBInputs = TransactionUtil.buildCoinInputForAmount(newTx, allCoins, BigInt(params.amount_b), params.coinTypeB)
      } else {
        params.amount_b = Number(fixAmount)
        primaryCoinAInputs = TransactionUtil.buildCoinInputForAmount(newTx, allCoins, BigInt(params.amount_a), params.coinTypeA)
        primaryCoinBInputs = fixCoinInput
        params = TransactionUtil.fixAddLiquidityFixTokenParams(params, gasEstimateArg.slippage, gasEstimateArg.curSqrtPrice)

        tx = TransactionUtil.buildAddLiquidityFixTokenArgs(newTx, sdk.sdkOptions, params, primaryCoinAInputs, primaryCoinBInputs)
        return tx
      }
    }
    return tx
  }

  /**
   * build add liquidity transaction
   * @param params
   * @param packageId
   * @returns
   */
  static async buildAddLiquidityTransaction(
    sdk: SDK,
    allCoinAsset: CoinAsset[],
    params: AddLiquidityParams | AddLiquidityFixTokenParams
  ): Promise<TransactionBlock> {
    if (sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    const isFixToken = !('delta_liquidity' in params)

    let tx = new TransactionBlock()
    const primaryCoinAInputs = TransactionUtil.buildCoinInputForAmount(
      tx,
      allCoinAsset,
      BigInt(isFixToken ? params.amount_a : params.max_amount_a),
      params.coinTypeA
    )
    const primaryCoinBInputs = TransactionUtil.buildCoinInputForAmount(
      tx,
      allCoinAsset,
      BigInt(isFixToken ? params.amount_b : params.max_amount_b),
      params.coinTypeB
    )

    if (isFixToken) {
      tx.setGasBudget(sdk.gasConfig.GasBudgetHigh2)
      tx = TransactionUtil.buildAddLiquidityFixTokenArgs(
        tx,
        sdk.sdkOptions,
        params as AddLiquidityFixTokenParams,
        primaryCoinAInputs,
        primaryCoinBInputs
      )
    } else {
      tx.setGasBudget(sdk.gasConfig.GasBudgetLow)
      tx = TransactionUtil.buildAddLiquidityArgs(tx, sdk.sdkOptions, params as AddLiquidityParams, primaryCoinAInputs, primaryCoinBInputs)
    }
    return tx
  }

  /**
   * fix add liquidity fix token for coin amount
   * @param params
   * @param slippage
   * @param curSqrtPrice
   * @returns
   */
  static fixAddLiquidityFixTokenParams(params: AddLiquidityFixTokenParams, slippage: number, curSqrtPrice: BN): AddLiquidityFixTokenParams {
    const coinAmount = params.fix_amount_a ? params.amount_a : params.amount_b
    const liquidityInput = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
      Number(params.tick_lower),
      Number(params.tick_upper),
      new BN(coinAmount),
      params.fix_amount_a,
      true,
      slippage,
      curSqrtPrice
    )

    params.amount_a = params.fix_amount_a ? params.amount_a : liquidityInput.tokenMaxA.toNumber()
    params.amount_b = params.fix_amount_a ? liquidityInput.tokenMaxB.toNumber() : params.amount_b

    return params
  }

  private static buildAddLiquidityFixTokenArgs(
    tx: TransactionBlock,
    sdkOptions: SdkOptions,
    params: AddLiquidityFixTokenParams,
    primaryCoinAInputs?: TransactionArgument,
    primaryCoinBInputs?: TransactionArgument
  ) {
    const typeArguments = [params.coinTypeA, params.coinTypeB]
    let functionName = 'add_liquidity_fix_coin_with_all'
    const { clmm } = sdkOptions
    const primaryCoinInputs: {
      coinInput: TransactionArgument
      coinAmount: string
    }[] = []

    if (primaryCoinAInputs) {
      primaryCoinInputs.push({
        coinInput: primaryCoinAInputs,
        coinAmount: params.amount_a.toString(),
      })
    }
    if (primaryCoinBInputs) {
      primaryCoinInputs.push({
        coinInput: primaryCoinBInputs,
        coinAmount: params.amount_b.toString(),
      })
    }

    const isWithAll = primaryCoinInputs.length === 2

    if (isWithAll) {
      functionName = params.is_open ? 'open_position_with_liquidity_with_all' : 'add_liquidity_fix_coin_with_all'
    } else {
      functionName = params.is_open
        ? primaryCoinAInputs !== undefined
          ? 'open_position_with_liquidity_only_a'
          : 'open_position_with_liquidity_only_b'
        : primaryCoinAInputs !== undefined
        ? 'add_liquidity_fix_coin_only_a'
        : 'add_liquidity_fix_coin_only_b'
    }

    const args = params.is_open
      ? isWithAll
        ? [
            tx.pure(clmm.config.global_config_id),
            tx.pure(params.pool_id),
            tx.pure(asUintN(BigInt(params.tick_lower)).toString()),
            tx.pure(asUintN(BigInt(params.tick_upper)).toString()),
            ...primaryCoinInputs.map((item) => item.coinInput),
            ...primaryCoinInputs.map((item) => tx.pure(item.coinAmount)),
            tx.pure(params.fix_amount_a),
            tx.pure(CLOCK_ADDRESS),
          ]
        : [
            tx.pure(clmm.config.global_config_id),
            tx.pure(params.pool_id),
            tx.pure(asUintN(BigInt(params.tick_lower)).toString()),
            tx.pure(asUintN(BigInt(params.tick_upper)).toString()),
            ...primaryCoinInputs.map((item) => item.coinInput),
            ...primaryCoinInputs.map((item) => tx.pure(item.coinAmount)),
            tx.pure(CLOCK_ADDRESS),
          ]
      : isWithAll
      ? [
          tx.pure(clmm.config.global_config_id),
          tx.pure(params.pool_id),
          tx.pure(params.pos_id),
          ...primaryCoinInputs.map((item) => item.coinInput),
          ...primaryCoinInputs.map((item) => tx.pure(item.coinAmount)),
          tx.pure(params.fix_amount_a),
          tx.pure(CLOCK_ADDRESS),
        ]
      : [
          tx.pure(clmm.config.global_config_id),
          tx.pure(params.pool_id),
          tx.pure(params.pos_id),
          ...primaryCoinInputs.map((item) => item.coinInput),
          ...primaryCoinInputs.map((item) => tx.pure(item.coinAmount)),
          tx.pure(CLOCK_ADDRESS),
        ]

    tx.moveCall({
      target: `${clmm.clmm_router}::${ClmmIntegrateModule}::${functionName}`,
      typeArguments,
      arguments: args,
    })
    return tx
  }

  private static buildAddLiquidityArgs(
    tx: TransactionBlock,
    sdkOptions: SdkOptions,
    params: AddLiquidityParams,
    primaryCoinAInputs?: TransactionArgument,
    primaryCoinBInputs?: TransactionArgument
  ) {
    const { clmm } = sdkOptions

    const typeArguments = [params.coinTypeA, params.coinTypeB]
    let functionName = 'add_liquidity_with_all'
    let args

    const primaryCoinInputs: TransactionArgument[] = []
    if (primaryCoinAInputs) {
      primaryCoinInputs.push(primaryCoinAInputs)
    }
    if (primaryCoinBInputs) {
      primaryCoinInputs.push(primaryCoinBInputs)
    }

    if (primaryCoinInputs.length === 2) {
      functionName = 'add_liquidity_with_all'
    } else {
      functionName = primaryCoinAInputs !== undefined ? 'add_liquidity_only_a' : 'add_liquidity_only_b'
    }

    if (primaryCoinAInputs !== undefined && primaryCoinBInputs !== undefined) {
      functionName = 'add_liquidity_with_all'
      args = [
        tx.pure(clmm.config?.global_config_id),
        tx.pure(params.pool_id),
        tx.pure(params.pos_id),
        primaryCoinAInputs,
        primaryCoinBInputs,
        tx.pure(params.max_amount_a.toString()),
        tx.pure(params.max_amount_b.toString()),
        tx.pure(params.delta_liquidity),
        tx.pure(CLOCK_ADDRESS),
      ]
    } else {
      args = [
        tx.pure(clmm.config?.global_config_id),
        tx.pure(params.pool_id),
        tx.pure(params.pos_id),
        primaryCoinAInputs !== undefined ? primaryCoinAInputs : (primaryCoinBInputs as TransactionArgument),
        tx.pure(params.max_amount_a.toString()),
        tx.pure(params.max_amount_b.toString()),
        tx.pure(params.delta_liquidity),
        tx.pure(CLOCK_ADDRESS),
      ]
    }

    tx.moveCall({
      target: `${clmm.clmm_router}::${ClmmIntegrateModule}::${functionName}`,
      typeArguments,
      arguments: args,
    })
    return tx
  }

  // -------------------------------------swap--------------------------------------------------//
  /**
   * build add liquidity transaction
   * @param params
   * @param slippage
   * @param curSqrtPrice
   * @returns
   */
  static async buildSwapTransactionForGas(
    sdk: SDK,
    params: SwapParams,
    allCoinAsset: CoinAsset[],
    gasEstimateArg: {
      byAmountIn: boolean
      slippage: Percentage
      decimalsA: number
      decimalsB: number
      swapTicks: Array<TickData>
      currentPool: Pool
    }
  ): Promise<TransactionBlock> {
    let tx = TransactionUtil.buildSwapTransaction(sdk, params, allCoinAsset)

    const newResult = await TransactionUtil.adjustTransactionForGas(
      sdk,
      CoinAssist.getCoinAssets(params.a2b ? params.coinTypeA : params.coinTypeB, allCoinAsset),
      BigInt(params.by_amount_in ? params.amount : params.amount_limit),
      tx
    )

    const { fixAmount } = newResult
    const { fixCoinInput } = newResult
    const { newTx } = newResult

    if (fixCoinInput !== undefined && newTx !== undefined) {
      if (params.by_amount_in) {
        params.amount = fixAmount.toString()
      } else {
        params.amount_limit = fixAmount.toString()
      }
      params = TransactionUtil.fixSwapParams(sdk, params, gasEstimateArg)
      tx = TransactionUtil.buildSwapTransactionArgs(newTx, params, sdk.sdkOptions, fixCoinInput)
    }

    return tx
  }

  /**
   * build swap transaction
   * @param params
   * @param packageId
   * @returns
   */
  static buildSwapTransaction(sdk: SDK, params: SwapParams, allCoinAsset: CoinAsset[]): TransactionBlock {
    let tx = new TransactionBlock()
    tx.setGasBudget(sdk.gasConfig.GasBudgetHigh2)
    const primaryCoinInputs = TransactionUtil.buildCoinInputForAmount(
      tx,
      allCoinAsset,
      BigInt(params.by_amount_in ? params.amount : params.amount_limit),
      params.a2b ? params.coinTypeA : params.coinTypeB
    )

    tx = TransactionUtil.buildSwapTransactionArgs(tx, params, sdk.sdkOptions, primaryCoinInputs as TransactionArgument)
    return tx
  }

  /**
   * build swap transaction
   * @param params
   * @param packageId
   * @returns
   */
  static buildSwapTransactionArgs(
    tx: TransactionBlock,
    params: SwapParams,
    sdkOptions: SdkOptions,
    primaryCoinInput: TransactionArgument
  ): TransactionBlock {
    const { clmm } = sdkOptions

    const sqrtPriceLimit = SwapUtils.getDefaultSqrtPriceLimit(params.a2b)
    const typeArguments = [params.coinTypeA, params.coinTypeB]
    const global_config_id = clmm.config?.global_config_id

    if (global_config_id === undefined) {
      throw Error('clmm.config.global_config_id is undefined')
    }

    const hasSwapPartner = params.swap_partner !== undefined

    const functionName = hasSwapPartner
      ? params.a2b
        ? 'swap_a2b_with_partner'
        : 'swap_b2a_with_partner'
      : params.a2b
      ? 'swap_a2b'
      : 'swap_b2a'

    const args = hasSwapPartner
      ? [
          tx.pure(global_config_id),
          tx.pure(params.pool_id),
          tx.pure(params.swap_partner),
          primaryCoinInput,
          tx.pure(params.by_amount_in),
          tx.pure(params.amount),
          tx.pure(params.amount_limit),
          tx.pure(sqrtPriceLimit.toString()),
          tx.pure(CLOCK_ADDRESS),
        ]
      : [
          tx.pure(global_config_id),
          tx.pure(params.pool_id),
          primaryCoinInput,
          tx.pure(params.by_amount_in),
          tx.pure(params.amount),
          tx.pure(params.amount_limit),
          tx.pure(sqrtPriceLimit.toString()),
          tx.pure(CLOCK_ADDRESS),
        ]

    tx.moveCall({
      target: `${clmm.clmm_router}::${ClmmIntegrateModule}::${functionName}`,
      typeArguments,
      arguments: args,
    })
    return tx
  }

  static fixSwapParams(
    sdk: SDK,
    params: SwapParams,
    gasEstimateArg: {
      byAmountIn: boolean
      slippage: Percentage
      decimalsA: number
      decimalsB: number
      swapTicks: Array<TickData>
      currentPool: Pool
    }
  ): SwapParams {
    const res = sdk.Swap.calculateRates({
      decimalsA: gasEstimateArg.decimalsA,
      decimalsB: gasEstimateArg.decimalsB,
      a2b: params.a2b,
      byAmountIn: params.by_amount_in,
      amount: new BN(params.amount),
      swapTicks: gasEstimateArg.swapTicks,
      currentPool: gasEstimateArg.currentPool,
    })

    const toAmount = gasEstimateArg.byAmountIn ? res.estimatedAmountOut : res.estimatedAmountIn

    const amountLimit = adjustForSlippage(toAmount, gasEstimateArg.slippage, !gasEstimateArg.byAmountIn)
    params.amount_limit = amountLimit.toString()
    return params
  }

  public static async syncBuildCoinInputForAmount(
    sdk: SDK,
    tx: TransactionBlock,
    amount: bigint,
    coinType: string
  ): Promise<TransactionArgument | undefined> {
    if (sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    const allCoins = await sdk.Resources.getOwnerCoinAssets(sdk.senderAddress, coinType)
    const primaryCoinInput = TransactionUtil.buildCoinInputForAmount(tx, allCoins, amount, coinType)

    return primaryCoinInput
  }

  public static buildCoinInputForAmount(
    tx: TransactionBlock,
    allCoins: CoinAsset[],
    amount: bigint,
    coinType: string,
    buildVector = true
  ): TransactionArgument | undefined {
    const coinAssets: CoinAsset[] = CoinAssist.getCoinAssets(coinType, allCoins)

    if (amount === BigInt(0)) {
      return undefined
    }
    const amountTotal = CoinAssist.calculateTotalBalance(coinAssets)
    if (amountTotal < amount) {
      throw new Error(`The amount(${amountTotal}) is Insufficient balance for ${coinType} , expect ${amount} `)
    }

    if (CoinAssist.isSuiCoin(coinType)) {
      const amountCoin = tx.splitCoins(tx.gas, [tx.pure(amount.toString())])
      if (buildVector) {
        return tx.makeMoveVec({ objects: [amountCoin] })
      }
      return amountCoin
    }

    const coinObjectIds = CoinAssist.selectCoinObjectIdGreaterThanOrEqual(coinAssets, amount)
    if (buildVector) {
      return tx.makeMoveVec({ objects: coinObjectIds.map((id) => tx.object(id)) })
    }
    const [primaryCoinA, ...mergeCoinAs] = coinObjectIds
    const primaryCoinAInput = tx.object(primaryCoinA)

    if (mergeCoinAs.length > 0) {
      tx.mergeCoins(
        primaryCoinAInput,
        mergeCoinAs.map((coin) => tx.object(coin))
      )
    }

    return primaryCoinAInput
  }

  public static async calculationTxGas(sdk: JsonRpcProvider | RawSigner, tx: TransactionBlock): Promise<number> {
    const { sender } = tx.blockData

    if (sender === undefined) {
      throw Error('sender is empty')
    }

    const devResult = await sdk.devInspectTransactionBlock({
      transactionBlock: tx,
      sender,
    })
    const { gasUsed } = devResult.effects

    const estimateGas = Number(gasUsed.computationCost) + Number(gasUsed.storageCost) - Number(gasUsed.storageRebate)
    return estimateGas
  }
}
