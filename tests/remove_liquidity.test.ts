import { TickMath } from '../src/math/tick'
import BN from 'bn.js'
import { buildSdk, buildTestAccount, buildTestPool, buildTestPosition, PoolObjectID, PositionObjectID } from './data/init_test_data'
import { ClmmPoolUtil } from '../src/math/clmm'
import { Percentage } from '../src/math/percentage'
import { adjustForCoinSlippage } from '../src/math/position'
import 'isomorphic-fetch'
import { printTransaction } from '../src/utils/transaction-util'
import { Position, RemoveLiquidityParams, d, toDecimalsAmount } from '../src'
import Decimal from 'decimal.js'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

let sendKeypair: Ed25519Keypair

describe('remove liquidity', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
    sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()
  })

  test('getCoinAmountFromLiquidity', async () => {
    const poolObjectId = PoolObjectID
    const pool = await buildTestPool(sdk, poolObjectId)
    const position = (await buildTestPosition(sdk, PositionObjectID)) as Position
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

  test(' remove liquidity for input totalAmount', async () => {
    const pool = await buildTestPool(sdk, PoolObjectID)
    const position = await buildTestPosition(sdk, PositionObjectID)
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

    const payload = await sdk.Position.removeLiquidityTransactionPayload(removeLiquidityParams)

    printTransaction(payload)

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, payload)
    console.log('removeLiquidity: ', transferTxn)
  })

  test('estCoinAmountsFromTotalAmount', async () => {
    const curSqrtPrice = new BN('533835442526411312729')
    // ===>tick_uppe
    const tick_lower_index = 67300
    const tick_upper_index = 67312

    const decimalsA = 6
    const decimalsB = 9

    const totalAmount = '715'
    const tokenPriceA = '0.999728'
    const tokenPriceB = '396.3536950482113947695850345003989648528620680256157171584034162209'

    const coinAmounts = ClmmPoolUtil.estCoinAmountsFromTotalAmount(
      tick_lower_index,
      tick_upper_index,
      curSqrtPrice,
      totalAmount,
      tokenPriceA,
      tokenPriceB
    )
    console.log('coinAmounts: ', coinAmounts)

    const amountA = Decimal.floor(toDecimalsAmount(coinAmounts.amountA.toString(), decimalsA))
    const amountB = Decimal.floor(toDecimalsAmount(coinAmounts.amountB.toString(), decimalsB))

    console.log('tokenAmounts: ', { amountA, amountB })

    const liquidityInput = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
      tick_lower_index,
      tick_upper_index,
      new BN(amountA.toString()),
      true,
      false,
      0.01,
      curSqrtPrice
    )

    console.log('liquidity: ', { tokenMaxA: liquidityInput.coinAmountA.toString(), tokenMaxB: liquidityInput.coinAmountB.toString() })
  })
  test('remove liquidity for input one token', async () => {
    const pool = await buildTestPool(sdk, PoolObjectID)
    const position = await buildTestPosition(sdk, PositionObjectID)
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

    const payload = await sdk.Position.removeLiquidityTransactionPayload(removeLiquidityParams)

    printTransaction(payload)

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, payload)
    console.log('removeLiquidity: ', transferTxn)
  })
  test('remove liquidity for input liquidity', async () => {
    const poolObjectId = PoolObjectID
    const pool = await buildTestPool(sdk, poolObjectId)
    const position = (await buildTestPosition(sdk, PositionObjectID)) as Position

    const lowerTick = Number(position.tick_lower_index)
    const upperTick = Number(position.tick_upper_index)

    const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick)
    const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick)

    const liquidity = new BN(position.liquidity)
    const slippageTolerance = new Percentage(new BN(5), new BN(100))
    const curSqrtPrice = new BN(pool.current_sqrt_price)

    const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(liquidity, curSqrtPrice, lowerSqrtPrice, upperSqrtPrice, false)
    const { tokenMaxA, tokenMaxB } = adjustForCoinSlippage(coinAmounts, slippageTolerance, false)

    const rewards: any[] = await sdk.Rewarder.posRewardersAmount(poolObjectId, pool.position_manager.positions_handle, PositionObjectID)
    console.log('rewards: ', rewards)

    const rewardCoinTypes = rewards.filter((item) => Number(item.amount_owed) >= 0).map((item) => item.coin_address)

    const removeLiquidityParams: RemoveLiquidityParams = {
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      delta_liquidity: liquidity.toString(),
      min_amount_a: tokenMaxA.toString(),
      min_amount_b: tokenMaxB.toString(),
      pool_id: pool.poolAddress,
      pos_id: position.pos_object_id,
      rewarder_coin_types: [...rewardCoinTypes],
      collect_fee: true,
    }

    const removeLiquidityTransactionPayload = await sdk.Position.removeLiquidityTransactionPayload(removeLiquidityParams)

    printTransaction(removeLiquidityTransactionPayload)

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, removeLiquidityTransactionPayload)
    console.log('removeLiquidity: ', transferTxn)
  })

})
