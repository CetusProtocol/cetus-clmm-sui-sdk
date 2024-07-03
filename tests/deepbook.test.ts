import BN from 'bn.js'
import { buildSdk, buildTestAccountNew, buildTestAccount, buildTestPool, TestnetCoin } from './data/init_test_data'
import { CoinProvider, OnePath, PreRouterSwapParams, SwapWithRouterParams } from '../src/modules/routerModule'
import SDK, { CoinAsset, CoinAssist, DeepbookUtils, Pool, printTransaction, SwapUtils, TransactionUtil } from '../src'
import { ClmmFetcherModule, ClmmIntegratePoolModule, CLOCK_ADDRESS } from '../src/types/sui'
import { TransactionArgument, Transaction } from '@mysten/sui/transactions'


describe('Router Module', () => {
  const sdk = buildSdk()
  const sendKeypair = buildTestAccount()
  sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()

  test('test get deepbook pools', async () => {
    const pools = await DeepbookUtils.getPools(sdk)
    console.log(pools)
  })

  test('test get deepbook pool asks and bids', async () => {
    // const coin_a = TestnetCoin.USDT
    // const coin_b = TestnetCoin.USDC
    // const pool_address = '0x067e75d248140e3f891d24f5ce12e7cbee1140db07c399fcd6e221bfe597b706'

    // ? - usdc
    // const coin_a = '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN'
    // const coin_b = '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
    // const pool_address = '0x5deafda22b6b86127ea4299503362638bea0ca33bb212ea3a67b029356b8b955'

    // sui - usdc
    const coin_a = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
    const coin_b = '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
    const pool_address = '0x7f526b1263c4b91b43c9e646419b5696f424de28dda3c1e6658cc0a54558baa7'

    // sui - usdc
    // const coin_a = '0x2::sui::SUI'
    // const coin_b = '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
    // const pool_address = '0x18d871e3c3da99046dfc0d3de612c5d88859bc03b8f0568bd127d0e70dbc58be'

    const asks = await DeepbookUtils.getPoolAsks(sdk, pool_address, coin_a, coin_b)
    console.log(asks)

    const bids = await DeepbookUtils.getPoolBids(sdk, pool_address, coin_a, coin_b)
    console.log(bids)
  })

  test('test get all order of pools', async () => {
    const pools = await (await DeepbookUtils.getPools(sdk)).filter((p) => p.poolID === '0xeb91fb7e1050fd6aa209d529a3f6bd8149a62f2f447f6abbe805a921983eb76c')

    for (const pool of pools) {
      console.log('--------------------------------')
      console.log('pool address:', pool.poolID)
      const asks = await DeepbookUtils.getPoolAsks(sdk, pool.poolID, '0x' + pool.baseAsset, '0x' + pool.quoteAsset)
      console.log(asks)

      const bids = await DeepbookUtils.getPoolBids(sdk, pool.poolID, '0x' + pool.baseAsset, '0x' + pool.quoteAsset)
      console.log(bids)
    }
  })

  test('test get uesr account cap', async () => {
    const accountCap = await DeepbookUtils.getAccountCap(sdk)
    console.log(accountCap)
  })

  test('test deposit_base', async () => {
    const accountCap = await DeepbookUtils.getAccountCap(sdk)
    const { deepbook } = sdk.sdkOptions
    const tx = new Transaction()
    tx.setGasBudget(100000000)

    const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)

    const buildCoinResult = TransactionUtil.buildCoinForAmount(tx, allCoinAsset, BigInt('1000000000'), TestnetCoin.USDT)
    const coin_a = buildCoinResult?.targetCoin

    const args: any = [
      tx.object('0x5a7604cb78bc96ebd490803cfa5254743262c17d3b5b5a954767f59e8285fa1b'),
      coin_a,
      tx.object(accountCap),
      tx.pure.u64(900000000),
    ]
    const typeArguments = [TestnetCoin.USDT, TestnetCoin.USDC]
    tx.moveCall({
      target: `${deepbook.published_at}::endpoints_v2::deposit_base`,
      typeArguments,
      arguments: args,
    })

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, tx)
    console.log('deposit_base: ', transferTxn)
  })

  test('test deposit_quote', async () => {
    const accountCap = await DeepbookUtils.getAccountCap(sdk)
    const { deepbook } = sdk.sdkOptions
    const tx = new Transaction()
    tx.setGasBudget(100000000)

    const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)

    const buildCoinResult = TransactionUtil.buildCoinForAmount(tx, allCoinAsset, BigInt('100000000'), TestnetCoin.USDC)
    const coin_a = buildCoinResult?.targetCoin

    const args: any = [
      tx.object('0x5a7604cb78bc96ebd490803cfa5254743262c17d3b5b5a954767f59e8285fa1b'),
      coin_a,
      tx.object(accountCap),
      tx.pure.u64(100000000),
    ]
    const typeArguments = [TestnetCoin.USDT, TestnetCoin.USDC]
    tx.moveCall({
      target: `${deepbook.published_at}::endpoints_v2::deposit_quote`,
      typeArguments,
      arguments: args,
    })

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, tx)
    console.log('deposit_quote: ', transferTxn)
  })

  test('test place_limit_order', async () => {
    const accountCap = await DeepbookUtils.getAccountCap(sdk)
    const { deepbook } = sdk.sdkOptions
    const tx = new Transaction()

    const args: any = [
      tx.object('0x5a7604cb78bc96ebd490803cfa5254743262c17d3b5b5a954767f59e8285fa1b'),
      tx.pure.u64(950000000),
      tx.pure.u64(150000000),
      tx.pure.bool(false),
      tx.pure.u64(1699124350000),
      tx.pure.u64(0),
      tx.object(CLOCK_ADDRESS),
      tx.object(accountCap),
    ]
    const typeArguments = [TestnetCoin.USDT, TestnetCoin.USDC]
    tx.moveCall({
      target: `${deepbook.published_at}::endpoints_v2::place_limit_order`,
      typeArguments,
      arguments: args,
    })

    console.log(tx)

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, tx)
    console.log('place_limit_order: ', transferTxn)
    // await sleep(2000)
  })

  test('create account cap', async () => {
    let tx = new Transaction()
    const createAccountCapResult = DeepbookUtils.createAccountCap(sdk.senderAddress, sdk.sdkOptions, tx, false)
    const cap: any = createAccountCapResult[0]
    tx = createAccountCapResult[1] as Transaction

    if (sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    tx.transferObjects([cap], tx.pure.address(sdk.senderAddress))

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, tx)
    console.log('create account cap: ', transferTxn)
  })

  test('delete account cap', async () => {
    const accountCap = await DeepbookUtils.getAccountCap(sdk)
    console.log(`deleted account cap: ${accountCap}}`)
    let tx = new Transaction()

    tx = DeepbookUtils.deleteAccountCap(accountCap, sdk.sdkOptions, tx)

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, tx)
    console.log('delete account cap: ', transferTxn)
  })

  test('test simulate swap', async () => {
    const USDT = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
    const USDC = '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN'
    const pool_address = '0x7f526b1263c4b91b43c9e646419b5696f424de28dda3c1e6658cc0a54558baa7'

    const a2b = true
    const amount = 1000000000
    // const res = await DeepbookUtils.simulateSwap(sdk, pool_address, USDT, USDC, a2b, amount)
    // console.log('simulate swap result', res)

    const pools = await DeepbookUtils.getPools(sdk)
    const pool = pools.filter((p) => p.poolID === pool_address)[0]

    const calRes = await DeepbookUtils.preSwap(sdk, pool, a2b, amount)
    console.log('calculate swap result', calRes)
  })
})
