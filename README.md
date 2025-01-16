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
  </p>
</div>

## Introduction

Cetus-CLMM-SUI-SDK is the official software development kit (SDK) specifically designed for seamless integration with Cetus-CLMM. It provides developers with the necessary tools and resources to easily connect and interact with Cetus-CLMM, enabling the development of robust and efficient applications.

## Getting Started
To integrate our SDK into your local project, please follow the example steps provided below.
Please see details in document.
### Prerequisites
  ```sh
  npm i @cetusprotocol/cetus-sui-clmm-sdk
  ```

### Setting Up Configuration
Our SDK now includes a default initialization method that allows for quick generation of the Cetus SDK configuration. You can utilize the src/config/initCetusSDK method to swiftly initialize the configuration. You have the option to select either 'mainnet' or 'testnet' for the network.
  ```typescript
  import { initCetusSDK } from '@cetusprotocol/cetus-sui-clmm-sdk'

  const cetusClmmSDK = initCetusSDK({network: 'mainnet'})
  ```
If you wish to set your own full node URL and simulate address, you can do so as follows:
  ```typescript
  import { initCetusSDK } from '@cetusprotocol/cetus-sui-clmm-sdk'

  const network = 'mainnet';
  const fullNodeUrl = "https://..."
  const simulationAccount = "0x..."
  const cetusClmmSDK = initCetusSDK({network, fullNodeUrl, simulationAccount})
  ```

Now, you can start using Cetus SDK.

### Typrscript Doc
You can view this typescript sdk in 
<a href="https://cetus-1.gitbook.io/cetus-developer-docs/developer/dev-overview"><strong> Cetus Development Documents. </strong></a>
<br />

## LICENSE
CETUS-SUI-SDK released under the Apache license. See the [LICENSE](./LICENSE) file for details.

## More About Cetus
Use the following links to learn more about Cetus:
Learn more about working with Cetus in the [Cetus Documentation](https://cetus-1.gitbook.io/cetus-docs).

Join the Cetus community on [Cetus Discord](https://discord.com/channels/1009749448022315008/1009751382783447072).
