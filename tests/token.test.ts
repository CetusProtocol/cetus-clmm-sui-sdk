
import { buildSdk } from './data/init_test_data';
import 'isomorphic-fetch';

describe('token Module', () => {
     const sdk = buildSdk()
     const tokenConfig = sdk.sdkOptions.token.config

    test('getTokenListByCoinTypes', async () => {
      const tokenMap =  await sdk.Token.getTokenListByCoinTypes(["0xde093aecdfbce6e49461bc2a3f463611e4b90b580bc8ae83701d03e97afcc291::xcetus::XCETUS"])

      
      console.log("tokenMap: ",tokenMap);

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





