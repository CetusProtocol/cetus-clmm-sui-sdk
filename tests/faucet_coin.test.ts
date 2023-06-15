import {
  Ed25519Keypair,
} from '@mysten/sui.js'
import {
  buildSdk,
  buildTestAccount,
  mintAll,
  faucet,
} from './data/init_test_data'
import 'isomorphic-fetch'

const sdk = buildSdk()
let sendKeypair: Ed25519Keypair

describe('faucet coin test', () => {
  beforeEach(async () => {
    sendKeypair = buildTestAccount()
  })

  test('requestSuiFromFaucet', async () => {
    const suiFromFaucet = await sdk.fullClient.requestSuiFromFaucet(buildTestAccount().getPublicKey().toSuiAddress())
    console.log('requestSuiFromFaucet', suiFromFaucet)
  })

  test('faucetCoins', async () => {
    await mintAll(sdk, sendKeypair, faucet, 'faucet')
  })

})
