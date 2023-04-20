import { d } from '../../src/utils/numbers'
import { faucetObjectId } from './init_test_data'
// least_raise_amount < softcap < hardcap
export const creatPoolList = [
  {
    coin_type_sale: `${faucetObjectId}::usdt::USDT`,
    coin_type_raise : `${faucetObjectId}::usdc::USDC`,
    sale_decimals: 6,
    raise_decimals: 6,
    initialize_price: 1.1,
    sale_total: 10 * 1_000_000 ,
    min_purchase: 1_000_000,
    max_purchase: 30_000_000,
    least_raise_amount: 3_000_000,
    softcap: 4_000_000, // sale_total* initialize_price
    hardcap: 28_000_000,
    liquidity_rate: 0.5,
    start_time: Number(d(Date.now() / 1000).toFixed(0)) + 1 *60 * 60,
    activity_duration:  1*60 * 60,
    settle_duration: 6 * 60 * 60,
    locked_duration: 2 * 60,
    tick_spacing: 2,
    recipient: "",
    white_config: {
      user_addrs: [],
      each_safe_cap: 0,
      hard_cap_total: 0
    },
    hasCreat: true,
  },


]


export const tokenList = [
  {
    address: '0x2::sui::SUI',
    coingecko_id: '',
    decimals: 9,
    logo_url: 'https://archive.cetus.zone/assets/image/icon_sui.png',
    name: 'SUI Token',
    official_symbol: 'SUI',
    project_url: '',
    symbol: 'SUI'
  },
  {
    address: '0x6740d70296035d0345bed636a820af129f6ed422::eth::ETH',
    coingecko_id: 'weth',
    decimals: 8,
    logo_url: 'https://app.cetus.zone/image/coins/eth.png',
    name: 'Ethereum',
    official_symbol: 'ETH',
    project_url: '',
    symbol: 'ETH'
  },
  {
    address: '0x6740d70296035d0345bed636a820af129f6ed422::btc::BTC',
    coingecko_id: 'wrapped-bitcoin',
    decimals: 8,
    logo_url: 'https://app.cetus.zone/image/coins/btc.png',
    name: 'Bitcoin',
    official_symbol: 'BTC',
    project_url: '',
    symbol: 'BTC'
  },
  {
    address: '0x6740d70296035d0345bed636a820af129f6ed422::usdt::USDT',
    coingecko_id: 'tether',
    decimals: 6,
    logo_url: 'https://app.cetus.zone/image/coins/usdt.png',
    name: 'Tether USD',
    official_symbol: 'USDT',
    project_url: '',
    symbol: 'USDT'
  },
  {
    address: '0x6740d70296035d0345bed636a820af129f6ed422::usdc::USDC',
    coingecko_id: 'usd-coin',
    decimals: 6,
    logo_url: 'https://app.cetus.zone/image/coins/usdc.png',
    name: 'USD Coin',
    official_symbol: 'USDC',
    project_url: 'test',
    symbol: 'USDC'
  }
]
