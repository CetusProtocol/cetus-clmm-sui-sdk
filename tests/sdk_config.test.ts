import { buildSdk } from './data/init_test_data'
import 'isomorphic-fetch'

const sdk = buildSdk()

describe('sdk config', () => {

  test('clmmConfig', async () => {
    try {
      const clmmConfig = await sdk.Pool.getClmmConfigs()
      console.log('clmmConfig ', clmmConfig)
    } catch (error) {
      console.log(error)
    }
  })

  test('tokenConfig', async () => {
    try {
      const tokenConfig = await sdk.Token.getTokenConfigEvent()
      console.log('tokenConfig: ', tokenConfig)
    } catch (error) {
      console.log(error)
    }
  })
})

describe('warp sdk config', () => {
  const config  = {
    clmmConfig: {
      pools_id: '',
      global_config_id: '',
      global_vault_id: '',
      admin_cap_id: ''
    },
    tokenConfig: {
      coin_registry_id: '',
      pool_registry_id: '',
      coin_list_owner: '',
      pool_list_owner: '',
    },
  }

  test('sdk Config', async () => {
    const sdkOptions = sdk.sdkOptions
    try {
      if (sdkOptions.clmm.clmm_display.length > 0) {
        const initEvent = await sdk.Pool.getClmmConfigs()
        config.clmmConfig = initEvent
      }
    } catch (error) {
      console.log('clmmConfig', error)
    }

    try {
      if (sdkOptions.token.token_display.length > 0) {
        const tokenConfig = await sdk.Token.getTokenConfigEvent()
        config.tokenConfig = tokenConfig
      }
    } catch (error) {
      console.log('tokenConfig', error)
    }
    console.log(config)
  })
})
