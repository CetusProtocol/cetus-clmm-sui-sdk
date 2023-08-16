import BN from 'bn.js'
import { buildSdk, buildTestAccount, pool_object_id, position_object_id } from './data/init_test_data'
import { TickMath } from '../src/math/tick'
import { d } from '../src/utils/numbers'
import { ClmmPoolUtil } from '../src/math/clmm'
import 'isomorphic-fetch'
import { printTransaction } from '../src/utils/transaction-util'
import { CreatePoolParams } from '../src'

describe('Pool Module', () => {
  const sdk = buildSdk()

  test('getAllPools', async () => {
    const pools = await sdk.Pool.getPoolsWithPage([])
    console.log(pools.length)
  })

  test('getPoolImmutables', async () => {
    const poolImmutables = await sdk.Pool.getPoolImmutables()
    console.log('getPoolImmutables', poolImmutables)
  })

  test('getAllPool', async () => {
    const allPool = await sdk.Pool.getPools([])
    console.log('getAllPool', allPool, '###length###', allPool.length)
  })

  test('getSiginlePool', async () => {
    const pool = await sdk.Pool.getPool('0x25ccb77dc4de57879e12ac7f8458860a0456a0a46a84b9f4a8903b5498b96665')
    console.log('pool', pool)
  })

  test('doCreatPools', async () => {
    sdk.senderAddress = buildTestAccount().getPublicKey().toSuiAddress()
    const tick_spacing = 2
    const initialize_price = 1
    const coin_a_decimals = 6
    const coin_b_decimals = 6
    const coin_type_a = `${sdk.sdkOptions.faucet?.package_id}::usdt::USDT`
    const coin_type_b = `{sdk.sdkOptions.faucet?.package_id}::usdc::USDC`

    const creatPoolTransactionPayload = await sdk.Pool.creatPoolsTransactionPayload([
      {
        tick_spacing: tick_spacing,
        initialize_sqrt_price: TickMath.priceToSqrtPriceX64(d(initialize_price), coin_a_decimals, coin_b_decimals).toString(),
        uri: '',
        coinTypeA: coin_type_a,
        coinTypeB: coin_type_b,
      },
    ])

    printTransaction(creatPoolTransactionPayload)
    const transferTxn = await sdk.fullClient.sendTransaction(buildTestAccount(), creatPoolTransactionPayload)
    console.log('doCreatPool: ', transferTxn)
  })

  test('create_and_add_liquidity_fix_token', async () => {
    sdk.senderAddress = buildTestAccount().getPublicKey().toSuiAddress()
    const initialize_sqrt_price = TickMath.priceToSqrtPriceX64(d(0.3), 6, 6).toString()
    const tick_spacing = 2
    const current_tick_index = TickMath.sqrtPriceX64ToTickIndex(new BN(initialize_sqrt_price))

    const lowerTick = TickMath.getPrevInitializableTickIndex(new BN(current_tick_index).toNumber(), new BN(tick_spacing).toNumber())
    const upperTick = TickMath.getNextInitializableTickIndex(new BN(current_tick_index).toNumber(), new BN(tick_spacing).toNumber())
    const coin_type_a = `${sdk.sdkOptions.faucet?.package_id}::usdt::USDT`
    const coin_type_b = `{sdk.sdkOptions.faucet?.package_id}::usdc::USDC`

    const fix_coin_amount = new BN(200)
    const fix_amount_a = true
    const slippage = 0.05

    const liquidityInput = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
      lowerTick,
      upperTick,
      fix_coin_amount,
      fix_amount_a,
      true,
      slippage,
      new BN(initialize_sqrt_price)
    )

    const amount_a = fix_amount_a ? fix_coin_amount.toNumber() : liquidityInput.tokenMaxA.toNumber()
    const amount_b = fix_amount_a ? liquidityInput.tokenMaxB.toNumber() : fix_coin_amount.toNumber()

    console.log('amount: ', { amount_a, amount_b })

    const creatPoolTransactionPayload = await sdk.Pool.creatPoolTransactionPayload({
      tick_spacing: tick_spacing,
      initialize_sqrt_price: initialize_sqrt_price,
      uri: '',
      coinTypeA: coin_type_a,
      coinTypeB: coin_type_b,
      amount_a: amount_a,
      amount_b: amount_b,
      slippage,
      fix_amount_a: fix_amount_a,
      tick_lower: lowerTick,
      tick_upper: upperTick,
    })

    const transferTxn = await sdk.fullClient.sendTransaction(buildTestAccount(), creatPoolTransactionPayload)
    console.log('doCreatPool: ', transferTxn)
  })

  test('get partner ref fee', async () => {
    const refFee = await sdk.Pool.getPartnerRefFeeAmount('0x5c41a004f0a781e9d050eec46f64c7f713deb385405b619148a845c5df63805d')
    console.log('ref fee:', refFee)
  })
})
