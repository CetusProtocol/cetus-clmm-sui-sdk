import {
  Ed25519Keypair,
  getObjectPreviousTransactionDigest,
  RawSigner,
  getTransactionEffects,
  TransactionBlock,
  SuiTransactionBlockResponse,
} from '@mysten/sui.js'
import { CoinAssist } from '../src/math/CoinAssist'
import { FaucetCoin, intervalFaucetTime } from '../src/modules/resourcesModule'
import { d } from '../src/utils/numbers'
import {
  buildSdk,
  buildTestAccount,
  buildSKAccount,
  buildWJLaunchPadAccount,
  buildWJLaunchPadAccountLocal,
  mintAll,
} from './data/init_test_data'
import 'isomorphic-fetch'
import { printTransaction, sendTransaction, TransactionUtil } from '../src/utils/transaction-util'
import { sdkEnv } from './data/config'

const sdk = buildSdk()
let sendKeypair: Ed25519Keypair

describe('getFaucetEvent test', () => {
  test('getFaucetEvent', async () => {
    const faucetEvents = await sdk.Resources.getFaucetEvent(sdkEnv.faucet.faucet_display, buildTestAccount().getPublicKey().toSuiAddress())
    console.log('getFaucetEvent', faucetEvents)
  })
  /**
   * curl --location --request POST 'http://192.168.1.41:9000/gas' \
--header 'Content-Type: application/json' \
--data-raw '{
    "FixedAmountRequest": {
        "recipient": "0xd974f68de93ac3f47572bd053969bf2b078ed0524da4b486e1d5471f408f8605"
    }
}'
   */
  test('requestSuiFromFaucet', async () => {
    const suiFromFaucet = await sdk.fullClient.requestSuiFromFaucet(buildTestAccount().getPublicKey().toSuiAddress())
    console.log('requestSuiFromFaucet', suiFromFaucet)
  })
})

describe('faucet coin test', () => {
  beforeEach(async () => {
    sendKeypair = buildTestAccount()
  })

  test(' get faucet Coins  ', async () => {
    const faucetObject = await sdk.fullClient.getObject({ id: sdkEnv.faucet.faucet_display, options: { showPreviousTransaction: true } })
    const faucetTx = getObjectPreviousTransactionDigest(faucetObject)
    console.log('faucetTx: ', faucetTx)
    if (faucetTx === undefined) {
      throw Error('fail to get faucetTx')
    }
    const suiTransactionResponse = (await sdk.Resources.getSuiTransactionResponse(faucetTx)) as SuiTransactionBlockResponse
    const faucetCoins = CoinAssist.getFaucetCoins(suiTransactionResponse)
    console.log('faucetCoins', faucetCoins)
  })

  test('faucetCoins', async () => {
    await mintAll(sdk, sendKeypair, sdkEnv.faucet, 'faucet', 'faucetAll')
  })

  test('faucetOneCoin', async () => {
    const coin = {
      transactionModule: 'btc',
      suplyID: '0xdf17a296e80416827b9bab70ca2f84a293fdf967815b365c6c7f7b12141703fb',
      decimals: 8,
    }
    const signer = new RawSigner(sendKeypair, sdk.fullClient)

    const tx = new TransactionBlock()
    tx.setGasBudget(20000000)
    tx.moveCall({
      target: `${sdkEnv.faucet.faucet_router}::${coin.transactionModule}::faucet`,
      typeArguments: [],
      arguments: [tx.pure(coin.suplyID)],
    })
    printTransaction(tx)
    const transferTxn = await sendTransaction(signer, tx)
    console.log('faucetAll: ', transferTxn)
  })
})
