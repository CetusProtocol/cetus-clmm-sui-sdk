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
    const allCoinAsset = await sdk.Clmm.getOwnerCoinAssets("xx")
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
    const recipient = "xx"
    tx.transferSui(recipient,3 * 1_000_000_000)
    const resultTxn = await sendTransaction(signer,tx.txBlock)
    console.log(resultTxn);
  })


  test('transferCoin', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const tx = new TxBlock()
    const recipient = "xx"
    tx.transferCoin(recipient,500 * 1_000_000_000,["xx"])

    const resultTxn = await sendTransaction(signer,tx.txBlock)
    console.log(resultTxn);
  })


  test('transferObjects', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const tx = new TxBlock()
    const recipient = "xx"
    tx.transferObjects(["xx"], recipient)

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
