<a name="readme-top"></a>

![NPM](https://img.shields.io/npm/l/%40cetusprotocol%2Fcetus-sui-clmm-sdk?registry_uri=https%3A%2F%2Fregistry.npmjs.com&style=flat&logo=npm&logoColor=blue&label=%40cetusprotocol&labelColor=rgb&color=fedcba&cacheSeconds=3600&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F%40cetusprotocol%2Fcetus-sui-clmm-sdk)
![npm](https://img.shields.io/npm/v/%40cetusprotocol%2Fcetus-sui-clmm-sdk?logo=npm&logoColor=rgb)
![GitHub Repo stars](https://img.shields.io/github/stars/CetusProtocol/cetus-clmm-sui-sdk?logo=github)

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a >
    <img src="https://archive.cetus.zone/assets/image/logo.png" alt="Logo" width="100" height="100">
  </a>

  <h3 align="center">Cetus-CLMM-SUI-SDK</h3>

  <p align="center">
    Integrating Cetus-CLMM-SUI-SDK: A Comprehensive Guide, Please see details in document.
    <br />
    <a href="https://cetus-1.gitbook.io/cetus-developer-docs/developer/dev-overview"><strong>Explore the document »</strong></a>
<br />
    <br />
    <a href="https://github.com/CetusProtocol/cetus-clmm-sui-sdk/tree/main/examples">View Demo</a>
    ·
    <a href="https://github.com/CetusProtocol/cetus-clmm-sui-sdk/issues">Report Bug</a>
    ·
  </p>
</div>

<!-- TABLE OF CONTENTS -->
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

## SDK configuration parameters

- The contract address available for reference [cetus-developer-docs](https://cetus-1.gitbook.io/cetus-developer-docs/developer/via-sdk/getting-started#latest-sdk-config).
- `simulationAccount` used to simulate trades and obtain tick data.
- *Notes: Please exercise caution when using a mainnet network account with assets as your `simulationAccount`.*


## Introduction

Cetus-CLMM-SUI-SDK is the official software development kit (SDK) specifically designed for seamless integration with Cetus-CLMM. It provides developers with the necessary tools and resources to easily connect and interact with Cetus-CLMM, enabling the development of robust and efficient applications.


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
<a href="https://cetus-1.gitbook.io/cetus-developer-docs/developer/dev-overview"><strong> »»» See details in development document. </strong></a>
<br />

1. Retrieve data
1.1 Retrieve clmm pools
1.2 Retrieve positions
1.3 Retrieve reward
1.4 Retrieve ticks
2. Pools and postions
2.1 Create clmm pool
2.2 Open position
2.3 Add liquidity
2.4 Remove liquidity
2.5 Close position
2.6 Collect fees
2.7 Collect rewards
3. Swap
3.1 Swap
3.2 Partner swap
3.3 Smart router v1 
3.4 Smart router v2
3.5 Price impact
3.6 Minimum received & Maximum sold
3.7 Fee
4. Liquidity correlation calculation
4.1 Liquidity correlation calculation

## LICENSE
CETUS-SUI-SDK released under the Apache license. See the [LICENSE](./LICENSE) file for details.
