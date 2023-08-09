
# Collect fee

- Provide to the position to collect the fee of the position earned.

```ts
const sendKeypair = buildTestAccount()
// Fetch pool data
const pool = await sdk.Pool.getPool(poolAddress)
// Fetch position data
const position =  await sdk.Position.getPosition(position_object_id)

// build collect fee Payload
const removeLiquidityPayload = (await sdk.Position.collectFeeTransactionPayload(
        {
          pool_id: pool.poolAddress,
          coinTypeA: pool.coinTypeA,
          coinTypeB: pool.coinTypeB,
          pos_id: position.position_object_id,
        },
        true
      ))
const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair,collectFeeTransactionPayload)
console.log('collect_fee: ', transferTxn)
```
