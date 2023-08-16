import BN from 'bn.js'
import { buildSdk, buildTestAccountNew as buildTestAccount, buildTestPool, currSdkEnv } from './data/init_test_data'
import { CoinProvider, OnePath, PreRouterSwapParams, SwapWithRouterParams } from '../src/modules/routerModule'
import SDK, { CoinAsset, CoinAssist, DeepbookUtils, getPackagerConfigs, Pool, printTransaction, SwapUtils, TransactionUtil } from '../src'
import { ClmmFetcherModule, ClmmIntegratePoolModule, CLOCK_ADDRESS } from '../src/types/sui'
import { TxBlock } from '../src/utils/tx-block'
import { PathProvider } from '../src/modules/routerModule'
import { printAggregatorResult } from './router_v2.test'
import { AggregatorResult } from '../src/modules'
import { RawSigner } from '@mysten/sui.js/dist/cjs/signers/raw-signer'
import { TransactionArgument, TransactionBlock } from '@mysten/sui.js/transactions'

describe('Router Module', () => {
  const sdk = buildSdk()
  const sendKeypair = buildTestAccount()
  sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()
  let USDC: string
  let USDT: string
  let ETH: string
  let AFR: string
  let SUI: string
  let BTC: string
  let CETUS: string
  let url: string

  beforeAll(async () => {
    if (currSdkEnv === 'mainnet') {
      USDC = '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
      USDT = '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN'
      ETH = '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN'
      SUI = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
      CETUS = '0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS'
      url = 'https://api-sui.cetus.zone/v2/sui/pools_info'
    } else {
      USDC = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC'
      USDT = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT'
      ETH = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::eth::ETH'
      AFR = '0x8ed60050f9c887864991b674cfc4b435be8e20e3e5a9970f7249794bd1319963::aifrens::AIFRENS'
      CETUS = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::cetus::CETUS'
      SUI = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
      url = 'https://api-sui.devcetus.com/v2/sui/pools_info'
    }
  })

  test('integration test <= router module', async () => {
    const coinMap = new Map()
    const poolMap = new Map()

    const resp: any = await fetch('https://api-sui.cetus.zone/v2/sui/pools_info', { method: 'GET' })
    // const resp: any = await fetch('https://api-sui.devcetus.com/v2/sui/pools_info', { method: 'GET' })
    const poolsInfo = await resp.json()

    if (poolsInfo.code === 200) {
      for (const pool of poolsInfo.data.lp_list) {
        if (pool.is_closed) {
          continue
        }

        let coin_a = pool.coin_a.address
        let coin_b = pool.coin_b.address

        coinMap.set(coin_a, {
          address: pool.coin_a.address,
          decimals: pool.coin_a.decimals,
        })
        coinMap.set(coin_b, {
          address: pool.coin_b.address,
          decimals: pool.coin_b.decimals,
        })

        const pair = `${coin_a}-${coin_b}`
        const pathProvider = poolMap.get(pair)
        if (pathProvider) {
          pathProvider.addressMap.set(Number(pool.fee) * 100, pool.address)
        } else {
          poolMap.set(pair, {
            base: coin_a,
            quote: coin_b,
            addressMap: new Map([[Number(pool.fee) * 100, pool.address]]),
          })
        }
      }
    }

    const coins: CoinProvider = {
      coins: Array.from(coinMap.values()),
    }
    const paths: PathProvider = {
      paths: Array.from(poolMap.values()),
    }

    sdk.Router.loadGraph(coins, paths)

    const byAmountIn = false
    const amount = new BN('1000000000')

    const result = await sdk.Router.price(CETUS, SUI, amount, byAmountIn, 0, '')

    console.log(result, result?.amountIn.toString(), result?.amountOut.toString())

    // const params: SwapWithRouterParams = {
    //   paths: [result?.paths![0]!, result?.paths![1]!],
    //   partner: '',
    //   priceSplitPoint: 5,
    // }

    // const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)
    // const routerPayload = await TransactionUtil.buildRouterSwapTransaction(sdk, params, byAmountIn, allCoinAsset)
    // printTransaction(routerPayload)

    // // const simulateRes = await sdk.fullClient.devInspectTransactionBlock({
    // //   transactionBlock: routerPayload,
    // //   sender: simulationAccount.address,
    // // })
    // // console.log('simulateRes', simulateRes)

    // console.log(result?.amountIn.toString(), result?.amountOut.toString())
    // if (!result?.isExceed) {
    //   const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)
    //   const routerPayload = await TransactionUtil.buildRouterSwapTransaction(sdk, params, byAmountIn, allCoinAsset)
    //   printTransaction(routerPayload)
    //   const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, routerPayload)
    //   console.log('router: ', transferTxn)
    //   console.log(result?.amountIn.toString(), result?.amountOut.toString())
    // }
  })

  test('calculate swap fee Impact', async () => {
    const res = await sdk.RouterV2.getBestRouter(CETUS, USDC, 100000000, true, 5, '', '', undefined, true, false)
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

    const resultTxn = await sdk.fullClient.sendTransaction(sendKeypair, txBlock)
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
    const { clmm_pool, deepbook_endpoint_v2 } = sdk.sdkOptions
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
      target: `${deepbook_endpoint_v2.published_at}::endpoints_v2::deposit_base`,
      typeArguments,
      arguments: args,
    })

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, tx)
    console.log('only open position: ', transferTxn)
  })

  test('test deposit_quote', async () => {
    const { deepbook_endpoint_v2 } = sdk.sdkOptions
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
      target: `${deepbook_endpoint_v2.published_at}::endpoints_v2::deposit_quote`,
      typeArguments,
      arguments: args,
    })

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, tx)
    console.log('only open position: ', transferTxn)
  })

  test('test deposit_quote', async () => {
    const { deepbook_endpoint_v2 } = sdk.sdkOptions
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
      target: `${deepbook_endpoint_v2.published_at}::endpoints_v2::place_limit_order`,
      typeArguments,
      arguments: args,
    })

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, tx)
    console.log('only open position: ', transferTxn)
  })

  test('create account cap', async () => {
    let tx = new TransactionBlock()
    const createAccountCapResult = DeepbookUtils.createAccountCap(sdk.senderAddress, sdk.sdkOptions, tx, false)
    const cap = createAccountCapResult[0] as TransactionArgument
    tx = createAccountCapResult[1] as TransactionBlock
    tx.transferObjects([cap], tx.pure(sdk.senderAddress))

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, tx)
    console.log('create account cap: ', transferTxn)
  })

  test('delete account cap', async () => {
    const accountCap = await DeepbookUtils.getAccountCap(sdk)
    console.log(`deleted account cap: ${accountCap}}`)
    let tx = new TransactionBlock()

    tx = DeepbookUtils.deleteAccountCap(accountCap, sdk.sdkOptions, tx)

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, tx)
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
  const { clmm_pool, integrate } = sdk.sdkOptions

  const args = [
    tx.pure(getPackagerConfigs(clmm_pool).global_config_id),
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
    target: `${integrate.published_at}::${ClmmIntegratePoolModule}::swap_without_send_coin`,
    typeArguments,
    arguments: args,
  })

  return { tx, coins }
}
