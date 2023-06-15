# Swap in best Router

Now, we support find best swap router in all cetus pool, (max step is 2)
All used type in `/src/modules/routerModule.ts`.
```ts

// get all pool info by `getPool`s.
const pools = await sdk.Pool.getPools([])

// prepare the data for constructing a transaction path graph.
const coinMap = new Map()
const poolMap = new Map()

for (let i = 0; i < pools.length; i += 1) {
  let coin_a = pools[i].coinTypeA
  let coin_b = pools[i].coinTypeB

  coinMap.set(coin_a, {
    address: coin_a,
    decimals: 9,
  })
  coinMap.set(coin_b, {
    address: coin_b,
    decimals: 9,
  })

  const pair = `${coin_a}-${coin_b}`
  const pathProvider = poolMap.get(pair)
  if (pathProvider) {
    pathProvider.addressMap.set(pools[i].fee_rate, pools[i].poolAddress)
  } else {
    poolMap.set(pair, {
      base: coin_a,
      quote: coin_b,
      addressMap: new Map([[pools[i].fee_rate, pools[i].poolAddress]]),
    })
  }
}

const coins: CoinProvider = {
  coins: Array.from(coinMap.values())
}
const paths: PathProvider = {
  paths: Array.from(poolMap.values())
}

// Load the path graph.
sdk.Router.loadGraph(coins, paths)

// The first two addresses requiring coin types.
const byAmountIn = false
const amount = new BN('1000000000000')
const result = await sdk.Router.price(ETH, CETUS, amount, byAmountIn, 0.05, '')

// if find the best swap router, then send transaction.
if (!result?.isExceed) {
  const allCoinAsset = await sdk.Resources.getOwnerCoinAssets(sdk.senderAddress)
  const routerPayload = TransactionUtil.buildRouterSwapTransaction(sdk, result!.createTxParams, byAmountIn, allCoinAsset)
  const signer = new RawSigner(sendKeypair, sdk.fullClient)
  const transferTxn = await sendTransaction(signer, routerPayload)
}
```