# . Fetch the token list and pool list

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
