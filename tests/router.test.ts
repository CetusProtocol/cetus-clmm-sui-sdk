import BN from 'bn.js'
import { buildSdk, buildTestAccount, buildTestPool } from './data/init_test_data'
import { CoinProvider, SwapWithRouterParams } from '../src/modules/routerModule'
import SDK, { CetusClmmSDK, CoinAsset, DeepbookUtils, Pool, printTransaction, sendTransaction, SwapUtils, TransactionUtil } from '../src'
import { RawSigner, TransactionArgument, TransactionBlock } from '@mysten/sui.js'
import { ClmmIntegratePoolModule, CLOCK_ADDRESS } from '../src/types/sui'
import { TxBlock } from '../src/utils/tx-block'
import { PathProvider } from '../src/modules/routerModule'
import { printAggregatorResult } from './router_v2.test'
import { AggregatorResult } from '../src/modules'

describe('Router Module', () => {
  const sdk = buildSdk()
  const sendKeypair = buildTestAccount()
  sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()

  const USDC = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC'
  const USDT = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT'
  const ETH = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::eth::ETH'
  const SUI = '0x2::sui::SUI'
  const BTC = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::btc::BTC'
  const CETUS = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::cetus::CETUS'
  const AFR = '0x8ed60050f9c887864991b674cfc4b435be8e20e3e5a9970f7249794bd1319963::aifrens::AIFRENS'

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
    const amount = new BN('271113000')

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

    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const succeed = await execTx(sdk, true, routerPayload, signer)
  })

  //   test('calculate swap fee Impact', async () => {
  //     const res = await sdk.RouterV2.getBestRouter(USDT, USDC, 100000000, true, 5, '', undefined, true, false)
  //     let param: any
  //     if (res.version === 'v2') {
  //       param = res.result
  //       printAggregatorResult(param! as AggregatorResult)
  //     }
  //     const fee = sdk.Swap.calculateSwapFee(res.result.splitPaths)
  //     const priceImpact = sdk.Swap.calculateSwapPriceImpact(res.result.splitPaths)
  //     console.log('result: ', { fee, priceImpact })
  //   })

  //   test('swap without send coin', async () => {
  //     let tx = new TxBlock()

  //     tx.setGasBudget(10_000_000)

  //     const poolAddress = '0xd40feebfcf7935d40c9e82c9cb437442fee6b70a4be84d94764d0d89bb28ab07'
  //     const pool = await buildTestPool(sdk, poolAddress)

  //     const allCoinAsset: CoinAsset[] = await sdk.getOwnerCoinAssets(sdk.senderAddress)
  //     const byAmountIn = true
  //     const a2b = true
  //     const amount = new BN('1000000')
  //     const amountLimit = byAmountIn ? amount.muln(0.9) : amount.muln(1.1)

  //     let txBlock = tx.txBlock

  //     const sqrtPriceLimit = SwapUtils.getDefaultSqrtPriceLimit(a2b).toString()

  //     const primaryCoinInputsA: any = TransactionUtil.buildCoinInputForAmount(
  //       txBlock,
  //       allCoinAsset,
  //       BigInt(byAmountIn ? amount.toString() : amountLimit.toString()),
  //       pool.coinTypeA
  //     )?.transactionArgument

  //     const primaryCoinInputsB: any = TransactionUtil.buildCoinInputForAmount(
  //       txBlock,
  //       allCoinAsset,
  //       BigInt('1'),
  //       pool.coinTypeB
  //     )?.transactionArgument

  //     const coinsA = primaryCoinInputsA

  //     const { tx: newTx, coins } = createRouterTransaction(
  //       sdk,
  //       txBlock,
  //       pool,
  //       a2b,
  //       byAmountIn,
  //       amount.toString(),
  //       amountLimit.toString(),
  //       sqrtPriceLimit,
  //       primaryCoinInputsA as TransactionArgument,
  //       primaryCoinInputsB as TransactionArgument
  //     )

  //     tx.txBlock = newTx

  //     tx.transferObjects([coins[0], coins[1]], sdk.senderAddress)

  //     const signer = new RawSigner(sendKeypair, sdk.fullClient)
  //     const resultTxn = await sendTransaction(signer, txBlock)
  //     console.log(resultTxn)
  //   })

  //   test('test get deepbook pools', async () => {
  //     const pools = await DeepbookUtils.getPools(sdk)
  //     console.log(pools)
  //   })

  //   test('test get deepbook pool asks and bids', async () => {
  //     const coin_a = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT'
  //     const coin_b = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC'

  //     // const pool_address = '0xeb91fb7e1050fd6aa209d529a3f6bd8149a62f2f447f6abbe805a921983eb76c'
  //     const pool_address = '0x5a7604cb78bc96ebd490803cfa5254743262c17d3b5b5a954767f59e8285fa1b'

  //     const asks = await DeepbookUtils.getPoolAsks(sdk, pool_address, coin_a, coin_b)
  //     console.log(asks)

  //     const bids = await DeepbookUtils.getPoolBids(sdk, pool_address, coin_a, coin_b)
  //     console.log(bids)
  //   })

  //   test('test get uesr account cap', async () => {
  //     const accountCap = await DeepbookUtils.getAccountCap(sdk)
  //     console.log(accountCap)
  //   })

  //   test('test deposit_base', async () => {
  //     const { clmm_pool, deepbook_endpoint_v2 } = sdk.sdkOptions
  //     const tx = new TransactionBlock()
  //     tx.setGasBudget(100000000)

  //     const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)

  //     const buildCoinResult = TransactionUtil.buildCoinInputForAmount(
  //       tx,
  //       allCoinAsset,
  //       BigInt('10000000000'),
  //       '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT'
  //     )
  //     const coin_a = buildCoinResult?.transactionArgument

  //     const args: any = [
  //       tx.object('0x5a7604cb78bc96ebd490803cfa5254743262c17d3b5b5a954767f59e8285fa1b'),
  //       coin_a,
  //       tx.object('0x8f5eb21819fa1e5d4a7acb3c0d6c00f2a50108b1196d7d96317b87e8f9d4e954'),
  //       tx.pure(10000000),
  //       // tx.object(CLOCK_ADDRESS),
  //     ]
  //     const typeArguments = [
  //       '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT',
  //       '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC',
  //     ]
  //     tx.moveCall({
  //       target: `${deepbook_endpoint_v2}::endpoints_v2::deposit_base`,
  //       typeArguments,
  //       arguments: args,
  //     })

  //     const signer = new RawSigner(sendKeypair, sdk.fullClient)
  //     const transferTxn = await sendTransaction(signer, tx)
  //     console.log('only open position: ', transferTxn)
  //   })

  //   test('test deposit_quote', async () => {
  //     const { clmm_pool, deepbook_endpoint_v2 } = sdk.sdkOptions
  //     const tx = new TransactionBlock()
  //     tx.setGasBudget(100000000)

  //     const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)

  //     const buildCoinResult = TransactionUtil.buildCoinInputForAmount(
  //       tx,
  //       allCoinAsset,
  //       BigInt('10000000000'),
  //       '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC'
  //     )
  //     const coin_a = buildCoinResult?.transactionArgument

  //     const args: any = [
  //       tx.object('0x5a7604cb78bc96ebd490803cfa5254743262c17d3b5b5a954767f59e8285fa1b'),
  //       coin_a,
  //       tx.object('0x8f5eb21819fa1e5d4a7acb3c0d6c00f2a50108b1196d7d96317b87e8f9d4e954'),
  //       tx.pure(10000000),
  //       // tx.object(CLOCK_ADDRESS),
  //     ]
  //     const typeArguments = [
  //       '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT',
  //       '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC',
  //     ]
  //     tx.moveCall({
  //       target: `${deepbook_endpoint_v2}::endpoints_v2::deposit_quote`,
  //       typeArguments,
  //       arguments: args,
  //     })

  //     const signer = new RawSigner(sendKeypair, sdk.fullClient)
  //     const transferTxn = await sendTransaction(signer, tx)
  //     console.log('only open position: ', transferTxn)
  //   })

  //   test('test deposit_quote', async () => {
  //     const { deepbook_endpoint_v2 } = sdk.sdkOptions
  //     const tx = new TransactionBlock()
  //     tx.setGasBudget(100000000)

  //     const args: any = [
  //       tx.object('0x5a7604cb78bc96ebd490803cfa5254743262c17d3b5b5a954767f59e8285fa1b'),
  //       tx.pure(990000000),
  //       tx.pure(9000000000),
  //       tx.pure(false),
  //       tx.pure(1699124350),
  //       tx.pure(0),
  //       tx.object(CLOCK_ADDRESS),
  //       tx.object('0x8f5eb21819fa1e5d4a7acb3c0d6c00f2a50108b1196d7d96317b87e8f9d4e954'),
  //       // tx.pure(10000000),
  //       // tx.object(CLOCK_ADDRESS),
  //     ]
  //     const typeArguments = [
  //       '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT',
  //       '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC',
  //     ]
  //     tx.moveCall({
  //       target: `${deepbook_endpoint_v2}::endpoints_v2::place_limit_order`,
  //       typeArguments,
  //       arguments: args,
  //     })

  //     const signer = new RawSigner(sendKeypair, sdk.fullClient)
  //     const transferTxn = await sendTransaction(signer, tx)
  //     console.log('only open position: ', transferTxn)
  //   })

  //   test('create account cap', async () => {
  //     let tx = new TransactionBlock()
  //     const createAccountCapResult = DeepbookUtils.createAccountCap(sdk.senderAddress, sdk.sdkOptions, tx, false)
  //     const cap = createAccountCapResult[0] as TransactionArgument
  //     tx = createAccountCapResult[1] as TransactionBlock
  //     tx.transferObjects([cap], tx.pure(sdk.senderAddress))

  //     const signer = new RawSigner(sendKeypair, sdk.fullClient)
  //     const transferTxn = await sendTransaction(signer, tx)
  //     console.log('create account cap: ', transferTxn)
  //   })

  //   test('delete account cap', async () => {
  //     const accountCap = await DeepbookUtils.getAccountCap(sdk)
  //     console.log(`deleted account cap: ${accountCap}}`)
  //     let tx = new TransactionBlock()

  //     tx = DeepbookUtils.deleteAccountCap(accountCap, sdk.sdkOptions, tx)

  //     const signer = new RawSigner(sendKeypair, sdk.fullClient)
  //     const transferTxn = await sendTransaction(signer, tx)
  //     console.log('delete account cap: ', transferTxn)
  //   })
})

// function createRouterTransaction(
//   sdk: SDK,
//   tx: TransactionBlock,
//   pool: Pool,
//   a2b: boolean,
//   byAmountIn: boolean,
//   amount: string,
//   amountLimit: string,
//   sqrtPriceLimit: string,
//   coinsA: TransactionArgument,
//   coinsB: TransactionArgument
// ) {
//   const { cetus_config, integrate } = sdk.sdkOptions

//   const args = [
//     tx.pure(cetus_config.config?.global_config_id),
//     tx.pure(pool.poolAddress),
//     coinsA,
//     coinsB,
//     tx.pure(a2b),
//     tx.pure(byAmountIn),
//     tx.pure(amount.toString()),
//     tx.pure(amountLimit.toString()),
//     tx.pure(sqrtPriceLimit),
//     tx.pure(CLOCK_ADDRESS),
//   ]

//   const typeArguments = [pool.coinTypeA, pool.coinTypeB]
//   const coins: TransactionArgument[] = tx.moveCall({
//     target: `${integrate.published_at}::${ClmmIntegratePoolModule}::swap_without_send_coin`,
//     typeArguments,
//     arguments: args,
//   })

//   return { tx, coins }
// }

async function execTx(sdk: CetusClmmSDK, simulate: boolean, payload: TransactionBlock, signer: RawSigner) {
  if (simulate) {
    const { simulationAccount } = sdk.sdkOptions
    const simulateRes = await sdk.fullClient.devInspectTransactionBlock({
      transactionBlock: payload,
      sender: simulationAccount.address,
    })
    console.log('simulateRes', simulateRes)

    return simulateRes.effects.status.status === 'success'
  } else {
    const transferTxn = await sendTransaction(signer, payload)
    console.log('router: ', transferTxn)
    return transferTxn?.status.status === 'success'
  }
}
