import BN from 'bn.js'
import { estPositionAPRWithDeltaMethod, estPositionAPRWithMultiMethod } from '../src/math/apr'

describe('APR function test', () => {
  test('test estPositionAPRWithDeltaMethod', async () => {
    const currentTickIndex = -1
    const lowerTickIndex = -443636
    const upperTickIndex = 443636
    const currentSqrtPriceX64 = new BN('18446460903430917184')
    const poolLiquidity = new BN('560867872160365128')
    const decimalsA = 6
    const decimalsB = 6
    const decimalsRewarder0 = 6
    const decimalsRewarder1 = 6
    const decimalsRewarder2 = 6
    const feeRate = 100
    const amountA_str = '1000.000034'
    const amountB_str = '999.969333'
    const poolAmountA = new BN(120754054325992)
    const poolAmountB = new BN(1000205276004441)
    const swapVolume_str = '7588147.89'
    const poolRewarders0_str = '30000000'
    const poolRewarders1_str = '52000000'
    const poolRewarders2_str = '35000000'
    const coinAPrice_str = '0.949513'
    const coinBPrice_str = '1.001'
    const rewarder0Price_str = '13.252911'
    const rewarder1Price_str = '0.949513'
    const rewarder2Price_str = '1.001'

    const res = estPositionAPRWithDeltaMethod(
      currentTickIndex,
      lowerTickIndex,
      upperTickIndex,
      currentSqrtPriceX64,
      poolLiquidity,
      decimalsA,
      decimalsB,
      decimalsRewarder0,
      decimalsRewarder1,
      decimalsRewarder2,
      feeRate,
      amountA_str,
      amountB_str,
      poolAmountA,
      poolAmountB,
      swapVolume_str,
      poolRewarders0_str,
      poolRewarders1_str,
      poolRewarders2_str,
      coinAPrice_str,
      coinBPrice_str,
      rewarder0Price_str,
      rewarder1Price_str,
      rewarder2Price_str
    )

    console.log('res: ', res)

  })

  test('test estPositionAPRWithDeltaMethod', async () => {
    const lowerUserPrice = 0.85
    const upperUserPrice = 0.99
    const lowerHistPrice = 0.06
    const upperHistPrice = 1

    const res = estPositionAPRWithMultiMethod(lowerUserPrice, upperUserPrice, lowerHistPrice, upperHistPrice)

    console.log('res: ', res)
  })
})
