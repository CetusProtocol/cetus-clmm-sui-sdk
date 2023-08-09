import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519'
import { buildSdk, buildTestAccount, mintAll, faucet } from './data/init_test_data'
import { requestSuiFromFaucetV0, getFaucetHost } from '@mysten/sui.js/faucet';
import 'isomorphic-fetch'

const sdk = buildSdk()
let sendKeypair: Ed25519Keypair

describe('faucet coin test', () => {
  beforeEach(async () => {
    sendKeypair = buildTestAccount()
  })

  test('requestSuiFromFaucet', async () => {
    const suiFromFaucet = await requestSuiFromFaucetV0({
      host: sdk.sdkOptions.faucetURL as string,
      recipient:buildTestAccount().getPublicKey().toSuiAddress()
    })
    console.log('requestSuiFromFaucet', suiFromFaucet)
  })

  test('faucetCoins', async () => {
    await mintAll(sdk, sendKeypair, faucet!, 'faucet')
  })
})
