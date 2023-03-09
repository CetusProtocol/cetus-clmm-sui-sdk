import { buildSdk, TokensMapping, position_object_id, buildTestAccount } from './data/init_test_data';
import { CollectRewarderParams } from '../src/modules/rewarderModule';
import { RawSigner, SuiExecuteTransactionResponse, getTransactionEffects } from '@mysten/sui.js';

describe('Rewarder Module', () => {
  const sdk = buildSdk()
  const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]

  test('emissionsEveryDay', async () => {
    const emissionsEveryDay = await sdk.Rewarder.emissionsEveryDay(poolObjectId)
    console.log(emissionsEveryDay)
  })

  test('posRewardersAmount', async () => {

    const res: any = await sdk.Rewarder.posRewardersAmount(TokensMapping.USDT_USDC_LP.poolObjectId[0], position_object_id)
    console.log('res####', res)

  })

  test('poolRewardersAmount', async () => {
    const account = buildTestAccount().getPublicKey().toSuiAddress()

    const res = await sdk.Rewarder.poolRewardersAmount(account, TokensMapping.USDT_USDC_LP.poolObjectId[0])
    console.log('res####', res)

  })


  test('collectPoolRewarderTransactionPayload', async () => {
    const account = buildTestAccount()
    const signer = new RawSigner(account, sdk.fullClient)

    const pool = await sdk.Resources.getPool(TokensMapping.USDT_USDC_LP.poolObjectId[0])

    const rewards: any[] = await sdk.Rewarder.posRewardersAmount(pool.poolAddress, position_object_id)
    const rewardCoinTypes = rewards.map((item) => {
      return item.coin_address as string
    })
    const collectRewarderParams: CollectRewarderParams = {
      pool_id: pool.poolAddress,
      pos_id: poolObjectId,
      coinType: [pool.coinTypeA, pool.coinTypeB , ...rewardCoinTypes]
    }

    const collectRewarderPayload =  sdk.Rewarder.collectRewarderTransactionPayload(collectRewarderParams)

    const transferTxn = (await signer.executeMoveCall(collectRewarderPayload)) as SuiExecuteTransactionResponse
    console.log('result: ', getTransactionEffects(transferTxn))

  })

})
