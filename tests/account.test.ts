import { Ed25519Keypair, getTransactionEffects, RawSigner, SuiEventFilter, TransactionBlock } from  '@mysten/sui.js'
import {  buildSdk, buildTestAccount, buildTestAccount1, generateAccount } from './data/init_test_data'
import 'isomorphic-fetch';
import { printTransaction, sendTransaction } from '../src/utils/transaction-util';
import { ClmmIntegratePoolModule } from '../src/types/sui';
import { TxBlock } from '../src/utils/tx-block';

describe('account Module', () => {
  const sdk = buildSdk()
  let sendKeypair: Ed25519Keypair

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
  })

  test('getObject', async () => {

    // const allCoinAsset = await sdk.fullClient.queryEvents({query : {
    //   All: [{
    //     MoveEventType :"0x97beea70a45eae73f1112bfced9014dc488b3df7076240e8ca4ea7ce31340762::factory::InitFactoryEvent"
    //   },
    //   {
    //     MoveEventType :"0x97beea70a45eae73f1112bfced9014dc488b3df7076240e8ca4ea7ce31340762::partner::InitPartnerEvent"
    //   },
    //   {
    //     MoveEventType :"0x97beea70a45eae73f1112bfced9014dc488b3df7076240e8ca4ea7ce31340762::config::InitConfigEvent"
    //   }]
    // }})

    // console.log('allCoinAsset: ', allCoinAsset.data)
  })


  test('getOwnerCoinAssets', async () => {
    const allCoinAsset = await sdk.Resources.getOwnerCoinAssets("0x5f9d2fb717ba2433f7723cf90bdbf90667001104915001d0af0cccb52b67c1e8")
    console.log('allCoinAsset: ', allCoinAsset)
  })

  test('fetch coinAssets for coinType', async () => {
    const allCoinAsset = await sdk.Resources.getOwnerCoinAssets(sendKeypair.getPublicKey().toSuiAddress(), '0x2::sui::SUI')
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
    const recipient = "0x660ea6bc10f2d6c2d40b829850ab746a6ad93c2674537c71e21809b0486254c6"
    tx.transferObjects(["0xf23891529b0e725e578f6a9900934e6eae09616d922c0b39a8d570338493f738"], recipient)

    const resultTxn = await sendTransaction(signer,tx.txBlock)
    console.log(resultTxn);
  })
})
