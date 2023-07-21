import {
  getTransactionEffects,
  JsonRpcProvider,
  RawSigner,
  TransactionArgument,
  TransactionBlock,
  TransactionEffects,
} from '@mysten/sui.js'
import BN from 'bn.js'
import { CoinAssist } from '../math/CoinAssist'
import { OnePath, SwapWithRouterParams } from '../modules/routerModule'

import { TickData } from '../types/clmmpool'
import { ClmmIntegratePoolModule, ClmmIntegrateRouterModule, ClmmIntegrateUtilsModule, CLOCK_ADDRESS } from '../types/sui'
import SDK, {
  AddLiquidityFixTokenParams,
  adjustForSlippage,
  asUintN,
  ClmmPoolUtil,
  CoinAsset,
  CoinPairType,
  d,
  DeepbookUtils,
  Percentage,
  Pool,
  SdkOptions,
  SwapParams,
  SwapUtils,
  ZERO,
} from '../index'
import { AggregatorResult, BasePath } from '../modules/routerModuleV2'

export function findAdjustCoin(coinPair: CoinPairType): { isAdjustCoinA: boolean; isAdjustCoinB: boolean } {
  const isAdjustCoinA = CoinAssist.isSuiCoin(coinPair.coinTypeA)
  const isAdjustCoinB = CoinAssist.isSuiCoin(coinPair.coinTypeB)
  return { isAdjustCoinA, isAdjustCoinB }
}

export type BuildCoinInputResult = {
  transactionArgument: TransactionArgument
  remainCoins: CoinAsset[]
}

export async function sendTransaction(
  signer: RawSigner,
  tx: TransactionBlock,
  onlyCalculateGas = false
): Promise<TransactionEffects | undefined> {
  try {
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

export async function printTransaction(tx: TransactionBlock, isPrint = true) {
  tx.blockData.transactions.forEach((item, index) => {
    if (isPrint) {
      console.log(`transaction ${index}: `, item)
    }
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
    const amountCoins = CoinAssist.selectCoinAssetGreaterThanOrEqual(allCoins, amount).selectedCoins
    if (amountCoins.length === 0) {
      throw new Error(`Insufficient balance`)
    }
    const totalAmount = CoinAssist.calculateTotalBalance(allCoins)
    // If the remaining coin balance is greater than 1000000000, no gas fee correction will be done
    if (totalAmount - amount > 1000000000) {
      return { fixAmount: amount }
    }

    // payload Estimated gas consumption
    const estimateGas = await TransactionUtil.calculationTxGas(sdk.fullClient, tx)

    // Find estimateGas objectIds
    const gasCoins = CoinAssist.selectCoinAssetGreaterThanOrEqual(
      allCoins,
      BigInt(estimateGas),
      amountCoins.map((item) => item.coinObjectId)
    ).selectedCoins

    // There is not enough gas and the amount needs to be adjusted
    if (gasCoins.length === 0) {
      // Readjust the amount , Reserve 500 gas for the spit
      const newGas = BigInt(estimateGas) + BigInt(500)
      if (totalAmount - amount < newGas) {
        amount -= newGas
        if (amount < 0) {
          throw new Error(`gas Insufficient balance`)
        }

        const newTx = new TransactionBlock()
        const primaryCoinAInput = newTx.splitCoins(newTx.gas, [newTx.pure(amount)])
        newTx.setGasBudget(newGas)
        return { fixAmount: amount, fixCoinInput: newTx.makeMoveVec({ objects: [primaryCoinAInput] }), newTx }
      }
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
  static async buildAddLiquidityFixTokenForGas(
    sdk: SDK,
    allCoins: CoinAsset[],
    params: AddLiquidityFixTokenParams,
    gasEstimateArg: {
      slippage: number
      curSqrtPrice: BN
    }
  ): Promise<TransactionBlock> {
    let tx = await TransactionUtil.buildAddLiquidityFixToken(sdk, allCoins, params)

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
      let primaryCoinAInputs: TransactionArgument | undefined | any
      let primaryCoinBInputs: TransactionArgument | undefined | any

      if (isAdjustCoinA) {
        params.amount_a = Number(fixAmount)
        primaryCoinAInputs = fixCoinInput
        primaryCoinBInputs = TransactionUtil.buildCoinInputForAmount(
          newTx,
          allCoins,
          BigInt(params.amount_b),
          params.coinTypeB
        )?.transactionArgument
      } else {
        params.amount_b = Number(fixAmount)
        primaryCoinAInputs = TransactionUtil.buildCoinInputForAmount(
          newTx,
          allCoins,
          BigInt(params.amount_a),
          params.coinTypeA
        )?.transactionArgument
        primaryCoinBInputs = fixCoinInput
        params = TransactionUtil.fixAddLiquidityFixTokenParams(params, gasEstimateArg.slippage, gasEstimateArg.curSqrtPrice)

        tx = TransactionUtil.buildAddLiquidityFixTokenArgs(newTx, sdk, params, primaryCoinAInputs, primaryCoinBInputs)
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
  static async buildAddLiquidityFixToken(
    sdk: SDK,
    allCoinAsset: CoinAsset[],
    params: AddLiquidityFixTokenParams
  ): Promise<TransactionBlock> {
    if (sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    let tx = new TransactionBlock()
    const primaryCoinAInputs: any = TransactionUtil.buildCoinInputForAmount(
      tx,
      allCoinAsset,
      BigInt(params.amount_a),
      params.coinTypeA
    )?.transactionArgument
    const primaryCoinBInputs: any = TransactionUtil.buildCoinInputForAmount(
      tx,
      allCoinAsset,
      BigInt(params.amount_b),
      params.coinTypeB
    )?.transactionArgument

    tx = TransactionUtil.buildAddLiquidityFixTokenArgs(
      tx,
      sdk,
      params as AddLiquidityFixTokenParams,
      primaryCoinAInputs,
      primaryCoinBInputs
    )
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
    sdk: SDK,
    params: AddLiquidityFixTokenParams,
    primaryCoinAInputs?: TransactionArgument,
    primaryCoinBInputs?: TransactionArgument
  ) {
    const typeArguments = [params.coinTypeA, params.coinTypeB]
    let functionName = 'add_liquidity_fix_coin_with_all'
    const { clmm } = sdk.sdkOptions
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
    if (!params.is_open) {
      sdk.Rewarder.collectRewarderTransactionPayload(
        {
          pool_id: params.pool_id,
          pos_id: params.pos_id,
          coinTypeA: params.coinTypeA,
          coinTypeB: params.coinTypeB,
          collect_fee: params.collect_fee,
          rewarder_coin_types: params.rewarder_coin_types,
        },
        tx
      )
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
            tx.object(clmm.config.global_config_id),
            tx.object(params.pool_id),
            tx.pure(asUintN(BigInt(params.tick_lower)).toString()),
            tx.pure(asUintN(BigInt(params.tick_upper)).toString()),
            ...primaryCoinInputs.map((item) => item.coinInput),
            ...primaryCoinInputs.map((item) => tx.pure(item.coinAmount)),
            tx.pure(params.fix_amount_a),
            tx.object(CLOCK_ADDRESS),
          ]
        : [
            tx.object(clmm.config.global_config_id),
            tx.object(params.pool_id),
            tx.pure(asUintN(BigInt(params.tick_lower)).toString()),
            tx.pure(asUintN(BigInt(params.tick_upper)).toString()),
            ...primaryCoinInputs.map((item) => item.coinInput),
            ...primaryCoinInputs.map((item) => tx.pure(item.coinAmount)),
            tx.object(CLOCK_ADDRESS),
          ]
      : isWithAll
      ? [
          tx.object(clmm.config.global_config_id),
          tx.object(params.pool_id),
          tx.object(params.pos_id),
          ...primaryCoinInputs.map((item) => item.coinInput),
          ...primaryCoinInputs.map((item) => tx.pure(item.coinAmount)),
          tx.pure(params.fix_amount_a),
          tx.object(CLOCK_ADDRESS),
        ]
      : [
          tx.object(clmm.config.global_config_id),
          tx.object(params.pool_id),
          tx.object(params.pos_id),
          ...primaryCoinInputs.map((item) => item.coinInput),
          ...primaryCoinInputs.map((item) => tx.pure(item.coinAmount)),
          tx.object(CLOCK_ADDRESS),
        ]

    tx.moveCall({
      target: `${clmm.clmm_router}::${ClmmIntegratePoolModule}::${functionName}`,
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

    const { fixAmount, fixCoinInput, newTx } = newResult

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
    const primaryCoinInputs: any = TransactionUtil.buildCoinInputForAmount(
      tx,
      allCoinAsset,
      BigInt(params.by_amount_in ? params.amount : params.amount_limit),
      params.a2b ? params.coinTypeA : params.coinTypeB
    )?.transactionArgument

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
      target: `${clmm.clmm_router}::${ClmmIntegratePoolModule}::${functionName}`,
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
    coinType: string,
    buildVector = true
  ): Promise<TransactionArgument | undefined> {
    if (sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    const allCoins = await sdk.getOwnerCoinAssets(sdk.senderAddress, coinType)
    const primaryCoinInput: any = TransactionUtil.buildCoinInputForAmount(tx, allCoins, amount, coinType, buildVector)!.transactionArgument

    return primaryCoinInput
  }

  public static buildCoinInputForAmount(
    tx: TransactionBlock,
    allCoins: CoinAsset[],
    amount: bigint,
    coinType: string,
    buildVector = true
  ): BuildCoinInputResult | undefined {
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
        return {
          transactionArgument: tx.makeMoveVec({ objects: [amountCoin] }),
          remainCoins: allCoins,
        }
      }
      return {
        transactionArgument: amountCoin,
        remainCoins: allCoins,
      }
    }
    const selectedCoinsResult = CoinAssist.selectCoinObjectIdGreaterThanOrEqual(coinAssets, amount)
    const coinObjectIds = selectedCoinsResult.objectArray
    if (buildVector) {
      return {
        transactionArgument: tx.makeMoveVec({ objects: coinObjectIds.map((id) => tx.object(id)) }),
        remainCoins: selectedCoinsResult.remainCoins,
      }
    }
    const [primaryCoinA, ...mergeCoinAs] = coinObjectIds
    const primaryCoinAInput: any = tx.object(primaryCoinA)

    if (mergeCoinAs.length > 0) {
      tx.mergeCoins(
        primaryCoinAInput,
        mergeCoinAs.map((coin) => tx.object(coin))
      )
    }

    return {
      transactionArgument: primaryCoinAInput,
      remainCoins: selectedCoinsResult.remainCoins,
    }
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

  static moveCallCoinZero = (txb: TransactionBlock, coinType: string) => {
    return txb.moveCall({
      target: '0x2::coin::zero',
      typeArguments: [coinType],
    })
  }

  // -------------------------------------router--------------------------------------------------//
  public static async buildRouterSwapTransaction(
    sdk: SDK,
    params: SwapWithRouterParams,
    byAmountIn: boolean,
    allCoinAsset: CoinAsset[]
  ): Promise<TransactionBlock> {
    let tx = new TransactionBlock()
    tx = await this.buildRouterBasePathTx(sdk, params, byAmountIn, allCoinAsset, tx)
    return tx
  }

  // -------------------------------------aggregator-----------------------------------------------//
  public static async buildAggregatorSwapTransaction(
    sdk: SDK,
    param: AggregatorResult,
    allCoinAsset: CoinAsset[],
    partner: string,
    priceSplitPoint: number
  ) {
    let tx = new TransactionBlock()
    if (param.byAmountIn) {
      const amountLimit = Math.round(param.outputAmount * (1 - priceSplitPoint))

      let fromCoin = TransactionUtil.buildCoinInputForAmount(
        tx,
        allCoinAsset,
        param.byAmountIn ? BigInt(param.inputAmount) : BigInt(amountLimit),
        param.fromCoin,
        false
      )?.transactionArgument as TransactionArgument

      let toCoin = TransactionUtil.moveCallCoinZero(tx, param.toCoin) as TransactionArgument

      const transferObjects: TransactionArgument[] = []
      let isCreateAccountCap = false

      const isHasDeepbook = param.splitPaths.some((splitPath) => splitPath.basePaths.some((basePath) => basePath.label === 'Deepbook'))

      let accountCap
      if (isHasDeepbook) {
        const accountCapStr = await DeepbookUtils.getAccountCap(sdk)
        if (!accountCapStr) {
          const [cap, createAccountCapTX] = DeepbookUtils.createAccountCap(sdk.senderAddress, sdk.sdkOptions, tx)
          tx = createAccountCapTX as TransactionBlock
          accountCap = cap as TransactionArgument
          isCreateAccountCap = true
        } else {
          accountCap = tx.object(accountCapStr)
        }
      }

      for (let i = 0; i < param.splitPaths.length; i += 1) {
        const splitPath = param.splitPaths[i]

        let middleCoin: any
        for (let i = 0; i < splitPath.basePaths.length; i += 1) {
          const basePath = splitPath.basePaths[i]
          if (basePath.label === 'Deepbook') {
            if (i === 0) {
              if (splitPath.basePaths.length === 1) {
                const deepbookTxBuild = this.buildDeepbookBasePathTx(sdk, basePath, tx, accountCap, fromCoin, toCoin, false)

                fromCoin = deepbookTxBuild.from as TransactionArgument
                toCoin = deepbookTxBuild.to as TransactionArgument
              } else {
                middleCoin = TransactionUtil.moveCallCoinZero(tx, basePath.toCoin)
                const deepbookTxBuild = this.buildDeepbookBasePathTx(sdk, basePath, tx, accountCap, fromCoin, middleCoin, false)
                fromCoin = deepbookTxBuild.from as TransactionArgument
                middleCoin = deepbookTxBuild.to as TransactionArgument
              }
            } else {
              const deepbookTxBuild = this.buildDeepbookBasePathTx(sdk, basePath, tx, accountCap, middleCoin, toCoin, true)

              middleCoin = deepbookTxBuild.from as TransactionArgument
              toCoin = deepbookTxBuild.to as TransactionArgument
            }
          }
          if (basePath.label === 'Cetus') {
            if (i === 0) {
              if (splitPath.basePaths.length === 1) {
                const clmmTxBuild = this.buildClmmBasePathTx(sdk, basePath, tx, param.byAmountIn, fromCoin, toCoin, false)
                fromCoin = clmmTxBuild.from as TransactionArgument
                toCoin = clmmTxBuild.to as TransactionArgument
              } else {
                middleCoin = TransactionUtil.moveCallCoinZero(tx, basePath.toCoin)
                const clmmTxBuild = this.buildClmmBasePathTx(sdk, basePath, tx, param.byAmountIn, fromCoin, middleCoin, false)
                fromCoin = clmmTxBuild.from as TransactionArgument
                middleCoin = clmmTxBuild.to as TransactionArgument
              }
            } else {
              const clmmTxBuild = this.buildClmmBasePathTx(sdk, basePath, tx, param.byAmountIn, middleCoin, toCoin, true)
              middleCoin = clmmTxBuild.from as TransactionArgument
              toCoin = clmmTxBuild.to as TransactionArgument
              tx.moveCall({
                target: `${sdk.sdkOptions.clmm.clmm_router}::${ClmmIntegrateUtilsModule}::send_coin`,
                typeArguments: [basePath.fromCoin],
                arguments: [middleCoin, tx.pure(sdk.senderAddress)],
              })
            }
          }
        }
      }
      transferObjects.push(fromCoin, toCoin)

      if (isCreateAccountCap) {
        transferObjects.push(accountCap as TransactionArgument)
      }

      if (param.byAmountIn) {
        tx.moveCall({
          target: `${sdk.sdkOptions.clmm.clmm_router}::${ClmmIntegrateRouterModule}::check_coin_threshold`,
          typeArguments: [param.toCoin],
          arguments: [toCoin, tx.pure(amountLimit)],
        })
      }

      tx.transferObjects(transferObjects, tx.pure(sdk.senderAddress))
    } else {
      const onePaths: OnePath[] = []
      for (const splitPath of param.splitPaths) {
        const a2b = []
        const poolAddress = []
        const rawAmountLimit: BN[] = []
        const coinType = []

        for (let i = 0; i < splitPath.basePaths.length; i += 1) {
          const basePath = splitPath.basePaths[i]
          a2b.push(basePath.direction)
          poolAddress.push(basePath.poolAddress)
          rawAmountLimit.push(new BN(basePath.inputAmount))
          if (i === 0) {
            coinType.push(basePath.fromCoin, basePath.toCoin)
          } else {
            coinType.push(basePath.toCoin)
          }
        }

        const onePath: OnePath = {
          amountIn: new BN(splitPath.inputAmount),
          amountOut: new BN(splitPath.outputAmount),
          poolAddress,
          a2b,
          rawAmountLimit,
          isExceed: false,
          coinType,
        }
        onePaths.push(onePath)
      }
      const params: SwapWithRouterParams = {
        paths: onePaths,
        partner,
        priceSplitPoint,
      }

      tx = await this.buildRouterBasePathTx(sdk, params, false, allCoinAsset, tx)
    }
    return tx
  }

  static buildDeepbookBasePathTx(
    sdk: SDK,
    basePath: BasePath,
    tx: TransactionBlock,
    accountCap: any,
    from: TransactionArgument,
    to: TransactionArgument,
    middleStep: boolean
  ) {
    const base = basePath.direction ? from : to
    const quote = basePath.direction ? to : from

    const args: any = [
      tx.object(basePath.poolAddress),
      accountCap,
      tx.pure(basePath.inputAmount),
      tx.pure(0),
      tx.pure(basePath.direction),
      base,
      quote,
      tx.pure(middleStep),
      tx.object(CLOCK_ADDRESS),
    ]

    const typeArguments = basePath.direction ? [basePath.fromCoin, basePath.toCoin] : [basePath.toCoin, basePath.fromCoin]

    const coinAB: TransactionArgument[] = tx.moveCall({
      target: `${sdk.sdkOptions.deepbook.deepbook_endpoint_v2}::endpoints_v2::swap`,
      typeArguments,
      arguments: args,
    })

    from = basePath.direction ? coinAB[0] : coinAB[1]
    to = basePath.direction ? coinAB[1] : coinAB[0]

    return {
      from,
      to,
      tx,
    }
  }

  static buildClmmBasePathTx(
    sdk: SDK,
    basePath: BasePath,
    tx: TransactionBlock,
    byAmountIn: boolean,
    from: TransactionArgument,
    to: TransactionArgument,
    middleStep: boolean
  ) {
    const { clmm } = sdk.sdkOptions
    const globalConfigID = clmm.config?.global_config_id

    let coinA = basePath.direction ? from : to
    let coinB = basePath.direction ? to : from

    const functionName = 'swap'
    const amount = byAmountIn ? basePath.inputAmount.toString() : basePath.outputAmount.toString()
    const sqrtPriceLimit = SwapUtils.getDefaultSqrtPriceLimit(basePath.direction)
    const args: any = [
      tx.object(globalConfigID),
      tx.object(basePath.poolAddress),
      coinA,
      coinB,
      tx.pure(basePath.direction),
      tx.pure(byAmountIn),
      tx.pure(amount),
      tx.pure(sqrtPriceLimit.toString()),
      tx.pure(middleStep),
      tx.object(CLOCK_ADDRESS),
    ]

    const typeArguments = basePath.direction ? [basePath.fromCoin, basePath.toCoin] : [basePath.toCoin, basePath.fromCoin]

    const coinAB: TransactionArgument[] = tx.moveCall({
      target: `${clmm.clmm_router}::${ClmmIntegrateRouterModule}::${functionName}`,
      typeArguments,
      arguments: args,
    })

    coinA = coinAB[0] as any
    coinB = coinAB[1] as any

    from = basePath.direction ? coinA : coinB
    to = basePath.direction ? coinB : coinA

    return {
      from,
      to,
      tx,
    }
  }

  static async buildRouterBasePathTx(
    sdk: SDK,
    params: SwapWithRouterParams,
    byAmountIn: boolean,
    allCoinAsset: CoinAsset[],
    tx: TransactionBlock
  ) {
    const { clmm } = sdk.sdkOptions
    const globalConfigID = clmm.config?.global_config_id

    const validPaths = params.paths.filter((path) => path && path.poolAddress)

    const inputAmount = Number(validPaths.reduce((total, path) => total.add(path.amountIn), ZERO).toString())
    const outputAmount = Number(validPaths.reduce((total, path) => total.add(path.amountOut), ZERO).toString())

    const totalAmountLimit = byAmountIn
      ? Math.round(Number(outputAmount.toString()) * (1 - params.priceSplitPoint))
      : Math.round(Number(inputAmount.toString()) * (1 + params.priceSplitPoint))

    const fromCoinType = params.paths[0].coinType[0]
    const toCoinType = params.paths[0].coinType[params.paths[0].coinType.length - 1]

    let fromCoin = TransactionUtil.buildCoinInputForAmount(
      tx,
      allCoinAsset,
      byAmountIn ? BigInt(inputAmount) : BigInt(totalAmountLimit),
      fromCoinType,
      false
    )?.transactionArgument as TransactionArgument
    let toCoin = TransactionUtil.moveCallCoinZero(tx, toCoinType) as TransactionArgument

    const transferObjects: TransactionArgument[] = []

    for (const path of validPaths) {
      if (path.poolAddress.length === 1) {
        const a2b = path.a2b[0]
        const swapParams = {
          amount: Number(path.amountIn.toString()),
          amountLimit: totalAmountLimit,
          poolCoinA: path.a2b[0] ? fromCoinType : toCoinType,
          poolCoinB: path.a2b[0] ? toCoinType : fromCoinType,
        }

        const poolCoinA = a2b ? fromCoin : toCoin
        const poolCoinB = a2b ? toCoin : fromCoin
        const amount = byAmountIn ? path.amountIn.toString() : path.amountOut.toString()

        const sqrtPriceLimit = SwapUtils.getDefaultSqrtPriceLimit(a2b).toString()
        const args: any = [
          tx.object(globalConfigID),
          tx.object(path.poolAddress[0]),
          poolCoinA,
          poolCoinB,
          tx.pure(a2b),
          tx.pure(byAmountIn),
          tx.pure(amount),
          tx.pure(sqrtPriceLimit),
          tx.pure(false),
          tx.object(CLOCK_ADDRESS),
        ]

        const typeArguments = [swapParams.poolCoinA, swapParams.poolCoinB]

        const coinABs: TransactionArgument[] = tx.moveCall({
          target: `${sdk.sdkOptions.clmm.clmm_router}::${ClmmIntegrateRouterModule}::swap`,
          typeArguments,
          arguments: args,
        })
        fromCoin = a2b ? coinABs[0] : coinABs[1]
        toCoin = a2b ? coinABs[1] : coinABs[0]
      } else {
        const amount0 = byAmountIn ? path.amountIn : path.rawAmountLimit[0]
        const amount1 = byAmountIn ? path.rawAmountLimit[0] : path.amountOut

        let functionName = ''
        if (path.a2b[0]) {
          if (path.a2b[1]) {
            functionName = 'swap_ab_bc'
          } else {
            functionName = 'swap_ab_cb'
          }
        } else if (path.a2b[1]) {
          functionName = 'swap_ba_bc'
        } else {
          functionName = 'swap_ba_cb'
        }
        const sqrtPriceLimit0 = SwapUtils.getDefaultSqrtPriceLimit(path.a2b[0])
        const sqrtPriceLimit1 = SwapUtils.getDefaultSqrtPriceLimit(path.a2b[1])
        const args: any = [
          tx.object(globalConfigID),
          tx.object(path.poolAddress[0]),
          tx.object(path.poolAddress[1]),
          fromCoin,
          toCoin,
          tx.pure(byAmountIn),
          tx.pure(amount0.toString()),
          tx.pure(amount1.toString()),
          tx.pure(sqrtPriceLimit0.toString()),
          tx.pure(sqrtPriceLimit1.toString()),
          tx.object(CLOCK_ADDRESS),
        ]
        const typeArguments = [path.coinType[0], path.coinType[1], path.coinType[2]]
        const fromToCoins = tx.moveCall({
          target: `${clmm.clmm_router}::${ClmmIntegrateRouterModule}::${functionName}`,
          typeArguments,
          arguments: args,
        })
        fromCoin = fromToCoins[0] as TransactionArgument
        toCoin = fromToCoins[1] as TransactionArgument
      }
    }

    if (byAmountIn) {
      tx.moveCall({
        target: `${clmm.clmm_router}::${ClmmIntegrateRouterModule}::check_coin_threshold`,
        typeArguments: [toCoinType],
        arguments: [toCoin, tx.pure(totalAmountLimit)],
      })
    }

    transferObjects.push(fromCoin, toCoin)
    tx.transferObjects(transferObjects, tx.pure(sdk.senderAddress))

    return tx
  }

  // public static buildRouterSwapTransaction

  static buildCoinTypePair(coinTypes: string[], partitionQuantities: number[]): string[][] {
    const coinTypePair: string[][] = []
    if (coinTypes.length === 2) {
      const pair: string[] = []
      pair.push(coinTypes[0], coinTypes[1])
      coinTypePair.push(pair)
    } else {
      const directPair: string[] = []
      directPair.push(coinTypes[0], coinTypes[coinTypes.length - 1])
      coinTypePair.push(directPair)
      for (let i = 1; i < coinTypes.length - 1; i += 1) {
        if (partitionQuantities[i - 1] === 0) {
          continue
        }
        const pair: string[] = []
        pair.push(coinTypes[0], coinTypes[i], coinTypes[coinTypes.length - 1])
        coinTypePair.push(pair)
      }
    }
    return coinTypePair
  }
}
