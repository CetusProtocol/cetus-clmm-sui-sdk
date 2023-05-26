import { Ed25519Keypair, RawSigner } from '@mysten/sui.js'
import { buildSdk, buildTestAccount } from './data/init_test_data'
import 'isomorphic-fetch'
import { printTransaction, sendTransaction } from '../src'
import { ClmmPositionStatus } from '../src/types/clmm_type'

let sendKeypair: Ed25519Keypair

const makerPoolId = '0xfe394df30f94cb7feef052e43c4b401e84ea2dd62291cbc1134f3d279565a056'
const venft_id = '0x552d7507d4cc36d4bdd7f4a107e7b49fb540db376ba1bdd73d042c7b99d25d73'

describe('Maker bonus Module', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
    sdk.senderAddress =sendKeypair.getPublicKey().toSuiAddress()
    console.log('env: ', sdk.sdkOptions.fullRpcUrl)
  })

  test('get PoolImmutables', async () => {
    const poolImmutables = await sdk.MakerModule.getPoolImmutables()
    console.log('poolImmutables: ', poolImmutables)
  })

  test('getPools', async () => {
    const pools = await sdk.MakerModule.getPools()
    console.log('pools: ', pools)
  })

  test('getSinglePools', async () => {
    const pool = await sdk.MakerModule.getPool(makerPoolId)
    console.log('pool: ', pool)

    const formatPeriods = await sdk.MakerModule.getMakerPoolPeriods(pool)
    console.log('formatPeriods: ', formatPeriods)
  })

  test('getPoolMarkerPositionList', async () => {
    const pool = await sdk.MakerModule.getPool(makerPoolId)
    console.log('pool: ', pool)

    const formatPeriods = await sdk.MakerModule.getMakerPoolPeriods(pool)
    console.log('formatPeriods: ', formatPeriods)

    const currPeriod = formatPeriods[0]

    if (formatPeriods.length > 0) {
      const positionList = await sdk.MakerModule.getPoolMarkerPositionList(pool.whale_nfts.whale_nfts_handle, [currPeriod])
      console.log('positionList: ', positionList[currPeriod.period])
    }
  })

  test('get my owenr position ', async () => {
    const pool = await sdk.MakerModule.getPool(makerPoolId)
    console.log('pool: ', pool)

    const formatPeriods = await sdk.MakerModule.getMakerPoolPeriods(pool)

    const positionList = await sdk.MakerModule.getPoolMarkerPositionList(pool.whale_nfts.whale_nfts_handle, formatPeriods)
    console.log('positionList: ', positionList)

    const ownerAddress = sendKeypair.getPublicKey().toSuiAddress()
    const ownerList = positionList[formatPeriods[0].period].filter((item) => {
      return item.clmm_position?.owner === ownerAddress
    })

    console.log('ownerList: ', ownerList)
  })

  test('getPoolBonusInfo ', async () => {
    const pool = await sdk.MakerModule.getPool(makerPoolId)
    console.log('pool: ', pool)

    const poolBonusInfo = await sdk.MakerModule.getPoolBonusInfo(pool.rewarders.rewarder_handle, 0)
    console.log('poolBonusInfo: ', poolBonusInfo)
  })

  test('updateXCetusRewarderAndFee ', async () => {
    const pool = await sdk.MakerModule.getPool(makerPoolId)
    console.log('pool: ', pool)

    const formatPeriods = await sdk.MakerModule.getMakerPoolPeriods(pool)

    const positionList = await sdk.MakerModule.getPoolMarkerPositionList(pool.whale_nfts.whale_nfts_handle, formatPeriods)
    console.log('positionList: ', positionList)

    const positionListIncludeRewarders = await sdk.MakerModule.updateXCetusRewarderAndFee(
      pool,
      positionList[formatPeriods[0].period],
      formatPeriods[0]
    )

    console.log('positionListIncludeRewarders: ', positionListIncludeRewarders)
  })

  test('calculateXCetusRewarder ', async () => {
    const pool = await sdk.MakerModule.getPool(makerPoolId)
    console.log('pool: ', pool)

    const formatPeriods = await sdk.MakerModule.getMakerPoolPeriods(pool)

    const positionList = await sdk.MakerModule.getPoolMarkerPositionList(pool.whale_nfts.whale_nfts_handle, formatPeriods)
    console.log('positionList: ', positionList)

    const total_points_after_multiper = await sdk.MakerModule.calculateTotalPointsAfterMultiper(pool, formatPeriods[0])
    console.log('total_points_after_multiper: ', total_points_after_multiper)

    const rewarderAmount = await sdk.MakerModule.calculateXCetusRewarder(
      pool,
      positionList[formatPeriods[0].period][0],
      formatPeriods[0].period,
      total_points_after_multiper
    )

    console.log('rewarderAmount: ', rewarderAmount)
  })

  test('calculateFeeRate ', async () => {
    const pool = await sdk.MakerModule.getPool(makerPoolId)
    console.log('pool: ', pool)

    const formatPeriods = await sdk.MakerModule.getMakerPoolPeriods(pool)

    const positionList = await sdk.MakerModule.getPoolMarkerPositionList(pool.whale_nfts.whale_nfts_handle, formatPeriods)
    console.log('positionList: ', positionList)

    const total_points_after_multiper = await sdk.MakerModule.calculateTotalPointsAfterMultiper(pool, formatPeriods[0])
    console.log('total_points_after_multiper: ', total_points_after_multiper)

    const feerate = sdk.MakerModule.calculateFeeShareRate(pool, positionList[formatPeriods[0].period][0], total_points_after_multiper)

    console.log('feerate: ', feerate)
  })

  test('claimAllPayload ', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)

    const pools = await sdk.MakerModule.getPools()
    console.log('pools: ', pools)

    const result = await sdk.MakerModule.calculateAllXCetusRewarder(pools)
    console.log('result: ', result)
    if(result.claimtotal.greaterThan(0)){
      const tx = sdk.MakerModule.claimAllPayload({
        ve_nft_id: venft_id,
        whale_nfts: result.claimRecord
      })
      printTransaction(tx)
      const txResult = await sendTransaction(signer, tx)
      console.log('claimPayload: ', txResult)
    }
  })

  test('claimPayload', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)

    const pool = await sdk.MakerModule.getPool(makerPoolId)
    console.log('pool: ', pool)

    const formatPeriods = await sdk.MakerModule.getMakerPoolPeriods(pool)
    const formatPeriod = formatPeriods[0]

    const positionList = await sdk.MakerModule.getPoolMarkerPositionList(pool.whale_nfts.whale_nfts_handle, [formatPeriod])
    console.log('positionList: ', positionList)

    const clmm_position = positionList[formatPeriod.period][1].clmm_position

    if(clmm_position?.position_status === ClmmPositionStatus.Exists){
      const tx = sdk.MakerModule.claimPayload({
        market_pool_id: pool.pool_id,
        position_nft_id: clmm_position!.pos_object_id,
        ve_nft_id: venft_id,
        bonus_type: pool.bonus_type,
        phase: formatPeriod.period,
      })
      printTransaction(tx)
      const txResult = await sendTransaction(signer, tx)
      console.log('claimPayload: ', txResult)
    }

  })


})
