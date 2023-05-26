import { d } from '../../src/utils/numbers'
const faucetObjectId = "0x8258af69b6d71e5f85670ec062a0ff7c5eb4323148e7fbc00950780f1b876ac7"
// least_raise_amount < softcap < hardcap
export const creatPoolList = [
  {
    coin_type_sale: `${faucetObjectId}::testa::TESTA`,
    coin_type_raise : `${faucetObjectId}::testb::TESTB`,
    sale_decimals: 9,
    raise_decimals: 9,
    initialize_price: 1.1,
    sale_total: 10 * 1_000_000_000,
    min_purchase: 1_000_000_000,
    max_purchase: 10_000_000_000,
    least_raise_amount: 3_000_000_000,
    softcap: 11_000_000_000, // sale_total* initialize_price
    hardcap: 28_000_000_000,
    liquidity_rate: 0.5,
    start_time: Number(d(Date.now() / 1000).toFixed(0)) + 10 * 60,
    activity_duration:  1 * 60 * 60,
    settle_duration: 5 * 60 * 60,
    locked_duration: 1 * 60,
    tick_spacing: 2,
    recipient: "0xf751c72f6462d2c2f4434d085076c85c690a51b584d765bb8863669908835f41",
    white_config: {
      user_addrs: ['0xf751c72f6462d2c2f4434d085076c85c690a51b584d765bb8863669908835f41'],
      safe_limit_amount:  10 * 1_000_000_000,
      hard_cap_total:  20 * 1_000_000_000
    },
    hasCreat: true,
  },

  {
    coin_type_sale: `0x8258af69b6d71e5f85670ec062a0ff7c5eb4323148e7fbc00950780f1b876ac7::testa::TESTA`,
    coin_type_raise : `0x8258af69b6d71e5f85670ec062a0ff7c5eb4323148e7fbc00950780f1b876ac7::usdc::USDC`,
    sale_decimals: 9,
    raise_decimals: 6,
    initialize_price: 1,
    sale_total: 100 * 1_000_000_00,
    min_purchase: 1_000_000,
    max_purchase: 90_000_000,
    least_raise_amount: 50_000_000,
    softcap: 11_000_000_00, // sale_total* initialize_price
    hardcap: 300_000_000,
    liquidity_rate: 0.5,
    start_time: Number(1682562600),
    activity_duration:  14400,
    settle_duration: 3600,
    locked_duration: 3600,
    tick_spacing: 2,
    recipient: "0xe130507a629c841cce2264971bff486ff94665e0859b184e33ab4943921fdd66",
    white_config: {
      user_addrs: ['0x66cb0c0d32a088b64a4a6f9b9d2beb6f39c14fab530b7a6467d7ccc845660b91','0x3b229689e5a26ba559107139794bcc49db38d37867290ac78cfbe9d02a667eda'],
      safe_limit_amount:0 ,
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
