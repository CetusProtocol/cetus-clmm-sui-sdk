import {  Ed25519Keypair, RawSigner, SuiExecuteTransactionResponse, SuiMoveObject, SuiObject, SuiTransactionResponse } from '@mysten/sui.js';
import { CoinAssist } from '../src/math/CoinAssist';
import { logCat } from '../src/utils/common'
import { d } from '../src/utils/numbers';
import { buildSdk, buildTestAccount, convertToDecimals, TokensMapping } from './init_test_data'
import { extractStructTagFromType } from '../src/utils/contracts';
import { LiquidityAndCoinYResult } from '../src/math/LiquidityHelper';
import { CoinAsset } from '../src/modules/resourcesModule';

const allSuiObjects: CoinAsset[] = [];
let sendKeypair : Ed25519Keypair

describe('liquidity Module calculate', () => {
  const sdk = buildSdk()

  test('getLiquidityAndCoinYByCoinX1', async () => {
    const objectLp = TokensMapping.BAS_SUI_LP

    const output = await sdk.Liquidity.getLiquidityAndCoinYByCoinX({
      poolObjectId: objectLp.poolObjectId,
      amountX: 100000000,
      direction : false
    })
    logCat("getLiquidityAndCoinYByCoinX",output)
  })

  test('getLiquidityAndCoinYByCoinX2', async () => {
    const objectLp = TokensMapping.BTC_USDC_LP

    const output = await sdk.Liquidity.getLiquidityAndCoinYByCoinX({
      poolObjectId: objectLp.poolObjectId,
      amountX: 1000,
      direction : false
    })
    logCat("getLiquidityAndCoinYByCoinX",output)
  })

  test('getCoinXYForLiquidity', async () => {
    const objectLp = TokensMapping.BTC_USDC_LP

    const output = await sdk.Liquidity.getCoinXYForLiquidity({
      poolObjectId: objectLp.poolObjectId,
      liquidity: 316.2277660168379332,
      direction : true
    })

    logCat("getCoinXYForLiquidity",output)
  })

  test('getSuiObjectOwnedByAddress', async () => {
    sendKeypair  = buildTestAccount()
    allSuiObjects.push(...await sdk.Resources.getSuiObjectOwnedByAddress(sendKeypair.getPublicKey().toSuiAddress()))
    logCat("--------totalBalance----",CoinAssist.totalBalance(allSuiObjects,"0x5391917714230bfe403e64c4d02e03ac8c4b54ad::btc::BTC"))
  })

})

describe('liquidity Module', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair  = buildTestAccount()
    //logCat("--------beforeEach---start----",allSuiObjects)
    allSuiObjects.push(...await sdk.Resources.getSuiObjectOwnedByAddress(sendKeypair.getPublicKey().toSuiAddress()))
    // logCat("--------beforeEach---end----",allSuiObjects)
  })

  test('addLiquidity', async () => {

    const signer = new RawSigner(sendKeypair,sdk.fullClient)

    const objectLp = TokensMapping.BTC_USDC_LP
    const lpStructTag = extractStructTagFromType(objectLp.address)
    const coinAddressX = lpStructTag.type_arguments[0]
    const coinAddressY = lpStructTag.type_arguments[1]

    const amountX = 100
    const isFirstAddLiquidity = true

    const amountY = isFirstAddLiquidity ? d(1000): ((await sdk.Liquidity.getLiquidityAndCoinYByCoinX({
      amountX: amountX.toString(),
      poolObjectId: objectLp.poolObjectId,
      direction:true
    })) as LiquidityAndCoinYResult).coinYAmount.toDP(0)

    const coinXs: SuiMoveObject[] =  CoinAssist.getSuiMoveObjects(coinAddressX,allSuiObjects)
    const coinYs: SuiMoveObject[] =  CoinAssist.getSuiMoveObjects(coinAddressY,allSuiObjects)

    const coinXObjectId = await CoinAssist.selectCoin(signer, coinXs, BigInt(amountX),sdk)
    const coinYObjectId = await CoinAssist.selectCoin(signer, coinYs, BigInt(amountY.toNumber()),sdk)

    const addLiquidityPayload = await sdk.Liquidity.createAddLiquidityTransactionPayload({
      coinX: coinAddressX,
      coinY: coinAddressY,
      coinXObjectId: coinXObjectId,
      coinYObjectId: coinYObjectId,
      poolObjectId: objectLp.poolObjectId,
      coinXAmount: amountX,
      coinYAmount: amountY,
      slippage: 0.05,
    })
    logCat("addLiquidityPayload:",addLiquidityPayload)
    // const result = await signer.dryRunTransaction(await signer.serializer.serializeToBytes(sendKeypair.getPublicKey().toSuiAddress(),{ kind: 'moveCall', data: addLiquidityPayload }))
    // logCat("result",result)
    const transferTxn = await signer.executeMoveCall(addLiquidityPayload) as SuiExecuteTransactionResponse
    logCat("addLiquidity",transferTxn )
   },50*1000)

  test('removeLiquidity', async () => {
    const signer = new RawSigner(sendKeypair,sdk.fullClient)

    const objectLp = TokensMapping.BTC_USDC_LP
    const lpStructTag = extractStructTagFromType(objectLp.address)
    const coinAddressX = lpStructTag.type_arguments[0]
    const coinAddressY = lpStructTag.type_arguments[1]

    const liquidity = 10
    const lpCoinXs: SuiMoveObject[] =  CoinAssist.getSuiMoveObjects(objectLp.address,allSuiObjects)

    const lpObjectId = await CoinAssist.selectCoin(signer, lpCoinXs, BigInt(liquidity),sdk)

     const removeLiquidityPayload = await sdk.Liquidity.removeLiquidityTransactionPayload({
       coinX: coinAddressX,
       coinY: coinAddressY,
       lpObjectId: lpObjectId,
       poolObjectId: objectLp.poolObjectId,
       liquidity: liquidity,
       slippage: 0.05,
       direction: true
     })
     logCat("removeLiquidityPayload:",removeLiquidityPayload)

     const transferTxn = await signer.executeMoveCall(removeLiquidityPayload) as SuiExecuteTransactionResponse

     logCat("removeLiquidity",transferTxn)
   },30*1000)

})

