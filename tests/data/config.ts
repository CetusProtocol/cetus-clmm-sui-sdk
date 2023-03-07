/**
 * initEventConfig  from await sdk.Resources.getInitEvent()
 * tokenConfig from sdk.Token.getTokenConfigEvent()
 */
const SDKConfig = {
  devnet:  {
      initEventConfig:  {
        initFactoryEvent: { pools_id: '0xbaa9aaf9674c837bf2272f540d2ac35bf57f8398' },
        initPartnerEvent: { partners_id: '0x78a800ff634e7dcacff92819f2aae44a33ba0588' },
        initConfigEvent: {
          admin_cap_id: '0xa3ea3c2067ab535c0ef2721f8ec15d2777e6620e',
          global_config_id: '0xe6f7329ab2e1cd4f01de8a82f5980de545474022',
          protocol_fee_claim_cap_id: '0x72514fb34b8fc3fd4efc1e463937065127e81e77'
        }
      },
      tokenConfig: {
        coin_registry_id: '0x3f9f6609fc99440e41c7e178ff1250274170c889',
        pool_registry_id: '0x699cff0b7e44e565908b4acfa482022cfbfc16c1',
        coin_list_owner: '0x7634802da06a3a4c8e4aa8c425cfd83406670e34',
        pool_list_owner: '0xa4e177fe96f33a7ec7f2aa14ad5387cac7c7cc21'
      }
  },
  testnet:  {
    initEventConfig:  {
      initFactoryEvent: { pools_id: '0xbaa9aaf9674c837bf2272f540d2ac35bf57f8398' },
      initPartnerEvent: { partners_id: '0x78a800ff634e7dcacff92819f2aae44a33ba0588' },
      initConfigEvent: {
        admin_cap_id: '0xa3ea3c2067ab535c0ef2721f8ec15d2777e6620e',
        global_config_id: '0xe6f7329ab2e1cd4f01de8a82f5980de545474022',
        protocol_fee_claim_cap_id: '0x72514fb34b8fc3fd4efc1e463937065127e81e77'
      }
    },
    tokenConfig: {
      coin_registry_id: '0x94eaa27edef3755085af24da1418ed0b66076916',
      pool_registry_id: '0xc41e206d8102dcec19d7a562f9bf586037f821c5',
      coin_list_owner: '0xa215987d5a2d18873cc7bf84620082db81576cdd',
      pool_list_owner: '0x081f3af881a6a37d65c671d3d53fddabe5605968'
    }
  }
}

// https://wiki.cplus.link/docs/rd/rd-1eg98jgpnk1v9
export const netConfig = {
  devnet: {
    fullRpcUrl: 'https://fullnode.devnet.sui.io',
    faucetURL: 'https://faucet.devnet.sui.io/gas',
    cetusClmm: '0xbf09195a58b786c063b08e4fae2793c36ef65835',
    cetusIntegrate: '0x1b2735ee3950a730df1f91692bf98707f848198b',
    integerMate: '0x3a1a096b4d2598eb3958c91fc8787c3e62f40770',
    swapPartner: '0xa420bad83346a8cd05c98fff988d90ef8d149b4c',
    TokenDeployer: '0x7bfe88372b99abb54609b58fee652b97a162cbcf',
    faucetObjectId: '0x6740d70296035d0345bed636a820af129f6ed422',
    initEventConfig: SDKConfig.devnet.initEventConfig,
    tokenConfig: SDKConfig.devnet.tokenConfig,
    simulationAccount: {
      address: '0x3f6cfdcf7bc19e86693d3d0f261f56b6e8caff0d',
    }
  },
  testnet: {
    fullRpcUrl: 'https://fullnode.testnet.sui.io',
    faucetURL: '',
    cetusClmm: '0x8fe718e1028a7678c17a27cc1926ce7e0db0079e',
    cetusIntegrate: '0xb2364d5ee45bfa3642d477a75a8bdc54f2bdefb7',
    integerMate: '0xf3f6102dfcf5910d694408737126d84f74374f5e',
    swapPartner: '0xd8e3f23676a9e07959f510212b93ab8160bf1bee',
    TokenDeployer: '0x53cf695b948bea160358a2f7893739d27bc983b5',
    faucetObjectId: '0xf3f169d4f40e941388e0745c12f118e752ced5af',
    initEventConfig: SDKConfig.testnet.initEventConfig,
    tokenConfig: SDKConfig.testnet.tokenConfig
  },
}
