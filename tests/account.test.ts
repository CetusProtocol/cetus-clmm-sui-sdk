import { Ed25519Keypair, RawSigner, } from  '@mysten/sui.js'
import { buildSdk, buildTestAccount } from './data/init_test_data'
import 'isomorphic-fetch';
import { sendTransaction, TransactionUtil } from '../src/utils/transaction-util';
import { TxBlock } from '../src/utils/tx-block';

describe('account Module', () => {
  const sdk = buildSdk()
  let sendKeypair: Ed25519Keypair

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
  })


  test('getOwnerCoinAssets', async () => {
    const allCoinAsset = await sdk.Clmm.getOwnerCoinAssets("0x8e1b7198809a002e91edf2cb2bed5fff80e9eaf7d77fb1b0a86679d8fb42c3b9")
    console.log('allCoinAsset: ', allCoinAsset)
  })

  test('fetch coinAssets for coinType', async () => {
    const allCoinAsset = await sdk.Clmm.getOwnerCoinAssets(sendKeypair.getPublicKey().toSuiAddress(), '0x2::sui::SUI')
    console.log('allCoinAsset: ', allCoinAsset)
  })

  test('getBalance', async () => {
    const allBalance = await sdk.fullClient.getBalance({
      owner : sendKeypair.getPublicKey().toSuiAddress(),
      coinType: '0x2::sui::SUI'
    })
    console.log('allBalance: ', allBalance)

  })


  test('transferSui', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const tx = new TxBlock()
    const recipient = "0xf751c72f6462d2c2f4434d085076c85c690a51b584d765bb8863669908835f41"
    tx.transferSui(recipient,3 * 1_000_000_000)
    const resultTxn = await sendTransaction(signer,tx.txBlock)
    console.log(resultTxn);
  })


  test('transferCoin', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const tx = new TxBlock()
    const recipient = "0x302b9f2417679def5f3665cfeeb48438d47bc54dd4f6250f803f79fb697bc31d"
    tx.transferCoin(recipient,500 * 1_000_000_000,["0xb35c4a85849f33fc196de235ac0d285a5d93b196954b2fe505c6b0ccc48e747d"])

    const resultTxn = await sendTransaction(signer,tx.txBlock)
    console.log(resultTxn);
  })


  test('transferObjects', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const tx = new TxBlock()
    const recipient = "0xe130507a629c841cce2264971bff486ff94665e0859b184e33ab4943921fdd66"
    tx.transferObjects(["0xe1a542cc773befd52740e36612b31c1c6d25e1fe226a7a46d1b7845a4c5ce5b5"], recipient)

    const resultTxn = await sendTransaction(signer,tx.txBlock)
    console.log(resultTxn);
  })


  test('mint zero coin', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const tx = new TxBlock()
    const recipient = sendKeypair.getPublicKey().toSuiAddress()

    const zeroCoin = TransactionUtil.moveCallCoinZero(tx.txBlock,"0xdc612ad030d4db39334d8e38a99fc6a49fc85b74c036839f13803beae66c6164::cetus::CETUS")

    tx.transferObjects([zeroCoin], recipient)

    const resultTxn = await sendTransaction(signer, tx.txBlock)
    console.log(resultTxn);
  })
})
