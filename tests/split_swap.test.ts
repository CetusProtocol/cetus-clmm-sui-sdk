import BN from 'bn.js'
import { buildSdk, buildTestPool, TokensMapping } from './data/init_test_data'
import 'isomorphic-fetch';
import { SplitSwap, SplitUnit } from '../src'

describe('SplitSwap compute swap test', () => {
  const sdk = buildSdk()

  test('computeSwap vs calculateRates vs preSwap', async () => {
    const a2b = true
    const byAmountIn = false
    const amount = new BN('100000000')

    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]
    const currentPool = await buildTestPool(sdk, poolObjectId)
    const tickdatas = await sdk.Pool.fetchTicksByRpc(currentPool.ticks_handle)

    const splitSwap = new SplitSwap(amount, SplitUnit.TWENTY, currentPool, a2b, byAmountIn, tickdatas)
    const splitSwapResult = await splitSwap.computeSwap()

    for(let i = 1; i < splitSwapResult.amountInArray.length; i += 1) {
      const calAmount = splitSwap.amountArray[i]

      const calculateResult = await sdk.Swap.calculateRates({
        decimalsA: 8,
        decimalsB: 8,
        a2b,
        byAmountIn,
        amount: calAmount,
        swapTicks: tickdatas,
        currentPool,
      })

      const perSwapResult: any = await sdk.Swap.preswap({
        pool: currentPool,
        current_sqrt_price: currentPool.current_sqrt_price,
        coinTypeA: currentPool.coinTypeA,
        coinTypeB: currentPool.coinTypeB,
        decimalsA: 8,
        decimalsB: 8,
        a2b,
        by_amount_in: byAmountIn,
        amount: calAmount.toString(),
      })

      console.log(`
        amountIn ${i}-> splitSwap:${splitSwapResult.amountInArray[i].toString()}, calculate: ${calculateResult.estimatedAmountIn.toString()}, preSwap: ${perSwapResult.estimatedAmountIn.toString()} \n
        amountOut ${i}-> splitSwap:${splitSwapResult.amountOutArray[i].toString()}, calculate: ${calculateResult.estimatedAmountOut.toString()}, preSwap: ${perSwapResult.estimatedAmountOut.toString()}\n
        isExceed ${i}-> splitSwap:${splitSwapResult.isExceed[i]}, calculate: ${calculateResult.isExceed}, preSwap: ${perSwapResult.isExceed}
      `)
    }
  })
})
