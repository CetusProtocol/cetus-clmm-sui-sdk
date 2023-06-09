# cetus-sdk

## Intro

- The typescript SDK for [cetus-clmm](https://git.cplus.link/cetus/cetus-clmm).It encompasses all open-source functionalities interacting with the Cetus CLMM contract.
- A more structured code example for this guide can be found [here](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/tree/main/tests)

## Prerequisites

- Node.js 18+
- Our published package can be found here [NPM](https://www.npmjs.com/package/@cetusprotocol/cetus-sui-clmm-sdk).

```bash
yarn add @cetusprotocol/cetus-sui-clmm-sdk
or
npm  install @cetusprotocol/cetus-sui-clmm-sdk
```

## Usage

### Relevant mathematical methods

#### 1. Calculate the amount of position coin_a and coin_b

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

#### 2. Calculate price from sqrt price

use `/src/math/tick.ts TickMath.sqrtPriceX64ToPrice()`

```ts
const pool = await sdk.Pool.getPool(poolAddress)
const price = TickMath.sqrtPriceX64ToPrice(new BN(pool.current_sqrt_price))
```

#### 3. Calculate tick index from price

when you want to open position, you dont know how to set your tick_lower and tick_upper.
use `/src/math/tick.ts TickMath.priceToTickIndex()`

```ts
// decimalsA and decimalsB means the decimal of coinA and coinB
const tick_lower = TickMath.priceToTickIndex(price, decimalsA, decimalsB)
```

#### 4. Calculate price impact in once swap trade

There are no existed function to get price impact, please use the subsequent mathematical formula for the calculation.

<img src="./assert/priceimpact.png" width="450" />

#### 5. Transform type I32 to type number

There are some param is `I32` type, you can transform it by `asInN`. eg: tick.liquidityNet

```ts
const liquidityNet: new BN(BigInt.asIntN(128, BigInt(BigInt(tick.liquidityNet.toString()))).toString()),
```

### Interact with cetus contracts

#### 1.SDK configuration parameters

- The contract address available for reference [config.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/data/config.ts).
- `simulationAccount` Used to simulate trades and obtain tick data.
- *Notes: Please exercise caution when using a mainnet network account with assets as your `simulationAccount`.*

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
     faucet_display: '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc',
     faucet_router: '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc',
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
      clmm_router: '0x3a86c278225173d4795f44ecf8cfe29326d701be42b57454b05be76ad97227a7',
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
      address: '',
    },
    token: {
      token_display: '0x481fb627bf18bc93c02c41ada3cc8b574744ef23c9d5e3136637ae3076e71562',
      config: SDKConfig.mainnet.tokenConfig,
    },
    clmm: {
      clmm_display: '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb',
      clmm_router: '0x2eeaab737b37137b94bfa8f841f92e36a153641119da3456dec1926b9960d9be',
      config: SDKConfig.mainnet.clmmConfig,
    },
  }
}
```

#### 2. Init CetusClmmSDK

- The `CetusClmmSDK`  class provides a set of modules for interacting with the Cetus CLMM pool and positions.

| module name | function|
| --- | --- | --- |
| Swap | Providing a swap function and a pre-calculation function before swapping for the CLMM pool. |
| Pool | Provide CLMM pool related data information, as well as related interface operations based on the pool, such as obtaining pool lists, creating pools, etc. |
| Position | Provide CLMM position information, as well as interface operations such as opening, adding, removing, and closing positions. |
| Rewarder | Provide reward information for calculating user CLMM pools and position, as well as interface for harvesting rewards. |
| Router | CLMM Router function support |
| Config | Retrieve immutable configuration information related to the CLMM pool and the token |

```ts
// init global sdk object
const sdk = new CetusClmmSDK(netConfig.testnet)

// When connecting the wallet, set the wallet address
sdk.senderAddress = ""
```

#### 3. Get Global Config

When you need to interactive with cetus clmm contract, you need to pass **global config** first.
The address of **global config** is fixed.

```ts
const global_config = sdk.SDKConfig.mainnet.clmmConfig.global_config_id
```

#### 4. Fetch the token list and pool list

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

#### 5. Operate the clmm pool and position

- the clmm pool not contains the token metadata.
- all liquidity and swap operations are based on clmm pool.
- code example for this guide can be found [pool.test.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/pool.test.ts)

##### 5.1 Fetch the clmm pool and position

```ts
//Fetch all clmm pools
const assignPools = [''] // query assign pool, if it's empty, query all.
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

##### 5.2 Create clmm pool and add liquidity

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

##### 5.3 Create clmm pool (support batch create)

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

#### 6. Liquidity

- code example for this guide can be found [position.test.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/position.test.ts)

##### 6.1 Open position and add liquidity

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

##### 6.2  Add liquidity

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

##### 6.3  Remove liquidity(can control whether collect fee)

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

##### 6.4  Close position

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

##### 6.5  Open position

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

##### 5.6  Collect fee

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

#### 7. Swap and Pre swap

- This swap example, we show how to do swap and pre swap about one pair in an exact clmmpool with the amount limit abount input coin or output coin, we should do preswap first, then we set the desired price difference according to the pre-swap results.

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

#### 8. Collect rewarder

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

#### 9. Fetch tick

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

#### Swap in best Router

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

### Partner

#### 1. Partner AccountCap

Only verified account are eligible to collect partner ref fees. When creating a partner, we generate an object **partner AccountCap**(you can see it in your NFT list). Only accounts that possess the AccountCap are able to claim the fees.

#### 2. Claim AccountCap

You can claim the partner ref fee by curl movecall about cetus contract entry function `cetus::partner_script::claim_ref_fee()` on sui explore.
