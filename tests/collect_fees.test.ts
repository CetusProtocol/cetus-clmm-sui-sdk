import {
  buildSdk, buildTestPool, buildTestPosition, position_object_id, TokensMapping,
} from './data/init_test_data'
import { collectFeesQuote } from '../src/math/collect-fees'
import 'isomorphic-fetch';

describe('collect fees', () => {
  const sdk = buildSdk()

  test('collect fees', async () => {
    //const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]
    const poolObjectId = "0x426e0572eb4aca5b50a4e2667a6f3b8c49fa42d631d6ca8ba7357fe5a85c5748"
    const position_object_id = "0x0138d476edcac45d2606f6d8c4b3c3cf775ceb15e01486e8ffbd7d3c561dd32c"
    const pool = await buildTestPool(sdk, poolObjectId)

    const position = await buildTestPosition(sdk, position_object_id)

    if(position === undefined){
      return
    }

    const ticksHandle = pool.ticks_handle
    const tickLowerData = await sdk.Pool.getTickDataByIndex(ticksHandle, position.tick_lower_index)
    const tickUpperData = await sdk.Pool.getTickDataByIndex(ticksHandle, position.tick_upper_index)

    const param = {
      clmmpool: pool,
      position: position,
      tickLower: tickLowerData,
      tickUpper: tickUpperData,
    }
    // console.log('param: ', param)

    const fees = collectFeesQuote(param)

    console.log('collect fees: ', {
      feeOwedA: fees.feeOwedA.toNumber(),
      feeOwedB: fees.feeOwedB.toNumber(),
    })
  })
})
