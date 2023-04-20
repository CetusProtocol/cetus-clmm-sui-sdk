import BN from 'bn.js'
import { buildSdk, buildTestPool, TokensMapping } from './data/init_test_data'
import { TokenInfo } from '../src/modules/tokenModule'

describe('Rewarder Module', () => {
  const sdk = buildSdk()

  test('swap module', async () => {
    const USDC = 'USDC'
    const USDT = 'USDT'
    const ETH = 'ETH'
    const SUI = 'SUI'

    const tokens: TokenInfo[] = [
      {
        address: '0x2::sui::SUI',
        coingecko_id: '',
        decimals: 9,
        logo_url: 'https://archive.cetus.zone/assets/image/icon_sui.png',
        name: 'SUI Token',
        official_symbol: 'SUI',
        project_url: '',
        symbol: 'SUI',
      },
      {
        address: '0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e::eth::ETH',
        coingecko_id: 'weth',
        decimals: 8,
        logo_url: 'https://app.cetus.zone/image/coins/eth.png',
        name: 'Ethereum',
        official_symbol: 'ETH',
        project_url: '',
        symbol: 'ETH',
      },
      {
        address: '0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e::btc::BTC',
        coingecko_id: 'wrapped-bitcoin',
        decimals: 8,
        logo_url: 'https://app.cetus.zone/image/coins/btc.png',
        name: 'Bitcoin',
        official_symbol: 'BTC',
        project_url: '',
        symbol: 'BTC',
      },
      {
        address: '0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e::usdt::USDT',
        coingecko_id: 'tether',
        decimals: 6,
        logo_url: 'https://app.cetus.zone/image/coins/usdt.png',
        name: 'Tether USD',
        official_symbol: 'USDT',
        project_url: '',
        symbol: 'USDT',
      },
      {
        address: '0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e::usdc::USDC',
        coingecko_id: 'usd-coin',
        decimals: 6,
        logo_url: 'https://app.cetus.zone/image/coins/usdc.png',
        name: 'USD Coin',
        official_symbol: 'USDC',
        project_url: '',
        symbol: 'USDC',
      },
    ]

    const path = {
      paths: [
        {
          base: ETH,
          quote: USDC,
          addressMap: new Map([[60, '0x426e0572eb4aca5b50a4e2667a6f3b8c49fa42d631d6ca8ba7357fe5a85c5748']]),
        },
        {
          base: ETH,
          quote: USDT,
          addressMap: new Map([[2, '0x9d36249e5a1f6f79e577c19cdb37d1fdcee981fd7a1594bcf181b1c0abf80d8e']]),
        },
        {
          base: USDT,
          quote: USDC,
          addressMap: new Map([
            [2, '0x2e6f7683bab8e02c94298a3a8c1c63d679a19eaa6fb2ecf9368ec661dda5fe05'],
            [60, '0xd127a768ef457ba1121570f7b46c4722e02a6b8581f9379636e2c030086a28ce'],
            [10, '0x723f1d1b1f1fa50c64b692b1b45b7417e9092351882e79bda777b7b10623a5f0'],
          ]),
        },
        {
          base: SUI,
          quote: USDC,
          addressMap: new Map([[2, '0x6a73a8d0c16d8b4d1988c54f1f2c9c5e48439eb6f6edc690c9117efda7e97184']]),
        },
      ],
    }

    await sdk.Router.setCoinList(tokens)
    await sdk.Router.loadGraph()

    const currentPool = await buildTestPool(sdk, TokensMapping.USDT_USDC_LP.poolObjectId[0])
    const a2b = true
    const byAmountIn = true
    const amount = new BN('100000000')

    const tickdatas = await sdk.Pool.fetchTicksByRpc(currentPool.ticks_handle)

    const res = await sdk.Swap.calculateRates({
      decimalsA: 8,
      decimalsB: 6,
      a2b,
      byAmountIn,
      amount,
      swapTicks: tickdatas,
      currentPool,
    })

    console.log('calculateRates0', {
      estimatedAmountIn: res.estimatedAmountIn.toString(),
      estimatedAmountOut: res.estimatedAmountOut.toString(),
      estimatedEndSqrtprice: res.estimatedEndSqrtPrice.toString(),
      isExceed: res.isExceed,
      a2b,
      byAmountIn,
    })
  })
})
