import BN from 'bn.js'
import { buildSdk, buildTestAccountNew as buildTestAccount, buildTestPool, TokensMapping } from './data/init_test_data'
import { CoinProvider, OnePath, PreRouterSwapParams, SwapWithRouterParams } from '../src/modules/routerModule'
import SDK, { CoinAsset, CoinAssist, DeepbookUtils, Pool, printTransaction, sendTransaction, SwapUtils, TransactionUtil } from '../src'
import { Ed25519Keypair, FaucetCoinInfo, RawSigner, TransactionArgument, TransactionBlock } from '@mysten/sui.js'
import { ClmmFetcherModule, ClmmIntegratePoolModule, CLOCK_ADDRESS } from '../src/types/sui'
import { TxBlock } from '../src/utils/tx-block'
import { PathProvider } from '../src/modules/routerModule'
import { printAggregatorResult } from './router_v2.test'
import { AggregatorResult } from '../src/modules'

describe('Router Module', () => {
  const sdk = buildSdk()
  const { simulationAccount } = sdk.sdkOptions
  const sendKeypair = buildTestAccount()
  sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()

  const USDC = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC'
  const USDT = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT'
  const ETH = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::eth::ETH'
  const SUI = '0x2::sui::SUI'
  const BTC = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::btc::BTC'
  const CETUS = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::cetus::CETUS'
  const AFR = '0x8ed60050f9c887864991b674cfc4b435be8e20e3e5a9970f7249794bd1319963::aifrens::AIFRENS'

  // const USDC = '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
  // const USDT = '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN'
  // const ETH = '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN'
  // const SUI = '0x2::sui::SUI'
  // const BTC = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::btc::BTC'
  // const CETUS = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::cetus::CETUS'

  const tokens: CoinProvider = {
    coins: [
      {
        address: '0x2::sui::SUI',
        decimals: 9,
      },
      {
        address: '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::eth::ETH',
        decimals: 8,
      },
      {
        address: '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::btc::BTC',
        decimals: 8,
      },
      {
        address: '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT',
        decimals: 6,
      },
      {
        address: '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC',
        decimals: 6,
      },
      {
        address: '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::cetus::CETUS',
        decimals: 9,
      },
    ],
  }

  const path_testnet = {
    paths: [
      {
        base: USDC,
        quote: ETH,
        addressMap: new Map([
          [2500, '0x74dcb8625ddd023e2ef7faf1ae299e3bc4cb4c337d991a5326751034676acdae'],
          // [100, '0x4ef9d8c9e7a251975936ec5342874f0dcc372d7a894462cba398b9db4fb7c52e'],
          // [10000, '0x1d732a627137158f6ec713b65cb16f1c3b83ad3a2d6740b32b21f79346eafca2'],
          [500, '0x8ad82df6fc8ee93b519f8e2d38c6985b1e5e21ea8bd2c8a94fe930dafd990d6b'],
        ]),
      },
      {
        base: USDT,
        quote: USDC,
        addressMap: new Map([
          [2500, '0x53d70570db4f4d8ebc20aa1b67dc6f5d061d318d371e5de50ff64525d7dd5bca'],
          // [500, '0x40c2dd0a9395b1f15a477f0e368c55651b837fd27765395a9412ab07fc75971c'],
          [10000, '0x4038aea2341070550e9c1f723315624c539788d0ca9212dca7eb4b36147c0fcb'],
          [100, '0x6fd4915e6d8d3e2ba6d81787046eb948ae36fdfc75dad2e24f0d4aaa2417a416'],
        ]),
      },
      {
        base: USDC,
        quote: CETUS,
        addressMap: new Map([
          [2500, '0xc41621d02d5ee00a7a993b912a8550df50524c9b2494339691e5896936ff269b'],
          [10000, '0x48630694d5632005a6d498883aa666b03aa4edf84366c5d0253e8bcca5f9008a'],
        ]),
      },
      {
        base: USDC,
        quote: SUI,
        addressMap: new Map([[100, '0x2b4570ea787289a433a53279020102681ed1af01c111f9cee50c44b1af55c7b5']]),
      },
    ],
  }

  test('integration test <= router module', async () => {
    const pools = await sdk.Pool.getPools([], 0, 200)

    const coinMap = new Map()
    const poolMap = new Map()

    for (let i = 0; i < pools.length; i += 1) {
      if (pools[i].is_pause) {
        continue
      }

      let coin_a = pools[i].coinTypeA
      let coin_b = pools[i].coinTypeB

      coinMap.set(coin_a, {
        address: coin_a,
        decimals: 8,
      })
      coinMap.set(coin_b, {
        address: coin_b,
        decimals: 6,
      })

      const pair = `${coin_a}-${coin_b}`
      const pathProvider = poolMap.get(pair)
      if (pathProvider) {
        pathProvider.addressMap.set(pools[i].fee_rate, pools[i].poolAddress)
      } else {
        poolMap.set(pair, {
          base: coin_a,
          quote: coin_b,
          addressMap: new Map([[pools[i].fee_rate, pools[i].poolAddress]]),
        })
      }
    }

    const coins: CoinProvider = {
      coins: Array.from(coinMap.values()),
    }
    const paths: PathProvider = {
      paths: Array.from(poolMap.values()),
    }

    sdk.Router.loadGraph(coins, paths)

    const byAmountIn = true
    const amount = new BN('271113')

    const result = await sdk.Router.price(USDC, CETUS, amount, byAmountIn, 0.05, '')

    console.log(result, result?.amountIn.toString(), result?.amountOut.toString())

    const params: SwapWithRouterParams = {
      paths: [result?.paths![0]!, result?.paths![1]!],
      partner: '',
      priceSplitPoint: 5,
    }

    const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)
    const routerPayload = await TransactionUtil.buildRouterSwapTransaction(sdk, params, byAmountIn, allCoinAsset)
    printTransaction(routerPayload)

    // const simulateRes = await sdk.fullClient.devInspectTransactionBlock({
    //   transactionBlock: routerPayload,
    //   sender: simulationAccount.address,
    // })
    // console.log('simulateRes', simulateRes)

    console.log(result?.amountIn.toString(), result?.amountOut.toString())
    if (!result?.isExceed) {
      const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)
      const routerPayload = await TransactionUtil.buildRouterSwapTransaction(sdk, params, byAmountIn, allCoinAsset)
      printTransaction(routerPayload)
      const signer = new RawSigner(sendKeypair, sdk.fullClient)
      const transferTxn = await sendTransaction(signer, routerPayload)
      console.log('router: ', transferTxn)
      console.log(result?.amountIn.toString(), result?.amountOut.toString())
    }
  })

  test('calculate swap fee Impact', async () => {
    const res = await sdk.RouterV2.getBestRouter(USDT, USDC, 100000000, true, 5, '', undefined, true, false)
    let param: any
    if (res.version === 'v2') {
      param = res.result
      printAggregatorResult(param! as AggregatorResult)
    }
    const fee = sdk.Swap.calculateSwapFee(res.result.splitPaths)
    const priceImpact = sdk.Swap.calculateSwapPriceImpact(res.result.splitPaths)
    console.log('result: ', { fee, priceImpact })
  })

  test('swap without send coin', async () => {
    let tx = new TxBlock()

    tx.setGasBudget(10_000_000)

    const poolAddress = '0xd40feebfcf7935d40c9e82c9cb437442fee6b70a4be84d94764d0d89bb28ab07'
    const pool = await buildTestPool(sdk, poolAddress)

    const allCoinAsset: CoinAsset[] = await sdk.getOwnerCoinAssets(sdk.senderAddress)
    const byAmountIn = true
    const a2b = true
    const amount = new BN('1000000')
    const amountLimit = byAmountIn ? amount.muln(0.9) : amount.muln(1.1)

    let txBlock = tx.txBlock

    const sqrtPriceLimit = SwapUtils.getDefaultSqrtPriceLimit(a2b).toString()

    const primaryCoinInputsA: any = TransactionUtil.buildCoinInputForAmount(
      txBlock,
      allCoinAsset,
      BigInt(byAmountIn ? amount.toString() : amountLimit.toString()),
      pool.coinTypeA
    )?.transactionArgument

    const primaryCoinInputsB: any = TransactionUtil.buildCoinInputForAmount(
      txBlock,
      allCoinAsset,
      BigInt('1'),
      pool.coinTypeB
    )?.transactionArgument

    const coinsA = primaryCoinInputsA

    const { tx: newTx, coins } = createRouterTransaction(
      sdk,
      txBlock,
      pool,
      a2b,
      byAmountIn,
      amount.toString(),
      amountLimit.toString(),
      sqrtPriceLimit,
      primaryCoinInputsA as TransactionArgument,
      primaryCoinInputsB as TransactionArgument
    )

    tx.txBlock = newTx

    tx.transferObjects([coins[0], coins[1]], sdk.senderAddress)

    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const resultTxn = await sendTransaction(signer, txBlock)
    console.log(resultTxn)
  })

  test('test get deepbook pools', async () => {
    const pools = await DeepbookUtils.getPools(sdk)
    console.log(pools)
  })

  test('test get deepbook pool asks and bids', async () => {
    const coin_a = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT'
    const coin_b = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC'

    // const pool_address = '0xeb91fb7e1050fd6aa209d529a3f6bd8149a62f2f447f6abbe805a921983eb76c'
    const pool_address = '0x5a7604cb78bc96ebd490803cfa5254743262c17d3b5b5a954767f59e8285fa1b'

    const asks = await DeepbookUtils.getPoolAsks(sdk, pool_address, coin_a, coin_b)
    console.log(asks)

    const bids = await DeepbookUtils.getPoolBids(sdk, pool_address, coin_a, coin_b)
    console.log(bids)
  })

  test('test get uesr account cap', async () => {
    const accountCap = await DeepbookUtils.getAccountCap(sdk)
    console.log(accountCap)
  })

  test('test deposit_base', async () => {
    const { clmm, deepbook } = sdk.sdkOptions
    const tx = new TransactionBlock()
    tx.setGasBudget(100000000)

    const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)

    const buildCoinResult = TransactionUtil.buildCoinInputForAmount(
      tx,
      allCoinAsset,
      BigInt('10000000000'),
      '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT'
    )
    const coin_a = buildCoinResult?.transactionArgument

    const args: any = [
      tx.object('0x5a7604cb78bc96ebd490803cfa5254743262c17d3b5b5a954767f59e8285fa1b'),
      coin_a,
      tx.object('0x8f5eb21819fa1e5d4a7acb3c0d6c00f2a50108b1196d7d96317b87e8f9d4e954'),
      tx.pure(10000000),
      // tx.object(CLOCK_ADDRESS),
    ]
    const typeArguments = [
      '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT',
      '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC',
    ]
    tx.moveCall({
      target: `${deepbook.deepbook_endpoint_v2}::endpoints_v2::deposit_base`,
      typeArguments,
      arguments: args,
    })

    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const transferTxn = await sendTransaction(signer, tx)
    console.log('only open position: ', transferTxn)
  })

  test('test deposit_quote', async () => {
    const { clmm, deepbook } = sdk.sdkOptions
    const tx = new TransactionBlock()
    tx.setGasBudget(100000000)

    const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)

    const buildCoinResult = TransactionUtil.buildCoinInputForAmount(
      tx,
      allCoinAsset,
      BigInt('10000000000'),
      '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC'
    )
    const coin_a = buildCoinResult?.transactionArgument

    const args: any = [
      tx.object('0x5a7604cb78bc96ebd490803cfa5254743262c17d3b5b5a954767f59e8285fa1b'),
      coin_a,
      tx.object('0x8f5eb21819fa1e5d4a7acb3c0d6c00f2a50108b1196d7d96317b87e8f9d4e954'),
      tx.pure(10000000),
      // tx.object(CLOCK_ADDRESS),
    ]
    const typeArguments = [
      '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT',
      '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC',
    ]
    tx.moveCall({
      target: `${deepbook.deepbook_endpoint_v2}::endpoints_v2::deposit_quote`,
      typeArguments,
      arguments: args,
    })

    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const transferTxn = await sendTransaction(signer, tx)
    console.log('only open position: ', transferTxn)
  })

  test('test deposit_quote', async () => {
    const { clmm, deepbook } = sdk.sdkOptions
    const tx = new TransactionBlock()
    tx.setGasBudget(100000000)

    // const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)

    // const buildCoinResult = TransactionUtil.buildCoinInputForAmount(
    //   tx,
    //   allCoinAsset,
    //   BigInt('10000000000'),
    //   '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC'
    // )
    // const coin_a = buildCoinResult?.transactionArgument

    const args: any = [
      tx.object('0x5a7604cb78bc96ebd490803cfa5254743262c17d3b5b5a954767f59e8285fa1b'),
      tx.pure(990000000),
      tx.pure(9000000000),
      tx.pure(false),
      tx.pure(1699124350),
      tx.pure(0),
      tx.object(CLOCK_ADDRESS),
      tx.object('0x8f5eb21819fa1e5d4a7acb3c0d6c00f2a50108b1196d7d96317b87e8f9d4e954'),
      // tx.pure(10000000),
      // tx.object(CLOCK_ADDRESS),
    ]
    const typeArguments = [
      '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT',
      '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC',
    ]
    tx.moveCall({
      target: `${deepbook.deepbook_endpoint_v2}::endpoints_v2::place_limit_order`,
      typeArguments,
      arguments: args,
    })

    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const transferTxn = await sendTransaction(signer, tx)
    console.log('only open position: ', transferTxn)
  })

  test('create account cap', async () => {
    let tx = new TransactionBlock()
    const createAccountCapResult = DeepbookUtils.createAccountCap(sdk.senderAddress, sdk.sdkOptions, tx, false)
    const cap = createAccountCapResult[0] as TransactionArgument
    tx = createAccountCapResult[1] as TransactionBlock
    tx.transferObjects([cap], tx.pure(sdk.senderAddress))

    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const transferTxn = await sendTransaction(signer, tx)
    console.log('create account cap: ', transferTxn)
  })

  test('delete account cap', async () => {
    const accountCap = await DeepbookUtils.getAccountCap(sdk)
    console.log(`deleted account cap: ${accountCap}}`)
    let tx = new TransactionBlock()

    tx = DeepbookUtils.deleteAccountCap(accountCap, sdk.sdkOptions, tx)

    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const transferTxn = await sendTransaction(signer, tx)
    console.log('delete account cap: ', transferTxn)
  })
})

function createRouterTransaction(
  sdk: SDK,
  tx: TransactionBlock,
  pool: Pool,
  a2b: boolean,
  byAmountIn: boolean,
  amount: string,
  amountLimit: string,
  sqrtPriceLimit: string,
  coinsA: TransactionArgument,
  coinsB: TransactionArgument
) {
  const { clmm } = sdk.sdkOptions

  const args = [
    tx.pure(clmm.config.global_config_id),
    tx.pure(pool.poolAddress),
    coinsA,
    coinsB,
    tx.pure(a2b),
    tx.pure(byAmountIn),
    tx.pure(amount.toString()),
    tx.pure(amountLimit.toString()),
    tx.pure(sqrtPriceLimit),
    tx.pure(CLOCK_ADDRESS),
  ]

  const typeArguments = [pool.coinTypeA, pool.coinTypeB]
  const coins: TransactionArgument[] = tx.moveCall({
    target: `${clmm.clmm_router}::${ClmmIntegratePoolModule}::swap_without_send_coin`,
    typeArguments,
    arguments: args,
  })

  return { tx, coins }
}
