# cetus-sdk

- The typescript SDK for [cetus-clmm](https://git.cplus.link/cetus/cetus-clmm).
- A more structured code example for this guide can be found [here](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/tree/main/tests)

### Install

- Our published package can be found here [NPM](https://www.npmjs.com/package/@cetusprotocol/cetus-sui-clmm-sdk).

```bash
yarn add @cetusprotocol/cetus-sui-clmm-sdk
```

### Usage

#### 1.SDK configuration parameters

- The contract address available for reference [config.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/data/config.ts).

```bash
const SDKConfig = {
  devnet:  {
      // ...
  },
  testnet:  {
    clmmConfig: {
      pools_id: '0x67679ae85ea0f39f5c211330bb830f68aeccfbd0085f47f80fc27bef981cc678',
      global_config_id: '0x28565a057d74e4c20d502002bdef5ecf8ff99e1bd9fc4dd11fe549c858ee99d7',
      global_vault_id: '0x6d582d2fa147214d50a0e537084859403e96a3b4554e962d5e993ad5761251f4',
    },
    tokenConfig: {
      coin_registry_id: '0x2cc70e515a70f3f953363febbab5e01027a25fc01b729d9de29df3db326cc302',
      pool_registry_id: '0xfd15ad9a6493fc3ff6b2fc922daeda50bba3df760fda32e53382b7f8dbcbc133',
      coin_list_owner: '0x44682678136f8e8b5a4ffbf9fe06a940b0ccbc9d46d9ae1a68aef2332c2e9cf1',
      pool_list_owner: '0x494262448a7b8d07e6f00980b67f07a18432a5587d898c27651d18daa4c4c33f'
    },
    launchpadConfig: {
      pools_id: '',
      admin_cap_id: '',
      config_cap_id: '',
      lock_manager_id: ''
    },
    xcetusConfig: {
      xcetus_manager_id: '',
      lock_manager_id: '',
      dividend_manager_id: ''
    },
    boosterConfig: {
      booster_config_id: '',
      booster_pool_handle: ''
    }
  }
}
export const netConfig = {
  devnet: {
    // ...
  },
  testnet: {
    fullRpcUrl: 'https://fullnode.testnet.sui.io',
    faucetURL: '',
    faucet_router: '0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e',
    simulationAccount: {
      address: '0x5f9d2fb717ba2433f7723cf90bdbf90667001104915001d0af0cccb52b67c1e8',
    },
    token: {
      token_display: '0x9dac946be53cf3dd137fa9289a23ecf146f8b87f3eb1a91cc323c93cdd26f8b3',
      config: SDKConfig.testnet.tokenConfig,
    },
    clmm: {
      clmm_display: '0xb7e7513751376aed2e21b267ef6edebe806a27c979870d3575658dd443ac4248',
      clmm_router: '0x5b77ec28a4077acb46e27e2421aa36b6bbdbe14b4165bc8a7024f10f0fde6112',
      config: SDKConfig.testnet.clmmConfig,
    },
    launchpad: {
      ido_display: '',
      ido_router: '',
      lock_display: '',
      lock_router: '',
      config: SDKConfig.testnet.launchpadConfig,
    },
    xcetus: {
      xcetus_display: '',
      xcetus_router: '',
      dividends_display: '',
      dividends_router: '',
      cetus_faucet: '',
      config: SDKConfig.testnet.xcetusConfig,
    },
    booster: {
      booster_display: '',
      booster_router: '',
      config: SDKConfig.local.boosterConfig,
    }
  },
}


```

#### 2. Init SDK

```ts
// init global sdk object
const sdk = new SDK(netConfig.devnet)
// set GasBudget config default gas rate is 1
sdk.gasConfig = new GasConfig(1)
// When connecting the wallet, set the wallet address
sdk.senderAddress = ""

```

#### 3. fetch the token list and pool list

- The token list and pool list contains the token metadata.
- code example for this guide can be found [token.test.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/token.test.ts)

```ts
const tokenConfig = sdk.sdkOptions.token.config

// Fetch  all tokens
const tokenList =  await sdk.Token.getAllRegisteredTokenList()

// Fetch  all tokens for specify ownerAddress
const tokenList =  await sdk.Token.getOwnerTokenList(tokenConfig.coin_list_owner)

// Fetch  all pools
const poolList =  await sdk.Token.getAllRegisteredPoolList()

// Fetch  all pools for specify ownerAddress
const poolList =  await sdk.Token.getOwnerPoolList(tokenConfig.pool_list_owner)

//Fetch  all pools (contains the token metadata)
const poolList =  await sdk.Token.getWarpPoolList()

// Fetch  all pools for specify ownerAddress (contains the token metadata)
const {pool_list_owner, coin_list_owner} = tokenConfig
const poolList =  await sdk.Token.getOwnerPoolList(pool_list_owner,coin_list_owner)

```

#### 4. fetch the clmm pool and position

- the clmm pool not contains the token metadata.
- all liquidity and swap operations are based on clmm pool.
- code example for this guide can be found [pool.test.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/pool.test.ts)

##### 4.1 fetch the clmm pool and position

```ts
//Fetch all clmm pools
const assignPools = [''] // query assign pool , if is empty else query all pool
const offset = 0  // optional paging cursor
const limit = 10  // maximum number of items per page
const pools = await sdk.Resources.getPools(assignPools, offset, limit)

//Fetch all clmm pools (only contain immutable info)
const poolImmutables = await sdk.Resources.getPoolImmutables(assignPools, offset, limit)

//Fetch clmm pool by poolAddress
const pool = await sdk.Resources.getPool(poolAddress)

//Fetch clmm position list of accountAddress for assign poolIds (not contains position rewarders)
const pool = sdk.Resources.getPositionList(accountAddress, assignPoolIds)

//Fetch clmm position by position_object_id  (contains position rewarders)
sdk.Resources.getPosition(pool.positions_handle, position_object_id)
sdk.Resources.getPositionById(position_object_id)
```

##### 4.2 create clmm pool and add liquidity

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

##### 4.3 create clmm pool (support batch create)

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

#### 5. Liquidity

code example for this guide can be found [position.test.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/position.test.ts)

##### 5.1 open position and addLiquidity

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
//  Fetch pool data
const pool = await sdk.Resources.getPool(poolAddress)
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
        curSqrtPrice
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

##### 5.2  addLiquidity

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
//  Fetch pool data
const pool = await sdk.Resources.getPool(poolAddress)
//  Fetch position data
const position = await sdk.Resources.getPositionInfo(position_object_id)
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

##### 5.3  removeLiquidity(can control whether collect fee)

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
// Fetch pool data
const pool = await sdk.Resources.getPool(poolAddress)
// Fetch position data
const position = await sdk.Resources.getPositionInfo(position_object_id)
// build tick data
const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_lower_index)
const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_upper_index)
const ticksHandle = pool.ticks_handle
const tickLower = await sdk.Resources.getTickDataByIndex(ticksHandle, position.tick_lower_index)
const tickUpper = await sdk.Resources.getTickDataByIndex(ticksHandle, position.tick_upper_index)
// input liquidity amount for remove
const liquidity = new BN(10000)
// slippage value
const slippageTolerance = new Percentage(new BN(5), new BN(100))
const curSqrtPrice = new BN(pool.current_sqrt_price)
// Get token amount from liquidity.
const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(liquidity, curSqrtPrice, lowerSqrtPrice, upperSqrtPrice, false)
// adjust  token a and token b amount for slippage
const { tokenMaxA, tokenMaxB } = adjustForCoinSlippage(coinAmounts, slippageTolerance, false)

// build remove liquidity params
const removeLiquidityParams : RemoveLiquidityParams = {
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      delta_liquidity: liquidity.toString(),
      min_amount_a: tokenMaxA.toString(),
      min_amount_b: tokenMaxB.toString(),
      pool_id: pool.poolAddress,
      pos_id: position.pos_object_id
      collect_fee: true // Whether to collect fee
    }
const removeLiquidityTransactionPayload = sdk.Position.removeLiquidityTransactionPayload(removeLiquidityParams)

const transferTxn = await sendTransaction(signer, removeLiquidityTransactionPayload)
console.log('removeLiquidity: ', transferTxn)
```

##### 5.4  close position

- Close position and remove all liquidity and collect reward

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
// Fetch pool data
const pool = await sdk.Resources.getPool(poolAddress)
// Fetch position data
const position = await sdk.Resources.getPositionInfo(position_object_id)
// build tick data
const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_lower_index)
const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_upper_index)
const ticksHandle = pool.ticks_handle
const tickLower = await sdk.Resources.getTickDataByIndex(ticksHandle, position.tick_lower_index)
const tickUpper = await sdk.Resources.getTickDataByIndex(ticksHandle, position.tick_upper_index)
// input liquidity amount for remove
const liquidity = new BN(position.liquidity)
// slippage value
const slippageTolerance = new Percentage(new BN(5), new BN(100))
const curSqrtPrice = new BN(pool.current_sqrt_price)
// Get token amount from liquidity.
const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(liquidity, curSqrtPrice, lowerSqrtPrice, upperSqrtPrice, false)
// adjust  token a and token b amount for slippage
const { tokenMaxA, tokenMaxB } = adjustForCoinSlippage(coinAmounts, slippageTolerance, false)
// get all rewarders of position
const rewards: any[] = await sdk.Rewarder.posRewardersAmount(poolObjectId,pool.positions_handle, position_object_id)
const rewardCoinTypes = rewards.filter((item) => {
    if(Number(item.amount_owed) > 0){
      return item.coin_address as string
    }
  })
// build close position payload
const closePositionTransactionPayload = sdk.Position.closePositionTransactionPayload({
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      min_amount_a: tokenMaxA.toString(),
      min_amount_b: tokenMaxB.toString(),
      rewarder_coin_types: [...rewardCoinTypes],
      pool_id: pool.poolAddress,
      pos_id: position_object_id,
    })

const transferTxn = await sendTransaction(signer,closePositionTransactionPayload)
console.log('close position: ', transferTxn)

```

##### 5.5  open position

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
// fetch pool data
const pool = await sdk.Resources.getPool(poolAddress)
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

const transferTxn = (await signer.executeMoveCall(openPositionTransactionPayload)) as SuiExecuteTransactionResponse
console.log('open position: ', getTransactionEffects(transferTxn))

```

##### 5.6  collect fee

- Provide to the position to collect the fee of the position earned.

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
// Fetch pool data
const pool = await sdk.Resources.getPool(poolAddress)
// Fetch position data
const position =  await sdk.Resources.getPosition(position_object_id)

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
const transferTxn = await sendTransaction(signer,collectFeeTransactionPayload)
console.log('collect_fee: ', transferTxn)

```

#### 6. swap

- code example for this guide can be found [swap.test.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/swap.test.ts)

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
// Fetch coin assets of sendKeypair
const allCoinAsset = await sdk.Resources.getOwnerCoinAssets(sendKeypair.getPublicKey().toSuiAddress())
//  Fetch pool data
const pool = await sdk.Resources.getPool(poolAddress)
//  Fetch ticks data
const tickdatas = await sdk.Pool.fetchTicksByRpc(pool.ticks_handle)
// Whether the swap direction is token a to token b
const a2b = true

// fix input token amount
const coinAmount = new BN(120000)
// input token amount is token a
const by_amount_in = true
// slippage value
 const slippage = Percentage.fromDecimal(d(5))
const curSqrtPrice = new BN(pool.current_sqrt_price)
// Estimated amountIn amountOut fee
const res = await sdk.Swap.calculateRates({
      decimalsA: 6,
      decimalsB: 6,
      a2b,
      by_amount_in,
      amount,
      swapTicks: tickdatas,
      currentPool,
    })
const toAmount = byAmountIn ? res.estimatedAmountOut : res.estimatedAmountIn
const amountLimit =  adjustForSlippage(toAmount,slippage,!byAmountIn)

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

 const transferTxn = await sendTransaction(signer,swapPayload)
 console.log('swap: ', transferTxn)

```

#### 7. collect rewarder

- Provide to the position to collect the rewarder of the position earned.
- code example for this guide can be found [rewarder.test.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/rewarder.test.ts)

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
// Fetch pool data
const pool = await sdk.Resources.getPool(poolAddress)
// Fetch all rewarder for position
const rewards: any[] = await sdk.Rewarder.posRewardersAmount(pool.poolAddress, poolObjectId)
const rewardCoinTypes = rewards.map((item) => {
      return item.coin_address as string
    })

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

#### 8. other helper function

```ts
// Fetch tick by index from table
const ticksHandle = pool.ticks_handle
const tickLower = await sdk.Resources.getTickDataByIndex(ticksHandle,position.tick_lower_index)
// Fetch all tick data by rpc
const tickdatas = await sdk.Pool.fetchTicksByRpc(ticksHandle)
// Fetch all tick data by contart
const tickdatas = await sdk.Pool.fetchTicks({
      pool_id: "0x565743e41c830e38ea39416d986ed1806da83f62",
      coinTypeA: `${faucetObjectId}::usdc::USDC`,
      coinTypeB: `${faucetObjectId}::usdc::USDT`
    })
```
