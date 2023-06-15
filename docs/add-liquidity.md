# Add Liquidity

- code example for this guide can be found [position.test.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/position.test.ts)

## 5.1 Open position and add liquidity

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
//  Fetch pool data
const pool = await sdk.Pool.getPool(poolAddress)
//  build lowerTick and  upperTick
const lowerTick = TickMath.getPrevInitializableTickIndex(new BN(pool.current_tick_index).toNumber()
      ,new BN(pool.tickSpacing).toNumber())
const upperTick = TickMath.getNextInitializableTickIndex(new BN(pool.current_tick_index).toNumber()
      ,new BN(pool.tickSpacing).toNumber())
// fix input token amount
const coinAmount = new BN(120000)
// input token amount is token a
const fix_amount_a = true
// slippage value
const slippage = 0.05
const curSqrtPrice = new BN(pool.current_sqrt_price)
// Estimate liquidity and token amount from one amounts
const liquidityInput = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
        lowerTick,
        upperTick,
        coinAmount,
        fix_amount_a,
        true,
        slippage,
        curSqrtPrice，
        rewarder_coin_types: [], // support collect rewarder by input rewarder coin type
        collect_fee: false, // Set the flag to indicate whether to collect fee
      )
// Estimate  token a and token b amount
const amount_a = fix_amount_a ? coinAmount.toNumber()  : liquidityInput.tokenMaxA.toNumber()
const amount_b = fix_amount_a ? liquidityInput.tokenMaxB.toNumber()  : coinAmount.toNumber()

// build open position and addLiquidity Payload
const addLiquidityPayload = sdk.Position.createAddLiquidityTransactionPayload(
      {
          coinTypeA: pool.coinTypeA,
          coinTypeB: pool.coinTypeB,
          pool_id: pool.poolAddress,
          tick_lower: lowerTick.toString(),
          tick_upper: upperTick.toString(),
          fix_amount_a,
          amount_a,
          amount_b,
          is_open: true,// control whether or not to create a new position or add liquidity on existed position.
          pos_id: "",// pos_id: position id. if `is_open` is true, index is no use.
      })

 //   0. `[params]` this add liquidity data for build payload
 //   1. `[gasEstimateArg]` optional parameters, When the fix input amount is SUI ,Calculate Gas and correct the amount
 const createAddLiquidityTransactionPayload = await sdk.Position.createAddLiquidityTransactionPayload(addLiquidityPayloadParams, {
      slippage: slippage,
      curSqrtPrice: curSqrtPrice
    })

 const transferTxn = await sendTransaction(signer,createAddLiquidityTransactionPayload)
 console.log('open_and_add_liquidity_fix_token: ', transferTxn)
```

## 5.2  Add liquidity

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
//  Fetch pool data
const pool = await sdk.Pool.getPool(poolAddress)
//  Fetch position data
const position = await sdk.Position.getPositionInfo(position_object_id)
//  build position lowerTick and upperTick
const lowerTick = position.tick_lower_index
const upperTick = position.tick_upper_index
// fix input token amount
const coinAmount = new BN(120000)
// input token amount is token a
const fix_amount_a = true
// slippage value
const slippage = 0.05
const curSqrtPrice = new BN(pool.current_sqrt_price)
// Estimate liquidity and token amount from one amounts
const liquidityInput = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
        lowerTick,
        upperTick,
        coinAmount,
        fix_amount_a,
        true,
        slippage,
        curSqrtPrice
      )
// Estimate  token a and token b amount
const amount_a = fix_amount_a ? coinAmount.toNumber()  : liquidityInput.tokenMaxA.toNumber()
const amount_b = fix_amount_a ? liquidityInput.tokenMaxB.toNumber()  : coinAmount.toNumber()

// build and addLiquidity Payload
const addLiquidityPayload = sdk.Position.createAddLiquidityTransactionPayload(
      {
          coinTypeA: pool.coinTypeA,
          coinTypeB: pool.coinTypeB,
          pool_id: pool.poolAddress,
          coin_object_ids_a: coinAObjectIds,
          coin_object_ids_b: coinBObjectIds,
          tick_lower: lowerTick.toString(),
          tick_upper: upperTick.toString(),
          fix_amount_a,
          amount_a,
          amount_b,
          is_open: false,// control whether or not to create a new position or add liquidity on existed position.
          pos_id: position.pos_object_id,// pos_id: position id. if `is_open` is true, index is no use.
      })
const createAddLiquidityTransactionPayload = sdk.Position.createAddLiquidityTransactionPayload(addLiquidityPayloadParams)

const transferTxn = await sendTransaction(signer,createAddLiquidityTransactionPayload)
console.log('add_liquidity_fix_token: ', transferTxn)

```
