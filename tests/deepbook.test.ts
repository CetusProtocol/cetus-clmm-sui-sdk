import BN from 'bn.js'
import { buildSdk, buildTestAccountNew, buildTestAccount, buildTestPool, TokensMapping } from './data/init_test_data'
import { CoinProvider, OnePath, PreRouterSwapParams, SwapWithRouterParams } from '../src/modules/routerModule'
import SDK, { CoinAsset, CoinAssist, DeepbookUtils, Pool, printTransaction, sendTransaction, SwapUtils, TransactionUtil } from '../src'
import { Ed25519Keypair, FaucetCoinInfo, RawSigner, TransactionArgument, TransactionBlock } from '@mysten/sui.js'
import { ClmmFetcherModule, ClmmIntegratePoolModule, CLOCK_ADDRESS } from '../src/types/sui'

describe('Router Module', () => {
  const sdk = buildSdk()
  const sendKeypair = buildTestAccountNew()
  sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()

  test('test get deepbook pools', async () => {
    const pools = await DeepbookUtils.getPools(sdk)
    console.log(pools)
  })

  test('test get deepbook pool asks and bids', async () => {
    const coin_a = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT'
    const coin_b = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC'
    const pool_address = '0x5a7604cb78bc96ebd490803cfa5254743262c17d3b5b5a954767f59e8285fa1b'

    // ? - usdc
    // const coin_a = '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN'
    // const coin_b = '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
    // const pool_address = '0x5deafda22b6b86127ea4299503362638bea0ca33bb212ea3a67b029356b8b955'

    // sui - usdc
    // const coin_a = '0x2::sui::SUI'
    // const coin_b = '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
    // const pool_address = '0x7f526b1263c4b91b43c9e646419b5696f424de28dda3c1e6658cc0a54558baa7'

    // sui - usdc
    // const coin_a = '0x2::sui::SUI'
    // const coin_b = '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
    // const pool_address = '0x18d871e3c3da99046dfc0d3de612c5d88859bc03b8f0568bd127d0e70dbc58be'

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
    const accountCap = await DeepbookUtils.getAccountCap(sdk)
    const { deepbook } = sdk.sdkOptions
    const tx = new TransactionBlock()
    tx.setGasBudget(100000000)

    const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)

    const buildCoinResult = TransactionUtil.buildCoinInputForAmount(
      tx,
      allCoinAsset,
      BigInt('1000000000'),
      '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT'
    )
    const coin_a = buildCoinResult?.transactionArgument

    const args: any = [
      tx.object('0x5a7604cb78bc96ebd490803cfa5254743262c17d3b5b5a954767f59e8285fa1b'),
      coin_a,
      tx.object(accountCap),
      tx.pure(900000000),
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
    console.log('deposit_base: ', transferTxn)
  })

  test('test deposit_quote', async () => {
    const accountCap = await DeepbookUtils.getAccountCap(sdk)
    const { deepbook } = sdk.sdkOptions
    const tx = new TransactionBlock()
    tx.setGasBudget(100000000)

    const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)

    const buildCoinResult = TransactionUtil.buildCoinInputForAmount(
      tx,
      allCoinAsset,
      BigInt('100000000'),
      '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC'
    )
    const coin_a = buildCoinResult?.transactionArgument

    const args: any = [
      tx.object('0x5a7604cb78bc96ebd490803cfa5254743262c17d3b5b5a954767f59e8285fa1b'),
      coin_a,
      tx.object(accountCap),
      tx.pure(100000000),
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
    console.log('deposit_quote: ', transferTxn)
  })

  test('test place_limit_order', async () => {
    const accountCap = await DeepbookUtils.getAccountCap(sdk)
    const { deepbook } = sdk.sdkOptions
    const tx = new TransactionBlock()

    const args: any = [
      tx.object('0x5a7604cb78bc96ebd490803cfa5254743262c17d3b5b5a954767f59e8285fa1b'),
      tx.pure(950000000),
      tx.pure(150000000),
      tx.pure(false),
      tx.pure(1699124350000),
      tx.pure(0),
      tx.object(CLOCK_ADDRESS),
      tx.object(accountCap),
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

    console.log(tx)

    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const transferTxn = await sendTransaction(signer, tx)
    console.log('place_limit_order: ', transferTxn)
    // await sleep(2000)
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

  test('test simulate swap', async () => {
    const USDT = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT'
    const USDC = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC'
    const pool_address = '0x5a7604cb78bc96ebd490803cfa5254743262c17d3b5b5a954767f59e8285fa1b'

    const a2b = false
    const amount = 99980356
    const res = await DeepbookUtils.simulateSwap(sdk, pool_address, USDT, USDC, a2b, amount)
    console.log('simulate swap result', res)

    const pools = await DeepbookUtils.getPools(sdk)
    const pool = pools.filter((p) => p.poolID === pool_address)[0]

    const calRes = await DeepbookUtils.preSwap(sdk, pool, a2b, amount)
    console.log('calculate swap result', calRes)
  })
})
