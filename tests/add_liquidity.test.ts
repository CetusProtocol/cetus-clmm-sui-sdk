import { TickMath } from '../src/math/tick'
import BN from 'bn.js'
import { buildSdk, buildTestAccount, buildTestPool, buildTestPosition, PoolObjectID, PositionObjectID } from './data/init_test_data'
import { ClmmPoolUtil } from '../src/math/clmm'
import { Percentage } from '../src/math/percentage'
import { adjustForCoinSlippage } from '../src/math/position'
import 'isomorphic-fetch'
import { printTransaction } from '../src/utils/transaction-util'
import { AddLiquidityParams, Position, d, toDecimalsAmount } from '../src'
import Decimal from 'decimal.js'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

let sendKeypair: Ed25519Keypair

describe('add Liquidity Module', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
    sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()
  })

  test('add liquidity for input liquidity', async () => {
    const pool = await buildTestPool(sdk, PoolObjectID)
    const position = (await buildTestPosition(sdk, PositionObjectID)) as Position
    const curSqrtPrice = new BN(pool.current_sqrt_price)
    const lowerTick = Number(position.tick_lower_index)
    const upperTick = Number(position.tick_upper_index)

    const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick)
    const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick)

    const slippageTolerance = new Percentage(new BN(5), new BN(100))
    const liquidity = 10000

    const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(new BN(liquidity), curSqrtPrice, lowerSqrtPrice, upperSqrtPrice, false)

    const { tokenMaxA, tokenMaxB } = adjustForCoinSlippage(coinAmounts, slippageTolerance, true)

    const addLiquidityPayloadParams: AddLiquidityParams = {
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      pool_id: pool.poolAddress,
      tick_lower: lowerTick.toString(),
      tick_upper: upperTick.toString(),
      delta_liquidity: liquidity.toString(),
      max_amount_a: tokenMaxA.toString(),
      max_amount_b: tokenMaxB.toString(),
      pos_id: position.pos_object_id,
      rewarder_coin_types: [],
      collect_fee: false,
    }

    const payload = await sdk.Position.createAddLiquidityPayload(addLiquidityPayloadParams)

    printTransaction(payload)

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, payload)
    console.log('createAddLiquidityPayload: ', transferTxn)
  })



  test('add liquidity for input totalAmount', async () => {
    const pool = await buildTestPool(sdk, PoolObjectID)
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

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, payload)
    console.log('createAddLiquidityPayload: ', transferTxn)
  })

})
