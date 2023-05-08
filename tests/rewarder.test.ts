import { buildSdk, TokensMapping, position_object_id, buildTestAccount } from './data/init_test_data';
import { CollectRewarderParams } from '../src/modules/rewarderModule';
import { RawSigner, getTransactionEffects } from '@mysten/sui.js'
import 'isomorphic-fetch';
import BN from 'bn.js';

const poolObjectId = TokensMapping.USDT_USDC_LP.poolObjectId[0]
describe('Rewarder Module', () => {
  const sdk = buildSdk()

  test('emissionsEveryDay', async () => {
    const emissionsEveryDay = await sdk.Rewarder.emissionsEveryDay(poolObjectId)
    console.log(emissionsEveryDay)
  })

  test('posRewardersAmount', async () => {
    const pool = await sdk.Resources.getPool("0x7b9d0f7e1ba6de8eefaa259da9f992e00aa8c22310b71ffabf2784e5b018a173")
    console.log("pool" , pool);

    const res = await sdk.Rewarder.posRewardersAmount(pool.poolAddress,pool.positions_handle, "0x5a0a9317df9239a80c5d9623ea87f0ac36f1cec733dc767ba606a6316a078d04")
    console.log('res####', res[0].amount_owed.toString(), res[1].amount_owed.toString(), res[2].amount_owed.toString())

  })

  test('poolRewardersAmount', async () => {
    const account = buildTestAccount().getPublicKey().toSuiAddress()

    const res = await sdk.Rewarder.poolRewardersAmount(account, TokensMapping.USDT_USDC_LP.poolObjectId[0])
    console.log('res####', res)

  })

  test('test BN', async () => {
    const a = new BN('49606569301722253557813231039171')
    const a2 = a.mul(new BN(2))
    console.log(a2.toString())
    let a3 = a2.mul(new BN(2))
    console.log(a3.toString())
    for (let i = 0; i < 30; i += 1) {
      const a4 = a3.mul(new BN(2))
      console.log(a4.toString())
      a3 = a4
    }
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
