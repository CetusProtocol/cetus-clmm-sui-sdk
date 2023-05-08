import { GasConfig } from '../../src/utils/gas_config'

const SDKConfig = {
  testnet: {
    clmmConfig: {
      pools_id: '0xc8407fc5dfec8d7b7014ee4d244dbe4eb456bfa6a7878e88c9d4bc947b2c2d87',
      global_config_id: '0x43e2925f7c5bed04b612cc66c53a850e280a46704ce12cd2f25420b537e23f9d',
      global_vault_id: '0x435c9725c4026206002a5a4004762316a53891f21a10c695311074482e52757e'
    },
    tokenConfig: {
      coin_registry_id: '0xde9a5123749136ca9fe05b88777e322f2161fe4aa71e9c575d5e27a31b815d40',
      pool_registry_id: '0x7b7b399344838363ec96611f133c77b98042404559e326fd289885b88848a3c5',
      coin_list_owner: '0xc93e168a9361b5443fef27dbbb95a023337c6bfd082fdd920d658f4f9147d801',
      pool_list_owner: '0x36d796de9529007373fd2e34311511a8ca4eaef2bf7ea65f65ab68a1bc1de092'
    },
    launchpadConfig: {
      pools_id: '',
      admin_cap_id: '',
      config_cap_id: ''
    },
    xcetusConfig: {
      xcetus_manager_id: '',
      lock_manager_id: '',
      lock_handle_id: '',
      dividend_manager_id: ''
    },
    boosterConfig: {
      booster_config_id: '',
      booster_pool_handle: ''
    },
    makerBonusConfig: {
      maker_config_id: '',
      maker_pool_handle: ''
    }
  },
  mainnet: {
    clmmConfig: {
      pools_id: '0xf699e7f2276f5c9a75944b37a0c5b5d9ddfd2471bf6242483b03ab2887d198d0',
      global_config_id: '0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f',
      global_vault_id: '0xce7bceef26d3ad1f6d9b6f13a953f053e6ed3ca77907516481ce99ae8e588f2b'
    },
    tokenConfig: {
      coin_registry_id: '0xe0b8cb7e56d465965cac5c5fe26cba558de35d88b9ec712c40f131f72c600151',
      pool_registry_id: '0xab40481f926e686455edf819b4c6485fbbf147a42cf3b95f72ed88c94577e67a',
      coin_list_owner: '0x1f6510ee7d8e2b39261bad012f0be0adbecfd75199450b7cbf28efab42dad083',
      pool_list_owner: '0x6de133b609ea815e1f6a4d50785b798b134f567ec1f4ee113ae73f6900b4012d'
    },
    launchpadConfig: {
      pools_id: '0xfd8d37f7a1276878972d240302c8efe32f577220c1bbc6c8984d8b60dddfcab3',
      admin_cap_id: '0x66c70d58c69353714cc6fe2d3a62492d605a96a9821e2bd8274de17219c69980',
      config_cap_id: '0x02b8d23f033687579966e182c776fe0287cacdbb18bff56c29f141e29a18a4d1'
    },
    xcetusConfig: {
      xcetus_manager_id: '',
      lock_manager_id: '',
      lock_handle_id: '',
      dividend_manager_id: ''
    },
    boosterConfig: {
      booster_config_id: '',
      booster_pool_handle: ''
    },
    makerBonusConfig: {
      maker_config_id: '',
      maker_pool_handle: ''
    }
  },
}

const rpcUrlConfigs = ['https://fullnode.testnet.sui.io', 'https://rpc-testnet.suiscan.xyz:443', 'https://sui-testnet.nodeinfra.com' ,"https://explorer-rpc.testnet.sui.io"]

// https://wiki.cplus.link/docs/rd/rd-1eg98jgpnk1v9
export const netConfig = {
  testnet: {
    gasConfig: new GasConfig(),
    fullRpcUrl: rpcUrlConfigs[0],
    faucetURL: '',
    faucet: {
      faucet_display: '0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e',
      faucet_router: '0xff3004dc90fee6f7027040348563feb866a61c8bb53049cc444c1746db8b218d',
    },
    simulationAccount: {
      address: '0x5f9d2fb717ba2433f7723cf90bdbf90667001104915001d0af0cccb52b67c1e8',
    },
    token: {
      token_display: '0xc7c40602f81eee198f472e14c87cb9c7186496064adba06cef1768c8b1785512',
      config: SDKConfig.testnet.tokenConfig,
    },
    clmm: {
      clmm_display: '0x837dddad95c6741474cde3e414a2eebccbeae81d0b378f193d00381bdaf0da62',
      clmm_router: {
        cetus: '0x32ba8c0298964e26161b3b44375ac39eeab6b29207e00c5f44368426096eb902',
        deepbook: '',
      },
      config: SDKConfig.testnet.clmmConfig,
    },
    launchpad: {
      ido_display: '',
      ido_router: '',
      config: SDKConfig.testnet.launchpadConfig,
    },
    xcetus: {
      xcetus_display: '',
      xcetus_router: '',
      dividends_display: '',
      dividends_router: '',
      cetus_faucet: '',
      config: SDKConfig.testnet.xcetusConfig,
    },
    booster: {
      booster_display: '',
      booster_router: '',
      config: SDKConfig.testnet.boosterConfig,
    },
    maker_bonus: {
      maker_display: "",
      maker_router: "",
      config: SDKConfig.testnet.makerBonusConfig,
    }
  },
  mainnet: {
    gasConfig: new GasConfig(),
    fullRpcUrl: 'https://sui-mainnet-endpoint.blockvision.org',
    // fullRpcUrl: 'https://rpc-mainnet.suiscan.xyz:443',
    // fullRpcUrl: 'https://fullnode.mainnet.sui.io',
    faucetURL: '',
    faucet: {
      faucet_display: '0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e',
      faucet_router: '0xff3004dc90fee6f7027040348563feb866a61c8bb53049cc444c1746db8b218d',
    },
    simulationAccount: {
      address: '0x326ce9894f08dcaa337fa232641cc34db957aec9ff6614c1186bc9a7508df0bb',
    },
    token: {
      token_display: '0x481fb627bf18bc93c02c41ada3cc8b574744ef23c9d5e3136637ae3076e71562',
      config: SDKConfig.mainnet.tokenConfig,
    },
    clmm: {
      clmm_display: '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb',
      clmm_router: {
        cetus: '0x2eeaab737b37137b94bfa8f841f92e36a153641119da3456dec1926b9960d9be',
        deepbook: '',
      },
      config: SDKConfig.mainnet.clmmConfig,
    },
    launchpad: {
      ido_display: '0x80d114c5d474eabc2eb2fcd1a0903f1eb5b5096a8dc4184d72453f7a9be728e4',
      ido_router: '0x80d114c5d474eabc2eb2fcd1a0903f1eb5b5096a8dc4184d72453f7a9be728e4',
      config: SDKConfig.mainnet.launchpadConfig,
    },
    xcetus: {
      xcetus_display: '',
      xcetus_router: '',
      dividends_display: '',
      dividends_router: '',
      cetus_faucet: '',
      config: SDKConfig.mainnet.xcetusConfig,
    },
    booster: {
      booster_display: '',
      booster_router: '',
      config: SDKConfig.mainnet.boosterConfig,
    },
    maker_bonus: {
      maker_display: "",
      maker_router: "",
      config: SDKConfig.mainnet.makerBonusConfig,
    }
  },
}

export const sdkEnv = netConfig.testnet
