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
      // const initLockEvent = await sdk.Launchpad.getInitLockEvent()
      console.log('launchpadConfig ', {
       ...initFactoryEvent,
        // lock_manager_id: initLockEvent.lock_manager_id,
      })
    } catch (error) {
      console.log(error)
    }
  })

  test('xcetusConfig', async () => {
    try {
       const initFactoryEvent = await sdk.XCetusModule.getInitFactoryEvent()
       const lockUpManagerEvent = await sdk.XCetusModule.getLockUpManagerEvent()
      const dividendManagerEvent = await sdk.XCetusModule.getDividendManagerEvent()
      console.log({
         ...initFactoryEvent,
         lock_manager_id: lockUpManagerEvent.lock_manager_id,
         lock_handle_id: lockUpManagerEvent.lock_handle_id,
        dividend_manager_id: dividendManagerEvent.dividend_manager_id
      })
    } catch (error) {
      console.log(error)
    }
  })

  test('boosteConfig', async () => {
    try {
      const initFactoryEvent = await sdk.BoosterModule.getInitFactoryEvent()
      console.log({
        ...initFactoryEvent,
      })
    } catch (error) {
      console.log(error)
    }
  })

  test('makerBonusConfig', async () => {
    try {
      const initFactoryEvent = await sdk.MakerModule.getInitFactoryEvent()
      console.log({
        ...initFactoryEvent,
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
      // lock_manager_id: '',
    },
    xcetusConfig: {
      xcetus_manager_id: '',
      lock_manager_id: '',
      lock_handle_id: "",
      dividend_manager_id: '',
    },
    boosterConfig: {
      booster_config_id: "",
      booster_pool_handle: ''
    },
    makerBonusConfig: {
      maker_config_id: '',
      maker_pool_handle: ''
    }
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
        // const initLockEvent = await sdk.Launchpad.getInitLockEvent()
        config.launchpadConfig = {
          ...initFactoryEvent,
          // lock_manager_id: initLockEvent.lock_manager_id,
        }
      }
    } catch (error) {
      console.log(error)
    }

    try {
      if (sdkOptions.xcetus.xcetus_display.length > 0) {
        const initFactoryEvent = await sdk.XCetusModule.getInitFactoryEvent()
        const lockUpManagerEvent = await sdk.XCetusModule.getLockUpManagerEvent()
        const dividendManagerEvent = await sdk.XCetusModule.getDividendManagerEvent()
        config.xcetusConfig = {
          ...initFactoryEvent,
          lock_manager_id: lockUpManagerEvent.lock_manager_id,
          lock_handle_id: lockUpManagerEvent.lock_handle_id,
          dividend_manager_id: dividendManagerEvent.dividend_manager_id
        }
      }
    } catch (error) {
      console.log(error)
    }

    try {
      const initFactoryEvent = await sdk.BoosterModule.getInitFactoryEvent()
      config.boosterConfig =  initFactoryEvent
    } catch (error) {
      console.log(error)
    }

    try {
      const initFactoryEvent = await sdk.MakerModule.getInitFactoryEvent()
      config.makerBonusConfig =  initFactoryEvent
    } catch (error) {
      console.log(error)
    }

    console.log(config)
  })
})
