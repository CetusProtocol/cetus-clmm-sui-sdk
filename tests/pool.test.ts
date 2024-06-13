import BN from 'bn.js'
import { SdkEnv, TestnetCoin, buildSdk, buildTestAccount } from './data/init_test_data'
import { TickMath } from '../src/math/tick'
import { d } from '../src/utils/numbers'
import { ClmmPoolUtil } from '../src/math/clmm'
import 'isomorphic-fetch'
import { printTransaction } from '../src/utils/transaction-util'
import { CreatePoolParams } from '../src'

describe('Pool Module', () => {
  const sdk = buildSdk(SdkEnv.testnet)

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
    const pool = await sdk.Pool.getPool('0xc41621d02d5ee00a7a993b912a8550df50524c9b2494339691e5896936ff269b')
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
    const refFee = await sdk.Pool.getPartnerRefFeeAmount('0x0c1e5401e40129da6a65a973b12a034e6c78b7b0b27c3a07213bc5ce3fa3d881')
    console.log('ref fee:', refFee)
  })

  test('claim partner ref fee', async () => {
    const partnerCap = 'xxx'
    const partner = 'xxx'
    const claimRefFeePayload = await sdk.Pool.claimPartnerRefFeePayload(partnerCap, partner, TestnetCoin.SUI)
    const transferTxn = await sdk.fullClient.sendTransaction(buildTestAccount(), claimRefFeePayload)
    console.log('doCreatPool: ', JSON.stringify(transferTxn))
  })
})

