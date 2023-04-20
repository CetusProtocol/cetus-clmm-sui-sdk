import { GasConfig } from '../../src/utils/gas_config'

const SDKConfig = {
  testnet: {
    clmmConfig: {
      pools_id: '0x67679ae85ea0f39f5c211330bb830f68aeccfbd0085f47f80fc27bef981cc678',
      global_config_id: '0x28565a057d74e4c20d502002bdef5ecf8ff99e1bd9fc4dd11fe549c858ee99d7',
      global_vault_id: '0x6d582d2fa147214d50a0e537084859403e96a3b4554e962d5e993ad5761251f4',
    },
    tokenConfig: {
      coin_registry_id: '0x2cc70e515a70f3f953363febbab5e01027a25fc01b729d9de29df3db326cc302',
      pool_registry_id: '0xfd15ad9a6493fc3ff6b2fc922daeda50bba3df760fda32e53382b7f8dbcbc133',
      coin_list_owner: '0x44682678136f8e8b5a4ffbf9fe06a940b0ccbc9d46d9ae1a68aef2332c2e9cf1',
      pool_list_owner: '0x494262448a7b8d07e6f00980b67f07a18432a5587d898c27651d18daa4c4c33f'
    },
    launchpadConfig: {
      pools_id: '0x5f7b271f5f21c16532440161c4a8fa8247f43c8e6054fcfa75cb4ad7b207d60a',
      admin_cap_id: '0x094f16cf0a37b38f6429416a30c8ef1a5f1a80286b460e8917e9d1d9252d48ba',
      config_cap_id: '0xe94fe811f1bef8cef1e323e95c8514c81d0a11c4765434762adb5480584aa051',
      lock_manager_id: '0xded40f6b0ffebeaece53ead5c5547891da6988fc2f3fe0ba998182c01ca646fd'
    },
    xwhaleConfig: {
      xwhale_manager_id: '0x6634aca8126ba9636d5239e3f1f7d26ceea607b329dd09014425e444aca4dcdd',
      lock_manager_id: '0xa6f43b6ee8f710501d4bd9df076ce5ae9354056db9c2f4e513bfc653c789c998',
      dividend_manager_id: '0xa2c45cd911255afb2173685e6ae3da5dabaede4806233809db9983415f16a656'
    },
  },

}

const rpcUrlConfigs = ['https://fullnode.testnet.sui.io', 'https://rpc-testnet.suiscan.xyz:443', 'https://sui-testnet.nodeinfra.com']

// https://wiki.cplus.link/docs/rd/rd-1eg98jgpnk1v9
export const netConfig = {
  testnet: {
    gasConfig: new GasConfig(),
    fullRpcUrl: rpcUrlConfigs[1],
    faucetURL: '',
    faucet_router: '0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e',
    simulationAccount: {
      address: '0x5f9d2fb717ba2433f7723cf90bdbf90667001104915001d0af0cccb52b67c1e8',
    },
    token: {
      token_display: '0x9dac946be53cf3dd137fa9289a23ecf146f8b87f3eb1a91cc323c93cdd26f8b3',
      config: SDKConfig.testnet.tokenConfig,
    },
    clmm: {
      clmm_display: '0xb7e7513751376aed2e21b267ef6edebe806a27c979870d3575658dd443ac4248',
      clmm_router: '0x5b77ec28a4077acb46e27e2421aa36b6bbdbe14b4165bc8a7024f10f0fde6112',
      config: SDKConfig.testnet.clmmConfig,
    },
    launchpad: {
      ido_display: '0x983e7e23e5febcdc703249eeb2bbc88ead8590928dfd4b37386ce958244a595c',
      ido_router: '0x983e7e23e5febcdc703249eeb2bbc88ead8590928dfd4b37386ce958244a595c',
      lock_display: '0x2be1314d0ca4c12400e4c48c58854b430a4a3c57fc5a45792926755c6a560d9e',
      lock_router: '0x2be1314d0ca4c12400e4c48c58854b430a4a3c57fc5a45792926755c6a560d9e',
      config: SDKConfig.testnet.launchpadConfig,
    },
    xwhale: {
      xwhale_display: '0x02d4ebbd89ec4e9c2c32680e22a6361006656b13f8cd506323cffa55b6254d33',
      xwhale_router: '0x02d4ebbd89ec4e9c2c32680e22a6361006656b13f8cd506323cffa55b6254d33',
      dividends_display: '0x4a4f531ce0971fad84ee57824414d3f770a055fffc531d6ef5f1cc0c9f7ac542',
      dividends_router: '0x4a4f531ce0971fad84ee57824414d3f770a055fffc531d6ef5f1cc0c9f7ac542',
      booster_display: '',
      booster_router: '',
      whale_faucet: '0x8244994892a3d0a15aef012f1570544a0af891994ab5f3fffe2b0796332d7bf0',
      config: SDKConfig.testnet.xwhaleConfig,
    },
  },

}

export const sdkEnv = netConfig.testnet
