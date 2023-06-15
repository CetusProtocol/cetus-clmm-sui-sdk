const SDKConfig = {
  clmmConfig: {
    pools_id: '0xf699e7f2276f5c9a75944b37a0c5b5d9ddfd2471bf6242483b03ab2887d198d0',
    global_config_id: '0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f',
    global_vault_id: '0xce7bceef26d3ad1f6d9b6f13a953f053e6ed3ca77907516481ce99ae8e588f2b',
    admin_cap_id: '0x89c1a321291d15ddae5a086c9abc533dff697fde3d89e0ca836c41af73e36a75',
  },
  tokenConfig: {
    coin_registry_id: '0xe0b8cb7e56d465965cac5c5fe26cba558de35d88b9ec712c40f131f72c600151',
    pool_registry_id: '0xab40481f926e686455edf819b4c6485fbbf147a42cf3b95f72ed88c94577e67a',
    coin_list_owner: '0x1f6510ee7d8e2b39261bad012f0be0adbecfd75199450b7cbf28efab42dad083',
    pool_list_owner: '0x6de133b609ea815e1f6a4d50785b798b134f567ec1f4ee113ae73f6900b4012d',
  },
}

export const clmm_mainnet = {
  fullRpcUrl: 'https://sui-mainnet-rpc.allthatnode.com',
  faucetURL: '',
  faucet: {
    faucet_display: '0x0588cff9a50e0eaf4cd50d337c1a36570bc1517793fd3303e1513e8ad4d2aa96',
    faucet_router: '0x0588cff9a50e0eaf4cd50d337c1a36570bc1517793fd3303e1513e8ad4d2aa96',
  },
  simulationAccount: {
    address: '',
  },
  token: {
    token_display: '0x481fb627bf18bc93c02c41ada3cc8b574744ef23c9d5e3136637ae3076e71562',
    config: SDKConfig.tokenConfig,
  },
  clmm: {
    clmm_display: '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb',
    clmm_router: '0x886b3ff4623c7a9d101e0470012e0612621fbc67fa4cedddd3b17b273e35a50e',
    config: SDKConfig.clmmConfig,
  },
}
