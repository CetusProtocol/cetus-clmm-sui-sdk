
# Open position

```ts
const sendKeypair = buildTestAccount()
// fetch pool data
const pool = await sdk.Pool.getPool(poolAddress)
// build tick range
const lowerTick = TickMath.getPrevInitializableTickIndex(
      new BN(pool.current_tick_index).toNumber(),
      new BN(pool.tickSpacing).toNumber()
    )
const upperTick = TickMath.getNextInitializableTickIndex(
      new BN(pool.current_tick_index).toNumber(),
      new BN(pool.tickSpacing).toNumber()
    )
// build open position payload
const openPositionTransactionPayload = sdk.Position.openPositionTransactionPayload({
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      tick_lower: lowerTick.toString(),
      tick_upper: upperTick.toString(),
      pool_id: pool.poolAddress,
    })
console.log('openPositionTransactionPayload: ', openPositionTransactionPayload)

const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair,openPositionTransactionPayload)
```