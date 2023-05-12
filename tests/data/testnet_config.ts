import GasConfig from "../../src/utils/gas_config"

const SDKConfig = {
  clmmConfig: {
    pools_id: '0xc090b101978bd6370def2666b7a31d7d07704f84e833e108a969eda86150e8cf',
    global_config_id: '0x6f4149091a5aea0e818e7243a13adcfb403842d670b9a2089de058512620687a',
    global_vault_id: '0xf3114a74d54cbe56b3e68f9306661c043ede8c6615f0351b0c3a93ce895e1699'
  },
  tokenConfig: {
    coin_registry_id: '',
    pool_registry_id: '',
    coin_list_owner: '',
    pool_list_owner: ''
  },
  launchpadConfig: {
    pools_id: '',
    admin_cap_id: '',
    config_cap_id: '',
    config_pools_id:''
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
}

export const testnet = {
  gasConfig: new GasConfig(),
  fullRpcUrl: 'https://fullnode.testnet.sui.io',
  faucetURL: '',
  faucet: {
    faucet_display: '',
    faucet_router: '',
  },
  simulationAccount: {
    address: '',
  },
  token: {
    token_display: '',
    config: SDKConfig.tokenConfig,
  },
  clmm: {
    clmm_display: '0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666',
    clmm_router: {
      cetus: '0x3a86c278225173d4795f44ecf8cfe29326d701be42b57454b05be76ad97227a7',
      deepbook: '',
    },
    config: SDKConfig.clmmConfig,
  },
  launchpad: {
    ido_display: '',
    ido_router: '',
    config_display: '',
    config: SDKConfig.launchpadConfig,
  },
  xcetus: {
    xcetus_display: '',
    xcetus_router: '',
    dividends_display: '',
    dividends_router: '',
    cetus_faucet: '',
    config: SDKConfig.xcetusConfig,
  },
  booster: {
    booster_display: '',
    booster_router: '',
    config: SDKConfig.boosterConfig,
  },
  maker_bonus: {
    maker_display: "",
    maker_router: "",
    config: SDKConfig.makerBonusConfig,
  }
}