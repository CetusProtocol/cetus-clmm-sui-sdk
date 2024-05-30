import { TickMath } from '../src/math/tick'
import BN from 'bn.js'
import { buildSdk, buildTestAccount, buildTestPool, buildTestPosition, PoolObjectID, PositionObjectID } from './data/init_test_data'
import { ClmmPoolUtil } from '../src/math/clmm'
import 'isomorphic-fetch'
import { printTransaction } from '../src/utils/transaction-util'
import { AddLiquidityFixTokenParams, Position, d } from '../src'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

let sendKeypair: Ed25519Keypair

describe('add_liquidity_fix_token', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
    sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()
  })

  test('open_and_add_liquidity_fix_token', async () => {
    const pool = await buildTestPool(sdk, PoolObjectID)
    const lowerTick = TickMath.getPrevInitializableTickIndex(
      new BN(pool.current_tick_index).toNumber(),
      new BN(pool.tickSpacing).toNumber()
    )
    const upperTick = TickMath.getNextInitializableTickIndex(
      new BN(pool.current_tick_index).toNumber(),
      new BN(pool.tickSpacing).toNumber()
    )
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
      slippage,
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
    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, createAddLiquidityTransactionPayload)
    console.log('open_and_add_liquidity_fix_token: ', transferTxn)
  })

  test('add_liquidity_fix_token', async () => {
    const poolObjectId = PoolObjectID
    const pool = await buildTestPool(sdk, poolObjectId)
    const position = (await buildTestPosition(sdk, PositionObjectID)) as Position
    const lowerTick = position.tick_lower_index
    const upperTick = position.tick_upper_index
    const coinAmount = new BN(50000000000)
    const fix_amount_a = true
    const slippage = 0.1
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
      slippage,
      is_open: false,
      pos_id: position.pos_object_id,
      rewarder_coin_types: [],
      collect_fee: true,
    }
    const createAddLiquidityTransactionPayload = await sdk.Position.createAddLiquidityFixTokenPayload(addLiquidityPayloadParams)

    printTransaction(createAddLiquidityTransactionPayload)

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, createAddLiquidityTransactionPayload)
    console.log('add_liquidity_fix_token: ', transferTxn)
  })
})
