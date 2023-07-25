import { TickMath } from '../src/math/tick'
import BN from 'bn.js'
import { RawSigner, Ed25519Keypair } from '@mysten/sui.js'
import { buildSdk, buildTestAccount, buildTestPool, buildTestPosition, position_object_id, TokensMapping } from './data/init_test_data'
import { ClmmPoolUtil } from '../src/math/clmm'
import { Percentage } from '../src/math/percentage'
import { adjustForCoinSlippage } from '../src/math/position'
import 'isomorphic-fetch'
import { printTransaction, sendTransaction } from '../src/utils/transaction-util'
import { AddLiquidityFixTokenParams, AddLiquidityParams, Position, RemoveLiquidityParams, d, toDecimalsAmount } from '../src'
import Decimal from 'decimal.js'

let sendKeypair: Ed25519Keypair

describe('Position add Liquidity Module', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
    sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()
  })

  test('open_and_add_liquidity_fix_token', async () => {
    const poolObjectId = "0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630" ;//  TokensMapping.USDT_USDC_LP.poolObjectIds[0]
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, poolObjectId)
    const lowerTick = TickMath.getPrevInitializableTickIndex(new BN(pool.current_tick_index).toNumber(), new BN(pool.tickSpacing).toNumber())
    const upperTick = TickMath.getNextInitializableTickIndex(new BN(pool.current_tick_index).toNumber(), new BN(pool.tickSpacing).toNumber())
    const coinAmount = new BN(100)
    const fix_amount_a = true
    const slippage = 0.01
    const curSqrtPrice = new BN(pool.current_sqrt_price)

    const liquidityInput = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
      lowerTick,
      upperTick,
      coinAmount,
      fix_amount_a,
      true,
      slippage,
      curSqrtPrice
    )

    const amount_a = fix_amount_a ? coinAmount.toNumber() : liquidityInput.tokenMaxA.toNumber()
    const amount_b = fix_amount_a ? liquidityInput.tokenMaxB.toNumber() : coinAmount.toNumber()

    console.log('amount: ', { amount_a, amount_b })

    const addLiquidityPayloadParams: AddLiquidityFixTokenParams = {
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      pool_id: pool.poolAddress,
      tick_lower: lowerTick.toString(),
      tick_upper: upperTick.toString(),
      fix_amount_a,
      amount_a,
      amount_b,
      is_open: true,
      rewarder_coin_types: [],
      collect_fee: false,
      pos_id: '',
    }
    const createAddLiquidityTransactionPayload = await sdk.Position.createAddLiquidityFixTokenPayload(addLiquidityPayloadParams, {
      slippage: slippage,
      curSqrtPrice: curSqrtPrice,
    })

    printTransaction(createAddLiquidityTransactionPayload)
    const transferTxn = await sendTransaction(signer, createAddLiquidityTransactionPayload)
    console.log('open_and_add_liquidity_fix_token: ', transferTxn)
  })

  test('add_liquidity_fix_token', async () => {
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectIds[0]
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, poolObjectId)
    const position = (await buildTestPosition(sdk, position_object_id)) as Position
    const lowerTick = position.tick_lower_index
    const upperTick = position.tick_upper_index
    const coinAmount = new BN(100)
    const fix_amount_a = true
    const slippage = 0.05
    const curSqrtPrice = new BN(pool.current_sqrt_price)

    const liquidityInput = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
      lowerTick,
      upperTick,
      coinAmount,
      fix_amount_a,
      true,
      slippage,
      curSqrtPrice
    )

    const amount_a = fix_amount_a ? coinAmount.toNumber() : liquidityInput.tokenMaxA.toNumber()
    const amount_b = fix_amount_a ? liquidityInput.tokenMaxB.toNumber() : coinAmount.toNumber()

    console.log('amount: ', { amount_a, amount_b })

    const addLiquidityPayloadParams: AddLiquidityFixTokenParams = {
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      pool_id: pool.poolAddress,
      tick_lower: lowerTick.toString(),
      tick_upper: upperTick.toString(),
      fix_amount_a,
      amount_a,
      amount_b,
      is_open: false,
      pos_id: position.pos_object_id,
      rewarder_coin_types: [],
      collect_fee: true,
    }
    const createAddLiquidityTransactionPayload = await sdk.Position.createAddLiquidityFixTokenPayload(addLiquidityPayloadParams)

    printTransaction(createAddLiquidityTransactionPayload)

    const transferTxn = await sendTransaction(signer, createAddLiquidityTransactionPayload)
    console.log('add_liquidity_fix_token: ', transferTxn)
  })

  test('getCoinAmountFromLiquidity', async () => {
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectIds[0]
    const pool = await buildTestPool(sdk, poolObjectId)
    const position = (await buildTestPosition(sdk, position_object_id)) as Position
    const curSqrtPrice = new BN(pool.current_sqrt_price)

    const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_lower_index)
    const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_upper_index)
    const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
      new BN(Number(d(position.liquidity))),
      curSqrtPrice,
      lowerSqrtPrice,
      upperSqrtPrice,
      true
    )

    console.log('coinA: ', coinAmounts.coinA.toString())
    console.log('coinB: ', coinAmounts.coinB.toString())
  })

  test('add liquidity for input totalAmount', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, TokensMapping.USDT_USDC_LP.poolObjectIds[0])
    const curSqrtPrice = new BN(pool.current_sqrt_price)
    // ===>tick_uppe
    const tick_lower_index = -304
    const tick_upper_index = 552
    const slippageTolerance = new Percentage(new BN(5), new BN(100))

    const totalAmount = '18.73'
    const tokenPriceA = '1.000625867190606471'
    const tokenPriceB = '1'

    const coinAmounts = ClmmPoolUtil.estCoinAmountsFromTotalAmount(
      tick_lower_index,
      tick_upper_index,
      6,
      6,
      curSqrtPrice,
      totalAmount,
      tokenPriceA,
      tokenPriceB
    )
    console.log('coinAmounts: ', coinAmounts)

    const amountA = toDecimalsAmount(coinAmounts.amountA.toFixed(6, Decimal.ROUND_UP).toString(), 6)
    const amountB = toDecimalsAmount(coinAmounts.amountB.toFixed(6, Decimal.ROUND_UP).toString(), 6)

    const tokenAmounts = {
      coinA: new BN(amountA),
      coinB: new BN(amountB),
    }

    const liquidity = ClmmPoolUtil.estimateLiquidityFromcoinAmounts(curSqrtPrice, tick_lower_index, tick_upper_index, tokenAmounts)

    console.log('liquidity: ', liquidity.toString())

    const { tokenMaxA, tokenMaxB } = adjustForCoinSlippage(tokenAmounts, slippageTolerance, true)

    const addLiquidityPayloadParams: AddLiquidityParams = {
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      pool_id: pool.poolAddress,
      tick_lower: tick_lower_index.toString(),
      tick_upper: tick_upper_index.toString(),
      delta_liquidity: liquidity.toString(),
      max_amount_a: tokenMaxA.toString(),
      max_amount_b: tokenMaxB.toString(),
      pos_id: '',
      rewarder_coin_types: [],
      collect_fee: false,
    }

    const payload = await sdk.Position.createAddLiquidityPayload(addLiquidityPayloadParams)

    printTransaction(payload)

    const transferTxn = await sendTransaction(signer, payload)
    console.log('createAddLiquidityPayload: ', transferTxn)
  })

  test('1 remove liquidity for input totalAmount', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, TokensMapping.USDT_USDC_LP.poolObjectIds[0])
    const position = await buildTestPosition(sdk, position_object_id)
    const curSqrtPrice = new BN(pool.current_sqrt_price)
    // ===>tick_uppe
    const tick_lower_index = position.tick_lower_index
    const tick_upper_index = position.tick_upper_index
    const slippageTolerance = new Percentage(new BN(5), new BN(100))

    const totalAmount = '18.73'
    const tokenPriceA = '1.000625867190606471'
    const tokenPriceB = '1'

    const coinAmounts = ClmmPoolUtil.estCoinAmountsFromTotalAmount(
      tick_lower_index,
      tick_upper_index,
      6,
      6,
      curSqrtPrice,
      totalAmount,
      tokenPriceA,
      tokenPriceB
    )
    console.log('coinAmounts: ', coinAmounts)

    const amountA = toDecimalsAmount(coinAmounts.amountA.toFixed(6, Decimal.ROUND_UP).toString(), 6)
    const amountB = toDecimalsAmount(coinAmounts.amountB.toFixed(6, Decimal.ROUND_UP).toString(), 6)

    const tokenAmounts = {
      coinA: new BN(amountA),
      coinB: new BN(amountB),
    }

    const liquidity = ClmmPoolUtil.estimateLiquidityFromcoinAmounts(curSqrtPrice, tick_lower_index, tick_upper_index, tokenAmounts)

    console.log('liquidity: ', liquidity.toString())

    const { tokenMaxA, tokenMaxB } = adjustForCoinSlippage(tokenAmounts, slippageTolerance, false)

    const removeLiquidityParams: RemoveLiquidityParams = {
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      delta_liquidity: liquidity.toString(),
      min_amount_a: tokenMaxA.toString(),
      min_amount_b: tokenMaxB.toString(),
      pool_id: pool.poolAddress,
      pos_id: position.pos_object_id,
      rewarder_coin_types: [],
      collect_fee: true,
    }

    const payload = sdk.Position.removeLiquidityTransactionPayload(removeLiquidityParams)

    printTransaction(payload)

    const transferTxn = await sendTransaction(signer, payload)
    console.log('removeLiquidity: ', transferTxn)
  })

  test('2 remove liquidity for input one token', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, TokensMapping.USDT_USDC_LP.poolObjectIds[0])
    const position = await buildTestPosition(sdk, position_object_id)
    const lowerTick = position.tick_lower_index
    const upperTick = position.tick_upper_index
    const coinAmount = new BN(5995942)
    const fix_amount_a = true
    const slippage = 0.005
    const curSqrtPrice = new BN(pool.current_sqrt_price)

    const liquidityInput = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
      lowerTick,
      upperTick,
      coinAmount,
      fix_amount_a,
      false,
      slippage,
      curSqrtPrice
    )

    const amount_a = fix_amount_a ? coinAmount.toNumber() : liquidityInput.tokenMaxA.toNumber()
    const amount_b = fix_amount_a ? liquidityInput.tokenMaxB.toNumber() : coinAmount.toNumber()
    const liquidity = liquidityInput.liquidityAmount.toString()

    console.log('amount: ', { amount_a, amount_b, liquidity })

    const removeLiquidityParams: RemoveLiquidityParams = {
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      delta_liquidity: liquidity,
      min_amount_a: amount_a.toString(),
      min_amount_b: amount_b.toString(),
      pool_id: pool.poolAddress,
      pos_id: position.pos_object_id,
      rewarder_coin_types: [],
      collect_fee: true,
    }

    const payload = sdk.Position.removeLiquidityTransactionPayload(removeLiquidityParams)

    printTransaction(payload)

    const transferTxn = await sendTransaction(signer, payload)
    console.log('removeLiquidity: ', transferTxn)
  })
  test('3 removeLiquidity', async () => {
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectIds[0]
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, poolObjectId)
    const position = (await buildTestPosition(sdk, position_object_id)) as Position
    console.log('position: ', position)

    const lowerTick = Number(position.tick_lower_index)
    const upperTick = Number(position.tick_upper_index)

    const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick)
    const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick)

    const liquidity = new BN(position.liquidity)
    const slippageTolerance = new Percentage(new BN(5), new BN(100))
    const curSqrtPrice = new BN(pool.current_sqrt_price)

    const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(liquidity, curSqrtPrice, lowerSqrtPrice, upperSqrtPrice, false)
    const { tokenMaxA, tokenMaxB } = adjustForCoinSlippage(coinAmounts, slippageTolerance, false)

    const removeLiquidityParams: RemoveLiquidityParams = {
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      delta_liquidity: liquidity.toString(),
      min_amount_a: tokenMaxA.toString(),
      min_amount_b: tokenMaxB.toString(),
      pool_id: pool.poolAddress,
      pos_id: position.pos_object_id,
      rewarder_coin_types: [],
      collect_fee: true,
    }

    const removeLiquidityTransactionPayload = sdk.Position.removeLiquidityTransactionPayload(removeLiquidityParams)

    printTransaction(removeLiquidityTransactionPayload)

    const transferTxn = await sendTransaction(signer, removeLiquidityTransactionPayload)
    console.log('removeLiquidity: ', transferTxn)
  })

  test('only open position', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, TokensMapping.USDT_USDC_LP.poolObjectIds[0])
    const lowerTick = TickMath.getPrevInitializableTickIndex(
      new BN(pool.current_tick_index).toNumber(),
      new BN(pool.tickSpacing).toNumber()
    )
    const upperTick = TickMath.getNextInitializableTickIndex(
      new BN(pool.current_tick_index).toNumber(),
      new BN(pool.tickSpacing).toNumber()
    )

    const openPositionTransactionPayload = sdk.Position.openPositionTransactionPayload({
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      tick_lower: lowerTick.toString(),
      tick_upper: upperTick.toString(),
      pool_id: pool.poolAddress,
    })

    const transferTxn = await sendTransaction(signer, openPositionTransactionPayload)
    console.log('only open position: ', transferTxn)
  })

  test('close position', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectIds[0]
    const pool = await buildTestPool(sdk, poolObjectId)
    const position = (await buildTestPosition(sdk, position_object_id)) as Position
    console.log('position: ', position)

    const lowerTick = Number(position.tick_lower_index)
    const upperTick = Number(position.tick_upper_index)

    const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick)
    const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick)

    const liquidity = new BN(position.liquidity)
    const slippageTolerance = new Percentage(new BN(5), new BN(100))
    const curSqrtPrice = new BN(pool.current_sqrt_price)

    const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(liquidity, curSqrtPrice, lowerSqrtPrice, upperSqrtPrice, false)
    const { tokenMaxA, tokenMaxB } = adjustForCoinSlippage(coinAmounts, slippageTolerance, false)

    const rewards: any[] = await sdk.Rewarder.posRewardersAmount(poolObjectId, pool.position_manager.positions_handle, position_object_id)
    console.log('rewards: ', rewards)

    const rewardCoinTypes = rewards.filter((item) => Number(item.amount_owed) > 0).map((item) => item.coin_address)

    const closePositionTransactionPayload = sdk.Position.closePositionTransactionPayload({
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      min_amount_a: tokenMaxA.toString(),
      min_amount_b: tokenMaxB.toString(),
      rewarder_coin_types: [...rewardCoinTypes],
      pool_id: pool.poolAddress,
      pos_id: position_object_id,
      collect_fee: false,
    })

    printTransaction(closePositionTransactionPayload)

    const transferTxn = await sendTransaction(signer, closePositionTransactionPayload)
    console.log('close position: ', transferTxn)
  })

  test('collect_fee', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, TokensMapping.USDT_USDC_LP.poolObjectIds[0])
    const collectFeeTransactionPayload = sdk.Position.collectFeeTransactionPayload({
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      pool_id: pool.poolAddress,
      pos_id: position_object_id,
    })

    const transferTxn = await sendTransaction(signer, collectFeeTransactionPayload, true)
    console.log('collect_fee: ', transferTxn)
  })

  test('calculateFee', async () => {
    const pool = await buildTestPool(sdk, TokensMapping.USDT_USDC_LP.poolObjectIds[0])
    const res = await sdk.Position.calculateFee({
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      pool_id: pool.poolAddress,
      pos_id: position_object_id,
    })
    console.log('res: ', res)
  })
})
