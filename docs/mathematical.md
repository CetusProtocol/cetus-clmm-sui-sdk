# Relevant mathematical methods

## 1. Calculate the amount of position coin_a and coin_b

use `/src/math/clmm.ts ClmmPoolUtil.getCoinAmountFromLiquidity()`

```ts
const pool = await sdk.Pool.getPool(poolAddress)

const liquidity = new BN(position.liquidity)
const curSqrtPrice = new BN(pool.current_sqrt_price)

const lowerPrice = TickMath.tickIndexToPrice(position.tick_lower_index)
const upperPrice = TickMath.tickIndexToPrice(position.tick_upper_index)

const amounts = ClmmClmmPoolUtil.getCoinAmountFromLiquidity(
  liquidity,
  curSqrtPrice,
  lowerPrice,
  upperPrice,
  false
)

const {coinA, coinB} = amounts
```

## 2. Calculate price from sqrt price

use `/src/math/tick.ts TickMath.sqrtPriceX64ToPrice()`

```ts
const pool = await sdk.Pool.getPool(poolAddress)
const price = TickMath.sqrtPriceX64ToPrice(new BN(pool.current_sqrt_price))
```

## 3. Calculate tick index from price

when you want to open position, you dont know how to set your tick_lower and tick_upper.

use `/src/math/tick.ts TickMath.priceToTickIndex()`

```ts
// decimalsA and decimalsB means the decimal of coinA and coinB
const tick_lower = TickMath.priceToTickIndex(price, decimalsA, decimalsB)
```

## 4. Calculate price impact in once swap trade

There are no existed function to get price impact, please use the subsequent mathematical formula for the calculation.

<img src="./priceimpact.png" width="450" />

## 5. Transform type I32 to type number

There are some param is `I32` type, you can transform it by `asInN`. eg: tick.liquidityNet

```ts
const liquidityNet: new BN(BigInt.asIntN(128, BigInt(BigInt(tick.liquidityNet.toString()))).toString()),
```

## 6. Calculate swap fee and price impact

```ts
    const res = await sdk.RouterV2.getBestRouter(USDT, USDC, 100000000, true, 5, '', undefined, true, false)
    let param: any
    if (res.version === 'v2') {
      param = res.result
      printAggregatorResult(param! as AggregatorResult)
    }
    const fee =  sdk.Swap.calculateSwapFee(res.result.splitPaths)
    const priceImpact =  sdk.Swap.calculateSwapPriceImpact(res.result.splitPaths)
    console.log('result: ', {fee , priceImpact })
```
