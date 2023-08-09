# Swap in best Router
In the routerV2 version, we mainly support the split computation of optimal routes. To ensure that our functionality is stable, we also have a well-designed fallback scheme in place. If our backend HPC service terminates unexpectedly, we will restart the first version of the sdk for precomputation.

As with the original router, you need to build the router group ahead of time to ensure that fallback scenarios are always available

There are two method to get all pools:
1. (Stable)If you get all pools by sdk, like ask.Pool.getPools(), you can't get coin decimals, so you need to set coin decimal by you self.
2. (Speediness) Get pool list by our API. The coin decimals were providerd.
- Testnet: https://api-sui.cetus.zone/v2/sui/pools_info
- Mainnet: https://api-sui.cetus.zone/v2/sui/pools_info

In latesd version, we recommand you build transaction by `TransactionUtil.buildAggregatorSwapTransaction`.

All used type in `/src/modules/routerModule.ts`.

If you want to use SDK to get pool list, you can see the first method in [router doc](/docs/router.md).

Notice: In this example, if you want to use partner, orderSplit must equal `false`.
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
const res = (await sdk.RouterV2.getBestRouter(SUI, USDC, 11111111000000, true, 0.5, '', undefined, true, false))
            .result as AggregatorResult

// if find the best swap router, then send transaction.
if (!result?.isExceed) {
  const allCoinAsset = await sdk.Resources.getOwnerCoinAssets(sdk.senderAddress)
  const payload = await TransactionUtil.buildAggregatorSwapTransaction(sdk, res, allCoinAsset, '', 0.5)
  const signer = new RawSigner(sendKeypair, sdk.fullClient)
  const transferTxn = await sendTransaction(signer, payload)
}
```
