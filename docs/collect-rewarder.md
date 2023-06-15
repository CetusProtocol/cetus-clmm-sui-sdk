
# collect rewarder

- Provide to the position to collect the rewarder of the position earned.
- code example for this guide can be found [rewarder.test.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/rewarder.test.ts)

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
// Fetch pool data
const pool = await sdk.Pool.getPool(poolAddress)
// Fetch all rewarder for position
const rewards: any[] = await sdk.Rewarder.posRewardersAmount(pool.poolAddress, poolObjectId)
const rewardCoinTypes = rewards.filter((item) => Number(item.amount_owed) > 0).map((item)=> item.coin_address)

// build collect rewarder Payload
const collectRewarderParams: CollectRewarderParams = {
      pool_id: pool.poolAddress,
      pos_id: poolObjectId,
      rewarder_coin_types: [ ...rewardCoinTypes],
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      collect_fee: false
    }

const collectRewarderPayload =  sdk.Rewarder.collectRewarderTransactionPayload(collectRewarderParams)

const transferTxn = (await signer.signAndExecuteTransactionBlock({transactionBlock:collectRewarderPayload}))
console.log('result: ', getTransactionEffects(transferTxn))
```