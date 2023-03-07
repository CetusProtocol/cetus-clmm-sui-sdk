import { TickMath } from '../src/math/tick'
import BN from 'bn.js'
import { RawSigner, SuiExecuteTransactionResponse, getTransactionEffects, Ed25519Keypair } from '@mysten/sui.js'
import { buildSdk, buildTestAccount, buildTestPool, buildTestPosition, position_object_id, TokensMapping } from './data/init_test_data'
import { CoinAsset, Position } from '../src/modules/resourcesModule'
import { ClmmPoolUtil } from '../src/math/clmm'
import { AddLiquidityFixTokenParams, RemoveLiquidityAndCloseParams, RemoveLiquidityParams } from '../src/modules/positionModule'
import { CoinAssist } from '../src/math/CoinAssist'
import { Percentage } from '../src/math/percentage'
import { adjustForCoinSlippage } from '../src/math/position'

let sendKeypair: Ed25519Keypair
let allCoinAsset: CoinAsset[] = []

describe('Position add Liquidity Module', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
    allCoinAsset = await sdk.Resources.getOwnerCoinAssets(sendKeypair.getPublicKey().toSuiAddress())
  })

  test('open_and_add_liquidity_fix_token', async () => {
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, poolObjectId)
    const lowerTick = TickMath.getPrevInitializableTickIndex(
      new BN(pool.current_tick_index).toNumber(),
      new BN(pool.tickSpacing).toNumber()
    )
    const upperTick = TickMath.getNextInitializableTickIndex(
      new BN(pool.current_tick_index).toNumber(),
      new BN(pool.tickSpacing).toNumber()
    )
    const coinAmount = new BN(200)
    const fix_amount_a = true
    const slippage = 0.05
    const curSqrtPrice = new BN(pool.current_sqrt_price)

    const liquidityInput = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
      lowerTick,
      upperTick,
      coinAmount,
      fix_amount_a,
      true,
      slippage,
      curSqrtPrice
    )

    const amount_a = fix_amount_a ? coinAmount.toNumber() : liquidityInput.tokenMaxA.toNumber()
    const amount_b = fix_amount_a ? liquidityInput.tokenMaxB.toNumber() : coinAmount.toNumber()

    console.log('amount: ', { amount_a, amount_b })

    const coinAs: CoinAsset[] = CoinAssist.getCoinAssets(pool.coinTypeA, allCoinAsset)
    const coinBs: CoinAsset[] = CoinAssist.getCoinAssets(pool.coinTypeB, allCoinAsset)

    const coinAObjectIds = await CoinAssist.selectCoinAssets(signer, coinAs, BigInt(amount_a), sdk)
    const coinBObjectIds = await CoinAssist.selectCoinAssets(signer, coinBs, BigInt(amount_b), sdk)

    const addLiquidityPayloadParams: AddLiquidityFixTokenParams = {
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      pool_id: pool.poolAddress,
      coin_object_ids_a: coinAObjectIds,
      coin_object_ids_b: coinBObjectIds,
      tick_lower: lowerTick.toString(),
      tick_upper: upperTick.toString(),
      fix_amount_a,
      amount_a,
      amount_b,
      is_open: true,
      pos_id: '',
    }
    const createAddLiquidityTransactionPayload = sdk.Position.createAddLiquidityTransactionPayload(addLiquidityPayloadParams)
    console.log('createAddLiquidityTransactionPayload: ', createAddLiquidityTransactionPayload)

    const transferTxn = (await signer.executeMoveCall(createAddLiquidityTransactionPayload)) as SuiExecuteTransactionResponse
    console.log('open_and_add_liquidity_fix_token: ', getTransactionEffects(transferTxn))
  })

  test('add_liquidity_fix_token', async () => {
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, poolObjectId)
    const position = (await buildTestPosition(sdk, position_object_id)) as Position
    const lowerTick = Number(position.tick_lower_index)
    const upperTick = Number(position.tick_upper_index)
    const coinAmount = new BN(10_000_000)
    const fix_amount_a = true
    const slippage = 0.05
    const curSqrtPrice = new BN(pool.current_sqrt_price)

    const liquidityInput = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
      lowerTick,
      upperTick,
      coinAmount,
      fix_amount_a,
      true,
      slippage,
      curSqrtPrice
    )

    const amount_a = fix_amount_a ? coinAmount.toNumber() : liquidityInput.tokenMaxA.toNumber()
    const amount_b = fix_amount_a ? liquidityInput.tokenMaxB.toNumber() : coinAmount.toNumber()

    console.log('amount: ', { amount_a, amount_b })

    const coinAs: CoinAsset[] = CoinAssist.getCoinAssets(pool.coinTypeA, allCoinAsset)
    const coinBs: CoinAsset[] = CoinAssist.getCoinAssets(pool.coinTypeB, allCoinAsset)

    const coinAObjectIds = await CoinAssist.selectCoinAssets(signer, coinAs, BigInt(amount_a), sdk)
    const coinBObjectIds = await CoinAssist.selectCoinAssets(signer, coinBs, BigInt(amount_b), sdk)

    const addLiquidityPayloadParams: AddLiquidityFixTokenParams = {
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      pool_id: pool.poolAddress,
      coin_object_ids_a: coinAObjectIds,
      coin_object_ids_b: coinBObjectIds,
      tick_lower: lowerTick.toString(),
      tick_upper: upperTick.toString(),
      fix_amount_a,
      amount_a,
      amount_b,
      is_open: false,
      pos_id: position.pos_object_id,
    }
    const createAddLiquidityTransactionPayload = sdk.Position.createAddLiquidityTransactionPayload(addLiquidityPayloadParams)

    console.log('createAddLiquidityTransactionPayload: ', createAddLiquidityTransactionPayload)

    const transferTxn = (await signer.executeMoveCall(createAddLiquidityTransactionPayload)) as SuiExecuteTransactionResponse
    console.log('add_liquidity_fix_token: ', getTransactionEffects(transferTxn))
  })
})

describe('Position  Module', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
  })

  test('getCoinAmountFromLiquidity', async () => {
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]
    const pool = await buildTestPool(sdk, poolObjectId)
    const position = (await buildTestPosition(sdk, position_object_id)) as Position
    const curSqrtPrice = new BN(pool.current_sqrt_price)
    const lowerTick = Number(position.tick_lower_index)
    const upperTick = Number(position.tick_upper_index)

    const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick)
    const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick)
    const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(
      new BN(position.liquidity),
      curSqrtPrice,
      lowerSqrtPrice,
      upperSqrtPrice,
      true
    )

    console.log('coinA: ', coinAmounts.coinA.toString())
    console.log('coinB: ', coinAmounts.coinB.toString())
  })

  test('only removeLiquidity', async () => {
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, poolObjectId)
    const position = (await buildTestPosition(sdk, position_object_id)) as Position

    const lowerTick = Number(position.tick_lower_index)
    const upperTick = Number(position.tick_upper_index)

    const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick)
    const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick)

    const liquidity = new BN(10000)
    const slippageTolerance = new Percentage(new BN(5), new BN(100))
    const curSqrtPrice = new BN(pool.current_sqrt_price)

    const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(liquidity, curSqrtPrice, lowerSqrtPrice, upperSqrtPrice, false)
    const { tokenMaxA, tokenMaxB } = adjustForCoinSlippage(coinAmounts, slippageTolerance, false)

    const removeLiquidityParams: RemoveLiquidityParams = {
      coin_types: [pool.coinTypeA, pool.coinTypeB],
      delta_liquidity: liquidity.toString(),
      min_amount_a: tokenMaxA.toString(),
      min_amount_b: tokenMaxB.toString(),
      pool_id: pool.poolAddress,
      pos_id: position.pos_object_id,
    }

    const removeLiquidityTransactionPayload = sdk.Position.removeLiquidityTransactionPayload(removeLiquidityParams)

    console.log('removeLiquidityTransactionPayload: ', removeLiquidityTransactionPayload)

    const transferTxn = (await signer.executeMoveCall(removeLiquidityTransactionPayload)) as SuiExecuteTransactionResponse
    console.log('removeLiquidity: ', getTransactionEffects(transferTxn))
  })

  test('RemoveLiquidityAndCloseParams', async () => {
    const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, poolObjectId)
    const position = (await buildTestPosition(sdk, position_object_id)) as Position

    const lowerTick = Number(position.tick_lower_index)
    const upperTick = Number(position.tick_upper_index)

    const lowerSqrtPrice = TickMath.tickIndexToSqrtPriceX64(lowerTick)
    const upperSqrtPrice = TickMath.tickIndexToSqrtPriceX64(upperTick)

    const liquidity = new BN(position.liquidity)
    const slippageTolerance = new Percentage(new BN(5), new BN(100))
    const curSqrtPrice = new BN(pool.current_sqrt_price)

    const coinAmounts = ClmmPoolUtil.getCoinAmountFromLiquidity(liquidity, curSqrtPrice, lowerSqrtPrice, upperSqrtPrice, false)
    const { tokenMaxA, tokenMaxB } = adjustForCoinSlippage(coinAmounts, slippageTolerance, false)

    const rewards: any[] = await sdk.Rewarder.posRewardersAmount(poolObjectId, position_object_id)
    const rewardCoinTypes = rewards.map((item) => {
      return item.coin_address as string
    })

    const removeLiquidityParams: RemoveLiquidityAndCloseParams = {
      coin_types: [pool.coinTypeA, pool.coinTypeB, ...rewardCoinTypes],
      min_amount_a: tokenMaxA.toString(),
      min_amount_b: tokenMaxB.toString(),
      pool_id: pool.poolAddress,
      pos_id: position.pos_object_id,
    }

    const removeLiquidityTransactionPayload = sdk.Position.removeLiquidityTransactionPayload(removeLiquidityParams)

    console.log('removeLiquidityTransactionPayload: ', removeLiquidityTransactionPayload)

    const transferTxn = (await signer.executeMoveCall(removeLiquidityTransactionPayload)) as SuiExecuteTransactionResponse
    console.log('removeLiquidity: ', getTransactionEffects(transferTxn))
  })

  test('only open position', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await buildTestPool(sdk, TokensMapping.USDT_USDC_LP.poolObjectId[0])

    const lowerTick = TickMath.getPrevInitializableTickIndex(
      new BN(pool.current_tick_index).toNumber(),
      new BN(pool.tickSpacing).toNumber()
    )
    const upperTick = TickMath.getNextInitializableTickIndex(
      new BN(pool.current_tick_index).toNumber(),
      new BN(pool.tickSpacing).toNumber()
    )

    const openPositionTransactionPayload = sdk.Position.openPositionTransactionPayload({
      coinTypeA: TokensMapping.USDT.address,
      coinTypeB: TokensMapping.USDC.address,
      tick_lower: lowerTick.toString(),
      tick_upper: upperTick.toString(),
      pool_id: pool.poolAddress,
    })
    console.log('openPositionTransactionPayload: ', openPositionTransactionPayload)

    const transferTxn = (await signer.executeMoveCall(openPositionTransactionPayload)) as SuiExecuteTransactionResponse
    console.log('only open position: ', getTransactionEffects(transferTxn))
  })

  test('close position', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)

    const closePositionTransactionPayload = sdk.Position.closePositionTransactionPayload({
      coinTypeA: TokensMapping.USDT.address,
      coinTypeB: TokensMapping.USDC.address,
      pool_id: TokensMapping.USDT_USDC_LP.poolObjectId[0],
      pos_id: '0x2bc696409d8bad5d2876354b0a6f25fc8c6ec585',
    })
    console.log('closePositionTransactionPayload: ', closePositionTransactionPayload)

    const transferTxn = (await signer.executeMoveCall(closePositionTransactionPayload)) as SuiExecuteTransactionResponse
    console.log('close position: ', getTransactionEffects(transferTxn))
  })

  test('collect_fee', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)

    const collectFeeTransactionPayload = sdk.Position.collectFeeTransactionPayload({
      coinTypeA: TokensMapping.USDT.address,
      coinTypeB: TokensMapping.USDC.address,
      pool_id: TokensMapping.USDT_USDC_LP.poolObjectId[0],
      pos_id: position_object_id,
    })

    console.log('collectFeeTransactionPayload: ', collectFeeTransactionPayload)

    const transferTxn = (await signer.executeMoveCall(collectFeeTransactionPayload)) as SuiExecuteTransactionResponse
    console.log('collect_fee: ', getTransactionEffects(transferTxn))
  })
})
