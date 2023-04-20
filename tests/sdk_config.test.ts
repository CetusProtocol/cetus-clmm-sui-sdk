import { buildSdk } from './data/init_test_data'
import 'isomorphic-fetch'

describe('sdk config', () => {
  const sdk = buildSdk()

  test('clmmConfig', async () => {
    try {
      const initEvent = await sdk.Resources.getInitEvent()
      console.log('clmmConfig ', initEvent)
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

  test('launchpadConfig', async () => {
    try {
      const initFactoryEvent = await sdk.Launchpad.getInitFactoryEvent()
      const initLockEvent = await sdk.Launchpad.getInitLockEvent()
      console.log('launchpadConfig ', {
        ...initFactoryEvent,
        lock_manager_id: initLockEvent.lock_manager_id,
      })
    } catch (error) {
      console.log(error)
    }
  })

  test('xwhaleConfig', async () => {
    try {
      const initFactoryEvent = await sdk.XWhaleModule.getInitFactoryEvent()
      const lockUpManagerEvent = await sdk.XWhaleModule.getLockUpManagerEvent()
      const dividendManagerEvent = await sdk.XWhaleModule.getDividendManagerEvent()
      console.log({
        ...initFactoryEvent,
        lock_manager_id: lockUpManagerEvent.lock_manager_id,
        dividend_manager_id: dividendManagerEvent.dividend_manager_id
      })
    } catch (error) {
      console.log(error)
    }
  })
})

describe('warp sdk config', () => {
  const sdk = buildSdk()

  const config =  {
    clmmConfig: {
      pools_id: '',
      global_config_id: '',
      global_vault_id: '',
    },
    tokenConfig: {
      coin_registry_id: '',
      pool_registry_id: '',
      coin_list_owner: '',
      pool_list_owner: '',
    },
    launchpadConfig: {
      pools_id: '',
      admin_cap_id: '',
      config_cap_id: '',
      lock_manager_id: '',
    },
    xwhaleConfig: {
      xwhale_manager_id: '',
      lock_manager_id: '',
      dividend_manager_id: '',
    },
  }

  test('sdk Config', async () => {
    const sdkOptions = sdk.sdkOptions
    try {
      if (sdkOptions.clmm.clmm_display.length > 0) {
        const initEvent = await sdk.Resources.getInitEvent()
        config.clmmConfig = initEvent
      }
    } catch (error) {
      console.log(error)
    }

    try {
      if (sdkOptions.token.token_display.length > 0) {
        const tokenConfig = await sdk.Token.getTokenConfigEvent()
        config.tokenConfig = tokenConfig
      }
    } catch (error) {
      console.log(error)
    }

    try {
      if (sdkOptions.launchpad.ido_display.length > 0) {
        const initFactoryEvent = await sdk.Launchpad.getInitFactoryEvent()
        const initLockEvent = await sdk.Launchpad.getInitLockEvent()
        config.launchpadConfig = {
          ...initFactoryEvent,
          lock_manager_id: initLockEvent.lock_manager_id,
        }
      }
    } catch (error) {
      console.log(error)
    }

    try {
      if (sdkOptions.xwhale.xwhale_display.length > 0) {
        const initFactoryEvent = await sdk.XWhaleModule.getInitFactoryEvent()
        const lockUpManagerEvent = await sdk.XWhaleModule.getLockUpManagerEvent()
        const dividendManagerEvent = await sdk.XWhaleModule.getDividendManagerEvent()
        config.xwhaleConfig = {
          ...initFactoryEvent,
          lock_manager_id: lockUpManagerEvent.lock_manager_id,
          dividend_manager_id: dividendManagerEvent.dividend_manager_id
        }
      }
    } catch (error) {
      console.log(error)
    }

    console.log(config)
  })
})
