import { TestnetSDK } from './init_testnet_sdk'

async function retrievelAllPools() {
  // If you want to get all pools, just pass one empty array.
  const pools = await TestnetSDK.Pool.getPoolsWithPage([])
  console.log(`pool length: ${pools.length}`)
}
// retrievelAllPools()
//pool length: 82

async function batchRetrievalPools() {
  const betch_pool_addresses = [
    '0xbed3136f15b0ea649fb94bcdf9d3728fb82ba1c3e189bf6062d78ff547850054',
    '0x74dcb8625ddd023e2ef7faf1ae299e3bc4cb4c337d991a5326751034676acdae',
  ]

  // if pool addresses not empty, you will get the pool list of the addresses.
  const betch_pools = await TestnetSDK.Pool.getPoolsWithPage(betch_pool_addresses)
  console.log({ betch_pools })
}
//batchRetrievalPools()
/*
{
  betch_pools: [
    {
      poolAddress: '0xbed3136f15b0ea649fb94bcdf9d3728fb82ba1c3e189bf6062d78ff547850054',
      poolType: '0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666::pool::Pool<0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT, 0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::cetus::CETUS>',
      coinTypeA: TestnetCoin.USDT,
      coinTypeB: '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::cetus::CETUS',
      coinAmountA: '301095941257',
      coinAmountB: '7744151970817830',
      current_sqrt_price: '2958038090622808503233',
      current_tick_index: 101552,
      fee_growth_global_a: '105486819403232',
      fee_growth_global_b: '5375007645466054573',
      fee_protocol_coin_a: '57258995',
      fee_protocol_coin_b: '2345233787348',
      fee_rate: '2500',
      is_pause: false,
      liquidity: '48272892630439',
      position_manager: [Object],
      rewarder_infos: [Array],
      rewarder_last_updated_time: '1690775362',
      tickSpacing: 60,
      ticks_handle: '0x7ac1074ec3dc1bcbffc4fdaa366464a9402f17a36a2bfd81afa0ee97230dcf95',
      uri: 'https://bq7bkvdje7gvgmv66hrxdy7wx5h5ggtrrnmt66rdkkehb64rvz3q.arweave.net/DD4VVGknzVMyvvHjceP2v0_TGnGLWT96I1KIcPuRrnc',
      index: 47,
      name: 'USDT-CETUS[60]'
    },
    {
      poolAddress: '0x74dcb8625ddd023e2ef7faf1ae299e3bc4cb4c337d991a5326751034676acdae',
      poolType: '0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666::pool::Pool<0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC, 0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::eth::ETH>',
      coinTypeA: TestnetCoin.USDC,
      coinTypeB: '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::eth::ETH',
      coinAmountA: '3322014941305',
      coinAmountB: '9107325795',
      current_sqrt_price: '28528838400056161926',
      current_tick_index: 8720,
      fee_growth_global_a: '1379094722374781659889726',
      fee_growth_global_b: '172841952761357607431',
      fee_protocol_coin_a: '3320806164020',
      fee_protocol_coin_b: '61436182',
      fee_rate: '2500',
      is_pause: false,
      liquidity: '1818716850',
      position_manager: [Object],
      rewarder_infos: [Array],
      rewarder_last_updated_time: '1690775362',
      tickSpacing: 60,
      ticks_handle: '0xba76b336b750760b26a524f8c56e8b74a6f247739e15c423cba1d2171dfaf5f1',
      uri: 'https://bq7bkvdje7gvgmv66hrxdy7wx5h5ggtrrnmt66rdkkehb64rvz3q.arweave.net/DD4VVGknzVMyvvHjceP2v0_TGnGLWT96I1KIcPuRrnc',
      index: 8,
      name: 'USDC-ETH[60]'
    }
  ]
}
*/

async function fetchOnePool() {
  const pool = await TestnetSDK.Pool.getPool('0xbed3136f15b0ea649fb94bcdf9d3728fb82ba1c3e189bf6062d78ff547850054')
  console.log({ pool })
}
//fetchOnePool()
/*{
  pool: {
    poolAddress: '0xbed3136f15b0ea649fb94bcdf9d3728fb82ba1c3e189bf6062d78ff547850054',
    poolType: '0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666::pool::Pool<0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT, 0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::cetus::CETUS>',
    coinTypeA: TestnetCoin.USDT,
    coinTypeB: '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::cetus::CETUS',
    coinAmountA: '301095941257',
    coinAmountB: '7744151970817830',
    current_sqrt_price: '2958038090622808503233',
    current_tick_index: 101552,
    fee_growth_global_a: '105486819403232',
    fee_growth_global_b: '5375007645466054573',
    fee_protocol_coin_a: '57258995',
    fee_protocol_coin_b: '2345233787348',
    fee_rate: '2500',
    is_pause: false,
    liquidity: '48272892630439',
    position_manager: {
      positions_handle: '0x5cb2c58574b34cd13dbd177bef53ab52b814131d0b684cf2b53f1d5d31d2d9f5',
      size: '4'
    },
    rewarder_infos: [ [Object] ],
    rewarder_last_updated_time: '1690775362',
    tickSpacing: 60,
    ticks_handle: '0x7ac1074ec3dc1bcbffc4fdaa366464a9402f17a36a2bfd81afa0ee97230dcf95',
    uri: 'https://bq7bkvdje7gvgmv66hrxdy7wx5h5ggtrrnmt66rdkkehb64rvz3q.arweave.net/DD4VVGknzVMyvvHjceP2v0_TGnGLWT96I1KIcPuRrnc',
    index: 47,
    name: 'USDT-CETUS[60]'
  }
}
*/
