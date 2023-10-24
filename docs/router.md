# Swap in best Router

Now, we support find best swap router in all cetus pool, (max step is 2).
There are two method to get all pools:
1. (Stable)If you get all pools by sdk, like ask.Pool.getPools(), you can't get coin decimals, so you need to set coin decimal by you self.
2. (Speediness) Get pool list by our API. The coin decimals were providerd.
- Testnet: https://api-sui.cetus.zone/v2/sui/pools_info
- Mainnet: https://api-sui.cetus.zone/v2/sui/pools_info

In latesd version, we recommand you build transaction by `TransactionUtil.buildAggregatorSwapTransaction`.

All used type in `/src/modules/routerModule.ts`.
1. Get all pools by SDK.
```ts

// get all pool info by `getPool`s.
const pools = await sdk.Pool.getPools([], 0, 200)

// prepare the data for constructing a transaction path graph.
const coinMap = new Map()
const poolMap = new Map()

for (let i = 0; i < pools.length; i += 1) {
  if (pools[i].is_pause) {
    continue
  }
  let coin_a = pools[i].coinTypeA
  let coin_b = pools[i].coinTypeB

  // Get coin decimals individual
  coinMap.set(coin_a, {
    address: coin_a,
    decimals: coin_a_decimal,
  })
  coinMap.set(coin_b, {
    address: coin_b,
    decimals: coin_b_decimal,
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

const params: SwapWithRouterParams = {
  paths: [result?.paths![0]!, result?.paths![1]!],
  partner: '',
  priceSplitPoint: 5,
}

// if find the best swap router, then send transaction.
if (!result?.isExceed) {
  const allCoinAsset = await sdk.Resources.getOwnerCoinAssets(sdk.senderAddress)
  const payload = await TransactionUtil.buildAggregatorSwapTransaction(sdk, res, allCoinAsset, '', 0.5)
  const signer = new RawSigner(sendKeypair, sdk.fullClient)
  const transferTxn = await sendTransaction(signer, payload)
}
```

2. Get all pools by centralization API.
```ts
const coinMap = new Map()
const poolMap = new Map()

const resp: any = await fetch('https://api-sui.cetus.zone/v2/sui/pools_info', { method: 'GET' })
const poolsInfo = await resp.json()

if (poolsInfo.code === 200) {
  for (const pool of poolsInfo.data.lp_list) {
    if (pool.is_closed) {
      continue
    }

    let coin_a = pool.coin_a.address
    let coin_b = pool.coin_b.address

    coinMap.set(coin_a, {
      address: pool.coin_a.address,
      decimals: pool.coin_a.decimals,
    })
    coinMap.set(coin_b, {
      address: pool.coin_b.address,
      decimals: pool.coin_b.decimals,
    })

    const pair = `${coin_a}-${coin_b}`
    const pathProvider = poolMap.get(pair)
    if (pathProvider) {
      pathProvider.addressMap.set(Number(pool.fee) * 100, pool.address)
    } else {
      poolMap.set(pair, {
        base: coin_a,
        quote: coin_b,
        addressMap: new Map([[Number(pool.fee) * 100, pool.address]]),
      })
    }
  }
}

const coins: CoinProvider = {
  coins: Array.from(coinMap.values()),
}
const paths: PathProvider = {
  paths: Array.from(poolMap.values()),
}

sdk.Router.loadGraph(coins, paths)


// The first two addresses requiring coin types.
const byAmountIn = false
const amount = new BN('1000000000000')
const result = await sdk.Router.price(ETH, CETUS, amount, byAmountIn, 0.05, '')

const params: SwapWithRouterParams = {
  paths: [result?.paths![0]!, result?.paths![1]!],
  partner: '',
  priceSplitPoint: 5,
}

// if find the best swap router, then send transaction.
if (!result?.isExceed) {
  const allCoinAsset = await sdk.Resources.getOwnerCoinAssets(sdk.senderAddress)
  const payload = await TransactionUtil.buildAggregatorSwapTransaction(sdk, res, allCoinAsset, '', 0.5)
  const signer = new RawSigner(sendKeypair, sdk.fullClient)
  const transferTxn = await sendTransaction(signer, payload)
}
```
