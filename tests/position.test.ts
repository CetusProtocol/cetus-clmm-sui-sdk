import { TickMath } from '../src/math/tick'
import BN from 'bn.js'
import { buildSdk, buildTestAccount, buildTestPool, buildTestPosition, pool_object_id, position_object_id } from './data/init_test_data'
import { ClmmPoolUtil } from '../src/math/clmm'
import { Percentage } from '../src/math/percentage'
import { adjustForCoinSlippage } from '../src/math/position'
import 'isomorphic-fetch'
import { printTransaction } from '../src/utils/transaction-util'
import { AddLiquidityFixTokenParams, AddLiquidityParams, Position, RemoveLiquidityParams, d, toDecimalsAmount } from '../src'
import Decimal from 'decimal.js'
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519'

let sendKeypair: Ed25519Keypair

describe('Position add Liquidity Module', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
    sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()
  })

  test('get ower position list', async () => {
    const res = await sdk.Position.getPositionList(buildTestAccount().getPublicKey().toSuiAddress(), [pool_object_id])
    console.log('getPositionList####', res)
  })

  test('get pool position list', async () => {
    const pool = await sdk.Pool.getPool(pool_object_id)
    const res = await sdk.Pool.getPositionList(pool.position_manager.positions_handle)
    console.log('getPositionList####', res)
  })

  test('getPositionById', async () => {
    const res = await sdk.Position.getPositionById('0x7cea8359f50318d88026d702462df7ce9d96a5b12f3efe9dce6d6450fba779a0')
    console.log('getPositionById###', res)
  })

  test('getSipmlePosition', async () => {
    const res = await sdk.Position.getSimplePosition(position_object_id)
    console.log('getSipmlePosition####', res)
  })

  test('getPositionInfo', async () => {
    const pool = await sdk.Pool.getPool(pool_object_id)
    const res = await sdk.Position.getPosition(pool.position_manager.positions_handle, position_object_id)
    console.log('getPositionInfo####', res)
  })

  test('fetchPositionRewardList', async () => {
    const pool = await sdk.Pool.getPool(pool_object_id)
    const res = await sdk.Pool.fetchPositionRewardList({
      pool_id: pool.poolAddress,
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
    })

    console.log('getPosition####', res)
  })

  test('open position', async () => {
    const pool = await buildTestPool(sdk, pool_object_id)
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

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, openPositionTransactionPayload)
    console.log('open position: ', transferTxn)
  })

  test('close position', async () => {
    const poolObjectId = pool_object_id
    const pool = await buildTestPool(sdk, poolObjectId)
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

    const rewards: any[] = await sdk.Rewarder.posRewardersAmount(poolObjectId, pool.position_manager.positions_handle, position_object_id)
    console.log('rewards: ', rewards)

    const rewardCoinTypes = rewards.filter((item) => Number(item.amount_owed) > 0).map((item) => item.coin_address)

    const closePositionTransactionPayload = await sdk.Position.closePositionTransactionPayload({
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      min_amount_a: tokenMaxA.toString(),
      min_amount_b: tokenMaxB.toString(),
      rewarder_coin_types: [...rewardCoinTypes],
      pool_id: pool.poolAddress,
      pos_id: position_object_id,
      collect_fee: true,
    })

    printTransaction(closePositionTransactionPayload)

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, closePositionTransactionPayload)
    console.log('close position: ', transferTxn)
  })

  test('collect_fee', async () => {
    const pool = await buildTestPool(sdk, pool_object_id)
    const collectFeeTransactionPayload = await sdk.Position.collectFeeTransactionPayload({
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      pool_id: pool.poolAddress,
      pos_id: position_object_id,
    })

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, collectFeeTransactionPayload)
    console.log('collect_fee: ', transferTxn)
  })

})
