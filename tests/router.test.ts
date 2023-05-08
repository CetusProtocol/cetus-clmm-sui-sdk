import BN from 'bn.js'
import { buildSdk, buildTestAccount, buildTestPool, TokensMapping } from './data/init_test_data'
import { TokenInfo } from '../src/modules/tokenModule'
import { CoinProvider, OnePath } from '../src/modules/routerModule'
import { printTransaction, sendTransaction, TransactionUtil } from '../src'
import { RawSigner } from '@mysten/sui.js'

describe('Router Module', () => {
  const sdk = buildSdk()
  const sendKeypair = buildTestAccount()
  sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()

  const USDC = '0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e::usdc::USDC'
  const USDT = '0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e::usdt::USDT'
  const ETH = '0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e::eth::ETH'
  const SUI = '0x2::sui::SUI'
  const BTC = '0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e::btc::BTC'

  const tokens: CoinProvider = {
    coins: [
      {
        address: '0x2::sui::SUI',
        decimals: 9,
      },
      {
        address: '0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e::eth::ETH',
        decimals: 8,
      },
      {
        address: '0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e::btc::BTC',
        decimals: 8,
      },
      {
        address: '0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e::usdt::USDT',
        decimals: 6,
      },
      {
        address: '0x4d892ceccd1497b9be7701e09d51c580bc83f22c9c97050821b373a77d0d9a9e::usdc::USDC',
        decimals: 6,
      },
    ]
  }

  const path0 = {
    paths: [
      {
        base: USDC,
        quote: ETH,
        addressMap: new Map([
          [2500, '0xfd184ddbb8c94c319209fe2e66462396e088f3d97cf3fcce8783d1fb5d6b92c4'],
          [10000, '0xfb1c5433dade825b7cb2f39a48876000afcb64ab778937f6b68f0b6c38b6b0b5'],
          // [100, '0xd3036becc5b0c01fff5f15a51a633106153891a0d7150b2d4324b39ab54042c8'],
        ]),
      },
      {
        base: ETH,
        quote: USDT,
        addressMap: new Map([
          [100, '0xb2ed4e98998b90e5d1bc3a0a8c81d7f94d847fe37665b2c5bd1203c8b0337ee9'],
          [500, '0x9cb978eff75f5e0754c2f4e148cea952956c9bc4b082680dc91a1dff3e30b609'],
          [2500, '0x69c1556b73f44b81c6392b27b3fe8fbfb80e483a35ef199bdb9cc6ac67a7c2ba'],
        ]),
      },
      {
        base: ETH,
        quote: BTC,
        addressMap: new Map([
          [2000, '0xd5f572b65a3625099d097f2dd3032f038fa79638f2e0d1044124d110493af67e'],
        ]),
      },
      {
        base: BTC,
        quote: USDC,
        addressMap: new Map(
          [
            [2500, '0x6cec33d399439d341216f24860e130b69ce30a802cc633fa29b088a8aa2f1453'],
          ]
        ),
      }, 
      {
        base: USDT,
        quote: USDC,
        addressMap: new Map([
          [100, '0x7e279224f1dd455860d65fa975cce5208485fd98b8e9a0cb6bd087c6dc9f5e03'],
          [500, '0x4ec79e658f4ce15371b8946a79c09c8fc46fcb948ccd87142ae3d02a195ac874'],
          [2500, '0xda21c1f4d1bbb2c4ddaf1966266e83e7c853acead10655ca2ff59532cebd6745'],
        ]),
      },
      {
        base: SUI,
        quote: USDC,
        addressMap: new Map(
          [
            [2500, '0xcfa5914edd8ed9e60006e36dd01d880ffc65acdc13a67d2432b66855b3e1b6ba'],
          ]
        ),
      },
    ],
  }

  const path1 = {
    paths: [
      {
        base: USDC,
        quote: ETH,
        addressMap: new Map([
          [100, '0x092c6d323002e100838187334f568a94716b72da5eb2a95947b4f6ddf0bf6dfd'],
          [500, '0xce6449b40d8c16253468a7a567cacb101712c054f43a9d2646c28a8e34a70204'],
          [2500, '0xeaf8f3756dba3a2b22e1a7a5bd1843ffc29a76812216292e9c762c327a639c1b'],
        ]),
      },
      {
        base: ETH,
        quote: USDT,
        addressMap: new Map([
          [500, '0x824a3569a3e25c1e5406de600e3985cdcd894f94d8b59f2ae92f6b5cbfc02cc2'],
          [100, '0xebe7f1860190d8a9d275d0c03400360d8b61d452299ca027cef1493777480d97'],
          [2500, '0x83d8514cf8b1d33e5d4e78f1f4752cd4407afdd18b2268f836311f98b1b61508'],
        ]),
      },
      // {
      //   base: ETH,
      //   quote: BTC,
      //   addressMap: new Map([
      //     // [2000, '0xd5f572b65a3625099d097f2dd3032f038fa79638f2e0d1044124d110493af67e'],
      //   ]),
      // },
      // {
      //   base: BTC,
      //   quote: USDC,
      //   addressMap: new Map(
      //     [
      //       // [2500, '0x6cec33d399439d341216f24860e130b69ce30a802cc633fa29b088a8aa2f1453'],
      //     ]
      //   ),
      // }, 
      {
        base: USDT,
        quote: USDC,
        addressMap: new Map([
          [100, '0x7b9d0f7e1ba6de8eefaa259da9f992e00aa8c22310b71ffabf2784e5b018a173'],
          [200, '0x056ee86d09bf768168394e76b2137cf567c99ebe43bb5820d817cc213b9fa0cd'],
          [500, '0x3382012b8e35c8745e1d163728f44d162c3d1799ec4f8e432da18e46bbbe5987'],
          [2500, '0x8aba0a4ea6ec440ba5cb75dad9f47492dab7fe37d6c5275a17c6df55ae88283b'],
        ]),
      },
      // {
      //   base: SUI,
      //   quote: USDC,
      //   addressMap: new Map(
      //     [
      //       // [2500, '0xcfa5914edd8ed9e60006e36dd01d880ffc65acdc13a67d2432b66855b3e1b6ba'],
      //     ]
      //   ),
      // },
    ],
  }

  test('router module => testnet', async () => {
    sdk.Router.addCoinProvider(tokens)
    sdk.Router.addPathProvider(path1)
    sdk.Router.setCoinList()
    sdk.Router.loadGraph()

    // const byAmountIn = true
    const byAmountIn = true
    // const amount = new BN('1000000000')
    const amount = new BN('1000000')
    // const amount = new BN('10000000000000000')
    // const amount = new BN('10000000')
    // const amount = new BN('10000000000')

    // const result = await sdk.Router.price(SUI,  ETH, amount, byAmountIn, 100, '')
    // console.log(result)

    const result: any  = await sdk.Router.price(USDT, USDC, amount, byAmountIn, 1, '')
    console.log(result?.amountIn.toString(), result?.amountOut.toString())
    logPath(result.paths)
    if (!result?.isExceed) {
      const allCoinAsset = await sdk.Resources.getOwnerCoinAssets(sdk.senderAddress)
      const routerPayload = TransactionUtil.buildRouterSwapTransaction(sdk, sdk.Router.getCreateTxParams(), byAmountIn, allCoinAsset)
      printTransaction(routerPayload)
      const signer = new RawSigner(sendKeypair, sdk.fullClient)
      const transferTxn = await sendTransaction(signer, routerPayload)
      console.log('router: ', transferTxn)
      console.log(result?.amountIn.toString(), result?.amountOut.toString())
    }
  })
})

function logPath(paths: OnePath[]) {
  for (const path of paths) {
    const limitArr: string[] = []
    for(const limit of path.rawAmountLimit) {
      limitArr.push(limit.toString())
    }
    const poolAdderss: string[] = []
    for(const pool of path.poolAddress) {
      poolAdderss.push(pool)
    }
    const a2b: boolean[] = [] 
    for (const a2bi of path.a2b) {
      a2b.push(a2bi)
    }
    const coinType: string[] = []
    for (const coin of path.coinType) {
      coinType.push(coin)
    }
    console.log('path: %s\nrawAmountLimit: %s\npoolAddress: %s\na2b: %s\nCoinType: %s', {
      amountIn: path.amountIn.toString(),
      amountOut: path.amountOut.toString(),
      poolAddress: path.poolAddress,
      a2b: path.a2b,
      isExceed: path.isExceed,
      coinType: path.coinType
    }, limitArr, poolAdderss, a2b, coinType)
  }
}