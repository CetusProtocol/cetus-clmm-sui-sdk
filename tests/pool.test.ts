import { RawSigner } from '@mysten/sui.js'
import BN from 'bn.js'
import { buildSdk, buildTestAccount, TokensMapping, position_object_id } from './data/init_test_data'
import { TickMath } from '../src/math/tick'
import { d } from '../src/utils/numbers'
import { ClmmPoolUtil } from '../src/math/clmm'
import 'isomorphic-fetch'
import { printTransaction, sendTransaction } from '../src/utils/transaction-util'
import { poolList } from './data/pool_data'
import { CreatePoolParams } from '../src'

describe('Pool Module', () => {
  const sdk = buildSdk()

  test('getPoolImmutables', async () => {
    const poolImmutables = await sdk.Pool.getPoolImmutables()
    console.log('getPoolImmutables', poolImmutables)
  })

  test('getAllPool', async () => {
    const allPool = await sdk.Pool.getPools([])
    console.log('getAllPool', allPool, '###length###', allPool.length)
  })

  test('getSiginlePool', async () => {
    const pool = await sdk.Pool.getPool(TokensMapping.USDT_USDC_LP.poolObjectIds[0])
    console.log('pool', pool)
  })

  test('get ower position list', async () => {
    const res = await sdk.Position.getPositionList(buildTestAccount().getPublicKey().toSuiAddress())
    console.log('getPositionList####', res)
  })

  test('get pool position list', async () => {
    const pool = await sdk.Pool.getPool(TokensMapping.USDT_USDC_LP.poolObjectIds[0])
    const res = await sdk.Pool.getPositionList(pool.position_manager.positions_handle)
    console.log('getPositionList####', res)
  })

  test('getPositionById', async () => {
    const res = await sdk.Position.getPositionById('0xac12f1a37cdbe6b7cd24d107d735152d9f82c33079f55e117c13d971b5248ff5')
    console.log('getPositionById###', res)
  })

  test('getSipmlePosition', async () => {
    const res = await sdk.Position.getSipmlePosition(position_object_id)
    console.log('getPositionList####', res)
  })

  test('getPositionInfo', async () => {
    const pool = await sdk.Pool.getPool(TokensMapping.USDT_USDC_LP.poolObjectIds[0])
    const res = await sdk.Position.getPosition(pool.position_manager.positions_handle, position_object_id)
    console.log('getPositionList####', res)
  })

  test('fetchPositionRewardList', async () => {
    const pool = await sdk.Pool.getPool(TokensMapping.USDT_USDC_LP.poolObjectIds[0])
    const res = await sdk.Pool.fetchPositionRewardList({
      pool_id: pool.poolAddress,
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
    })

    console.log('getPosition####', res)
  })

  test('doCreatPools', async () => {
    const signer = new RawSigner(buildTestAccount(), sdk.fullClient)
    sdk.senderAddress = buildTestAccount().getPublicKey().toSuiAddress()
    const pools = poolList
    const paramss: CreatePoolParams[] = []
    for (const pool of pools) {
      if (!pool.hasCreat) {
        paramss.push({
          tick_spacing: pool.tick_spacing,
          initialize_sqrt_price: TickMath.priceToSqrtPriceX64(
            d(pool.initialize_price),
            pool.coin_a_decimals,
            pool.coin_b_decimals
          ).toString(),
          uri: pool.uri,
          coinTypeA: pool.coin_type_a,
          coinTypeB: pool.coin_type_b,
        })
      }
    }

    const creatPoolTransactionPayload = await sdk.Pool.creatPoolsTransactionPayload(paramss)

    printTransaction(creatPoolTransactionPayload)
    const transferTxn = await sendTransaction(signer, creatPoolTransactionPayload)
    console.log('doCreatPool: ', transferTxn)
  })

  test('create_and_add_liquidity_fix_token', async () => {
    const signer = new RawSigner(buildTestAccount(), sdk.fullClient)
    sdk.senderAddress = buildTestAccount().getPublicKey().toSuiAddress()
    const initialize_sqrt_price = TickMath.priceToSqrtPriceX64(d(0.3), 6, 6).toString()
    const tick_spacing = 2
    const current_tick_index = TickMath.sqrtPriceX64ToTickIndex(new BN(initialize_sqrt_price))

    const lowerTick = TickMath.getPrevInitializableTickIndex(new BN(current_tick_index).toNumber(), new BN(tick_spacing).toNumber())
    const upperTick = TickMath.getNextInitializableTickIndex(new BN(current_tick_index).toNumber(), new BN(tick_spacing).toNumber())

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
      coinTypeA: '0x219d80b1be5d586ff3bdbfeaf4d051ec721442c3a6498a3222773c6945a73d9f::usdt::USDT',
      coinTypeB: TokensMapping.SUI.address,
      amount_a: amount_a,
      amount_b: amount_b,
      fix_amount_a: fix_amount_a,
      tick_lower: lowerTick,
      tick_upper: upperTick,
    })

    const transferTxn = await sendTransaction(signer, creatPoolTransactionPayload)
    console.log('doCreatPool: ', transferTxn)
  })
})
