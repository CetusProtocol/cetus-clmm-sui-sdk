# Create clmm pool

## Create clmm pool and add liquidity

```ts
const signer = new RawSigner(buildTestAccount(), sdk.fullClient)
// initialize sqrt_price
const initialize_sqrt_price = TickMath.priceToSqrtPriceX64(d(1.2),6,6).toString()
const tick_spacing = 2
const current_tick_index = TickMath.sqrtPriceX64ToTickIndex(new BN(initialize_sqrt_price))
// build tick range
const lowerTick = TickMath.getPrevInitializableTickIndex(new BN(current_tick_index).toNumber()
    , new BN(tick_spacing).toNumber())
const upperTick = TickMath.getNextInitializableTickIndex(new BN(current_tick_index).toNumber()
    , new BN(tick_spacing).toNumber())
// input token amount
const fix_coin_amount = new BN(200)
// input token amount is token a
const fix_amount_a = true
// slippage value
const slippage = 0.05
const curSqrtPrice = new BN(pool.current_sqrt_price)
// Estimate liquidity and token amount from one amounts
const liquidityInput = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
        lowerTick,
        upperTick,
        fix_coin_amount,
        fix_amount_a,
        true,
        slippage,
        curSqrtPrice
      )
// Estimate  token a and token b amount
const amount_a = fix_amount_a ? fix_coin_amount.toNumber()  : liquidityInput.tokenMaxA.toNumber()
const amount_b = fix_amount_a ? liquidityInput.tokenMaxB.toNumber()  : fix_coin_amount.toNumber()

// build creatPoolPayload Payload
const creatPoolPayload = sdk.Pool.creatPoolTransactionPayload({
    coinTypeA: `0x3cfe7b9f6106808a8178ebd2d5ae6656cd0ccec15d33e63fd857c180bde8da75::coin:CetusUSDT`,
    coinTypeB: `0x3cfe7b9f6106808a8178ebd2d5ae6656cd0ccec15d33e63fd857c180bde8da75::coin::CetusUSDC`,
    tick_spacing: tick_spacing,
    initialize_sqrt_price: initialize_sqrt_price,
    uri: '',
    amount_a: amount_a,
    amount_b: amount_b,
    fix_amount_a: fix_amount_a,
    tick_lower: lowerTick,
    tick_upper: upperTick
  })

 // send the transaction
 const transferTxn = await sendTransaction(signer, creatPoolTransactionPayload,true)
 console.log('doCreatPool: ', transferTxn)

```

## Create clmm pool (support batch create)

```ts
const signer = new RawSigner(buildTestAccount(), sdk.fullClient)

// build creatPoolPayload Payload
const creatPoolPayload = sdk.Pool.creatPoolTransactionPayload({
    coinTypeA: `0x3cfe7b9f6106808a8178ebd2d5ae6656cd0ccec15d33e63fd857c180bde8da75::coin:CetusUSDT`,
    coinTypeB: `0x3cfe7b9f6106808a8178ebd2d5ae6656cd0ccec15d33e63fd857c180bde8da75::coin::CetusUSDC`,
    tick_spacing: tick_spacing,
    initialize_sqrt_price: initialize_sqrt_price,
    uri: '',
    amount_a: amount_a,
    amount_b: amount_b,
    fix_amount_a: fix_amount_a,
    tick_lower: lowerTick,
    tick_upper: upperTick
  })

const creatPoolTransactionPayload = await sdk.Pool.creatPoolsTransactionPayload([creatPoolPayload])

// send the transaction
const transferTxn = await sendTransaction(signer, creatPoolTransactionPayload,true)
console.log('doCreatPool: ', transferTxn)
```