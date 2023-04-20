import { buildSdk, TokensMapping, position_object_id, buildTestAccount } from './data/init_test_data';
import { CollectRewarderParams } from '../src/modules/rewarderModule';
import { RawSigner, getTransactionEffects } from '@mysten/sui.js'
import 'isomorphic-fetch';

const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]
describe('Rewarder Module', () => {
  const sdk = buildSdk()

  test('emissionsEveryDay', async () => {
    const emissionsEveryDay = await sdk.Rewarder.emissionsEveryDay(poolObjectId)
    console.log(emissionsEveryDay)
  })

  test('posRewardersAmount', async () => {
    const pool = await sdk.Resources.getPool(poolObjectId)
    const res: any = await sdk.Rewarder.posRewardersAmount(pool.poolAddress,pool.positions_handle, position_object_id)
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

    const pool = await sdk.Resources.getPool(poolObjectId)

    const rewards: any[] = await sdk.Rewarder.posRewardersAmount(pool.poolAddress,pool.positions_handle, position_object_id)
    const rewardCoinTypes = rewards.filter((item) => {
      if(Number(item.amount_owed) > 0){
        return item.coin_address as string
      }
    })

    const collectRewarderParams: CollectRewarderParams = {
      pool_id: pool.poolAddress,
      pos_id: position_object_id,
      rewarder_coin_types: [ ...rewardCoinTypes],
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      collect_fee: false
    }

    const collectRewarderPayload =  sdk.Rewarder.collectRewarderTransactionPayload(collectRewarderParams)

    console.log("collectRewarderPayload: ",collectRewarderPayload.blockData.transactions[0]);

    const transferTxn = (await signer.signAndExecuteTransactionBlock({transactionBlock:collectRewarderPayload}))
    console.log('result: ', getTransactionEffects(transferTxn))

  })

})
