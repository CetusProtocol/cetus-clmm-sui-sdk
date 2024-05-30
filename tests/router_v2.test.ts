import CetusClmmSDK, { CoinAsset, CoinAssist, TransactionUtil } from '../src'
import { AggregatorResult, CoinProvider, PathProvider } from '../src/modules'
import { SdkEnv, TestnetCoin, buildSdk, buildTestAccount } from './data/init_test_data'
import { assert } from 'console'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1'
import { Transaction } from '@mysten/sui/transactions'
import { verifyBalanceEnough } from './router_v1.test'

describe('Test Router V2 Module', () => {
  const sdk = buildSdk(SdkEnv.testnet)
  const sendKeypair = buildTestAccount()
  sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()

  const coinList = Object.values(TestnetCoin)
  let allCoinAsset: CoinAsset[] = []

  beforeAll(async () => {
    // load router graph
    const coinMap = new Map()
    const poolMap = new Map()

    const resp: any = await fetch(sdk.sdkOptions.swapCountUrl!, { method: 'GET' })
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

    // prepare all coin asset
    allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)
  })

  test('Test detection router path', async () => {
    const byAmountIn = true
    for (let i = 0; i < coinList.length; i++) {
      for (let j = 0; j < coinList.length; j++) {
        if (j === i) {
          continue
        }
        console.log(`Swap from ${coinList[i]} to ${coinList[j]}`)
        const amount = 10000000
        for (const orderSplit of [true, false]) {
          for (const externalRouter of [true, false]) {
            const result = (
              await sdk.RouterV2.getBestRouter(
                coinList[i],
                coinList[j],
                amount,
                byAmountIn,
                0,
                '',
                undefined,
                undefined,
                orderSplit,
                externalRouter
              )
            ).result
            assert(result.outputAmount > 0, 'detection all router path success')
          }
        }
      }
    }
  })

  test('Test split path will batter than one path', async () => {
    let split = false
    const byAmountIn = true
    for (let i = 0; i < coinList.length; i++) {
      for (let j = 0; j < coinList.length; j++) {
        if (j === i) {
          continue
        }
        console.log(`Swap from ${coinList[i]} to ${coinList[j]}`)
        const amount = 10000000
        const externalRouter = false

        const splitResult = await (
          await sdk.RouterV2.getBestRouter(coinList[i], coinList[j], amount, byAmountIn, 0, '', undefined, undefined, true, externalRouter)
        ).result
        const noSplitResult = await (
          await sdk.RouterV2.getBestRouter(coinList[i], coinList[j], amount, byAmountIn, 0, '', undefined, undefined, false, externalRouter)
        ).result

        console.log(`Split path: ${JSON.stringify(splitResult, null, 2)}, One path: ${JSON.stringify(noSplitResult, null, 2)}`)

        if (splitResult.splitPaths.length > 1) {
          split = true
          assert(splitResult.outputAmount > noSplitResult.outputAmount, 'split path will the same as one path')
        } else {
          assert(splitResult.outputAmount === noSplitResult.outputAmount, 'split path will batter than one path')
        }
      }
    }
    assert(split === true, 'There is splited router result')
  })

  test('Test all swap condition in router server, byAmountIn = true', async () => {
    const byAmountIn = true
    for (let i = 0; i < coinList.length; i++) {
      for (let j = 0; j < coinList.length; j++) {
        if (j === i) {
          continue
        }
        console.log(`Swap from ${coinList[i]} to ${coinList[j]}`)
        const coinIBalance = Number(CoinAssist.totalBalance(allCoinAsset, coinList[i]).toString())
        const amountList = [0, 1, Math.floor(coinIBalance / 2), coinIBalance, coinIBalance + 1]
        for (let a = 0; a < amountList.length; a++) {
          const amount = amountList[a]
          for (const orderSplit of [true, false]) {
            for (const externalRouter of [true, false]) {
              const result = await (
                await sdk.RouterV2.getBestRouter(
                  coinList[i],
                  coinList[j],
                  amount,
                  byAmountIn,
                  0,
                  '',
                  undefined,
                  undefined,
                  orderSplit,
                  externalRouter
                )
              ).result
              console.log(
                `Fix ${amount} as input amount,output: ${result.outputAmount} orderSplit: ${orderSplit}, externalRouter: ${externalRouter}`
              )

              if ((a === 3 && coinList[i] === TestnetCoin.SUI) || a === 4) {
                assert(!verifyBalanceEnough(allCoinAsset, coinList[i], amount.toString()), 'Use total balance of sui test failed.')
                continue
              }

              if (a === 0) {
                assert(result.outputAmount === 0, 'Input amount equals 0 test failed.')
                continue
              }

              if (!result?.isExceed && verifyBalanceEnough(allCoinAsset, coinList[i], amount.toString())) {
                const payload = await TransactionUtil.buildAggregatorSwapTransaction(sdk, result, allCoinAsset, '', 0)
                const simulateRes = await execTx(sdk, true, payload, sendKeypair)!
                if (result?.outputAmount === 0) {
                  console.log('Router swap when amount out equals 0 test passed.')
                  assert(simulateRes.effects!.status.status === 'failure', 'Amount out equals 0 should failed.')
                } else {
                  console.log('Common rotuer swap test passed.')
                  assert(simulateRes.effects!.status.status === 'success', 'Common router swap test failed.')
                }
              } else {
                console.log(`result exceed`)
                assert(result.isExceed, 'Result should be exceed.')
              }
            }
          }
        }
      }
    }
  })

  test('Test all swap condition in router server, byAmountIn = false', async () => {
    const byAmountIn = false
    for (let i = 4; i < coinList.length; i++) {
      for (let j = 0; j < coinList.length; j++) {
        if (j === i) {
          continue
        }
        console.log(`Swap from ${coinList[i]} to ${coinList[j]}`)
        const amountList = [0, 1, 1000000, 1000000000000, 10000000000000000]
        for (let a = 0; a < amountList.length; a++) {
          const amount = amountList[a]
          for (const orderSplit of [true, false]) {
            for (const externalRouter of [true, false]) {
              const result = await (
                await sdk.RouterV2.getBestRouter(
                  coinList[i],
                  coinList[j],
                  amount,
                  byAmountIn,
                  0,
                  '',
                  undefined,
                  undefined,
                  orderSplit,
                  externalRouter
                )
              ).result
              console.log(`Fix ${amount} as output amount, orderSplit: ${orderSplit}, externalRouter: ${externalRouter}`)

              if (a === 0) {
                assert(result.inputAmount === 0, 'Output amount equals 0 test failed.')
                continue
              }

              if (!result?.isExceed && verifyBalanceEnough(allCoinAsset, coinList[i], result.inputAmount.toString())) {
                const payload = await TransactionUtil.buildAggregatorSwapTransaction(sdk, result, allCoinAsset, '', 0)
                const simulateRes = await execTx(sdk, true, payload, sendKeypair)!
                assert(simulateRes.effects!.status.status === 'success', 'Common router swap test failed.')
                console.log('Common rotuer swap test passed.')
              } else {
                console.log(
                  `${
                    result?.isExceed
                      ? 'result exceed'
                      : !verifyBalanceEnough(allCoinAsset, coinList[i], result.inputAmount.toString())
                      ? 'balance insufficient'
                      : 'unknown error'
                  }`
                )
              }
            }
          }
        }
      }
    }
  })

  test('Test specific router swap', async () => {
    const coin_a = TestnetCoin.SUI
    const coin_b = TestnetCoin.HASUI
    const amount = 8143301107
    const byAmountIn = true
    const slippage = 0

    const { result, version } = await await sdk.RouterV2.getBestRouter(
      coin_a,
      coin_b,
      amount,
      byAmountIn,
      slippage,
      '',
      undefined,
      undefined,
      false,
      true
    )
    console.log(result, version)
    if (!result?.isExceed && verifyBalanceEnough(allCoinAsset, coin_a, result.inputAmount.toString())) {
      const payload = await TransactionUtil.buildAggregatorSwapTransaction(sdk, result, allCoinAsset, '', 0.01)
      const simulateRes = await execTx(sdk, false, payload, sendKeypair)!
      if (result?.outputAmount === 0) {
        assert(simulateRes.effects!.status.status === 'failure', 'Amount out equals 0 should failed.')
        console.log('Router swap when amount out equals 0 test passed.')
      } else {
        assert(simulateRes.effects!.status.status === 'success', 'Common router swap test failed.')
        console.log('Common rotuer swap test passed.')
      }
    } else {
      console.log(
        `${
          result?.isExceed
            ? 'result exceed'
            : !verifyBalanceEnough(allCoinAsset, coin_a, result.inputAmount.toString())
            ? 'balance insufficient'
            : 'unknown error'
        }`
      )
    }
  })

  test('Test lp change for specific router swap', async () => {
    const coin_a = TestnetCoin.SUI
    const coin_b = TestnetCoin.HASUI
    const amount = 150000000
    const byAmountIn = true
    const slippage = 0.001

    const result = await (
      await sdk.RouterV2.getBestRouter(coin_a, coin_b, amount, byAmountIn, slippage, '', undefined, undefined, false, true, [
        {
          pool_id: '0x473ab0306ff8952d473b10bb4c3516c632edeb0725f6bb3cda6c474d0ffc883f',
          tick_lower: -2,
          tick_upper: 1824,
          delta_liquidity: 2536563403949,
          is_increase: false,
        },
      ])
    ).result
    console.log('结果： ', result)

    if (!result?.isExceed && verifyBalanceEnough(allCoinAsset, coin_a, result.inputAmount.toString())) {
      const payload = await TransactionUtil.buildAggregatorSwapTransaction(sdk, result, allCoinAsset, '', 0.01)
      const simulateRes = await execTx(sdk, true, payload, sendKeypair)!
      if (result?.outputAmount === 0) {
        assert(simulateRes.effects!.status.status === 'failure', 'Amount out equals 0 should failed.')
        console.log('Router swap when amount out equals 0 test passed.')
      } else {
        assert(simulateRes.effects!.status.status === 'success', 'Common router swap test failed.')
        console.log('Common rotuer swap test passed.')
      }
    } else {
      console.log(
        `${
          result?.isExceed
            ? 'result exceed'
            : !verifyBalanceEnough(allCoinAsset, coin_a, result.inputAmount.toString())
            ? 'balance insufficient'
            : 'unknown error'
        }`
      )
    }
  })

  test('Test router swap with partner', async () => {
    const coin_a = TestnetCoin.CETUS
    const coin_b = TestnetCoin.USDC
    const amount = 1000000000000
    const byAmountIn = true
    const slippage = 0.1
    const partner = '0x5349919fa007fe7153f7e0957994de730cafc7038e0441f9991977fc598153cd'

    const result = await (await sdk.RouterV2.getBestRouter(coin_a, coin_b, amount, byAmountIn, slippage, '', '', undefined)).result
    if (!result?.isExceed && verifyBalanceEnough(allCoinAsset, coin_a, amount.toString())) {
      const payload = await TransactionUtil.buildAggregatorSwapTransaction(sdk, result, allCoinAsset, partner, 0)
      const simulateRes = await execTx(sdk, true, payload, sendKeypair)!
      if (result?.outputAmount === 0) {
        assert(simulateRes.effects!.status.status === 'failure', 'Amount out equals 0 should failed.')
        console.log('Router swap when amount out equals 0 test passed.')
      } else {
        assert(simulateRes.effects!.status.status === 'success', 'Common router swap test failed.')
        console.log('Common rotuer swap test passed.')
      }
    } else {
      console.log(
        `${
          result?.isExceed
            ? 'result exceed'
            : !verifyBalanceEnough(allCoinAsset, coin_a, amount.toString())
            ? 'balance insufficient'
            : 'unknown error'
        }`
      )
    }
  })

  test('Test not create new coin after swap', async () => {
    const coin_a = TestnetCoin.USDT
    const coin_b = TestnetCoin.USDC
    const amount = 1000000
    const byAmountIn = true
    const slippage = 0.1
    const partner = '0x5349919fa007fe7153f7e0957994de730cafc7038e0441f9991977fc598153cd'

    const result = await (await sdk.RouterV2.getBestRouter(coin_a, coin_b, amount, byAmountIn, slippage, partner, '', undefined)).result

    const fromCoinNumsBeforeSwap = CoinAssist.getCoinAssets(coin_a, allCoinAsset).length
    const toCoinNumsBeforeSwap = CoinAssist.getCoinAssets(coin_b, allCoinAsset).length

    if (!result?.isExceed && verifyBalanceEnough(allCoinAsset, coin_a, amount.toString())) {
      const payload = await TransactionUtil.buildAggregatorSwapTransaction(sdk, result, allCoinAsset, partner, 0)
      const execRes = await execTx(sdk, false, payload, sendKeypair)!
      assert(execRes.effects?.status.status! === 'success', 'Swap failed')

      const newCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)
      const fromCoinNumsAfterSwap = CoinAssist.getCoinAssets(TestnetCoin.USDT, newCoinAsset).length
      const toCoinNumsAfterSwap = CoinAssist.getCoinAssets(TestnetCoin.USDC, newCoinAsset).length

      assert(fromCoinNumsAfterSwap <= fromCoinNumsBeforeSwap, 'From coin create new coin. 555')
      console.log(`from coin nums before swap: ${fromCoinNumsBeforeSwap}, after swap: ${fromCoinNumsAfterSwap}`)
      if (toCoinNumsBeforeSwap === 0) {
        assert(toCoinNumsAfterSwap === 1, '')
      } else {
        assert(toCoinNumsAfterSwap >= toCoinNumsBeforeSwap, 'To coin create new coin. 555')
      }
      console.log(`to coin nums before swap: ${toCoinNumsBeforeSwap}, after swap: ${toCoinNumsAfterSwap}`)
    }
  })

  test('Test router swap downgraded', async () => {
    sdk.sdkOptions.aggregatorUrl = ''
    const coin_a = TestnetCoin.CETUS
    const coin_b = TestnetCoin.USDC
    const amount = 1000000000000
    const byAmountIn = true
    const slippage = 0.1
    const partner = '0x5349919fa007fe7153f7e0957994de730cafc7038e0441f9991977fc598153cd'

    const result = await (await sdk.RouterV2.getBestRouter(coin_a, coin_b, amount, byAmountIn, slippage, '', '', undefined)).result
    if (!result?.isExceed && verifyBalanceEnough(allCoinAsset, coin_a, amount.toString())) {
      const payload = await TransactionUtil.buildAggregatorSwapTransaction(sdk, result, allCoinAsset, partner, 0)
      const simulateRes = await execTx(sdk, true, payload, sendKeypair)!
      if (result?.outputAmount === 0) {
        assert(simulateRes.effects!.status.status === 'failure', 'Amount out equals 0 should failed.')
        console.log('Router swap when amount out equals 0 test passed.')
      } else {
        assert(simulateRes.effects!.status.status === 'success', 'Common router swap test failed.')
        console.log('Common rotuer swap test passed.')
      }
    } else {
      console.log(
        `${
          result?.isExceed
            ? 'result exceed'
            : !verifyBalanceEnough(allCoinAsset, coin_a, amount.toString())
            ? 'balance insufficient'
            : 'unknown error'
        }`
      )
    }
  })

  test('Transfer zero coin', async () => {
    const coinType = TestnetCoin.HASUI
    const tx = new Transaction()

    const coin = tx.object('0x721729c8cb713aadce7f4f4f4ece2f72a1574f75e0e809a064ede10f55f7cee4')
    const payload = await TransactionUtil.buildTransferCoin(sdk, tx, coin, coinType)
    const simulateRes = await execTx(sdk, false, tx, sendKeypair)!
  })
})

export async function execTx(sdk: CetusClmmSDK, simulate: boolean, payload: Transaction, sendKeypair: Ed25519Keypair | Secp256k1Keypair) {
  if (simulate) {
    const { simulationAccount } = sdk.sdkOptions
    const simulateRes = await sdk.fullClient.devInspectTransactionBlock({
      transactionBlock: payload,
      sender: simulationAccount.address,
    })
    console.log('simulateRes', simulateRes)

    return simulateRes
  } else {
    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, payload)
    console.log('router: ', transferTxn)
    return transferTxn!
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
