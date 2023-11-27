import BN from 'bn.js'
import { SdkEnv, TestnetCoin, buildSdk, buildTestAccountNew as buildTestAccount } from './data/init_test_data'
import { CoinProvider, SwapWithRouterParams } from '../src/modules/routerModule'
import { CetusClmmSDK, CoinAsset, CoinAssist, TransactionUtil } from '../src'
import { PathProvider } from '../src/modules/routerModule'
import { execTx } from './router_v2.test'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { assert } from 'console'

describe('Test Router V1 Module', () => {
  const sdk = buildSdk(SdkEnv.testnet)
  const sendKeypair = buildTestAccount()
  sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()

  const coinList = Object.values(TestnetCoin)
  const amountList = [10, 1000000, 1000000000000, 1000000000000000]
  const fixInputOrOutput = [true, false]
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

  test('Test all states about router condition', async () => {
    for (let i = 0; i < coinList.length; i++) {
      for (let j = 0; j < coinList.length; j++) {
        if (j === i) {
          continue
        }

        console.log(`Swap from ${coinList[i]} to ${coinList[j]}`)
        for (const amount of amountList) {
          for (const byAmountIn of fixInputOrOutput) {
            const result = await sdk.Router.price(coinList[i], coinList[j], new BN(amount), byAmountIn, 0, '')
            console.log(`Fix ${amount} as ${byAmountIn ? 'input' : 'output'} amount`)
            if (!result?.isExceed && verifyBalanceEnough(allCoinAsset, coinList[i], amount.toString())) {
              const params: SwapWithRouterParams = {
                paths: result?.paths!,
                partner: '',
                priceSlippagePoint: 0.01,
              }

              const payload = await TransactionUtil.buildRouterSwapTransaction(sdk, params, byAmountIn, allCoinAsset)
              const simulateRes = await execTxReturnRes(sdk, payload)
              if (result?.amountOut.eqn(0)) {
                assert(simulateRes.effects.status.status === "failure", "Amount out equals 0 should failed.")
                console.log("Router swap when amount out equals 0 test passed.")
              } else {
                assert(simulateRes.effects.status.status === "success", "Common router swap test failed.")
                console.log("Common rotuer swap test passed.")
              }
            } else {
              console.log(`${result?.isExceed ? 'result exceed' : !verifyBalanceEnough(allCoinAsset, coinList[i], amount.toString()) ? 'balance insufficient' : 'unknown error'}`)
            }
          }
        }
      }
    }
  })

  test('Test specific swap', async () => {
    const allCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)
    const byAmountIn = true
    const amount = new BN('10')

    const result = await sdk.Router.price(TestnetCoin.CETUS, TestnetCoin.SUI, amount, byAmountIn, 0, '')
    console.log(result, null, 2)

    if (!result?.isExceed && verifyBalanceEnough(allCoinAsset, TestnetCoin.CETUS, amount.toString())) {
      const params: SwapWithRouterParams = {
        paths: result?.paths!,
        partner: '',
        priceSlippagePoint: 0.01,
      }

      const payload = await TransactionUtil.buildRouterSwapTransaction(sdk, params, byAmountIn, allCoinAsset)

      const simulateRes = await execTx(sdk, true, payload, sendKeypair)
      console.log('simulateRes', simulateRes)
    }
  })

  test('Test input max balance of one coin', async () => {
    const byAmountIn = true
    for (let i = 0; i < coinList.length; i++) {
      for (let j = 0; j < coinList.length; j++) {
        if (i === j) {
          continue
        }
        console.log(`Swap from ${coinList[i]} to ${coinList[j]}`)
        const amount = CoinAssist.totalBalance(allCoinAsset, coinList[i]).toString()
        const result = await sdk.Router.price(coinList[i], coinList[j], new BN(amount), byAmountIn, 0, '')
        console.log(`Fix ${amount} as ${byAmountIn ? 'input' : 'output'} amount`)
        if (!result?.isExceed && verifyBalanceEnough(allCoinAsset, coinList[i], amount.toString())) {
          const params: SwapWithRouterParams = {
            paths: result?.paths!,
            partner: '',
            priceSlippagePoint: 0.01,
          }

          const payload = await TransactionUtil.buildRouterSwapTransaction(sdk, params, byAmountIn, allCoinAsset)
          const simulateRes = await execTxReturnRes(sdk, payload)
          if (result?.amountOut.eqn(0)) {
            assert(simulateRes.effects.status.status === "failure", "Amount out equals 0 should failed.")
            console.log("Router swap when amount out equals 0 test passed.")
          } else {
            assert(simulateRes.effects.status.status === "success", "Common router swap test failed.")
            console.log("Common rotuer swap test passed.")
          }
        } else {
          console.log(`${result?.isExceed ? 'Swap exceed' : !verifyBalanceEnough(allCoinAsset, coinList[i], amount.toString()) ? 'Insufficient balance' : 'unknown error'}`)
        }
      }
    }
  })

  test('Test fix min decimal amount as output', async () => {
    const byAmountIn = false
    const amount = 1
    for (let i = 0; i < coinList.length; i++) {
      for (let j = 0; j < coinList.length; j++) {
        if (i === j) {
          continue
        }
        console.log(`Swap from ${coinList[i]} to ${coinList[j]}`)
        const result = await sdk.Router.price(coinList[i], coinList[j], new BN(amount), byAmountIn, 0, '')
        console.log(`Fix ${amount} as ${byAmountIn ? 'input' : 'output'} amount`)
        if (!result?.isExceed && verifyBalanceEnough(allCoinAsset, coinList[i], amount.toString())) {
          const params: SwapWithRouterParams = {
            paths: result?.paths!,
            partner: '',
            priceSlippagePoint: 0.01,
          }

          const payload = await TransactionUtil.buildRouterSwapTransaction(sdk, params, byAmountIn, allCoinAsset)
          const simulateRes = await execTxReturnRes(sdk, payload)
          if (result?.amountOut.eqn(0)) {
            assert(simulateRes.effects.status.status === "failure", "Amount out equals 0 should failed.")
            console.log("Router swap when amount out equals 0 test passed.")
          } else {
            assert(simulateRes.effects.status.status === "success", "Common router swap test failed.")
            console.log("Common rotuer swap test passed.")
          }
        } else {
          console.log(`${result?.isExceed ? 'Swap exceed' : !verifyBalanceEnough(allCoinAsset, coinList[i], amount.toString()) ? 'Insufficient balance' : 'unknown error'}`)
        }
      }
    }
  })

  test('Test not create new coin after swap', async () => {
    const amount = 1000000
    const byAmountIn = true
    const result = await sdk.Router.price(TestnetCoin.USDT, TestnetCoin.USDC, new BN(amount), byAmountIn, 0, '')

    const fromCoinNumsBeforeSwap = CoinAssist.getCoinAssets(TestnetCoin.USDT, allCoinAsset).length
    const toCoinNumsBeforeSwap = CoinAssist.getCoinAssets(TestnetCoin.USDC, allCoinAsset).length

    if (!result?.isExceed && verifyBalanceEnough(allCoinAsset, TestnetCoin.USDT, amount.toString())) {
      const params: SwapWithRouterParams = {
        paths: result?.paths!,
        partner: '',
        priceSlippagePoint: 0.01,
      }
      const payload = await TransactionUtil.buildRouterSwapTransaction(sdk, params, byAmountIn, allCoinAsset)
      const execRes = await execTx(sdk, false, payload, sendKeypair)
      assert(execRes.effects?.status.status! === 'success', "Swap failed");

      const newCoinAsset = await sdk.getOwnerCoinAssets(sdk.senderAddress)
      const fromCoinNumsAfterSwap = CoinAssist.getCoinAssets(TestnetCoin.USDT, newCoinAsset).length
      const toCoinNumsAfterSwap = CoinAssist.getCoinAssets(TestnetCoin.USDC, newCoinAsset).length

      assert(fromCoinNumsAfterSwap <= fromCoinNumsBeforeSwap, "From coin create new coin. 555")
      console.log(`from coin nums before swap: ${fromCoinNumsBeforeSwap}, after swap: ${fromCoinNumsAfterSwap}`)
      if (toCoinNumsBeforeSwap === 0) {
        assert(toCoinNumsAfterSwap === 1, "")
      } else {
        assert(toCoinNumsAfterSwap <= toCoinNumsBeforeSwap, "To coin create new coin. 555")
      }
      console.log(`to coin nums before swap: ${toCoinNumsBeforeSwap}, after swap: ${toCoinNumsAfterSwap}`)
    }
  })

  test('Test router swap with partner', async () => {
    const amount = 1000000
    const byAmountIn = true
    const partner = '0x5349919fa007fe7153f7e0957994de730cafc7038e0441f9991977fc598153cd'
    const result = await sdk.Router.price(TestnetCoin.USDC, TestnetCoin.USDT, new BN(amount), byAmountIn, 0, partner)
    if (!result?.isExceed && verifyBalanceEnough(allCoinAsset, TestnetCoin.USDC, amount.toString())) {
      const params: SwapWithRouterParams = {
        paths: result?.paths!,
        partner: '',
        priceSlippagePoint: 0.01,
      }

      const payload = await TransactionUtil.buildRouterSwapTransaction(sdk, params, byAmountIn, allCoinAsset)
      const simulateRes = await execTxReturnRes(sdk, payload)
      if (result?.amountOut.eqn(0)) {
        assert(simulateRes.effects.status.status === "failure", "Amount out equals 0 should failed.")
        console.log("Router swap when amount out equals 0 test passed.")
      } else {
        assert(simulateRes.effects.status.status === "success", "Common router swap test failed.")
        console.log("Common rotuer swap test passed.")
      }
    } else {
      console.log(`${result?.isExceed ? 'Swap exceed' : !verifyBalanceEnough(allCoinAsset, TestnetCoin.USDC, amount.toString()) ? 'Insufficient balance' : 'unknown error'}`)
    }
  })
})

export function verifyBalanceEnough(allCoins: CoinAsset[], coinType: string, amount: string): boolean {
  const coinAssets: CoinAsset[] = CoinAssist.getCoinAssets(coinType, allCoins)
  const amountTotal = CoinAssist.calculateTotalBalance(coinAssets)
  return amountTotal >= BigInt(amount)
}

export async function execTxReturnRes(sdk: CetusClmmSDK, payload: TransactionBlock) {
  const { simulationAccount } = sdk.sdkOptions
  const simulateRes = await sdk.fullClient.devInspectTransactionBlock({
    transactionBlock: payload,
    sender: simulationAccount.address,
  })

  return simulateRes
}