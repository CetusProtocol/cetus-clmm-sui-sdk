# Quick Start

## cetus-sdk

- The typescript SDK for It encompasses all open-source functionalities interacting with the Cetus CLMM contract.
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

| module name | function |
| ----------- | ----------- |
| Swap | Providing a swap function and a pre-calculation function before swapping for the CLMM pool. |
| Pool | Provide CLMM pool related data information, as well as related interface operations based on the pool, such as obtaining pool lists, creating pools. |
| Position | Provide CLMM position information, as well as interface operations such as opening, adding, removing, and closing positions. |
| Rewarder | Provide reward information for calculating user CLMM pools and position, as well as interface for harvesting rewards. |
| Router | CLMM Router function support. |
| Token | Retrieve immutable configuration information related to the CLMM pool and the token. |

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