import { Ed25519Keypair, getTransactionEffects, ObjectId, RawSigner, SuiExecuteTransactionResponse } from '@mysten/sui.js'
import BN from 'bn.js'
import { buildSdk, buildTestAccount, buildTestPool, TokensMapping } from './data/init_test_data'
import { CoinAsset } from '../src/modules/resourcesModule'
import { CoinAssist } from '../src/math/CoinAssist'
import { extractStructTagFromType } from '../src/utils/contracts'

let sendKeypair: Ed25519Keypair
let allCoinAsset: CoinAsset[] = []

describe('Swap calculate Module', () => {
  const sdk = buildSdk()

  test('calculateRates', async () => {
    const a2b = true
    const byAmountIn = true
    const amount = new BN('1000')

    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]
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
    const lpInfo = TokensMapping.USDT_USDC_LP
    const structTag = extractStructTagFromType(lpInfo.address)

    const tickdatas = await sdk.Pool.fetchTicks({
      pool_id: lpInfo.poolObjectId[0],
      coinTypeA: structTag.type_arguments[0],
      coinTypeB: structTag.type_arguments[1],
    })
    console.log('fetchTicks: ', tickdatas.length)
  })

  test('fetchTicksByRpc', async () => {
    const tickdatas = await sdk.Pool.fetchTicksByRpc('0x565743e41c830e38ea39416d986ed1806da83f62')
    console.log('fetchTicks: ', tickdatas.length)
  })
  test('getTickDataByIndex', async () => {
    const tickdata = await sdk.Pool.getTickDataByIndex('0xf0f1b4e3477d8cd5127ed60bf7de1a4cb722f8d3', '2')
    console.log('tickdata: ', tickdata)
  })

  test('preswap', async () => {
    const a2b = true
    const pool = await buildTestPool(sdk, TokensMapping.USDT_USDC_LP.poolObjectId[0])
    const byAmountIn = true
    const amount = '10000000'

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
  })
})

describe('Swap Module', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
    allCoinAsset = await sdk.Resources.getOwnerCoinAssets(sendKeypair.getPublicKey().toSuiAddress())
    console.log('allCoinAsset: ', allCoinAsset)
  })

  test('swap', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)

    const a2b = true

    const byAmountIn = true
    const amount = new BN(100)
    const slippage = 0.01
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]

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

    const toAmount = res.estimatedAmountOut
    const amountLimit = toAmount.sub(toAmount.mul(new BN(slippage)))

    console.log('swap###params####', { amount: res.amount.toString(), amount_limit: amountLimit.toString() })

    const payCoins: CoinAsset[] = CoinAssist.getCoinAssets(a2b ? currentPool.coinTypeA : currentPool.coinTypeB, allCoinAsset)
    const payObjectIds: ObjectId[] = await CoinAssist.selectCoinAssets(signer, payCoins, BigInt(amount.toString()), sdk)

    const swapPayload = sdk.Swap.createSwapTransactionPayload({
      pool_id: currentPool.poolAddress,
      coin_object_ids_a: a2b ? payObjectIds : [],
      coin_object_ids_b: a2b ? [] : payObjectIds,
      a2b,
      by_amount_in: byAmountIn,
      amount: res.amount.toString(),
      amount_limit: amountLimit.toString(),
      coinTypeA: currentPool.coinTypeA,
      coinTypeB: currentPool.coinTypeB,
    })

    console.log('swapPayload: ', swapPayload)

    const transferTxn = (await signer.executeMoveCall(swapPayload)) as SuiExecuteTransactionResponse
    console.log('swap: ', getTransactionEffects(transferTxn))
  })
})
