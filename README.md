# cetus-sdk

- The typescript SDK for [cetus-clmm](https://git.cplus.link/cetus/cetus-clmm).
- A more structured code example for this guide can be found [here](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/tree/main/tests)

### Install

- Our published package can be found here [NPM](https://www.npmjs.com/package/@cetusprotocol/cetus-sui-clmm-sdk).
- To install the cetus-sui-clmm-sdk, simply add @cetusprotocol/cetus-sui-clmm-sdk into your package.json

```bash
yarn add @cetusprotocol/cetus-sui-clmm-sdk
```

Or

```bash
npm  install @cetusprotocol/cetus-sui-clmm-sdk
```

### Usage

#### 1.SDK configuration parameters

- The contract address available for reference [config.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/data/config.ts).

```bash
const SDKConfig = {
  testnet:  {
     clmmConfig: {
      pools_id: '0xc090b101978bd6370def2666b7a31d7d07704f84e833e108a969eda86150e8cf',
      global_config_id: '0x6f4149091a5aea0e818e7243a13adcfb403842d670b9a2089de058512620687a',
      global_vault_id: '0xf3114a74d54cbe56b3e68f9306661c043ede8c6615f0351b0c3a93ce895e1699'
    },
    tokenConfig: {
     coin_registry_id: '0xb52e4b2bef6fe50b91680153c3cf3e685de6390f891bea1c4b6d524629f1f1a9',
     pool_registry_id: '0x68a66a7d44840481e2fa9dce43293a31dced955acc086ce019853cb6e6ab774f',
     coin_list_owner: '0x1370c41dce1d5fb02b204288c67f0369d4b99f70df0a7bddfdcad7a2a49e3ba2',
     pool_list_owner: '0x48bf04dc68a2b9ffe9a901a4903b2ce81157dec1d83b53d0858da3f482ff2539'
    },
  },
  mainnet: {
    clmmConfig: {
      pools_id: '0xf699e7f2276f5c9a75944b37a0c5b5d9ddfd2471bf6242483b03ab2887d198d0',
      global_config_id: '0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f',
      global_vault_id: '0xce7bceef26d3ad1f6d9b6f13a953f053e6ed3ca77907516481ce99ae8e588f2b'
    },
    tokenConfig: {
      coin_registry_id: '0xe0b8cb7e56d465965cac5c5fe26cba558de35d88b9ec712c40f131f72c600151',
      pool_registry_id: '0xab40481f926e686455edf819b4c6485fbbf147a42cf3b95f72ed88c94577e67a',
      coin_list_owner: '0x1f6510ee7d8e2b39261bad012f0be0adbecfd75199450b7cbf28efab42dad083',
      pool_list_owner: '0x6de133b609ea815e1f6a4d50785b798b134f567ec1f4ee113ae73f6900b4012d'
    },
  }
}
export const netConfig = {
  testnet: {
    fullRpcUrl: 'https://fullnode.testnet.sui.io',
    faucetURL: '',
    faucet: {
      faucet_display: '',
      faucet_router: '',
    },
    simulationAccount: {
      address: '',
    },
    token: {
      token_display: '',
      config: SDKConfig.testnet.tokenConfig,
    },
    clmm: {
      clmm_display: '0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666',
      clmm_router: {
        cetus: '0x3a86c278225173d4795f44ecf8cfe29326d701be42b57454b05be76ad97227a7',
        deepbook: '',
      },
      config: SDKConfig.testnet.clmmConfig,
    }
  },
  mainnet: {
    fullRpcUrl: 'https://fullnode.mainnet.sui.io',
    faucetURL: '',
    faucet: {
      faucet_display: '0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e',
      faucet_router: '0xff3004dc90fee6f7027040348563feb866a61c8bb53049cc444c1746db8b218d',
    },
    simulationAccount: {
      address: '0x326ce9894f08dcaa337fa232641cc34db957aec9ff6614c1186bc9a7508df0bb',
    },
    token: {
      token_display: '0x481fb627bf18bc93c02c41ada3cc8b574744ef23c9d5e3136637ae3076e71562',
      config: SDKConfig.mainnet.tokenConfig,
    },
    clmm: {
      clmm_display: '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb',
      clmm_router: {
        cetus: '0x2eeaab737b37137b94bfa8f841f92e36a153641119da3456dec1926b9960d9be',
        deepbook: '',
      },
      config: SDKConfig.mainnet.clmmConfig,
    },
  }
}


```

#### 2. Init SDK

```ts
// init global sdk object
const sdk = new SDK(netConfig.devnet)
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
const pools = await sdk.Pool.getPools(assignPools, offset, limit)

//Fetch all clmm pools (only contain immutable info)
const poolImmutables = await sdk.Pool.getPoolImmutables(assignPools, offset, limit)

//Fetch clmm pool by poolAddress
const pool = await sdk.Pool.getPool(poolAddress)

//Fetch clmm position list of accountAddress for assign poolIds (not contains position rewarders)
const pool = sdk.Position.getPositionList(accountAddress, assignPoolIds)

//Fetch clmm position by position_object_id  (contains position rewarders)
sdk.Position.getPosition(pool.positions_handle, position_object_id)
sdk.Position.getPositionById(position_object_id)
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

##### 5.3  removeLiquidity(can control whether collect fee)

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
// Fetch pool data
const pool = await sdk.Pool.getPool(poolAddress)
// Fetch position data
const position = await sdk.Position.getPositionInfo(position_object_id)
// build tick data
const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_lower_index)
const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_upper_index)
const ticksHandle = pool.ticks_handle
const tickLower = await sdk.Pool.getTickDataByIndex(ticksHandle, position.tick_lower_index)
const tickUpper = await sdk.Pool.getTickDataByIndex(ticksHandle, position.tick_upper_index)
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
const pool = await sdk.Pool.getPool(poolAddress)
// Fetch position data
const position = await sdk.Position.getPositionInfo(position_object_id)
// build tick data
const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_lower_index)
const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(position.tick_upper_index)
const ticksHandle = pool.ticks_handle
const tickLower = await sdk.Pool.getTickDataByIndex(ticksHandle, position.tick_lower_index)
const tickUpper = await sdk.Pool.getTickDataByIndex(ticksHandle, position.tick_upper_index)
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
const rewardCoinTypes = rewards.filter((item) => Number(item.amount_owed) > 0).map((item)=> item.coin_address)
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
const pool = await sdk.Pool.getPool(poolAddress)
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
const transferTxn = await sendTransaction(signer,collectFeeTransactionPayload)
console.log('collect_fee: ', transferTxn)

```

#### 6. swap

- code example for this guide can be found [swap.test.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/swap.test.ts)

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
// Fetch coin assets of sendKeypair
const allCoinAsset = await sdk.getOwnerCoinAssets(sendKeypair.getPublicKey().toSuiAddress())
//  Fetch pool data
const pool = await sdk.Pool.getPool(poolAddress)
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

#### 8. other helper function

```ts
// Fetch tick by index from table
const ticksHandle = pool.ticks_handle
const tickLower = await sdk.Pool.getTickDataByIndex(ticksHandle,position.tick_lower_index)
// Fetch all tick data by rpc
const tickdatas = await sdk.Pool.fetchTicksByRpc(ticksHandle)
// Fetch all tick data by contart
const tickdatas = await sdk.Pool.fetchTicks({
      pool_id: "0x565743e41c830e38ea39416d986ed1806da83f62",
      coinTypeA: `${faucetObjectId}::usdc::USDC`,
      coinTypeB: `${faucetObjectId}::usdc::USDT`
    })
```
