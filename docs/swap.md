# Swap

- This swap example, we show how to do swap about one pair in an exact clmmpool with the amount limit abount input coin or output coin, we should do preswap first, then we set the desired price difference according to the pre-swap results.

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
// Whether the swap direction is token a to token b
const a2b = true
// fix input token amount
const coinAmount = new BN(120000)
// input token amount is token a
const byAmountIn = true
// slippage value
const slippage = Percentage.fromDecimal(d(5))
// Fetch pool data
const pool = await sdk.Pool.getPool(poolAddress)
// Estimated amountIn amountOut fee
const res: any = await sdk.Swap.preswap({
  pool: pool,
  current_sqrt_price: pool.current_sqrt_price,
  coinTypeA: pool.coinTypeA,
  coinTypeB: pool.coinTypeB,
  decimalsA: 6, // coin a 's decimals
  decimalsB: 8, // coin b 's decimals
  a2b,
  by_amount_in,
  amount,
})

const toAmount = byAmountIn ? res.estimatedAmountOut : res.estimatedAmountIn
const amountLimit =  adjustForSlippage(toAmount, slippage, !byAmountIn)

// build swap Payload
const swapPayload = sdk.Swap.createSwapTransactionPayload(
  {
    pool_id: pool.poolAddress,
    coinTypeA: pool.coinTypeA,
    coinTypeB: pool.coinTypeB
    a2b: a2b,
    by_amount_in: by_amount_in,
    amount: res.amount.toString(),
    amount_limit: amountLimit.toString(),
  },
)

onst transferTxn = await sendTransaction(signer,swapPayload)
console.log('swap: ', transferTxn)
```

- This example we show how to create a swap tx without any limit.
- Notes: This swap will get very large price slip!

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
// Whether the swap direction is token a to token b
const a2b = true
// fix input token amount
const coinAmount = new BN(120000)
// input token amount is token a
const by_amount_in = true
// Fetch pool data
const pool = await sdk.Pool.getPool(poolAddress)
// Estimated amountIn amountOut fee
const toAmount = byAmountIn ? res.estimatedAmountOut : res.estimatedAmountIn

// build swap Payload
const swapPayload = sdk.Swap.createSwapTransactionPayload(
  {
    pool_id: pool.poolAddress,
    coinTypeA: pool.coinTypeA,
    coinTypeB: pool.coinTypeB
    a2b,
    by_amount_in,
    amount: coinAmount.toString(),
    amount_limit: '0',
  },
)

onst transferTxn = await sendTransaction(signer,swapPayload)
console.log('swap: ', transferTxn)
```