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

- swapPartner : Contact the platform to apply  [Apply](https://forms.gle/xvVzKenWVnWSmTrs7)

- The contract address available for reference [config.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/data/config.ts).

```bash
const SDKConfig = {
  devnet:  {
      initEventConfig:  {
        initFactoryEvent: { pools_id: '0x6bdca4fa2c6afac9638e5f9755ccdcbe413a833c' },
        initPartnerEvent: { partners_id: '0x59c9d39e7d8b628bb54eadf8cbf49d9a296eeee8' },
        initConfigEvent: {
          admin_cap_id: '0x19a2872ce65e79285adf54d807e54a9798e7ce5f',
          global_config_id: '0xb8893bbf6a5509cf6ee09fd28a89320a203f6c49',
          protocol_fee_claim_cap_id: '0x2db9a2420b7907f684f721edd79150417f525545'
        }
      },
      tokenConfig: {
        coin_registry_id: '0xa210baf82a5f29dcebb1a1941b024dee5f632db8',
        pool_registry_id: '0xedd6e34dcb05d1c0e5f543e97901ec7987f9919b',
        coin_list_owner: '0x5bd7e0182807d45dfc8d019da6cf3d2351771364',
        pool_list_owner: '0x9aa924f25509decf440e5de98cefa4e0b65dd5bb'
      }
  },
  testnet:  {
   // ...
  }
}
export const netConfig = {
  devnet: {
    fullRpcUrl: 'https://fullnode.devnet.sui.io',
    faucetURL: 'https://faucet.devnet.sui.io/gas',
    cetusClmm: '0x8fe718e1028a7678c17a27cc1926ce7e0db0079e',
    cetusIntegrate: '0xa8b57964a0c4332b93916aa1f9b95a7c3a8849ce',
    integerMate: '0xf3f6102dfcf5910d694408737126d84f74374f5e',
    swapPartner: '',// swap Partner Address
    TokenDeployer: '0x9690d7c1e03909cec38ec2fbf45d04d223af5840',
    faucetObjectId: '0xbc72e752c41d6788dae67576f5a01a923d846d4f',
    initEventConfig: SDKConfig.devnet.initEventConfig,
    tokenConfig: SDKConfig.devnet.tokenConfig,
    simulationAccount: {
      address: '0x3f6cfdcf7bc19e86693d3d0f261f56b6e8caff0d',
    }
  },
  testnet: {
   // ...
  },
}


```

#### 2. Init SDK

```ts
export const sdkEnv = netConfig.devnet

const defaultNetworkOptions: SdkOptions = {
  fullRpcUrl: sdkEnv.fullRpcUrl,
  faucetURL: sdkEnv.faucetURL,
  networkOptions: {
    simulationAccount: sdkEnv.simulationAccount,
    token: {
      token_deployer: sdkEnv.TokenDeployer,
      config: sdkEnv.tokenConfig,
    },
    modules: {
      cetus_clmm: sdkEnv.cetusClmm,
      cetus_integrate: sdkEnv.cetusIntegrate,
      integer_mate: sdkEnv.integerMate,
      swap_partner: sdkEnv.swapPartner,
      config: {
        global_config_id: sdkEnv.initEventConfig.initConfigEvent.global_config_id,
        pools_id: sdkEnv.initEventConfig.initFactoryEvent.pools_id,
      },
    },
  },
}
const sdk = new SDK(defaultNetworkOptions)
```

#### 3. fetch the token list and pool list

- The token list and pool list contains the token metadata.
- code example for this guide can be found [token.test.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/token.test.ts)

```ts
const networkOptions = sdk.sdkOptions.networkOptions
const tokenConfig = sdk.sdkOptions.networkOptions.token.config

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

//Fetch clmm position list of accountAddress for assign poolIds
const pool = sdk.Resources.getPositionList(accountAddress, assignPoolIds)

//Fetch clmm position by position_object_id
sdk.Resources.getPosition(position_object_id)
```

##### 4.2 create clmm pool and add liquidity

```ts
const signer = new RawSigner(buildTestAccount(), sdk.fullClient)
// initialize sqrt_price
const initialize_sqrt_price = TickMath.priceToSqrtPriceX64(d(1.2),6,6).toString()
const tick_spacing = 18
const current_tick_index = TickMath.sqrtPriceX64ToTickIndex(new BN(initialize_sqrt_price))
// build tick range
const lowerTick = TickMath.getPrevInitializableTickIndex(new BN(current_tick_index).toNumber()
    , new BN(tick_spacing).toNumber())
const upperTick = TickMath.getNextInitializableTickIndex(new BN(current_tick_index).toNumber()
    , new BN(tick_spacing).toNumber())
// optional : If coinAmount is 0, only pool is created
const coinAmount = new BN(200)
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

// select token a and token b asset for liquidity
const coinAs: CoinAsset[] = CoinAssist.getCoinAssets(pool.coinTypeA, allCoinAsset)
const coinBs: CoinAsset[] = CoinAssist.getCoinAssets(pool.coinTypeB, allCoinAsset)
const coinAObjectIds = await CoinAssist.selectCoinAssets(signer,coinAs, BigInt(amount_a),sdk)
const coinBObjectIds = await CoinAssist.selectCoinAssets(signer,coinBs, BigInt(amount_b),sdk)

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
    coin_object_ids_a: coinAObjectIds,
    coin_object_ids_b: coinBObjectIds,
    tick_lower: lowerTick,
    tick_upper: upperTick
  })
console.log('creatPoolTransactionPayload: ', creatPoolTransactionPayload)

const transferTxn = (await signer.executeMoveCall(creatPoolTransactionPayload)) as SuiExecuteTransactionResponse
console.log('doCreatPool: ', getTransactionEffects(transferTxn))
```

#### 5. Liquidity

code example for this guide can be found [position.test.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/position.test.ts)

##### 5.1 open position and addLiquidity

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
// Fetch coin assets of sendKeypair
const allCoinAsset = await sdk.Resources.getOwnerCoinAssets(sendKeypair.getPublicKey().toSuiAddress())
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
// select token a and token b asset for liquidity
const coinAs: CoinAsset[] = CoinAssist.getCoinAssets(pool.coinTypeA, allCoinAsset)
const coinBs: CoinAsset[] = CoinAssist.getCoinAssets(pool.coinTypeB, allCoinAsset)
const coinAObjectIds = await CoinAssist.selectCoinAssets(signer,coinAs, BigInt(amount_a),sdk)
const coinBObjectIds = await CoinAssist.selectCoinAssets(signer,coinBs, BigInt(amount_b),sdk)

// build open position and addLiquidity Payload
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
          is_open: true,// control whether or not to create a new position or add liquidity on existed position.
          pos_id: "",// pos_id: position id. if `is_open` is true, index is no use.
      })
const createAddLiquidityTransactionPayload = sdk.Position.createAddLiquidityTransactionPayload(addLiquidityPayloadParams)

const transferTxn = (await signer.executeMoveCall(createAddLiquidityTransactionPayload)) as SuiExecuteTransactionResponse
console.log('open_and_add_liquidity_fix_token: ', getTransactionEffects(transferTxn))
```

##### 5.2  addLiquidity

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
// Fetch coin assets of sendKeypair
const allCoinAsset = await sdk.Resources.getOwnerCoinAssets(sendKeypair.getPublicKey().toSuiAddress())
//  Fetch pool data
const pool = await sdk.Resources.getPool(poolAddress)
//  Fetch position data
const position = await sdk.Resources.getPositionInfo(position_object_id)
//  build position lowerTick and upperTick
const lowerTick = Number(position.tick_lower_index)
const upperTick = Number(position.tick_upper_index)
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

// select token a and token b asset for liquidity
const coinAs: CoinAsset[] = CoinAssist.getCoinAssets(pool.coinTypeA, allCoinAsset)
const coinBs: CoinAsset[] = CoinAssist.getCoinAssets(pool.coinTypeB, allCoinAsset)
const coinAObjectIds = await CoinAssist.selectCoinAssets(signer,coinAs, BigInt(amount_a),sdk)
const coinBObjectIds = await CoinAssist.selectCoinAssets(signer,coinBs, BigInt(amount_b),sdk)

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

const transferTxn = (await signer.executeMoveCall(createAddLiquidityTransactionPayload)) as SuiExecuteTransactionResponse
console.log('open_and_add_liquidity_fix_token: ', getTransactionEffects(transferTxn))

```

##### 5.3  removeLiquidity

- if want to remove liquidity and collect rewarder, The cointype of the reward must be passed in when build Payload, else only remove liquidity

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)
// Fetch pool data
const pool = await sdk.Resources.getPool(poolAddress)
// Fetch position data
const position = await sdk.Resources.getPositionInfo(position_object_id)
// build tick data
const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(Number(position.tick_lower_index))
const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(Number(position.tick_upper_index))
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

// mode(1) only remove liquidity
const removeLiquidityParams : RemoveLiquidityParams = {
      coin_types: [pool.coinTypeA, pool.coinTypeB,...rewardCoinTypes],
      delta_liquidity: liquidity.toString(),
      min_amount_a: tokenMaxA.toString(),
      min_amount_b: tokenMaxB.toString(),
      pool_id: pool.poolAddress,
      pos_id: position.pos_object_id
    }
const removeLiquidityTransactionPayload = sdk.Position.removeLiquidityTransactionPayload(removeLiquidityParams)

// mode(2) remove all liquidity  and collect rewards and close position
// Fetch all rewards data for position (If only remove liquidity ,  This step is optional)
const rewards: any[] = await sdk.Rewarder.posRewardersAmount(poolAddress, position_object_id)
const rewardCoinTypes = rewards.map((item) => {
      return item.coin_address as string
    })
const removeLiquidityAndCloseParams : RemoveLiquidityAndCloseParams = {
      coin_types: [pool.coinTypeA, pool.coinTypeB,...rewardCoinTypes],
      min_amount_a: tokenMaxA.toString(),
      min_amount_b: tokenMaxB.toString(),
      pool_id: pool.poolAddress,
      pos_id: position.pos_object_id
    }
const removeLiquidityTransactionPayload = sdk.Position.removeLiquidityTransactionPayload(removeLiquidityAndCloseParams)

const transferTxn = (await signer.executeMoveCall(removeLiquidityTransactionPayload)) as SuiExecuteTransactionResponse
console.log('remove_liquidity: ', getTransactionEffects(transferTxn))

```

##### 5.4  close position

- Provide to close position if position is empty.

```ts
const sendKeypair = buildTestAccount()
const signer = new RawSigner(sendKeypair, sdk.fullClient)

// build closePosition Payload
const closePositionTransactionPayload = sdk.Position.closePositionTransactionPayload({
      coinTypeA: `0xbc72e752c41d6788dae67576f5a01a923d846d4f::usdt::USDT`,
      coinTypeB: `0xbc72e752c41d6788dae67576f5a01a923d846d4f::usdt::USDT`,
      pool_id:  poolObjectId,
      pos_id: pos_object_id
    })

const closePositionTransactionPayload = sdk.Position.closePositionTransactionPayload(closePositionTransactionPayload)

const transferTxn = (await signer.executeMoveCall(closePositionTransactionPayload)) as SuiExecuteTransactionResponse
console.log('close position: ', getTransactionEffects(transferTxn))

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
      )) as TxnBuilderTypes.TransactionPayloadEntryFunction
const respose = await sendPayloadTx(sdk.client, account, removeLiquidityPayload)

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
const slippage = 0.05
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
const toAmount = res.estimatedAmountOut
const amountLimit = toAmount.sub(toAmount.mul(new BN(slippage)))
// prepare pay objectIds for input assets
const payCoins: CoinAsset[] = CoinAssist.getCoinAssets(a2b ? pool.coinTypeA : pool.coinTypeB, allCoinAsset)
    const payObjectIds: ObjectId[] =  await CoinAssist.selectCoinAssets(signer,payCoins, BigInt(amount.toString()),sdk)
// build swap Payload
const swapPayload = sdk.Swap.createSwapTransactionPayload(
      {
        pool_id: pool.poolAddress,
        coinTypeA: pool.coinTypeA,
        coinTypeB: pool.coinTypeB
        a_to_b: a2b,
        by_amount_in: by_amount_in,
        amount: res.amount.toString(),
        amount_limit: amountLimit.toString(),
      },
      true
    ) as TxnBuilderTypes.TransactionPayloadEntryFunction

 const transferTxn = (await signer.executeMoveCall(swapPayload)) as SuiExecuteTransactionResponse
 console.log('swap: ', getTransactionEffects(transferTxn))

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
      coinType: [pool.coinTypeA, pool.coinTypeB , ...rewardCoinTypes]
    }

const collectRewarderPayload =  sdk.Rewarder.collectRewarderTransactionPayload(collectRewarderParams)

const transferTxn = (await signer.executeMoveCall(collectRewarderPayload)) as SuiExecuteTransactionResponse
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
