import { RawSigner, TransactionBlock } from '@mysten/sui.js'
import BN from 'bn.js'
import {
  buildSdk,
  buildTestAccount,
  TokensMapping,
  position_object_id,
  buildWJLaunchPadAccount,
} from './data/init_test_data'
import { TickMath } from '../src/math/tick'
import { d } from '../src/utils/numbers'
import { ClmmPoolUtil } from '../src/math/clmm'
import 'isomorphic-fetch'
import { printTransaction, sendTransaction, TransactionUtil } from '../src/utils/transaction-util'
import { poolList } from './data/pool_data'
import { CreatePoolParams } from '../src'

describe('Pool Module', () => {
  const sdk = buildSdk()

  test('getPoolImmutables', async () => {
    const poolImmutables = await sdk.Pool.getPoolImmutables()
    console.log('getPoolImmutables', poolImmutables, '###length###', poolImmutables.length)
  })

  test('getAllPool', async () => {
   const allPool = await sdk.Pool.getPools([])
   console.log('getAllPool', allPool,'###length###', allPool.length)
  })

  test('getSiginlePool', async () => {
    const pool = await sdk.Pool.getPool(TokensMapping.USDT_USDC_LP.poolObjectId[0])
    console.log('pool', pool)
  })

  test('get ower position list', async () => {
    const res = await sdk.Position.getPositionList(buildTestAccount().getPublicKey().toSuiAddress())
    console.log('getPositionList####', res)
  })

  test('get pool position list', async () => {
    const pool = await sdk.Pool.getPool(TokensMapping.USDT_USDC_LP.poolObjectId[0])
    const res = await sdk.Pool.getPositionList(pool.position_manager.positions_handle)
    console.log('getPositionList####', res)
  })


  test('getPositionById', async () => {
    const res = await sdk.Position.getPositionById('0x74055642637856f8e8ea2a9724be86250a4fa2b87969ba663aabfcf4c99db33c')
    console.log('getPositionById###', res)
  })

  test('getSipmlePosition', async () => {
    const res = await sdk.Position.getSipmlePosition(position_object_id)
    console.log('getPositionList####', res)
  })


  test('getPositionInfo', async () => {
    //const pool = await sdk.Pool.getPool(TokensMapping.USDT_USDC_LP.poolObjectId[0])
    //const res = await sdk.Position.getPosition(pool.positions_handle, "0x545d43936d9e8bad18fe4034b39cfbcf664fc79300358b5beedbb76936d3b7e8")
    const res = await sdk.Position.getPosition('0xc203a9d8ffd64dde8e664c9092f39db7a2f4a267709d30be93814a5edb95454f', "0x95838f0ba6cf343689d6b38234d82c7722c57d79deacfb8837aa8aae2958072c")
    console.log('getPosition####', res)
  })

  test('fetchPositionRewardList', async () => {
    const pool = await sdk.Pool.getPool("0xf71b517fe0f57a4e3be5b00a90c40f461058f5ae7a4bb65fe1abf3bfdd20dcf7")
    const res = await sdk.Pool.fetchPositionRewardList({
      pool_id: pool.poolAddress,
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB
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
    const transferTxn = await sendTransaction(signer,creatPoolTransactionPayload)
    console.log('doCreatPool: ', transferTxn)
  })

  test('create_and_add_liquidity_fix_token', async () => {

    const signer = new RawSigner(buildTestAccount(), sdk.fullClient)
    sdk.senderAddress = buildTestAccount().getPublicKey().toSuiAddress()
    const initialize_sqrt_price = TickMath.priceToSqrtPriceX64(d(1), 6, 6).toString()
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
      coinTypeA: TokensMapping.USDT.address,
      coinTypeB: TokensMapping.USDC.address,
      amount_a: amount_a,
      amount_b: amount_b,
      fix_amount_a: fix_amount_a,
      tick_lower: lowerTick,
      tick_upper: upperTick,
    })


    const transferTxn = await sendTransaction(signer, creatPoolTransactionPayload,true)
    console.log('doCreatPool: ', transferTxn)
  })

  test('add_fee_tier', async () => {
    const signer = new RawSigner(buildWJLaunchPadAccount(), sdk.fullClient)
    const tx = new TransactionBlock()
    const args = [tx.pure(sdk.sdkOptions.clmm.config!.global_config_id), tx.pure('2'), tx.pure('1')]

    tx.moveCall({
      target: `${sdk.sdkOptions.clmm.clmm_router.cetus}::config_script::add_fee_tier`,
      typeArguments: [],
      arguments: args,
    })
    const transferTxn = await sendTransaction(signer, tx)
    console.log('add_fee_tier: ', transferTxn)
  })
})
