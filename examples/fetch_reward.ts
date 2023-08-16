import { TestnetSDK } from './init_testnet_sdk'

async function retrievalRewardListOfOnePool() {
  const poolId = '0x83c101a55563b037f4cd25e5b326b26ae6537dc8048004c1408079f7578dd160'
  const pool = await TestnetSDK.Pool.getPool(poolId)
  const res = await TestnetSDK.Pool.fetchPositionRewardList({
    pool_id: pool.poolAddress,
    coinTypeA: pool.coinTypeA,
    coinTypeB: pool.coinTypeB,
  })
  console.log('fetch reward list of one pool', res)
}
// retrievalRewardListOfOnePool()
/*
{
    liquidity: '1178890675',
    tick_lower_index: -2,
    tick_upper_index: 2,
    reward_amount_owed_0: '0',
    reward_amount_owed_1: '0',
    reward_amount_owed_2: '0',
    reward_growth_inside_0: '0',
    reward_growth_inside_1: '0',
    reward_growth_inside_2: '0',
    fee_growth_inside_a: '0',
    fee_owed_a: '0',
    fee_growth_inside_b: '0',
    fee_owed_b: '0',
    pos_object_id: '0x88e9779719cdb9d5e722267ca2ddd0681d6c845eadfe4f6e46f9e456b26ad15e'
  },

  ...

  {
    liquidity: '496569205127',
    tick_lower_index: -6,
    tick_upper_index: 4,
    reward_amount_owed_0: '0',
    reward_amount_owed_1: '0',
    reward_amount_owed_2: '0',
    reward_growth_inside_0: '0',
    reward_growth_inside_1: '0',
    reward_growth_inside_2: '0',
    fee_growth_inside_a: '0',
    fee_owed_a: '0',
    fee_growth_inside_b: '0',
    fee_owed_b: '0',
    pos_object_id: '0x004dcb4665475ed18b3327e35cdbd6360ce1028d08bec185bafdbfb57d2ef085'
  }, 
*/

async function retrievalRewardEmissionInfosForOnePoolEveryDay() {
  const poolObjectId = '0x83c101a55563b037f4cd25e5b326b26ae6537dc8048004c1408079f7578dd160'
  const emissionsEveryDay = await TestnetSDK.Rewarder.emissionsEveryDay(poolObjectId)
  console.log({ emissionsEveryDay })
}
// retrievalRewardEmissionInfosForOnePoolEveryDay()
/*
{
  emissionsEveryDay: [
    {
      emissions: 86400000000,
      coin_address: '0x0588cff9a50e0eaf4cd50d337c1a36570bc1517793fd3303e1513e8ad4d2aa96::usdc::USDC'
    },
    {
      emissions: 0,
      coin_address: '0x0588cff9a50e0eaf4cd50d337c1a36570bc1517793fd3303e1513e8ad4d2aa96::usdt::USDT'
    },
    {
      emissions: 0,
      coin_address: '0x0588cff9a50e0eaf4cd50d337c1a36570bc1517793fd3303e1513e8ad4d2aa96::cetus::CETUS'
    }
  ]
}
*/

async function retrievalPositionRewardAmount() {
  const pool = await TestnetSDK.Pool.getPool('0x83c101a55563b037f4cd25e5b326b26ae6537dc8048004c1408079f7578dd160')

  const posRewardersAmount = await TestnetSDK.Rewarder.posRewardersAmount(
    pool.poolAddress,
    pool.position_manager.positions_handle,
    '0xf10d37cc00bcd60f85cef3fe473ea979e3f7f3631d522618e80c876b349e56bc'
  )
  console.log({ posRewardersAmount })
}
//retrievalPositionRewardAmount()
/*
{
  posRewardersAmount: [
    {
      amount_owed: <BN: 0>,
      coin_address: '0x0588cff9a50e0eaf4cd50d337c1a36570bc1517793fd3303e1513e8ad4d2aa96::usdc::USDC'
    },
    {
      amount_owed: <BN: 0>,
      coin_address: '0x0588cff9a50e0eaf4cd50d337c1a36570bc1517793fd3303e1513e8ad4d2aa96::usdt::USDT'
    },
    {
      amount_owed: <BN: 0>,
      coin_address: '0x0588cff9a50e0eaf4cd50d337c1a36570bc1517793fd3303e1513e8ad4d2aa96::cetus::CETUS'
    }
  ]
}
*/

async function batchRetrievalPositionRewarders() {
  const params = []
  params.push({
    poolAddress: '0x83c101a55563b037f4cd25e5b326b26ae6537dc8048004c1408079f7578dd160',
    positionId: '0x88e9779719cdb9d5e722267ca2ddd0681d6c845eadfe4f6e46f9e456b26ad15e',
    coinTypeA: '0x588cff9a50e0eaf4cd50d337c1a36570bc1517793fd3303e1513e8ad4d2aa96::usdt::USDT',
    coinTypeB: '0x588cff9a50e0eaf4cd50d337c1a36570bc1517793fd3303e1513e8ad4d2aa96::usdc::USDC',
    rewarderInfo: 

  })

  fetchPosRewardersAmount
}
