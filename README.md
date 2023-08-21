<a name="readme-top"></a>

![NPM](https://img.shields.io/npm/l/%40cetusprotocol%2Fcetus-sui-clmm-sdk?registry_uri=https%3A%2F%2Fregistry.npmjs.com&style=flat&logo=npm&logoColor=blue&label=%40cetusprotocol&labelColor=rgb&color=fedcba&cacheSeconds=3600&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F%40cetusprotocol%2Fcetus-sui-clmm-sdk)
![npm](https://img.shields.io/npm/v/%40cetusprotocol%2Fcetus-sui-clmm-sdk?logo=npm&logoColor=rgb)
![GitHub Repo stars](https://img.shields.io/github/stars/CetusProtocol/cetus-clmm-sui-sdk?logo=github)

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a >
    <img src="./docs/logo.png" alt="Logo" width="100" height="100">
  </a>

  <h3 align="center">Cetus-CLMM-SUI-SDK</h3>

  <p align="center">
    Integrating Cetus-CLMM-SUI-SDK: A Comprehensive Guide, Please see details in document.
    <br />
    <a href="https://cetus-1.gitbook.io/cetus-docs/"><strong>Explore the document »</strong></a>
<br />
    <br />
    <a href="https://github.com/CetusProtocol/cetus-clmm-sui-sdk/tree/main/examples">View Demo</a>
    ·
    <a href="https://github.com/CetusProtocol/cetus-clmm-sui-sdk/issues">Report Bug</a>
    ·
    <a href="https://github.com/CetusProtocol/cetus-clmm-sui-sdk/issues">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
- [Latest Package address and NPM version](#latest-package-address-and-npm-version)
- [SDK configuration parameters](#sdk-configuration-parameters)
- [Introduction](#introduction)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setting Up Configuration](#setting-up-configuration)
  - [Features Available Right Now](#features-available-right-now)
    - [Query data](#query-data)
    - [Pool and Position (Liquidity)](#pool-and-position-liquidity)
    - [Swap with Partner](#swap-with-partner)
    - [Smart Router for Swap](#smart-router-for-swap)
      - [Smart Router V1](#smart-router-v1)
      - [Smart Router V2](#smart-router-v2)
    - [Swap Pre-calculating Result Show](#swap-pre-calculating-result-show)
    - [Conversion between liquidity, tickIndex, sqrtPrice, and coinAmount.](#conversion-between-liquidity-tickindex-sqrtprice-and-coinamount)
- [LICENSE](#license)

## Latest Package address and NPM version

**Mainnet**
|  clmmpool published_at   | integrate publish_at  | cetus-sui-sdk version |
|  ----  | ----  | ---- |
| 0xc33c3e937e5aa2009cc0c3fdb3f345a0c3193d4ee663ffc601fe8b894fbc4ba6 | 0x12fc0b1791df55bf2c91921f12152659c4a897fa6867144b5b3939a3ea004c46 | 3.10.0 |

**Testnet**
|  clmmpool published_at   | integrate publish_at  | cetus-sui-sdk version |
|  ----  | ----  | ---- |
| 0x1c29d658882c40eeb39a8bb8fe58f71a216a918acb3e3eb3b47d24efd07257f2 | 0xc831ec758f8ddcb23781a4288a9f2ccaf3e17cf7443e8888cf74fd7c80e1f52d | 3.10.0 |

## SDK configuration parameters

- The contract address available for reference [config.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/data/config.ts).
- `simulationAccount` Used to simulate trades and obtain tick data.
- *Notes: Please exercise caution when using a mainnet network account with assets as your `simulationAccount`.*

```bash
export const testnet =  {
  fullRpcUrl: 'https://fullnode.testnet.sui.io',
  simulationAccount: {
    address: ''
  },
  cetus_config: {
    package_id: '0xf5ff7d5ba73b581bca6b4b9fa0049cd320360abd154b809f8700a8fd3cfaf7ca',
    published_at: '0xf5ff7d5ba73b581bca6b4b9fa0049cd320360abd154b809f8700a8fd3cfaf7ca',
    config: {
      coin_list_id: '0x257eb2ba592a5480bba0a97d05338fab17cc3283f8df6998a0e12e4ab9b84478',
      launchpad_pools_id: '0xdc3a7bd66a6dcff73c77c866e87d73826e446e9171f34e1c1b656377314f94da',
      clmm_pools_id: '0x26c85500f5dd2983bf35123918a144de24e18936d0b234ef2b49fbb2d3d6307d',
      admin_cap_id: '0x1a496f6c67668eb2c27c99e07e1d61754715c1acf86dac45020c886ac601edb8',
      global_config_id: '0xe1f3db327e75f7ec30585fa52241edf66f7e359ef550b533f89aa1528dd1be52',
      coin_list_handle: '0x3204350fc603609c91675e07b8f9ac0999b9607d83845086321fca7f469de235',
      launchpad_pools_handle: '0xae67ff87c34aceea4d28107f9c6c62e297a111e9f8e70b9abbc2f4c9f5ec20fd',
      clmm_pools_handle: '0xd28736923703342b4752f5ed8c2f2a5c0cb2336c30e1fed42b387234ce8408ec'
    }
  },
  clmm_pool: {
    package_id: '0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666',
    published_at: '0x1c29d658882c40eeb39a8bb8fe58f71a216a918acb3e3eb3b47d24efd07257f2',
    config: {
      pools_id: '0xc090b101978bd6370def2666b7a31d7d07704f84e833e108a969eda86150e8cf',
      global_config_id: '0x6f4149091a5aea0e818e7243a13adcfb403842d670b9a2089de058512620687a',
      global_vault_id: '0xf3114a74d54cbe56b3e68f9306661c043ede8c6615f0351b0c3a93ce895e1699',
      admin_cap_id: '0xa456f86a53fc31e1243f065738ff1fc93f5a62cc080ff894a0fb3747556a799b',
      partners_id: '0xb1cefb6de411213a1cfe94d24213af2518eff3d51267fb95e35d11aa77fc9b5f'
    }
  },
  integrate: {
    package_id: '0x8627c5cdcd8b63bc3daa09a6ab7ed81a829a90cafce6003ae13372d611fbb1a9',
    published_at: '0xc831ec758f8ddcb23781a4288a9f2ccaf3e17cf7443e8888cf74fd7c80e1f52d'
  },
  deepbook: {
    package_id: '0x000000000000000000000000000000000000000000000000000000000000dee9',
    published_at: '0x000000000000000000000000000000000000000000000000000000000000dee9'
  },
  deepbook_endpoint_v2: {
    package_id: '0xa34ffca2c6540e1ca9e53963ab43e7b1eed7b82e37696c743bb7c6179c15dfa6',
    published_at: '0xa34ffca2c6540e1ca9e53963ab43e7b1eed7b82e37696c743bb7c6179c15dfa6'
  },
  aggregatorUrl: 'https://api-sui.devcetus.com/router'
}

export const mainnet = {
  fullRpcUrl: 'https://sui-mainnet-rpc.allthatnode.com',
  simulationAccount: {
    address: ''
  },
  cetus_config: {
    package_id: '0x95b8d278b876cae22206131fb9724f701c9444515813042f54f0a426c9a3bc2f',
    published_at: '0x95b8d278b876cae22206131fb9724f701c9444515813042f54f0a426c9a3bc2f',
    config: {
      coin_list_id: '0x8cbc11d9e10140db3d230f50b4d30e9b721201c0083615441707ffec1ef77b23',
      launchpad_pools_id: '0x1098fac992eab3a0ab7acf15bb654fc1cf29b5a6142c4ef1058e6c408dd15115',
      clmm_pools_id: '0x15b6a27dd9ae03eb455aba03b39e29aad74abd3757b8e18c0755651b2ae5b71e',
      admin_cap_id: '0x39d78781750e193ce35c45ff32c6c0c3f2941fa3ddaf8595c90c555589ddb113',
      global_config_id: '0x0408fa4e4a4c03cc0de8f23d0c2bbfe8913d178713c9a271ed4080973fe42d8f',
      coin_list_handle: '0x49136005e90e28c4695419ed4194cc240603f1ea8eb84e62275eaff088a71063',
      launchpad_pools_handle: '0x5e194a8efcf653830daf85a85b52e3ae8f65dc39481d54b2382acda25068375c',
      clmm_pools_handle: '0x37f60eb2d9d227949b95da8fea810db3c32d1e1fa8ed87434fc51664f87d83cb'
    }
  },
  clmm_pool: {
    package_id: '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb',
    published_at: '0xc33c3e937e5aa2009cc0c3fdb3f345a0c3193d4ee663ffc601fe8b894fbc4ba6',
    config: {
      pools_id: '0xf699e7f2276f5c9a75944b37a0c5b5d9ddfd2471bf6242483b03ab2887d198d0',
      global_config_id: '0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f',
      global_vault_id: '0xce7bceef26d3ad1f6d9b6f13a953f053e6ed3ca77907516481ce99ae8e588f2b',
      admin_cap_id: '0x89c1a321291d15ddae5a086c9abc533dff697fde3d89e0ca836c41af73e36a75',
      partners_id: '0xac30897fa61ab442f6bff518c5923faa1123c94b36bd4558910e9c783adfa204'
    }
  },
  integrate: {
    package_id: '0x996c4d9480708fb8b92aa7acf819fb0497b5ec8e65ba06601cae2fb6db3312c3',
    published_at: '0x12fc0b1791df55bf2c91921f12152659c4a897fa6867144b5b3939a3ea004c46'
  },
  deepbook: {
    package_id: '0x000000000000000000000000000000000000000000000000000000000000dee9',
    published_at: '0x000000000000000000000000000000000000000000000000000000000000dee9'
  },
  deepbook_endpoint_v2: {
    package_id: '0xac95e8a5e873cfa2544916c16fe1461b6a45542d9e65504c1794ae390b3345a7',
    published_at: '0xac95e8a5e873cfa2544916c16fe1461b6a45542d9e65504c1794ae390b3345a7'
  },
  aggregatorUrl: 'https://api-sui.cetus.zone/router
  '
}
```

## Introduction

Cetus-CLMM-SUI-SDK is the official software development kit (SDK) specifically designed for seamless integration with Cetus-CLMM. It provides developers with the necessary tools and resources to easily connect and interact with Cetus-CLMM, enabling the development of robust and efficient applications.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

To integrate our SDK into your local project, please follow the example steps provided below.
Please see details in document.

### Prerequisites

* npm

    ```sh
    npm i @cetusprotocol/cetus-sui-clmm-sdk
    ```

### Setting Up Configuration

1. Initialize testnet (or mainnet) SdkOption

    **NOTICE**
    1. In this example, the contract address version may backward, please use the latest clmmpool and integrate address.
    2. `simulationAccount` should be add an account address with a small amount of assets, it used to do estimated or other query object from.

2. Instantiate one CetusClmmSDK

Now, you can start using Cetus SDK.

### Features Available Right Now

#### Query data

- Retrieval clmm pools:
  - Retrieve all pools: [example](/examples/fetch_clmm_pools.ts#L3)
  - Batch retrieval of pools: [example](/examples/fetch_clmm_pools.ts#L12)
  - Retrieval one pool: [example](/examples/fetch_clmm_pools.ts#L81)
- Retrieval positions:
  - Retrieval all positions of one pool by `ownerAddress`: [example](/examples/fetch_positions.ts#L3)
  - Retrieval all positions of one pool: [example](/examples/fetch_positions.ts#L73)
  - Retrieval one position: [example](/examples/fetch_positions.ts#L81)
  - Batch retrieval position fee: [example](/examples/fetch_position.ts#L118)
- Retrieval reward:
  - Retrieval position reward list of one pool: [example](/examples/fetch_reward.ts#L3)
  - Retrieval reward emission infos for one pool every day [example](/examples/fetch_reward.ts#L52)
  - Retrieval reward of one position: [example](/examples/fetch_reward.ts#L77)
- Retrieval ticks:
  - Batch retrieval ticks by `poolID`: [example](/examples/fetch_ticks.ts#L3)
  - Batch retrieval ticks by  `tickHandle`: [example](/examples/fetch_ticks.ts#L42)

#### Pool and Position (Liquidity)

- Pool:
  - Create clmmpool: [doc](/docs/create-pool.md)
    - create one pool
    - create pools
- Position
  - Open position: [doc](/docs/open-position.md)
    - only open position
    - open position with add liquidity
  - Add liquidity: [doc](/docs/add-liquidity.md)
    - add liquidity with specified liquidity
    - add liquidity with fixed coin amount
  - Remove liquidity: [doc](/docs/remove-liquidity.md)
  - Close position: [doc](/docs/close-position.md)
  - Collect fee: [doc](/docs/collect-fee.md)
  - Collect reward: [doc](/docs/collect-rewarder.md)

#### Swap with Partner [doc](/docs/swap.md)

- preswap in one pool
- preswap in multi pools
- swap after preswap

#### Smart Router for Swap

##### Smart Router V1

- smart router swap: [doc](/docs/router.md)

##### Smart Router V2

- smart routerV2 swap: [doc](/docs/routerV2.md)

#### Swap Pre-calculating Result Show [doc](/docs/mathematical.md)

- price impact
- minimun received
- fee

#### Conversion between liquidity, tickIndex, sqrtPrice, and coinAmount. [doc](/docs/mathematical.md)

- liquidity to coinAmount
- price to tickIndex
- price from sqrt price

#### Partner

- check partner ref fee [doc](/docs/partner.md)

## LICENSE

CETUS-SUI-SDK released under the Apache license. See the [LICENSE](./LICENSE) file for details.
