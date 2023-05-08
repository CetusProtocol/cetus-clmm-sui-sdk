import { Ed25519Keypair, RawSigner } from '@mysten/sui.js';
import { buildSdk, buildTestAccount } from './data/init_test_data'
import 'isomorphic-fetch';
import { BoosterUtil, d, printTransaction, sendTransaction } from '../src';
import { BoosterPool, LockPositionInfo } from '../src/types/booster_type';

let sendKeypair: Ed25519Keypair

const boosterPoolId = "0x30074f3331fe0d4203d414ed09dc4e4f023f536591b9846a7b616ceb755c0d8a"
const clmm_position_id= "0x5ba3df70bf9664b9a39a4d81c20f45238e5b0d57c40a303877b6e50e4b474b88"
const venft_id = "0x98cc20cc6d2bd982cca9a1e2aeac343f1167582dd0fc2c9f52d7967f640e7294"

describe('booster Module', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
    console.log("env: " , sdk.sdkOptions.fullRpcUrl);

  })

  test('get PoolImmutables', async () => {
   const poolImmutables =   await sdk.BoosterModule.getPoolImmutables()
   console.log("poolImmutables: ",poolImmutables);
  })

  test('getPools', async () => {
    const pools =   await sdk.BoosterModule.getPools()
    console.log("pools: ",pools);
   })

   test('getSinglePools', async () => {
    const pool =   await sdk.BoosterModule.getPool(boosterPoolId)
    console.log("pool: ",pool);
   })


   test('getOwnerLockNfts', async () => {
    const nfts =   await sdk.BoosterModule.getOwnerLockNfts(sendKeypair.getPublicKey().toSuiAddress())
    console.log("nfts: ",nfts);
   })

   test('getLockNftById', async () => {
    // from  getOwnerLockNfts
    const info =   await sdk.BoosterModule.getLockNftById("0xf23891529b0e725e578f6a9900934e6eae09616d922c0b39a8d570338493f738")
    console.log("info: ",info);
   })


   test('1 getLockPositionInfos', async () => {
    // from getOwnerLockNfts
    const infos =   await sdk.BoosterModule.getLockPositionInfos("0xe420b4cd1fca40f032584608d5e31601fa4454e9df8d109b45c03ff6bb566bf8",
    ["0xf23891529b0e725e578f6a9900934e6eae09616d922c0b39a8d570338493f738"])
    console.log("infos: ",infos);
   })


   test('2 getLockPositionInfo', async () => {
    // from getOwnerLockNfts
    const info =   await sdk.BoosterModule.getLockPositionInfo("0xe420b4cd1fca40f032584608d5e31601fa4454e9df8d109b45c03ff6bb566bf8",
    "0xf23891529b0e725e578f6a9900934e6eae09616d922c0b39a8d570338493f738")
    console.log("info: ",info);
   })

   test('getLockPositionInfoById', async () => {
    // from  getLockPositionInfo : id
    const info =   await sdk.BoosterModule.getLockPositionInfoById("0x119829aaa1e3fb6a388eed0b8b8ada10382b537282538419b0594ad93dbca77d")
    console.log("info: ",info);
   })


   test('get clmm Rewarders  and xcetus Rewarder', async () => {
    const pool = await sdk.Resources.getPool("0xf71b517fe0f57a4e3be5b00a90c40f461058f5ae7a4bb65fe1abf3bfdd20dcf7")
    console.log("pool" , pool);

    const res = await sdk.Rewarder.posRewardersAmount(pool.poolAddress,pool.positions_handle, "0xf23891529b0e725e578f6a9900934e6eae09616d922c0b39a8d570338493f738")
    console.log('res####', res)

    const booterPool =   await sdk.BoosterModule.getPool(boosterPoolId) as BoosterPool
    console.log("booterPool: ",booterPool);

    const info =   await sdk.BoosterModule.getLockPositionInfoById("0x119829aaa1e3fb6a388eed0b8b8ada10382b537282538419b0594ad93dbca77d") as LockPositionInfo
    console.log("info: ",info);

    const xcetus =  sdk.BoosterModule.calculateXCetusRewarder(res,booterPool,info)

    console.log("xcetus: ",xcetus);

  })


  test('lockPositionPayload', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)

    const boosterPool =   await sdk.BoosterModule.getPool(boosterPoolId)
    console.log("boosterPool: ",boosterPool);

    if(boosterPool){
      const tx =  sdk.BoosterModule.lockPositionPayload({
        clmm_position_id: clmm_position_id,
        booster_pool_id: boosterPool.pool_id,
        clmm_pool_id: boosterPool.clmm_pool_id,
        lock_day: boosterPool.config[0].lock_day,
        booster_type: boosterPool.booster_type,
        coinTypeA: boosterPool.coinTypeA,
        coinTypeB: boosterPool.coinTypeB
      })

      const txResult = await sendTransaction(signer,tx)
      console.log("lockPositionPayload: ", txResult);

    }
   })

   test('canceLockPositionPayload', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)

    const boosterPool =   await sdk.BoosterModule.getPool(boosterPoolId)
    console.log("boosterPool: ",boosterPool);


    if(boosterPool){
      const nfts =   await sdk.BoosterModule.getOwnerLockNfts(sendKeypair.getPublicKey().toSuiAddress(),boosterPool?.clmm_pool_id)
      console.log("nfts: ",nfts);


      if(nfts.length > 0){
        const nft = nfts[0]
        if(BoosterUtil.isLocked(nft)){
        const tx =  sdk.BoosterModule.canceLockPositionPayload({
          booster_pool_id: boosterPool.pool_id,
          lock_nft_id: nfts[0].locked_nft_id,
          booster_type: boosterPool.booster_type,
        })
        printTransaction(tx)
        const txResult = await sendTransaction(signer,tx)
        console.log("canceLockPositionPayload: ", txResult);
      }}

    }
   })

   test('redeemPayload', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)

    const boosterPool =   await sdk.BoosterModule.getPool(boosterPoolId)
    console.log("boosterPool: ",boosterPool);


    if(boosterPool){
      const nfts =   await sdk.BoosterModule.getOwnerLockNfts(sendKeypair.getPublicKey().toSuiAddress(),boosterPool?.clmm_pool_id)
      console.log("nfts: ",nfts);

      if(nfts.length > 0){
        const nft = nfts[0]
        if(!BoosterUtil.isLocked(nft)){
          const tx =  sdk.BoosterModule.redeemPayload({
            booster_pool_id: boosterPool.pool_id,
            lock_nft_id: nft.locked_nft_id,
            booster_type: boosterPool.booster_type,
            clmm_pool_id: boosterPool.clmm_pool_id,
            ve_nft_id: venft_id,
            coinTypeA: boosterPool.coinTypeA,
            coinTypeB: boosterPool.coinTypeB
          })
          printTransaction(tx)
          const txResult = await sendTransaction(signer,tx)
          console.log("canceLockPositionPayload: ", txResult);
        }
      }

    }
   })


})


