# . Fetch the coin list and clmm pool list

- The coin list and clmm pool list contains the coin metadata.
- code example for this guide can be found [config.test.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/cetus-config.test.ts)

```ts
const tokenConfig = sdk.sdkOptions.token.config

// Get coin config list.
const coin_list =  await sdk.CetusConfig.getCoinConfigs()

// Get clmm pool config list.
const pool_list =  await sdk.CetusConfig.getClmmPoolConfigs()

```
