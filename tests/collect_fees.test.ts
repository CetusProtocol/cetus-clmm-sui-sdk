import { TokensMapping, buildSdk, buildTestPool, position_object_id } from './data/init_test_data'
import { collectFeesQuote } from '../src/math/collect-fees'
import 'isomorphic-fetch'

describe('collect fees', () => {
  const sdk = buildSdk()


  test('batchFetchPositionFees', async () => {
    const res = await sdk.Rewarder.batchFetchPositionFees(["0x2f270c02cbb5da0b047051102909534e1923ef966e674dfb6c6d8b554de8a5bc","0x630683bfa6a9bf60263de3d68eb209004b6d283eb900c96af3f0c7c8378bf5f5",
    "0xd65c3e9a25e817e73e71fbb0daed7433be64e659b01287efe4b0952b9fd737c1"])
    console.log('res####', res)
  })

  test('collect fees', async () => {
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectIds[0]
    const pool = await buildTestPool(sdk, poolObjectId)

    const position = await sdk.Position.getPositionById(position_object_id)
    if (position === undefined) {
      return
    }

    const ticksHandle = pool.ticks_handle
    const tickLowerData = await sdk.Pool.getTickDataByIndex(ticksHandle, position.tick_lower_index)
    const tickUpperData = await sdk.Pool.getTickDataByIndex(ticksHandle, position.tick_upper_index)

    console.log('tickLowerData ', {
      tickLowerData,
      feeGrowthOutsideA: tickLowerData.feeGrowthOutsideA.toString(),
    })

    console.log('tickUpperData ', {
      tickUpperData,
      feeGrowthOutsideB: tickUpperData.feeGrowthOutsideB.toString(),
    })

    const param = {
      clmmpool: pool,
      position: position,
      tickLower: tickLowerData,
      tickUpper: tickUpperData,
    }

    const fees = collectFeesQuote(param)

    console.log('collect fees: ', {
      feeOwedA: fees.feeOwedA.toNumber(),
      feeOwedB: fees.feeOwedB.toNumber(),
    })
  })
})
