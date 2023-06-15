const SDKConfig = {
  clmmConfig: {
      pools_id: '0xc090b101978bd6370def2666b7a31d7d07704f84e833e108a969eda86150e8cf',
      global_config_id: '0x6f4149091a5aea0e818e7243a13adcfb403842d670b9a2089de058512620687a',
      global_vault_id: '0xf3114a74d54cbe56b3e68f9306661c043ede8c6615f0351b0c3a93ce895e1699',
      admin_cap_id: '0xa456f86a53fc31e1243f065738ff1fc93f5a62cc080ff894a0fb3747556a799b',
  },
  tokenConfig: {
    coin_registry_id: '0xb52e4b2bef6fe50b91680153c3cf3e685de6390f891bea1c4b6d524629f1f1a9',
    pool_registry_id: '0x68a66a7d44840481e2fa9dce43293a31dced955acc086ce019853cb6e6ab774f',
    coin_list_owner: '0x1370c41dce1d5fb02b204288c67f0369d4b99f70df0a7bddfdcad7a2a49e3ba2',
    pool_list_owner: '0x48bf04dc68a2b9ffe9a901a4903b2ce81157dec1d83b53d0858da3f482ff2539'
  }
}

export const clmm_testnet = {
  fullRpcUrl: 'https://fullnode.testnet.sui.io',
  faucetURL: '',
  faucet: {
    faucet_display: '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc',
    faucet_router: '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc',
  },
  simulationAccount: {
    address: '',
  },
  token: {
    token_display: '0x171d9d43dbf30a0ab448a2e268c6708447aa89626153a2b647298ca6449fb718',
    config: SDKConfig.tokenConfig,
  },
  clmm: {
    clmm_display: '0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666',
    clmm_router: '0x2b9b944d978c3fef70b818af306fad4f4f8dbaa9cc9210143dbd6c34f6593d45',
    config: SDKConfig.clmmConfig,
  }
}
