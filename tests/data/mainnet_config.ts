const SDKConfig = {
  clmmConfig: {
    pools_id: '0xf699e7f2276f5c9a75944b37a0c5b5d9ddfd2471bf6242483b03ab2887d198d0',
    global_config_id: '0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f',
    global_vault_id: '0xce7bceef26d3ad1f6d9b6f13a953f053e6ed3ca77907516481ce99ae8e588f2b',
    admin_cap_id: '0x89c1a321291d15ddae5a086c9abc533dff697fde3d89e0ca836c41af73e36a75',
  },
  cetusConfig: {
    coin_list_id: '0x8cbc11d9e10140db3d230f50b4d30e9b721201c0083615441707ffec1ef77b23',
    launchpad_pools_id: '0x1098fac992eab3a0ab7acf15bb654fc1cf29b5a6142c4ef1058e6c408dd15115',
    clmm_pools_id: '0x15b6a27dd9ae03eb455aba03b39e29aad74abd3757b8e18c0755651b2ae5b71e',
    admin_cap_id: '0x39d78781750e193ce35c45ff32c6c0c3f2941fa3ddaf8595c90c555589ddb113',
    global_config_id: '0x0408fa4e4a4c03cc0de8f23d0c2bbfe8913d178713c9a271ed4080973fe42d8f',
    coin_list_handle: '0x49136005e90e28c4695419ed4194cc240603f1ea8eb84e62275eaff088a71063',
    launchpad_pools_handle: '0x5e194a8efcf653830daf85a85b52e3ae8f65dc39481d54b2382acda25068375c',
    clmm_pools_handle: '0x37f60eb2d9d227949b95da8fea810db3c32d1e1fa8ed87434fc51664f87d83cb',
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
    address: '0x326ce9894f08dcaa337fa232641cc34db957aec9ff6614c1186bc9a7508df0bb',
  },
  cetus_config: {
    config_display: '0x95b8d278b876cae22206131fb9724f701c9444515813042f54f0a426c9a3bc2f',
    config_router: '0x95b8d278b876cae22206131fb9724f701c9444515813042f54f0a426c9a3bc2f',
    config: SDKConfig.cetusConfig,
  },
  clmm: {
    clmm_display: '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb',
    clmm_router: '0xf58457acfccac2b252150ed6f12acba1f1fe48340127a21247450867ea10f240',
    config: SDKConfig.clmmConfig,
  },
  deepbook: {
    deepbook_display: '0x000000000000000000000000000000000000000000000000000000000000dee9',
    deepbook_endpoint_v2: '0x69cbacf622b5074c460da71a246a923cf16a45793f0da31cf26fa739fea0505b',
  },
  aggregatorUrl: 'http://192.168.1.45:8080/router',
}
