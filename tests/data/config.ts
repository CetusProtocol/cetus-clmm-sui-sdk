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
  }
}

export const netConfig = {
  devnet: {
    fullRpcUrl: 'https://fullnode.devnet.sui.io',
    faucetURL: 'https://faucet.devnet.sui.io/gas',
    cetusClmm: '0xbf09195a58b786c063b08e4fae2793c36ef65835',
    cetusIntegrate: '0x1b2735ee3950a730df1f91692bf98707f848198b',
    integerMate: '0x3a1a096b4d2598eb3958c91fc8787c3e62f40770',
    swapPartner: '', // Contact the platform to apply
    TokenDeployer: '0x7bfe88372b99abb54609b58fee652b97a162cbcf',
    faucetObjectId: '0x6740d70296035d0345bed636a820af129f6ed422',
    initEventConfig: SDKConfig.devnet.initEventConfig,
    tokenConfig: SDKConfig.devnet.tokenConfig,
    simulationAccount: {
      address: '0x3f6cfdcf7bc19e86693d3d0f261f56b6e8caff0d',
    }
  }

}
