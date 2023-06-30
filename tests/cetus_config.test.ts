
import { buildSdk } from './data/init_test_data';
import 'isomorphic-fetch';

describe('Config Module', () => {
     const sdk = buildSdk()

     test('getTokenListByCoinTypes', async () => {
      const tokenMap =  await sdk.CetusConfig.getTokenListByCoinTypes(["0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::cetus::CETUS"])
      console.log("tokenMap: ",tokenMap);
    })

    test('getCoinConfigs', async () => {
      const coin_list =  await sdk.CetusConfig.getCoinConfigs()
      console.log("coin_list: ",coin_list);
    })

    test('getClmmPoolConfigs', async () => {
      const pool_list =  await sdk.CetusConfig.getClmmPoolConfigs()
      console.log("pool_list: ",pool_list);
    })

    test('getLaunchpadPoolConfigs', async () => {
      const pool_list =  await sdk.CetusConfig.getLaunchpadPoolConfigs()
      console.log("pool_list: ",pool_list);
    })
})





