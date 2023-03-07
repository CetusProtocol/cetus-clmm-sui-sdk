
import { buildSdk } from './data/init_test_data';

describe('token Module', () => {
     const sdk = buildSdk()
     const tokenConfig = sdk.sdkOptions.networkOptions.token.config

     test('getTokenConfigEvent', async () => {
      const tokenConfig =  await sdk.Token.getTokenConfigEvent()
      console.log("tokenConfig: ",tokenConfig);

    })

    test('getAllRegisteredTokenList', async () => {
      const tokenList =  await sdk.Token.getAllRegisteredTokenList()
      console.log("tokenList: ",tokenList);
    })

    test('getOwnerTokenList', async () => {
      const tokenList =  await sdk.Token.getOwnerTokenList(tokenConfig.coin_list_owner)
      console.log("tokenList: ",tokenList);
    })

    test('getAllRegisteredPoolList', async () => {
      const lp_list =  await sdk.Token.getAllRegisteredPoolList()
      console.log("lp_list: ",lp_list);

    })

    test('getOwnerPoolList', async () => {
      const lp_list =  await sdk.Token.getOwnerPoolList(tokenConfig.pool_list_owner)
      console.log("lp_list: ",lp_list);
    })


    test('getWarpPoolList', async () => {
      const lp_list =  await sdk.Token.getWarpPoolList()
      console.log("lp_list: ",lp_list);

    })

    test('getOwnerWarpPoolList', async () => {
      const {pool_list_owner, coin_list_owner} = tokenConfig
      const lp_list =  await sdk.Token.getOwnerWarpPoolList(pool_list_owner,coin_list_owner)
      console.log("lp_list: ",lp_list);
    })

})





