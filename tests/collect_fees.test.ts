import {
  buildSdk, buildTestPool, buildTestPosition,
} from './data/init_test_data'
import { collectFeesQuote } from '../src/math/collect-fees'
import 'isomorphic-fetch';

describe('collect fees', () => {
  const sdk = buildSdk()

  test('collect fees', async () => {
    //const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]
    const poolObjectId = "0x74dcb8625ddd023e2ef7faf1ae299e3bc4cb4c337d991a5326751034676acdae"
    const position_object_id = "0x80e60175d20b9fecbd2cf10cc2fc7f43dc3f8ed67065550eaedc036ed5d41583"
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
