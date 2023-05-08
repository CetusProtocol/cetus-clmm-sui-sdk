import { Ed25519Keypair, RawSigner } from '@mysten/sui.js';
import { buildSdk, buildTestAccount, mintAll } from './data/init_test_data'
import 'isomorphic-fetch';
import { printTransaction, sendTransaction } from '../src';
import { XCetusUtil } from '../src/utils/xcetus';
import { d } from '../src/utils/numbers';

let sendKeypair: Ed25519Keypair

const venft_id = "0x2c94a4dd607def65a56a35f0d206a8b6cbf66368b76f2373dac50ec7c3dcc84e"

describe('launch pad Module', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
    console.log("env: " , sdk.sdkOptions.fullRpcUrl);

  })


  test('mint cetus', async () => {
    await mintAll(sdk,sendKeypair,{
      faucet_display: sdk.sdkOptions.xcetus.cetus_faucet,
      faucet_router: sdk.sdkOptions.xcetus.cetus_faucet
    },"cetus","faucet" )
  })


  test('getLockUpManagerEvent', async () => {
    const lockUpManagerEvent = await sdk.XCetusModule.getLockUpManagerEvent()
    console.log(lockUpManagerEvent)
  })

  test('mintVeNFTPayload', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const payload =  sdk.XCetusModule.mintVeNFTPayload()

     const tx = await sendTransaction(signer,payload)
     console.log("mintVeNFTPayload : ", tx);

  })

  test('getOwnerVeNFT', async () => {
    const nfts = await sdk.XCetusModule.getOwnerVeNFT(sendKeypair.getPublicKey().toSuiAddress())
    console.log("nfts: ",nfts);

  })

  test('getOwnerCetusCoins', async () => {
    const coins = await sdk.XCetusModule.getOwnerCetusCoins(sendKeypair.getPublicKey().toSuiAddress())
    console.log("coins: ",coins);
  })


  test(' Convert Cetus to Xcetus', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()
    const payload = await sdk.XCetusModule.convertPayload({
      amount: '30000',
      venft_id
    })

    printTransaction(payload)

    const tx = await sendTransaction(signer,payload)
    console.log("convertPayload : ", tx);

  })


  test('redeemNum', async () => {
    const n = 15
    const amountInput = 20000
    const amount = await sdk.XCetusModule.redeemNum(amountInput,n)

   const rate =  d(n).sub(15).div(165).mul(0.5).add(0.5)
   const amount1 =rate.mul(amountInput)
   console.log("amount : ", amount,amount1 , rate);
  })


  test('redeemLockPayload', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const payload =  sdk.XCetusModule.redeemLockPayload({
      venft_id: venft_id,
      amount: '100',
      lock_day: 15
    })

    const tx = await sendTransaction(signer,payload)
    console.log("redeemLockPayload : ", tx);

  })


  test('getOwnerLockCetuss', async () => {
    const lockCetuss = await sdk.XCetusModule.getOwnerLockCetuss(sendKeypair.getPublicKey().toSuiAddress())
    console.log("lockCetuss: ",lockCetuss);
  })


  test('getLockCetus', async () => {
    const lockCetus = await sdk.XCetusModule.getLockCetus("0xe47a382ad73627e15f23f0bf49f078a3ada18090bad4411d381a2a891bb218e2")
    console.log("lockCetus: ",lockCetus);
  })


  test('redeemPayload', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const lock_id = "0x907a5c7523f7cc17cb43b75af3bbdfc15ffa65bc2b2b0ca0e3e5a5cd64e819de"
    const lockCetus = await sdk.XCetusModule.getLockCetus(lock_id)
    console.log('lockCetus: ',lockCetus);


    if(lockCetus && !XCetusUtil.isLocked(lockCetus)){

      const payload =  sdk.XCetusModule.redeemPayload({
        venft_id: venft_id,
        lock_id:lock_id
      })

      const tx = await sendTransaction(signer,payload)
      console.log("redeemPayload : ", tx);
    }else{
      console.log(" not reach  lock time");
    }

  })

  test('cancelRedeemPayload', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const lock_id = "0xe47a382ad73627e15f23f0bf49f078a3ada18090bad4411d381a2a891bb218e2"
    const lockCetus = await sdk.XCetusModule.getLockCetus(lock_id)
    console.log('lockCetus: ',lockCetus);

    if(lockCetus && XCetusUtil.isLocked(lockCetus)){
    const payload =  sdk.XCetusModule.cancelRedeemPayload({
      venft_id: venft_id,
      lock_id:lock_id
    })

    const tx = await sendTransaction(signer,payload)
    console.log("cancelRedeemPayload : ", tx);
  }
  })

  /**-------------------------------------xWHALE Holder Rewards--------------------------------------- */
  test('get my share', async () => {
    const nfts = await sdk.XCetusModule.getOwnerVeNFT(sendKeypair.getPublicKey().toSuiAddress())
    console.log("nfts: ",nfts);

    if(nfts){
      const xcetusManager = await sdk.XCetusModule.getXcetusManager()
      console.log("xcetusManager: ",xcetusManager);
      const rate =  d(nfts.xcetus_balance).div(xcetusManager.treasury)
      console.log("rate: ", rate);
    }

  })

  test('getVeNFTDividendInfo', async () => {
     const dividendManager = await sdk.XCetusModule.getDividendManager()
     console.log("dividendManager: ",dividendManager);

    const veNFTDividendInfo =  await sdk.XCetusModule.getVeNFTDividendInfo(dividendManager.venft_dividends.id , venft_id)
    console.log("veNFTDividendInfo: ",veNFTDividendInfo?.rewards);
  })

  test('redeemDividendPayload', async () => {
    const dividendManager = await sdk.XCetusModule.getDividendManager()
    console.log("dividendManager: ",dividendManager);
    if(dividendManager.bonus_types.length > 0){
      const signer = new RawSigner(sendKeypair, sdk.fullClient)
      const payload =  sdk.XCetusModule.redeemDividendPayload(venft_id,dividendManager.bonus_types)

      printTransaction(payload)
      const result = await sendTransaction(signer , payload)
      console.log("redeemDividendPayload: ",result);

    }

  })

})


