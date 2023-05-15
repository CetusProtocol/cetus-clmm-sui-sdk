const SDKConfig = {
  clmmConfig: {
    pools_id: '0xc090b101978bd6370def2666b7a31d7d07704f84e833e108a969eda86150e8cf',
    global_config_id: '0x6f4149091a5aea0e818e7243a13adcfb403842d670b9a2089de058512620687a',
    global_vault_id: '0xf3114a74d54cbe56b3e68f9306661c043ede8c6615f0351b0c3a93ce895e1699'
  },
  tokenConfig: {
    coin_registry_id: '0xb52e4b2bef6fe50b91680153c3cf3e685de6390f891bea1c4b6d524629f1f1a9',
    pool_registry_id: '0x68a66a7d44840481e2fa9dce43293a31dced955acc086ce019853cb6e6ab774f',
    coin_list_owner: '0x1370c41dce1d5fb02b204288c67f0369d4b99f70df0a7bddfdcad7a2a49e3ba2',
    pool_list_owner: '0x48bf04dc68a2b9ffe9a901a4903b2ce81157dec1d83b53d0858da3f482ff2539'
  },
  launchpadConfig: {
    pools_id: '',
    admin_cap_id: '',
    config_cap_id: '',
    config_pools_id: ''
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
  makerBonusConfig: { maker_config_id: '', maker_pool_handle: '' }
}

export const testnet = {
  fullRpcUrl: 'https://fullnode.testnet.sui.io',
  faucetURL: '',
  faucet: {
    faucet_display: '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc',
    faucet_router: '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc',
  },
  simulationAccount: {
    address: '0xcd0247d0b67e53dde69b285e7a748e3dc390e8a5244eb9dd9c5c53d95e4cf0aa',
  },
  token: {
    token_display: '0x171d9d43dbf30a0ab448a2e268c6708447aa89626153a2b647298ca6449fb718',
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
    maker_display: '',
    maker_router: '',
    config: SDKConfig.makerBonusConfig,
  },
}
