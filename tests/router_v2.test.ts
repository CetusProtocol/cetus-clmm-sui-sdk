import { RawSigner } from '@mysten/sui.js'
import { TransactionUtil, printTransaction, sendTransaction } from '../src'
import { AggregatorResult } from '../src/modules'
import { buildSdk, buildTestAccount } from './data/init_test_data'

describe('Router Module', () => {
  const sdk = buildSdk()
  const sendKeypair = buildTestAccount()
  sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()

  const USDC = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC'
  const USDT = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT'
  const ETH = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::eth::ETH'

  test('router v2 module', async () => {
    const res = await sdk.RouterV2.getBestRouter(USDC, ETH, 164192000000, true, 5, '', undefined, false, true)
    let param: any
    if (res.version === 'v2') {
      param = res.result
      printAggregatorResult(param! as AggregatorResult)
    }

    const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)

    const payload = await TransactionUtil.buildAggregatorSwapTransaction(sdk, param! as AggregatorResult, allCoinAsset, '', 5)

    const { simulationAccount } = sdk.sdkOptions
    printTransaction(payload)
    const simulateRes = await sdk.fullClient.devInspectTransactionBlock({
      transactionBlock: payload,
      sender: simulationAccount.address,
    })
    console.log('simulateRes', simulateRes)

    // const transferTxn = await sendTransaction(signer, payload)
    // console.log('router: ', transferTxn)
  })
})

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
    })
  })

  console.log(logLines.join('\n'))
}
