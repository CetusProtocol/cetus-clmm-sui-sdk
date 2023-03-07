import {
  getTransactionEffects,
  RawSigner,
  SuiExecuteTransactionResponse,
} from '@mysten/sui.js'
import { buildSdk, buildTestAccount } from './data/init_test_data';

describe('account Module', () => {
  const sdk = buildSdk()

  test('transferObject', async () => {
     const signer = new RawSigner(buildTestAccount(), sdk.fullClient)
    const transferTxn = (await signer.transferObject({
      objectId: "0xdf536c49aca84af91d105b7ab3540093594d5795",
      recipient: '0xd60452b35ab4a61a9f50bee9b01a6e1eb89e6155',
      gasBudget: 10000
    })) as SuiExecuteTransactionResponse

    console.log('doCreatPool: ', getTransactionEffects(transferTxn))


  })

})
