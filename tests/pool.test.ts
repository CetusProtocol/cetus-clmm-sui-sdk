import {
  getTransactionEffects,
  RawSigner,
  SuiExecuteTransactionResponse,
} from '@mysten/sui.js'
import BN from 'bn.js'
import { buildSdk, printSDKConfig, buildTestAccount, TokensMapping, position_object_id } from './data/init_test_data';
import { TickMath } from '../src/math/tick';
import { d } from '../src/utils/numbers';
import { ClmmPoolUtil } from '../src/math/clmm';
import { CoinAsset } from '../src/modules/resourcesModule';
import { CoinAssist } from '../src/math/CoinAssist';

describe('Pool Module', () => {
  const sdk = buildSdk()


  test('getPoolImmutables', async () => {
    const poolImmutables = await sdk.Resources.getPoolImmutables()
    console.log('getPoolImmutables', poolImmutables)
  })

  test('getAllPool', async () => {
    const allPool = await sdk.Resources.getPools([])
    console.log('getAllPool', allPool)
  })

  test('getPool', async () => {
    const pool = await sdk.Resources.getPool(TokensMapping.USDT_USDC_LP.poolObjectId[0])
    console.log('pool', pool)
  })

  test('getPositionList', async () => {
    const res = await sdk.Resources.getPositionList(buildTestAccount().getPublicKey().toSuiAddress(),[])
    console.log('getPositionList####', res)
  })

  test('getPositionInfo', async () => {
     const res = await sdk.Resources.getPosition(position_object_id)
     console.log('getPosition####', res)
  })

  test('doCreatPool', async () => {
    const signer = new RawSigner(buildTestAccount(), sdk.fullClient)
    const creatPoolTransactionPayload =  sdk.Pool.creatPoolTransactionPayload({
      tick_spacing: 4,
      initialize_sqrt_price: TickMath.priceToSqrtPriceX64(d(1.2),6,6).toString(),
      uri: '',
      coinTypeA: TokensMapping.USDT.address,
      coinTypeB: TokensMapping.USDC.address,
      amount_a: 0,
      amount_b: 0,
      fix_amount_a: false,
      coin_object_ids_a: [],
      coin_object_ids_b: [],
      tick_lower: 0,
      tick_upper: 0
    })
    console.log('creatPoolTransactionPayload: ', creatPoolTransactionPayload)

    const transferTxn = (await signer.executeMoveCall(creatPoolTransactionPayload)) as SuiExecuteTransactionResponse
    console.log('doCreatPool: ', getTransactionEffects(transferTxn))
  })

  test('create_and_add_liquidity_fix_token', async () => {
    const signer = new RawSigner(buildTestAccount(), sdk.fullClient)
    const initialize_sqrt_price = TickMath.priceToSqrtPriceX64(d(1.2),6,6).toString()
    const tick_spacing = 60
    const current_tick_index = TickMath.sqrtPriceX64ToTickIndex(new BN(initialize_sqrt_price))

    const lowerTick = TickMath.getPrevInitializableTickIndex(new BN(current_tick_index).toNumber(),
      new BN(tick_spacing).toNumber()
    )
    const upperTick = TickMath.getNextInitializableTickIndex(new BN(current_tick_index).toNumber(),
      new BN(tick_spacing).toNumber()
    )

    const fix_coin_amount = new BN(200)
    const fix_amount_a = true
    const slippage = 0.05

    const liquidityInput = ClmmPoolUtil.estLiquidityAndcoinAmountFromOneAmounts(
      lowerTick,
      upperTick,
      fix_coin_amount,
      fix_amount_a,
      true,
      slippage,
      new BN(initialize_sqrt_price)
    )

    const amount_a = fix_amount_a ? fix_coin_amount.toNumber() : liquidityInput.tokenMaxA.toNumber()
    const amount_b = fix_amount_a ? liquidityInput.tokenMaxB.toNumber() : fix_coin_amount.toNumber()

    console.log('amount: ', { amount_a, amount_b })

    const allCoinAsset = await sdk.Resources.getOwnerCoinAssets(buildTestAccount().getPublicKey().toSuiAddress())

    const coinAs: CoinAsset[] = CoinAssist.getCoinAssets(TokensMapping.USDT.address, allCoinAsset)
    const coinBs: CoinAsset[] = CoinAssist.getCoinAssets(TokensMapping.USDC.address, allCoinAsset)

    const coinAObjectIds = await CoinAssist.selectCoinAssets(signer,coinAs, BigInt(amount_a),sdk)
    const coinBObjectIds = await CoinAssist.selectCoinAssets(signer,coinBs, BigInt(amount_b),sdk)

    const creatPoolTransactionPayload =  sdk.Pool.creatPoolTransactionPayload({
      tick_spacing: tick_spacing,
      initialize_sqrt_price: initialize_sqrt_price,
      uri: '',
      coinTypeA: TokensMapping.USDT.address,
      coinTypeB: TokensMapping.USDC.address,
      amount_a: amount_a,
      amount_b: amount_b,
      fix_amount_a: fix_amount_a,
      coin_object_ids_a: coinAObjectIds,
      coin_object_ids_b: coinBObjectIds,
      tick_lower: lowerTick,
      tick_upper: upperTick
    })
    console.log('creatPoolTransactionPayload: ', creatPoolTransactionPayload)

    const transferTxn = (await signer.executeMoveCall(creatPoolTransactionPayload)) as SuiExecuteTransactionResponse
    console.log('doCreatPool: ', getTransactionEffects(transferTxn))
  })

 /** -----------------------helper function--------------------------- */
  test('getInitEvent', async () => {
    const initEvent = await sdk.Resources.getInitEvent()
    console.log('getInitEvent', initEvent)
  })

  test('getCreatePartnerEvent', async () => {
    const initEvent = await sdk.Resources.getCreatePartnerEvent()
    console.log('getCreatePartnerEvent', initEvent)
  })

  test('printSDKConfig', async () => {
    await printSDKConfig(sdk)
 })


})
