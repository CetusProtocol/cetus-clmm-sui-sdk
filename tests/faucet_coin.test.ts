import { Ed25519Keypair, getObjectPreviousTransactionDigest, RawSigner, SuiExecuteTransactionResponse,  SuiTransactionResponse, getTransactionEffects } from '@mysten/sui.js';
import { CoinAssist } from '../src/math/CoinAssist';
import { FaucetCoin, intervalFaucetTime } from '../src/modules/resourcesModule';
import { d } from '../src/utils/numbers';
import { buildSdk, buildTestAccount, faucetObjectId } from './data/init_test_data'



const sdk = buildSdk()
let sendKeypair: Ed25519Keypair
let faucetCoins: FaucetCoin[]


describe('getFaucetEvent test', () => {
  test('getFaucetEvent', async () => {
    const faucetEvents = await sdk.Resources.getFaucetEvent(faucetObjectId, buildTestAccount().getPublicKey().toSuiAddress())
    console.log("getFaucetEvent",faucetEvents)
  })

  test('requestSuiFromFaucet', async () => {
    const suiFromFaucet = await sdk.fullClient.requestSuiFromFaucet("0x6d49ddaaacf57fc92a2bd0f4d30da78b23f03772")
    console.log("requestSuiFromFaucet",suiFromFaucet)
  })
})

describe('faucet coin test', () => {

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
    const faucetObject = await sdk.fullClient.getObject(faucetObjectId)
    console.log("faucetObject: ",faucetObject)
    const faucetTx = getObjectPreviousTransactionDigest(faucetObject)
    console.log("faucetTx: ",faucetTx)
    if(faucetTx === undefined){
      throw Error("fail to get faucetTx")
    }
    const suiTransactionResponse = await sdk.Resources.getSuiTransactionResponse(faucetTx) as SuiTransactionResponse
    faucetCoins = CoinAssist.getFaucetCoins(suiTransactionResponse)
    console.log("getSuiTransactionResponse",faucetCoins)
  })


  test('faucetLimit', async () => {
    const suplyIDS : string[] = []
    faucetCoins.forEach(async (coin) => {
       suplyIDS.push(coin.suplyID)
    })

    const currentfaucetTime = d(Date.parse(new Date().toString())).div(1000).toDP(0).toNumber()
    const faucetEvents = await sdk.Resources.getFaucetEvent(faucetObjectId, sendKeypair.getPublicKey().toSuiAddress())

    if(faucetEvents){
      const lastfaucetTime = faucetEvents.time
      if((currentfaucetTime - lastfaucetTime)*1000 < intervalFaucetTime ){
        throw new Error("faucet time Less than 12 hours");
      }
    }

    const signer = new RawSigner(sendKeypair, sdk.fullClient)

    const transferTxn = await signer.executeMoveCall({
      packageObjectId: faucetObjectId,
      module: 'faucet',
      function: 'faucetLimit',
      typeArguments: [],
      gasBudget: 1000,
      arguments: [...suplyIDS, currentfaucetTime.toString()],
    }) as SuiExecuteTransactionResponse
    console.log("faucetAll: ", getTransactionEffects(transferTxn))
  })

    test('faucetCoins', async () => {
      const suplyIDS : string[] = []
      faucetCoins.forEach(async (coin) => {
         suplyIDS.push(coin.suplyID)
      })
      const signer = new RawSigner(sendKeypair, sdk.fullClient)
      const transferTxn = await signer.executeMoveCall({
        packageObjectId: faucetObjectId,
        module: 'faucet',
        function: 'faucetAll',
        typeArguments: [],
        gasBudget: 1000,
        arguments: [...suplyIDS],
      }) as SuiExecuteTransactionResponse
      console.log("faucetAll: ", transferTxn)
    })

  test('faucetOneCoin', async () => {
    const coin = faucetCoins[4]
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const transferTxn = await signer.executeMoveCall({
      packageObjectId: faucetObjectId,
      module: coin.transactionModule,
      function: 'faucet',
      typeArguments: [],
      gasBudget: 1000,
      arguments: [coin.suplyID],
    }) as SuiExecuteTransactionResponse
    console.log("faucetAll: ", transferTxn)
  })
})




