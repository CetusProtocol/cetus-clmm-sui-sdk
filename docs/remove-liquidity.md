# Remove liquidity

## Remove liquidity by input liquidity amount

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
// Fetch pool data
const pool = await sdk.Pool.getPool(poolAddress)
// Fetch position data
const position = await sdk.Position.getPositionInfo(position_object_id)
// build tick data
const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_lower_index)
const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_upper_index)
const ticksHandle = pool.ticks_handle
const tickLower = await sdk.Pool.getTickDataByIndex(ticksHandle, position.tick_lower_index)
const tickUpper = await sdk.Pool.getTickDataByIndex(ticksHandle, position.tick_upper_index)
// input liquidity amount for remove
const liquidity = new BN(10000)
// slippage value
const slippageTolerance = new Percentage(new BN(5), new BN(100))
const curSqrtPrice = new BN(pool.current_sqrt_price)
// Get token amount from liquidity.
const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(liquidity, curSqrtPrice, lowerSqrtPrice, upperSqrtPrice, false)
// adjust  token a and token b amount for slippage
const { tokenMaxA, tokenMaxB } = adjustForCoinSlippage(coinAmounts, slippageTolerance, false)

// build remove liquidity params
const removeLiquidityParams : RemoveLiquidityParams = {
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      delta_liquidity: liquidity.toString(),
      min_amount_a: tokenMaxA.toString(),
      min_amount_b: tokenMaxB.toString(),
      pool_id: pool.poolAddress,
      pos_id: position.pos_object_id
      collect_fee: true // Whether to collect fee
    }
const removeLiquidityTransactionPayload = sdk.Position.removeLiquidityTransactionPayload(removeLiquidityParams)

const transferTxn = await sendTransaction(signer, removeLiquidityTransactionPayload)
console.log('removeLiquidity: ', transferTxn)
```
