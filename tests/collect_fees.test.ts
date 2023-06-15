import {
  TokensMapping,
  buildSdk, buildTestPool, position_object_id,
} from './data/init_test_data'
import { collectFeesQuote } from '../src/math/collect-fees'
import 'isomorphic-fetch';

describe('collect fees', () => {
  const sdk = buildSdk()
  test('collect fees', async () => {
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectIds[0]
    const pool = await buildTestPool(sdk, poolObjectId)

    const position = await sdk.Position.getPositionById(position_object_id)
    if(position === undefined){
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
