import { Ed25519Keypair, RawSigner } from '@mysten/sui.js'
import { buildSdk, buildTestAccount } from './data/init_test_data'
import 'isomorphic-fetch'
import { BoosterUtil, printTransaction, sendTransaction } from '../src'
import { BoosterPool } from '../src/types/booster_type'
import { poolList } from './data/pool_data'

let sendKeypair: Ed25519Keypair

const boosterPoolId = '0x6024263379ca07167a692aa3c19a9703c196b27816c1080e8cde89e071a106f0'
const clmm_pool_id = '0x6e20639f49444fa8ff6012ce3f7b6064517c0ad7bda5730a0557ad1b1bded372'
const clmm_position_id = '0x74055642637856f8e8ea2a9724be86250a4fa2b87969ba663aabfcf4c99db33c'
const venft_id = '0xbc71d9a71899f915e713bb63ae61ffcd0729e726e16744b6b4ddc8a60d39607d'

describe('booster Module', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
  })

  test('get PoolImmutables', async () => {
    const poolImmutables = await sdk.BoosterModule.getPoolImmutables()
    console.log('poolImmutables: ', poolImmutables)
  })

  test('getPools', async () => {
    const pools = await sdk.BoosterModule.getPools()
    console.log('pools: ', pools)
  })

  test('getSinglePools', async () => {
    const pool = await sdk.BoosterModule.getPool(boosterPoolId)
    console.log('pool: ', pool)
  })

  test('getOwnerBoosterPositions', async () => {
    const pool = await sdk.BoosterModule.getPool(boosterPoolId)
    console.log('pool: ', pool)

    const poolList = await sdk.BoosterModule.getOwnerBoosterPositions(
      sendKeypair.getPublicKey().toSuiAddress(),
      clmm_pool_id,
      pool.lock_positions.lock_positions_handle
    )
    console.log('npoolListfts: ', poolList)
  })

  test('getBoosterPosition', async () => {
    const pool = await sdk.BoosterModule.getPool(boosterPoolId)
    console.log('pool: ', pool)

    const info = await sdk.BoosterModule.getBoosterPosition(pool.lock_positions.lock_positions_handle, '0xe3581b641fe8c5f1ddd94aa49c245222594eadfe122c2befa074bd1031bb3acd')
    console.log('info: ', info)
  })

  test('getLockPositionInfo', async () => {
    const pool = await sdk.BoosterModule.getPool(boosterPoolId)
    console.log('pool: ', pool)

    const info = await sdk.BoosterModule.getLockPositionInfo(
      pool.lock_positions.lock_positions_handle,
      '0xe3581b641fe8c5f1ddd94aa49c245222594eadfe122c2befa074bd1031bb3acd'
    )
    console.log('info: ', info)
  })


  test('get clmm Rewarders  and xcetus Rewarder', async () => {
    const clmmPool = await sdk.Pool.getPool(clmm_pool_id)
    console.log('clmmPool', clmmPool)

    const res = await sdk.Rewarder.posRewardersAmount(
      clmmPool.poolAddress,
      clmmPool.positions_handle,
      '0x74055642637856f8e8ea2a9724be86250a4fa2b87969ba663aabfcf4c99db33c'
    )
    console.log('res####', res)

    const booterPool = (await sdk.BoosterModule.getPool(boosterPoolId)) as BoosterPool
    console.log('booterPool: ', booterPool)

    const info = await sdk.BoosterModule.getLockPositionInfo(
      booterPool.lock_positions.lock_positions_handle,
      '0xe3581b641fe8c5f1ddd94aa49c245222594eadfe122c2befa074bd1031bb3acd'
    )

    const xcetus = sdk.BoosterModule.calculateXCetusRewarder(res, booterPool, info)

    console.log('xcetus: ', xcetus)
  })

  test('lockPositionPayload', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)

    const boosterPool = await sdk.BoosterModule.getPool(boosterPoolId)
    console.log('boosterPool: ', boosterPool)

    if (boosterPool) {
      const tx = sdk.BoosterModule.lockPositionPayload({
        clmm_position_id: clmm_position_id,
        booster_pool_id: boosterPool.pool_id,
        clmm_pool_id: boosterPool.clmm_pool_id,
        lock_day: boosterPool.config[0].lock_day,
        booster_type: boosterPool.booster_type,
        coinTypeA: boosterPool.coinTypeA,
        coinTypeB: boosterPool.coinTypeB,
      })

      const txResult = await sendTransaction(signer, tx)
      console.log('lockPositionPayload: ', txResult)
    }
  })

  test('canceLockPositionPayload', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)

    const boosterPool = await sdk.BoosterModule.getPool(boosterPoolId)
    console.log('boosterPool: ', boosterPool)

    if (boosterPool) {
      const positionList = await sdk.BoosterModule.getOwnerBoosterPositions(
        sendKeypair.getPublicKey().toSuiAddress(),
        boosterPool.clmm_pool_id,
        boosterPool.lock_positions.lock_positions_handle
      )
      if (positionList.length > 0) {
        const position = positionList[0]
        if (BoosterUtil.isLocked(position)) {
          const tx = sdk.BoosterModule.canceLockPositionPayload({
            booster_pool_id: boosterPool.pool_id,
            lock_nft_id: position.locked_nft_id,
            booster_type: boosterPool.booster_type,
          })
          printTransaction(tx)
          const txResult = await sendTransaction(signer, tx)
          console.log('canceLockPositionPayload: ', txResult)
        }
      }
    }
  })

  test('redeemPayload', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)

    const boosterPool = await sdk.BoosterModule.getPool(boosterPoolId)
    console.log('boosterPool: ', boosterPool)

    if (boosterPool) {
      const positionList = await sdk.BoosterModule.getOwnerBoosterPositions(
        sendKeypair.getPublicKey().toSuiAddress(),
        boosterPool.clmm_pool_id,
        boosterPool.lock_positions.lock_positions_handle
      )
      console.log('positionList: ', positionList)

      if (poolList.length > 0) {
        const nft = positionList[0]
        if (!BoosterUtil.isLocked(nft)) {
          const tx = sdk.BoosterModule.redeemPayload({
            booster_pool_id: boosterPool.pool_id,
            lock_nft_id: nft.locked_nft_id,
            booster_type: boosterPool.booster_type,
            clmm_pool_id: boosterPool.clmm_pool_id,
            ve_nft_id: venft_id,
            coinTypeA: boosterPool.coinTypeA,
            coinTypeB: boosterPool.coinTypeB,
          })
          printTransaction(tx)
          const txResult = await sendTransaction(signer, tx)
          console.log('canceLockPositionPayload: ', txResult)
        }
      }
    }
  })
})
