import { Ed25519Keypair, RawSigner } from '@mysten/sui.js'
import BN from 'bn.js'
import { buildSdk, buildTestAccount, buildTestPool, TokensMapping } from './data/init_test_data'
import 'isomorphic-fetch'
import { printTransaction, sendTransaction } from '../src/utils/transaction-util'
import { adjustForSlippage, d, Percentage, TickMath } from '../src'

let sendKeypair: Ed25519Keypair

describe('Swap calculate Module', () => {
  const sdk = buildSdk()

  test('calculateRates', async () => {
    const a2b = true
    const byAmountIn = true
    const amount = new BN('1000')

    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectIds[0]
    const currentPool = await buildTestPool(sdk, poolObjectId)

    const tickdatas = await sdk.Pool.fetchTicksByRpc(currentPool.ticks_handle)
    const res = await sdk.Swap.calculateRates({
      decimalsA: 6,
      decimalsB: 6,
      a2b,
      byAmountIn,
      amount,
      swapTicks: tickdatas,
      currentPool,
    })

    console.log('calculateRates', {
      estimatedAmountIn: res.estimatedAmountIn.toString(),
      estimatedAmountOut: res.estimatedAmountOut.toString(),
      estimatedEndSqrtprice: res.estimatedEndSqrtPrice.toString(),
      estimatedFeeAmount: res.estimatedFeeAmount.toString(),
      isExceed: res.isExceed,
      a2b,
      byAmountIn,
    })
  })

  test('fetchTicksByContract', async () => {
    const tickdatas = await sdk.Pool.fetchTicks({
      pool_id: TokensMapping.USDT_USDC_LP.poolObjectIds[0],
      coinTypeA: '0x473d520316e4ea5550657410669c9da6cde191e570d63d754cee353e11746751::usdt::USDT',
      coinTypeB: '0x473d520316e4ea5550657410669c9da6cde191e570d63d754cee353e11746751::usdc::USDC',
    })
    console.log('fetchTicks: ', tickdatas)
  })

  test('fetchTicksByRpc', async () => {
    const tickdatas = await sdk.Pool.fetchTicksByRpc('0x8d2ed466497914180b59fb3ad2cf036ac62f59c3761646caba51dfa92ca9c97a')
    console.log('fetchTicks: ', tickdatas)
  })
  test('getTickDataByIndex', async () => {
    const tickdata = await sdk.Pool.getTickDataByIndex('0x79696ca8bcdc45b9e15ef7da074a9c9a6f94739021590d7f57a3ed4055b93532', -443636)
    console.log('tickdata: ', tickdata)
  })

  test('preSwapWithMultiPool', async () => {
    const a2b = true
    const poolAddresses = [
      '0x018734f81283c5320fd322178f8d4aeafb6e0034959a890987b10705297b61e3',
      '0x684d8a994e695578e5e45ad3aa020a338c9d42879f7b1853a1cede6e317ba900',
      '0x525d2a587f56a42ea350072d61b0c00283f9587949764332c4c2bb0e6db9b9f8',
    ]
    const pool0 = await buildTestPool(sdk, poolAddresses[0])
    const pool1 = await buildTestPool(sdk, poolAddresses[1])
    const pool2 = await buildTestPool(sdk, poolAddresses[2])
    const byAmountIn = true
    const amount = '10000000'

    const resWithMultiPool: any = await sdk.Swap.preSwapWithMultiPool({
      poolAddresses: poolAddresses,
      coinTypeA: pool0.coinTypeA,
      coinTypeB: pool0.coinTypeB,
      a2b,
      byAmountIn,
      amount,
    })

    for (const pool of [pool0, pool1, pool2]) {
      const res: any = await sdk.Swap.preswap({
        pool: pool,
        current_sqrt_price: pool.current_sqrt_price,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB,
        decimalsA: 6,
        decimalsB: 6,
        a2b,
        by_amount_in: byAmountIn,
        amount,
      })
      console.log('preswap###res###', res)
    }

    console.log('preswap###res###', resWithMultiPool)
  })

  test('preswap', async () => {
    const a2b = true
    const pool = await sdk.Pool.getPool('0xc41621d02d5ee00a7a993b912a8550df50524c9b2494339691e5896936ff269b')
    const byAmountIn = true
    const amount = '1000000'

    const res: any = await sdk.Swap.preswap({
      pool: pool,
      current_sqrt_price: pool.current_sqrt_price,
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      decimalsA: 6,
      decimalsB: 8,
      a2b,
      by_amount_in: byAmountIn,
      amount,
    })

    console.log('preswap###res###', res)
  })
})

describe('Swap Module', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
    sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()
  })

  test('swap', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)

    const a2b = false
    const byAmountIn = true
    const amount = new BN('1664')
    const slippage = Percentage.fromDecimal(d(0.1))
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectIds[0]

    const currentPool = await buildTestPool(sdk, poolObjectId)
    console.log('currentPool: ', currentPool)

    const tickdatas = await sdk.Pool.fetchTicksByRpc(currentPool.ticks_handle)

    const decimalsA = 8
    const decimalsB = 9
    const calculateRatesParams = {
      decimalsA,
      decimalsB,
      a2b,
      byAmountIn,
      amount,
      swapTicks: tickdatas,
      currentPool,
    }
    const res = await sdk.Swap.calculateRates(calculateRatesParams)

    console.log('calculateRates', {
      estimatedAmountIn: res.estimatedAmountIn.toString(),
      estimatedAmountOut: res.estimatedAmountOut.toString(),
      estimatedEndSqrtprice: res.estimatedEndSqrtPrice.toString(),
      estimatedFeeAmount: res.estimatedFeeAmount.toString(),
      isExceed: res.isExceed,
      a2b,
      byAmountIn,
    })

    const toAmount = byAmountIn ? res.estimatedAmountOut : res.estimatedAmountIn

    const amountLimit = adjustForSlippage(toAmount, slippage, !byAmountIn)

    const swapPayload = await sdk.Swap.createSwapTransactionPayload({
      pool_id: currentPool.poolAddress,
      a2b,
      by_amount_in: byAmountIn,
      amount: amount.toString(),
      amount_limit: amountLimit.toString(),
      coinTypeA: currentPool.coinTypeA,
      coinTypeB: currentPool.coinTypeB,
    })

    printTransaction(swapPayload)
    const transferTxn = await sendTransaction(signer, swapPayload, false)
    console.log('swap: ', transferTxn)
  })
})
