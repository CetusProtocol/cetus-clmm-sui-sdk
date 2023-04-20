import { TickMath } from '../src/math/tick'
import BN from 'bn.js'
import { RawSigner, Ed25519Keypair } from '@mysten/sui.js'
import { buildSdk, buildTestAccount, buildTestPool, buildTestPosition, position_object_id, TokensMapping } from './data/init_test_data'
import { Position } from '../src/modules/resourcesModule'
import { ClmmPoolUtil } from '../src/math/clmm'
import { AddLiquidityFixTokenParams, RemoveLiquidityParams } from '../src/modules/positionModule'
import { Percentage } from '../src/math/percentage'
import { adjustForCoinSlippage } from '../src/math/position'
import 'isomorphic-fetch';
import { printTransaction, sendTransaction, TransactionUtil } from '../src/utils/transaction-util';
import { tuple } from 'superstruct'

let sendKeypair: Ed25519Keypair

describe('Position add Liquidity Module', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
    sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()
  })

  test('open_and_add_liquidity_fix_token', async () => {
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, poolObjectId)
    const lowerTick = TickMath.getPrevInitializableTickIndex(
      new BN(pool.current_tick_index).toNumber(),
      new BN(pool.tickSpacing).toNumber()
    )
    const upperTick = TickMath.getNextInitializableTickIndex(
      new BN(pool.current_tick_index).toNumber(),
      new BN(pool.tickSpacing).toNumber()
    )
    const coinAmount = new BN(40)
    const fix_amount_a = false
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
      is_open: true,
      pos_id: '',
    }


    const createAddLiquidityTransactionPayload = await sdk.Position.createAddLiquidityTransactionPayload(addLiquidityPayloadParams, {
      slippage: slippage,
      curSqrtPrice: curSqrtPrice
    })


    printTransaction(createAddLiquidityTransactionPayload)

    const transferTxn = await sendTransaction(signer,createAddLiquidityTransactionPayload)
    console.log('open_and_add_liquidity_fix_token: ', transferTxn)
  })

  test('add_liquidity_fix_token', async () => {
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, poolObjectId)
    const position = (await buildTestPosition(sdk, position_object_id)) as Position
    const lowerTick = position.tick_lower_index
    const upperTick = position.tick_upper_index
    const coinAmount = new BN(50)
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
    }
    const createAddLiquidityTransactionPayload = await sdk.Position.createAddLiquidityTransactionPayload(addLiquidityPayloadParams)

    printTransaction(createAddLiquidityTransactionPayload)

    const transferTxn = await sendTransaction(signer,createAddLiquidityTransactionPayload)
    console.log('add_liquidity_fix_token: ', transferTxn)
  })
})

describe('Position  Module', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
  })

  test('getCoinAmountFromLiquidity', async () => {
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]
    const pool = await buildTestPool(sdk, poolObjectId)
    const position = (await buildTestPosition(sdk, position_object_id)) as Position
    const curSqrtPrice = new BN(pool.current_sqrt_price)

    const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_lower_index)
    const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_upper_index)
    const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
      new BN(position.liquidity),
      curSqrtPrice,
      lowerSqrtPrice,
      upperSqrtPrice,
      true
    )

    console.log('coinA: ', coinAmounts.coinA.toString())
    console.log('coinB: ', coinAmounts.coinB.toString())
  })

  test('removeLiquidity', async () => {
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, poolObjectId)
    const position = (await buildTestPosition(sdk, position_object_id)) as Position

    const lowerTick = Number(position.tick_lower_index)
    const upperTick = Number(position.tick_upper_index)

    const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick)
    const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick)

    const liquidity = new BN(10)
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
      collect_fee: true
    }

    const removeLiquidityTransactionPayload = sdk.Position.removeLiquidityTransactionPayload(removeLiquidityParams)

    printTransaction(removeLiquidityTransactionPayload)


    const transferTxn = await sendTransaction(signer, removeLiquidityTransactionPayload)
    console.log('removeLiquidity: ', transferTxn)
  })


  test('only open position', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, TokensMapping.USDT_USDC_LP.poolObjectId[0])
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


    const transferTxn = await sendTransaction(signer,openPositionTransactionPayload)
    console.log('only open position: ', transferTxn)
  })

  test('close position', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]
    const pool = await buildTestPool(sdk, poolObjectId)
    const position_object_id = "0xdc02a15b8d8d329cae14543d0bf19eb40d5ddffbceceffbbb7098dc18958ac6f"
    const position = (await buildTestPosition(sdk, position_object_id)) as Position

    const lowerTick = Number(position.tick_lower_index)
    const upperTick = Number(position.tick_upper_index)

    const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick)
    const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick)

    const liquidity = new BN(position.liquidity)
    const slippageTolerance = new Percentage(new BN(5), new BN(100))
    const curSqrtPrice = new BN(pool.current_sqrt_price)

    const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(liquidity, curSqrtPrice, lowerSqrtPrice, upperSqrtPrice, false)
    const { tokenMaxA, tokenMaxB } = adjustForCoinSlippage(coinAmounts, slippageTolerance, false)

    const rewards: any[] = await sdk.Rewarder.posRewardersAmount(poolObjectId,pool.positions_handle, position_object_id)
    console.log("rewards: ",rewards);

    const rewardCoinTypes = rewards.filter((item) => {
      if(Number(item.amount_owed) > 0){
        return item.coin_address as string
      }
    })

    const closePositionTransactionPayload = sdk.Position.closePositionTransactionPayload({
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      min_amount_a: tokenMaxA.toString(),
      min_amount_b: tokenMaxB.toString(),
      rewarder_coin_types: [...rewardCoinTypes],
      pool_id: pool.poolAddress,
      pos_id: position_object_id,
    })

    printTransaction(closePositionTransactionPayload)

    const transferTxn = await sendTransaction(signer,closePositionTransactionPayload)
    console.log('close position: ', transferTxn)
  })

  test('collect_fee', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, TokensMapping.USDT_USDC_LP.poolObjectId[0])
    const collectFeeTransactionPayload = sdk.Position.collectFeeTransactionPayload({
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      pool_id: pool.poolAddress,
      pos_id: position_object_id,
    })


    // console.log(await TransactionUtil.calculationTxGas(sdk,collectFeeTransactionPayload));

    const transferTxn = await sendTransaction(signer,collectFeeTransactionPayload)
    console.log('collect_fee: ', transferTxn)
  })
})
