
# Close position

- Close position and remove all liquidity and collect reward

```ts
const sendKeypair = buildTestAccount()
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
const liquidity = new BN(position.liquidity)
// slippage value
const slippageTolerance = new Percentage(new BN(5), new BN(100))
const curSqrtPrice = new BN(pool.current_sqrt_price)
// Get token amount from liquidity.
const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(liquidity, curSqrtPrice, lowerSqrtPrice, upperSqrtPrice, false)
// adjust  token a and token b amount for slippage
const { tokenMaxA, tokenMaxB } = adjustForCoinSlippage(coinAmounts, slippageTolerance, false)
// get all rewarders of position
const rewards: any[] = await sdk.Rewarder.posRewardersAmount(poolObjectId,pool.positions_handle, position_object_id)
const rewardCoinTypes = rewards.filter((item) => Number(item.amount_owed) > 0).map((item)=> item.coin_address)
// build close position payload
const closePositionTransactionPayload = sdk.Position.closePositionTransactionPayload({
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      min_amount_a: tokenMaxA.toString(),
      min_amount_b: tokenMaxB.toString(),
      rewarder_coin_types: [...rewardCoinTypes],
      pool_id: pool.poolAddress,
      pos_id: position_object_id,
    })

const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair,closePositionTransactionPayload)
console.log('close position: ', transferTxn)
```
