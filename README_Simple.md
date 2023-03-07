# cetus-sui-sdk

The typescript SDK for [cetus-clmm](https://git.cplus.link/cetus/cetus-clmm)

## Usage

### Install

```bash
npm i test-cetus-sui-clmm-sdk
```

### Test

```bash
yarn test
```

### SDKConfig

```bash
/**
 * initEventConfig  from await sdk.Resources.getInitEvent()
 * tokenConfig from sdk.Token.getTokenConfigEvent()
 */
const SDKConfig = {
  devnet:  {
    initEventConfig: {
      initFactoryEvent: { pools_id: '0x3d86df5423542713f6975cd7b8ecf8d7a7962469' },
      initPartnerEvent: { partners_id: '0x60c4037dd9d8b426bc8537b2969789afe80cd188' },
      initConfigEvent: {
        admin_cap_id: '0x390321a3147147fe4afe5b9391878accac31b9ee',
        global_config_id: '0x23489048afb274dd7ab4634722cf9ad272ce6657',
        protocol_fee_claim_cap_id: '0x952bbfce1bb56b34b142b9afde810716176fc1bd'
      }
    },
    tokenConfig:  {
      coin_registry_id: '0xeb1a855693e3790da2c0e867c06fc09d095546ec',
      pool_registry_id: '0xfb71a370e4f2475a17d3ef53c6917b3a2cd7695e',
      coin_list_owner: '0x603b714cda38b8679bdd5a44e304700126067f7c',
      pool_list_owner: '0x6920e982758aaae75d640343ddd22b712978313c'
    }
  }
}

// https://wiki.cplus.link/docs/rd/rd-1eg98jgpnk1v9
export const netConfig = {
  devnet: {
    fullRpcUrl: 'https://fullnode.devnet.sui.io',
    faucetURL: 'https://faucet.devnet.sui.io/gas',
    cetusClmm: '0xd7f87aa0ed51936050b8c5c6c7512e907d244e27',
    cetusIntegrate: '0x0c686f67601cbc59d42c057f52829293b06798ee',
    integerMate: '0x8131844e9d3b85cee419454b6066a7ba718402c5',
    swapPartner: '0x6c8ccd81ff2336d05e5f46cebbcdc0446a523c71',
    TokenDeployer: '0x53cf695b948bea160358a2f7893739d27bc983b5',
    faucetObjectId: '0xf3f169d4f40e941388e0745c12f118e752ced5af',
    initEventConfig: SDKConfig.devnet.initEventConfig,
    tokenConfig: SDKConfig.devnet.tokenConfig
  },
  testnet: {
    fullRpcUrl: 'https://fullnode.testnet.sui.io',
    faucetURL: '',
    cetusClmm: '0x8ac1458203099c4483bef2137537532c973c480b',
    clmmIntegrate: '0x5d86a111022f87ee2658935a0eea2bbd0875e949',
    faucetObjectId: '0x3477ff9927318838f31a9411f7af778b053b142a',
  },
}
```

### Init SDK

```ts
const defaultNetworkOptions: SdkOptions = {
  fullRpcUrl: sdkEnv.fullRpcUrl,
  faucetURL: sdkEnv.faucetURL,
  networkOptions: {
    simulationAccount: {
      address: '',
    },
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

### clmm池子

```ts
//查询所有池子信息
const allPool = await sdk.Resources.getPools([])
//查询单个池子信息
const pool = await sdk.Resources.getPool(poolObjectId)
//创建池子
sdk.Pool.creatPoolTransactionPayload(CreatePoolParams)
//查询当前钱包下所有仓位信息
sdk.Resources.getPositionList(accountAddress,[])
//查询单个仓位信息
sdk.Resources.getPosition(positionId)
```

### 流动性

```ts
//添加流动性 | 添加流动性并开仓
sdk.Position.createAddLiquidityTransactionPayload(AddLiquidityParams | AddLiquidityFixTokenParams)
//移除流动性
sdk.Position.removeLiquidityTransactionPayload(RemoveLiquidityParams)
//开仓
sdk.Position.openPositionTransactionPayload(OpenPositionParams)
//关闭仓位
sdk.Position.closePositionTransactionPayload(ClosePositionParams)
//收取fee
sdk.Position.collectFeeTransactionPayload(CollectFeeParams)
```

### swap

```ts
//通过RPC接口获取池子所有tick
sdk.Pool.fetchTicksByRpc(tickHandle)
//通过合约接口获取池子所有tick
sdk.Pool.fetchTicks(FetchTickParams)
//获取tick
sdk.Pool.getTickDataByIndex(tickHandle, tickIndex)
//获取tick
sdk.Pool.getTickDataByObjectId(tickId)
//模拟交易
sdk.Swap.preswap(PreSwapParams)
//swap
sdk.Swap.createSwapTransactionPayload(SwapParams)
```

### Token

```ts
//获取所有Token
sdk.Token.getAllRegisteredTokenList()
//获取指定地址下所有Token
sdk.Token.getOwnerTokenList(coin_list_owner)
//获取所有池子
sdk.Token.getAllRegisteredPoolList()
sdk.Token.getWarpPoolList()
//获取指定地址下所有池子
sdk.Token.getOwnerPoolList(pool_list_owner)
sdk.Token.getOwnerWarpPoolList(pool_list_owner,coin_list_owner)
```
