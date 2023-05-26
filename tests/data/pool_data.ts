import { faucetObjectId } from './init_test_data'

export const poolList = [
  {
    coin_type_a: `${faucetObjectId}::usdt::USDT`,
    coin_type_b : `${faucetObjectId}::usdc::USDC`,
    coin_a_decimals: 6,
    coin_b_decimals: 6,
    initialize_price: 1,
    tick_spacing: 2 ,
    fee_rate: 0.01 /100 * 1000000 ,
    uri: '',
    hasCreat: true,
  },
  {
    coin_type_a: `${faucetObjectId}::btc::BTC`,
    coin_type_b : `${faucetObjectId}::usdc::USDC`,
    coin_a_decimals: 8,
    coin_b_decimals: 6,
    initialize_price: 30090,
    tick_spacing: 60 ,
    fee_rate: 0.25 /100 * 1000000 ,
    uri: '',
    hasCreat: false,
  },
  {
    coin_type_a: `0x2::sui::SUI`,
    coin_type_b : `${faucetObjectId}::usdc::USDC`,
    coin_a_decimals: 9,
    coin_b_decimals: 6,
    initialize_price: 0.005,
    tick_spacing: 60 ,
    fee_rate: 0.25 /100 * 1000000 ,
    uri: '',
    hasCreat: true,
  },
  {
    coin_type_a: `${faucetObjectId}::eth::ETH`,
    coin_type_b : `${faucetObjectId}::usdc::USDC`,
    coin_a_decimals: 8,
    coin_b_decimals: 6,
    initialize_price: 1920,
    tick_spacing: 60 ,
    fee_rate: 0.25 /100 * 1000000 ,
    uri: '',
    hasCreat: true,
  },

  {
    coin_type_a: `${faucetObjectId}::usdc::USDC`,
    coin_type_b : `0x2::sui::SUI`,
    coin_a_decimals: 8,
    coin_b_decimals: 6,
    initialize_price:  0.005,
    tick_spacing: 60 ,
    fee_rate: 0.25 /100 * 1000000 ,
    uri: '',
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
