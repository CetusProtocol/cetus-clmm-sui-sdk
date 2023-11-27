import { TestnetSDK } from './init_testnet_sdk'

async function betchRetrievalTicksByPoolID() {
  const tickdatas = await TestnetSDK.Pool.fetchTicks({
    pool_id: '0xbed3136f15b0ea649fb94bcdf9d3728fb82ba1c3e189bf6062d78ff547850054',
    coinTypeA: TestnetCoin.USDT,
    coinTypeB: '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::cetus::CETUS',
  })
  console.log('fetchTicks: ', tickdatas)
}
// betchRetrievalTicksByPoolID()
/*
fetchTicks:  [
  {
    objectId: '',
    index: -443636,
    sqrtPrice: <BN: 100013b50>,
    liquidityNet: <BN: 1717f11788>,
    liquidityGross: <BN: 1717f11788>,
    feeGrowthOutsideA: <BN: 0>,
    feeGrowthOutsideB: <BN: 0>,
    rewardersGrowthOutside: []
  },
  {
    objectId: '',
    index: -5630,
    sqrtPrice: <BN: c1317f9be7e3624f>,
    liquidityNet: <BN: 210b4a0>,
    liquidityGross: <BN: 210b4a0>,
    feeGrowthOutsideA: <BN: 3fc2189029e0374>,
    feeGrowthOutsideB: <BN: 1f6d28d0924e7fd>,
    rewardersGrowthOutside: [
      '493908213970774732607273',
      '1536244159578954174',
      '1228332157000808067268'
    ]
  },
  ...
]
 */

async function betchFetchTicksByRpc() {
  const pool = await TestnetSDK.Pool.getPool('0x6fd4915e6d8d3e2ba6d81787046eb948ae36fdfc75dad2e24f0d4aaa2417a416')
  const tickdatas = await TestnetSDK.Pool.fetchTicksByRpc(pool.ticks_handle)
  console.log('tick data:', tickdatas)
}
// betchFetchTicksByRpc()
/*
[
  {
    objectId: '0x012cc2b51309c25256a4249f586c5b997bdef52b4650c975988ae951083f3d07',
    index: 120,
    sqrtPrice: <BN: 1018a60d3e16e8273>,
    liquidityNet: <BN: 12339ce2>,
    liquidityGross: <BN: 12339ce2>,
    feeGrowthOutsideA: <BN: 0>,
    feeGrowthOutsideB: <BN: 0>,
    rewardersGrowthOutside: [ '0' ]
  },
  {
    objectId: '0x02d64aaa0665387c739a3488c57cff9c306a13e81fb340b0909d6e1f3339018d',
    index: 186,
    sqrtPrice: <BN: 102644c0526945878>,
    liquidityNet: <BN: ffffffffffffffffffffffffedcc631e>,
    liquidityGross: <BN: 12339ce2>,
    feeGrowthOutsideA: <BN: 0>,
    feeGrowthOutsideB: <BN: 0>,
    rewardersGrowthOutside: [ '0' ]
  },
  ...
]
*/
