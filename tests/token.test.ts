
import { buildSdk } from './data/init_test_data';
import 'isomorphic-fetch';

describe('Token Module', () => {
     const sdk = buildSdk()
     const tokenConfig = sdk.sdkOptions.token.config

    test('getTokenListByCoinTypes', async () => {
      const tokenMap =  await sdk.Token.getTokenListByCoinTypes(["0x6864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS"])
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





