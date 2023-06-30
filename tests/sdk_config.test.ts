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

  test('cetusConfig', async () => {
    try {
      const cetusConfig = await sdk.CetusConfig.getCetusConfig()
      console.log('cetusConfig: ', cetusConfig)
    } catch (error) {
      console.log(error)
    }
  })
})

describe('warp sdk config', () => {
  const config = {
    clmmConfig: {
      pools_id: '',
      global_config_id: '',
      global_vault_id: '',
      admin_cap_id: '',
    },
    cetusConfig: {
      coin_list_id: '',
      launchpad_pools_id: '',
      clmm_pools_id: '',
      admin_cap_id: '',
      global_config_id: '',
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
      if (sdkOptions.cetus_config.config_display.length > 0) {
        const cetusConfig = await sdk.CetusConfig.getCetusConfig()
        config.cetusConfig = cetusConfig
      }
    } catch (error) {
      console.log('tokenConfig', error)
    }
    console.log(config)
  })
})
