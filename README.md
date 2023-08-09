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
    Integrating Cetus-CLMM-SUI-SDK: A Comprehensive Guide
    <br />
    <a href="https://cetus-1.gitbook.io/cetus-docs/"><strong>Explore the docs »</strong></a>
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
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#introduction">Introduction</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## Introduction

Cetus-CLMM-SUI-SDK is the official software development kit (SDK) specifically designed for seamless integration with Cetus-CLMM. It provides developers with the necessary tools and resources to easily connect and interact with Cetus-CLMM, enabling the development of robust and efficient applications.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started
To integrate our SDK into your local project, please follow the example steps provided below:

### Prerequisites
* npm
    ```sh
    npm i @cetusprotocol/cetus-sui-clmm-sdk
    ```

### Setting up configuration
1. Initialize testnet (or mainnet) SdkOption. [example](/examples/init_testnet_sdk.ts#L23)

    **simulationAccount** you should add an account address with a small amount of assets, it uesd to do preswap or other get object from chain.

2. Instantiate one CetusClmmSDK. [example](/examples/init_testnet_sdk.ts#L52)


Now, you can start using Cetus SDK officially.


### Features available right now
#### Query
  - Fetch clmm pools:
    - fetch all pools: [example](/examples/fetch_clmm_pools.ts#L3)
    - fetch betch pools: [example](/examples/fetch_clmm_pools.ts#L12)
    - fetch one pool: [example](/examples/fetch_clmm_pools.ts#L81)
  - Fetch positions:
    - fetch all positions of one pool by `owner_address`: [example](/examples/fetch_positions.ts#L3)
    - fetch all positions of one pool: [example](/examples/fetch_positions.ts#L73)
    - fetch one position by `position_id`: [example1](/examples/fetch_positions.ts#L81) [example2](/examples/fetch_positions.ts#L118)
  - Fetch reward:
    - fetch position reward list of one pool: [example](/examples/fetch_reward.ts#L3)
    - fetch reward emission infos for one pool every day. [example](/examples/fetch_reward.ts#L52)
    - fetch 

- Fetch coin list and clmm pool list 
config for cetus config contract. [More](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/docs/cetus-config.md)
- Fetch clmm pool and position from cetus clmm contract. [More](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/docs/pool.md)
- Create clmm pool. [More](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/docs/create-pool.md)
- The add liquidity for clmm position. [More](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/docs/add-liquidity.md)
- The remove liquidity for clmm position. [More](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/docs/remove-liquidity.md)
- The open position for clmm pool. [More](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/docs/open-position.md)
- The close position for clmm pool. [More](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/docs/close-position.md)
- The swap for clmm pool. [More](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/docs/swap.md)
- The router swap for clmm pool. [More]((https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/docs/router.md))
- The routerV2 swap for clmm pool. [More]((https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/docs/routerV2.md))
- Swap in best Router. [More](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/docs/router.md)
- The collect fee for clmm position . [More](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/docs/collect-fee.md)
- The collect rewarder for clmm position earn. [More](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/docs/collect-rewarder.md)
- Relevant mathematical methods for cetus clmm. [More](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/docs/mathematical.md)
- The partner. [More](./docs/partner.md)


## Quick Start

- Current dependent SDK NPM version is [3.9.1](https://www.npmjs.com/package/@cetusprotocol/cetus-sui-clmm-sdk/v/3.9.1)
- The Quick Start provides developers with a streamlined process for integrating and using the SDK.[More](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/docs/quick-start.md)


