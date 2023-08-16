import { TestnetSDK } from './init_testnet_sdk'

async function retrievalPositions() {
  const res = await TestnetSDK.Position.getPositionList('0xcd0247d0b67e53dde69b285e7a748e3dc390e8a5244eb9dd9c5c53d95e4cf0aa', [
    '0x83c101a55563b037f4cd25e5b326b26ae6537dc8048004c1408079f7578dd160',
  ])
  console.log('get positions of one pool by owner address', res)
}

// retrievalPositions()
/*
  {
    creator: 'Cetus',
    description: 'Cetus Liquidity Position',
    image_url: 'https://bq7bkvdje7gvgmv66hrxdy7wx5h5ggtrrnmt66rdkkehb64rvz3q.arweave.net/DD4VVGknzVMyvvHjceP2v0_TGnGLWT96I1KIcPuRrnc',
    link: 'https://app.cetus.zone/position?chain=sui&id=0xf10d37cc00bcd60f85cef3fe473ea979e3f7f3631d522618e80c876b349e56bc',
    name: 'Cetus LP | Pool0-36',
    project_url: 'https://cetus.zone',
    pos_object_id: '0xf10d37cc00bcd60f85cef3fe473ea979e3f7f3631d522618e80c876b349e56bc',
    owner: '0xcd0247d0b67e53dde69b285e7a748e3dc390e8a5244eb9dd9c5c53d95e4cf0aa',
    type: '0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666::position::Position',
    coin_type_a: '0588cff9a50e0eaf4cd50d337c1a36570bc1517793fd3303e1513e8ad4d2aa96::usdt::USDT',
    coin_type_b: '0588cff9a50e0eaf4cd50d337c1a36570bc1517793fd3303e1513e8ad4d2aa96::usdc::USDC',
    liquidity: '0',
    tick_lower_index: -2,
    tick_upper_index: 2,
    index: '36',
    pool: '0x83c101a55563b037f4cd25e5b326b26ae6537dc8048004c1408079f7578dd160',
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
    position_status: 'Exists'
  },
  ...
  {
    creator: 'Cetus',
    description: 'Cetus Liquidity Position',
    image_url: 'https://bq7bkvdje7gvgmv66hrxdy7wx5h5ggtrrnmt66rdkkehb64rvz3q.arweave.net/DD4VVGknzVMyvvHjceP2v0_TGnGLWT96I1KIcPuRrnc',
    link: 'https://app.cetus.zone/position?chain=sui&id=0xfbf94213d59d285f66bacdb3d667a4db00b491af35887022e9197bb244705bde',
    name: 'Cetus LP | Pool0-22',
    project_url: 'https://cetus.zone',
    pos_object_id: '0xfbf94213d59d285f66bacdb3d667a4db00b491af35887022e9197bb244705bde',
    owner: '0xcd0247d0b67e53dde69b285e7a748e3dc390e8a5244eb9dd9c5c53d95e4cf0aa',
    type: '0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666::position::Position',
    coin_type_a: '0588cff9a50e0eaf4cd50d337c1a36570bc1517793fd3303e1513e8ad4d2aa96::usdt::USDT',
    coin_type_b: '0588cff9a50e0eaf4cd50d337c1a36570bc1517793fd3303e1513e8ad4d2aa96::usdc::USDC',
    liquidity: '0',
    tick_lower_index: -2,
    tick_upper_index: 2,
    index: '22',
    pool: '0x83c101a55563b037f4cd25e5b326b26ae6537dc8048004c1408079f7578dd160',
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
    position_status: 'Exists'
  }
*/

async function retrievalPositionOfOnePool() {
  const pool = await TestnetSDK.Pool.getPool('0x83c101a55563b037f4cd25e5b326b26ae6537dc8048004c1408079f7578dd160')
  const res = await TestnetSDK.Pool.getPositionList(pool.position_manager.positions_handle)
  console.log('get positions of one pool, the length of positions is: ', res.length)
}
// retrievalPositionOfOnePool()
//get positions of one pool, the length of positions is:  35

async function retrievalPositionById() {
  const res = await TestnetSDK.Position.getPositionById('0xfbf94213d59d285f66bacdb3d667a4db00b491af35887022e9197bb244705bde')
  console.log('get position by id', res)
}
// retrievalPositionById()
/*
get position by id {
  creator: 'Cetus',
  description: 'Cetus Liquidity Position',
  image_url: 'https://bq7bkvdje7gvgmv66hrxdy7wx5h5ggtrrnmt66rdkkehb64rvz3q.arweave.net/DD4VVGknzVMyvvHjceP2v0_TGnGLWT96I1KIcPuRrnc',
  link: 'https://app.cetus.zone/position?chain=sui&id=0xfbf94213d59d285f66bacdb3d667a4db00b491af35887022e9197bb244705bde',
  name: 'Cetus LP | Pool0-22',
  project_url: 'https://cetus.zone',
  pos_object_id: '0xfbf94213d59d285f66bacdb3d667a4db00b491af35887022e9197bb244705bde',
  owner: '0xcd0247d0b67e53dde69b285e7a748e3dc390e8a5244eb9dd9c5c53d95e4cf0aa',
  type: '0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666::position::Position',
  coin_type_a: '0588cff9a50e0eaf4cd50d337c1a36570bc1517793fd3303e1513e8ad4d2aa96::usdt::USDT',
  coin_type_b: '0588cff9a50e0eaf4cd50d337c1a36570bc1517793fd3303e1513e8ad4d2aa96::usdc::USDC',
  liquidity: '0',
  tick_lower_index: -2,
  tick_upper_index: 2,
  index: '22',
  pool: '0x83c101a55563b037f4cd25e5b326b26ae6537dc8048004c1408079f7578dd160',
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
  position_status: 'Exists'
}
*/

async function batchFetchPositionFees() {
  const positionIDs = [
    '0xf10d37cc00bcd60f85cef3fe473ea979e3f7f3631d522618e80c876b349e56bc',
    '0xfbf94213d59d285f66bacdb3d667a4db00b491af35887022e9197bb244705bde',
  ]
  const fees = await TestnetSDK.Position.batchFetchPositionFees(positionIDs)
  console.log('batch fetch position fees', fees)
}
