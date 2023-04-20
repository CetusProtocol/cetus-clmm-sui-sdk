import { Ed25519Keypair, RawSigner } from '@mysten/sui.js';
import { buildSdk, buildTestAccount, mintAll } from './data/init_test_data'
import 'isomorphic-fetch';
import { printTransaction, sendTransaction } from '../src';
import { XWhaleUtil } from '../src/utils/xwhale';
import { d } from '../src/utils/numbers';

let sendKeypair: Ed25519Keypair

const venft_id = "0x44d01dcaeb814a934aa8d684795983a475f6f3eda48a68ef3cad15068ce4c33a"

describe('launch pad Module', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
    console.log("env: " , sdk.sdkOptions.fullRpcUrl);

  })


  test('mint whale', async () => {
    await mintAll(sdk,sendKeypair,sdk.sdkOptions.xwhale.whale_faucet,"whale","faucet" )
  })


  test('getLockUpManagerEvent', async () => {
    const lockUpManagerEvent = await sdk.XWhaleModule.getLockUpManagerEvent()
    console.log(lockUpManagerEvent)
  })

  test('mintVeNFTPayload', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const payload =  sdk.XWhaleModule.mintVeNFTPayload()

     const tx = await sendTransaction(signer,payload)
     console.log("mintVeNFTPayload : ", tx);

  })

  test('getOwnerVeNFT', async () => {
    const nfts = await sdk.XWhaleModule.getOwnerVeNFT(sendKeypair.getPublicKey().toSuiAddress())
    console.log("nfts: ",nfts);

  })

  test('getOwnerWhaleCoins', async () => {
    const coins = await sdk.XWhaleModule.getOwnerWhaleCoins(sendKeypair.getPublicKey().toSuiAddress())
    console.log("coins: ",coins);
  })


  test(' Convert Whale to Xwhale', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()
    const payload = await sdk.XWhaleModule.convertPayload({
      amount: '13000',
      venft_id: venft_id
    })

    printTransaction(payload)

    const tx = await sendTransaction(signer,payload)
    console.log("convertPayload : ", tx);

  })


  test('redeemNum', async () => {
    const amount = await sdk.XWhaleModule.redeemNum(400,2)
    console.log("amount : ", amount);
  })


  test('redeemLockPayload', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const payload =  sdk.XWhaleModule.redeemLockPayload({
      venft_id: venft_id,
      amount: '1100',
      lock_day: 1
    })

    const tx = await sendTransaction(signer,payload)
    console.log("redeemLockPayload : ", tx);

  })


  test('getOwnerLockWhales', async () => {
    const lockWhales = await sdk.XWhaleModule.getOwnerLockWhales(sendKeypair.getPublicKey().toSuiAddress())
    console.log("lockWhales: ",lockWhales);
  })


  test('getLockWhale', async () => {
    const lockWhale = await sdk.XWhaleModule.getLockWhale("0xef8b97297390eb5d209438a1352d138cb056153f45f66a3384d12da82ade94a5")
    console.log("lockWhale: ",lockWhale);
  })


  test('redeemPayload', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const lock_id = "0xef8b97297390eb5d209438a1352d138cb056153f45f66a3384d12da82ade94a5"
    const lockWhale = await sdk.XWhaleModule.getLockWhale(lock_id)
    console.log('lockWhale: ',lockWhale);


    if(lockWhale && !XWhaleUtil.isLocked(lockWhale)){

      const payload =  sdk.XWhaleModule.redeemPayload({
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
    const lock_id = "0xb67107d29c9e334623376e94a339aa78a9317f1dfc12aaebb2784327f5dcca25"
    const lockWhale = await sdk.XWhaleModule.getLockWhale(lock_id)
    console.log('lockWhale: ',lockWhale);

    if(lockWhale && XWhaleUtil.isLocked(lockWhale)){
    const payload =  sdk.XWhaleModule.cancelRedeemPayload({
      venft_id: venft_id,
      lock_id:"0xb67107d29c9e334623376e94a339aa78a9317f1dfc12aaebb2784327f5dcca25"
    })

    const tx = await sendTransaction(signer,payload)
    console.log("cancelRedeemPayload : ", tx);
  }
  })

  /**-------------------------------------xWHALE Holder Rewards--------------------------------------- */
  test('get my share', async () => {
    const nfts = await sdk.XWhaleModule.getOwnerVeNFT(sendKeypair.getPublicKey().toSuiAddress())
    console.log("nfts: ",nfts);

    if(nfts){
      const xwhaleManager = await sdk.XWhaleModule.getXwhaleManager()
      console.log("xwhaleManager: ",xwhaleManager);
      const rate =  d(nfts.xwhale_balance).div(xwhaleManager.treasury)
      console.log("rate: ", rate);
    }

  })

  test('getVeNFTDividendInfo', async () => {
     const dividendManager = await sdk.XWhaleModule.getDividendManager()
     console.log("dividendManager: ",dividendManager);

    const veNFTDividendInfo =  await sdk.XWhaleModule.getVeNFTDividendInfo(dividendManager.venft_dividends.id , venft_id)
    console.log("veNFTDividendInfo: ",veNFTDividendInfo?.rewards[0]);
    console.log("veNFTDividendInfo: ",veNFTDividendInfo?.rewards[1]);
  })

  test('redeemDividendPayload', async () => {
    const dividendManager = await sdk.XWhaleModule.getDividendManager()
    console.log("dividendManager: ",dividendManager);
    if(dividendManager.bonus_types.length > 0){
      const signer = new RawSigner(sendKeypair, sdk.fullClient)
      const payload =  sdk.XWhaleModule.redeemDividendPayload(venft_id,dividendManager.bonus_types)

      printTransaction(payload)
      const result = await sendTransaction(signer , payload)
      console.log("redeemDividendPayload: ",result);

    }

  })

})


