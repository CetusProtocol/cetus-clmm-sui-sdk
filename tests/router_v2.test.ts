import { RawSigner, TransactionBlock } from '@mysten/sui.js'
import CetusClmmSDK, { TransactionUtil, printTransaction, sendTransaction } from '../src'
import { AggregatorResult, CoinProvider, PathProvider } from '../src/modules'
import { buildSdk, buildTestAccount } from './data/init_test_data'
import { currSdkEnv } from './data/sdk_config'
import { assert } from 'console'

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
      SUI = '0x2::sui::SUI'
      BTC = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::btc::BTC'
      CETUS = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::cetus::CETUS'
      url = 'https://api-sui.cetus.zone/v2/sui/pools_info'
    } else {
      USDC = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC'
      USDT = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT'
      ETH = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::eth::ETH'
      AFR = '0x8ed60050f9c887864991b674cfc4b435be8e20e3e5a9970f7249794bd1319963::aifrens::AIFRENS'
      SUI = '0x2::sui::SUI'
      url = 'https://api-sui.devcetus.com/v2/sui/pools_info'
    }

    const coinMap = new Map()
    const poolMap = new Map()

    const resp: any = await fetch(url, { method: 'GET' })
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
  })

  test('USDT -> USDC', async () => {
    const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)
    const res = (await sdk.RouterV2.getBestRouter(USDC, SUI, 11111111000000, true, 0.5, '', undefined, true, false))
      .result as AggregatorResult
    printAggregatorResult(res)

    const payload = await TransactionUtil.buildAggregatorSwapTransaction(sdk, res, allCoinAsset, '', 0.5)
    printTransaction(payload, true)

    // const signer = new RawSigner(sendKeypair, sdk.fullClient)
    // const succeed = await execTx(sdk, true, payload, signer)
    // assert(succeed, 'error')
  })

  test('USDT -> USDC', async () => {
    const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)
    const res = (await sdk.RouterV2.getBestRouter(USDT, USDC, 3100000, false, 0.5, '', undefined, true, false)).result as AggregatorResult
    printAggregatorResult(res)

    const payload = await TransactionUtil.buildAggregatorSwapTransaction(sdk, res, allCoinAsset, '', 0.5)
    printTransaction(payload, true)

    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const succeed = await execTx(sdk, true, payload, signer)
    assert(succeed, 'error')
  })

  test('USDC -> USDT', async () => {
    const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)
    const res = (await sdk.RouterV2.getBestRouter(USDC, USDT, 100123145, false, 0.5, '', undefined, true, false)).result as AggregatorResult
    printAggregatorResult(res)

    const payload = await TransactionUtil.buildAggregatorSwapTransaction(sdk, res, allCoinAsset, '', 5)
    printTransaction(payload, true)

    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const succeed = await execTx(sdk, false, payload, signer)
    assert(succeed, 'error')
  })

  test('USDC -> USDT', async () => {
    const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)
    const res = (await sdk.RouterV2.getBestRouter(USDC, USDT, 10231124, true, 0.5, '', undefined, true, false)).result as AggregatorResult
    printAggregatorResult(res)

    const payload = await TransactionUtil.buildAggregatorSwapTransaction(sdk, res, allCoinAsset, '', 5)
    printTransaction(payload, true)

    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const succeed = await execTx(sdk, false, payload, signer)
    assert(succeed, 'error')
  })
})

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

export function printAggregatorResult(result: AggregatorResult) {
  const logLines: string[] = [
    `inputAmount: ${result.inputAmount}`,
    `outputAmount: ${result.outputAmount}`,
    `fromCoin: ${result.fromCoin}`,
    `toCoin: ${result.toCoin}`,
    `isExceed: ${result.isExceed ? 'true' : 'false'}`,
    `isTimeout: ${result.isTimeout ? 'true' : 'false'}`,
    `byAmountIn: ${result.byAmountIn ? 'true' : 'false'}`,
  ]

  result.splitPaths.forEach((splitPath, index) => {
    logLines.push(`splitPaths ${index + 1}:`)
    logLines.push(`  pathIndex ${splitPath.pathIndex}:`)
    logLines.push(`  lastQuoteOutput: ${splitPath.lastQuoteOutput}`)
    logLines.push(`  percent: ${splitPath.percent}`)
    logLines.push(`  inputAmount: ${splitPath.inputAmount}`)
    logLines.push(`  outputAmount: ${splitPath.outputAmount}`)

    splitPath.basePaths.forEach((basePath, basePathIndex) => {
      logLines.push(`  basePaths ${basePathIndex + 1}:`)
      logLines.push(`    direction: ${basePath.direction ? 'true' : 'false'}`)
      logLines.push(`    label: ${basePath.label}`)
      logLines.push(`    poolAddress: ${basePath.poolAddress}`)
      logLines.push(`    fromCoin: ${basePath.fromCoin}`)
      logLines.push(`    toCoin: ${basePath.toCoin}`)
      logLines.push(`    outputAmount: ${basePath.outputAmount}`)
      logLines.push(`    inputAmount: ${basePath.inputAmount}`)
      logLines.push(`    fee_rate: ${basePath.feeRate.toString()}`)
      logLines.push(`    current_sqrt_price: ${basePath.currentSqrtPrice}`)
      logLines.push(`    from_decimal: ${basePath.fromDecimal}`)
      logLines.push(`    to_decimal: ${basePath.toDecimal}`)
      logLines.push(`    currentPrice: ${basePath.currentPrice}`)
    })
  })

  console.log(logLines.join('\n'))
}
