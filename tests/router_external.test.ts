import { TransactionArgument, Transaction } from '@mysten/sui/transactions'
import { DeepbookUtils, TransactionUtil } from '../src'
import { SdkEnv, TestnetCoin, buildSdk, buildTestAccount } from './data/init_test_data'
import { assert } from 'console'

describe('Router External Module', () => {
  const sdk = buildSdk(SdkEnv.testnet)
  const sendKeypair = buildTestAccount()
  sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()

  test('Test get deepbook pools', async () => {
    const pools = await DeepbookUtils.getPools(sdk)
    assert(pools.length > 0, 'Get deepbook pool error.')
  })

  test('Test get deepbook pool asks and bids', async () => {
    const coin_a = TestnetCoin.USDT
    const coin_b = TestnetCoin.USDC
    const pool_address = '0x5a7604cb78bc96ebd490803cfa5254743262c17d3b5b5a954767f59e8285fa1b'

    const asks = await DeepbookUtils.getPoolAsks(sdk, pool_address, coin_a, coin_b)
    assert(asks.length > 0, 'Get deepbook pool asks error.')

    const bids = await DeepbookUtils.getPoolBids(sdk, pool_address, coin_a, coin_b)
    assert(bids.length === 0, 'Get deepbook pool asks error.')
  })

  test('Test get uesr account cap', async () => {
    const accountCap = await DeepbookUtils.getAccountCap(sdk)
    assert(accountCap !== '', 'Get user account cap error.')
  })

  test('create account cap', async () => {
    let tx = new Transaction()
    const createAccountCapResult = DeepbookUtils.createAccountCap(sdk.senderAddress, sdk.sdkOptions, tx, false)
    const cap = createAccountCapResult[0] as TransactionArgument
    tx = createAccountCapResult[1] as Transaction
    if (sdk.senderAddress.length === 0) {
      throw Error('this config sdk senderAddress is empty')
    }

    tx.transferObjects([cap], sdk.senderAddress)

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
})
