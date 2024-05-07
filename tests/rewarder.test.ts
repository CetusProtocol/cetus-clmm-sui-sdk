import { buildSdk, PositionObjectID, buildTestAccount, PoolObjectID } from './data/init_test_data'
import 'isomorphic-fetch'
import { CollectRewarderParams } from '../src'

const poolObjectId = PoolObjectID
describe('Rewarder Module', () => {
  const sdk = buildSdk()

  test('emissionsEveryDay', async () => {
    const emissionsEveryDay = await sdk.Rewarder.emissionsEveryDay(poolObjectId)
    console.log(emissionsEveryDay)
  })

  test('posRewardersAmount', async () => {
    const pool = await sdk.Pool.getPool('0x83c101a55563b037f4cd25e5b326b26ae6537dc8048004c1408079f7578dd160')
    console.log('pool', pool)

    const res = await sdk.Rewarder.posRewardersAmount(
      pool.poolAddress,
      pool.position_manager.positions_handle,
      '0xf10d37cc00bcd60f85cef3fe473ea979e3f7f3631d522618e80c876b349e56bc'
    )
    console.log('res####', res[0].amount_owed.toString(), res[1].amount_owed.toString(), res[2].amount_owed.toString())
  })

  test('poolRewardersAmount', async () => {
    const account = buildTestAccount().getPublicKey().toSuiAddress()

    const res = await sdk.Rewarder.poolRewardersAmount(account, PoolObjectID)
    console.log('res####', res)
  })

  test('pool rewarders amount', async () => {
    const account = buildTestAccount().getPublicKey().toSuiAddress()
    const res = await sdk.Rewarder.fetchPoolRewardersAmount(account, PoolObjectID)
    console.log('res####', res)
  })

  test('batchFetchPositionRewarders', async () => {
    const res = await sdk.Rewarder.batchFetchPositionRewarders([
      '0x2f270c02cbb5da0b047051102909534e1923ef966e674dfb6c6d8b554de8a5bc',
      '0x630683bfa6a9bf60263de3d68eb209004b6d283eb900c96af3f0c7c8378bf5f5',
      '0xd65c3e9a25e817e73e71fbb0daed7433be64e659b01287efe4b0952b9fd737c1',
    ])
    console.log('res####', res)
  })

  test('collectPoolRewarderTransactionPayload', async () => {
    const sendKeypair = buildTestAccount()
    sdk.senderAddress = sendKeypair.getPublicKey().toSuiAddress()

    const pool = await sdk.Pool.getPool(poolObjectId)

    const rewards: any[] = await sdk.Rewarder.posRewardersAmount(
      pool.poolAddress,
      pool.position_manager.positions_handle,
      PositionObjectID
    )
    const rewardCoinTypes = rewards.filter((item) => Number(item.amount_owed) > 0).map((item) => item.coin_address)

    const collectRewarderParams: CollectRewarderParams = {
      pool_id: pool.poolAddress,
      pos_id: PositionObjectID,
      rewarder_coin_types: [...rewardCoinTypes],
      coinTypeA: pool.coinTypeA,
      coinTypeB: pool.coinTypeB,
      collect_fee: true,
    }

    const collectRewarderPayload = await sdk.Rewarder.collectRewarderTransactionPayload(collectRewarderParams)

    const transferTxn = await sdk.fullClient.sendTransaction(sendKeypair, collectRewarderPayload)
    console.log('collectRewarderPayload: ', JSON.stringify(transferTxn, null, 2))
  })
})
