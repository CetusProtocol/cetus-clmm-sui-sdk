import BN from 'bn.js'
import { buildSdk, buildTestPool, TokensMapping } from './data/init_test_data'
import { TokenInfo } from '../src/modules/tokenModule';

describe('Rewarder Module', () => {
  const sdk = buildSdk()

  test('swap module', async () => {
    const tokens : TokenInfo[] = []
    await sdk.Router.setCoinList(tokens)
    await sdk.Router.loadGraph()

    const currentPool = await buildTestPool(sdk,TokensMapping.USDT_USDC_LP.poolObjectId[0])
    const a2b = true
    const byAmountIn = true
    const amount = new BN('100000000')

    const tickdatas = await sdk.Pool.fetchTicksByRpc(currentPool.ticks_handle)

    const res = await sdk.Swap.calculateRates({
      decimalsA: 8,
      decimalsB: 6,
      a2b,
      byAmountIn,
      amount,
      swapTicks: tickdatas,
      currentPool,
    })

    console.log('calculateRates0', {
      estimatedAmountIn: res.estimatedAmountIn.toString(),
      estimatedAmountOut: res.estimatedAmountOut.toString(),
      estimatedEndSqrtprice: res.estimatedEndSqrtPrice.toString(),
      isExceed: res.isExceed,
      a2b,
      byAmountIn,
    })

  })

})
