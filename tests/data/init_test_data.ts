import { CoinAssist, Package } from '../../src'
import { CetusClmmSDK } from '../../src/sdk'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519'
import { getObjectPreviousTransactionDigest } from '../../src/utils/objects'
import { SDK } from './init_mainnet_sdk'
import { TestnetSDK } from './init_testnet_sdk'

export const position_object_id = '0x1f4ba879e065fe0550f9831a72009ac350632bf963b174a7b3c2a9bbb29259f0'
export const pool_object_id = '0x6fd4915e6d8d3e2ba6d81787046eb948ae36fdfc75dad2e24f0d4aaa2417a416'

export async function mintAll(sdk: CetusClmmSDK, sendKeypair: Ed25519Keypair, faucet: Package, funName: string) {
  const objects = await sdk.fullClient.getObject({ id: faucet.package_id, options: { showPreviousTransaction: true } })
  const previousTx = getObjectPreviousTransactionDigest(objects)
  console.log('previousTx', previousTx)
  if (previousTx) {
    const txResult: any = await sdk.Pool.getSuiTransactionResponse(previousTx)

    if (txResult) {
      const faucetCoins = CoinAssist.getFaucetCoins(txResult)
      console.log('faucetCoins: ', faucetCoins)

      const tx = new TransactionBlock()

      faucetCoins.forEach((coin) => {
        tx.moveCall({
          target: `${faucet.published_at}::${coin.transactionModule}::${funName}`,
          typeArguments: [],
          arguments: [tx.object(coin.suplyID)],
        })
      })

      const result = await sdk.fullClient.sendTransaction(sendKeypair, tx)
      console.log('result: ', result)
    }
  }
}

export enum SdkEnv {
  mainnet = 'mainnet',
  testnet = 'testnet',
}
export let currSdkEnv = SdkEnv.mainnet

export function buildSdk(sdkEnv: SdkEnv = currSdkEnv): CetusClmmSDK {
  currSdkEnv = sdkEnv
  switch (currSdkEnv) {
    case SdkEnv.mainnet:
      return SDK
    case SdkEnv.testnet:
      return TestnetSDK
    default:
      throw Error('not match SdkEnv')
  }
}

export async function buildTestPool(sdk: CetusClmmSDK, poolObjectId: string) {
  const pool = await sdk.Pool.getPool(poolObjectId)
  console.log('buildPool: ', pool)
  return pool
}

export async function buildTestPosition(sdk: CetusClmmSDK, posObjectId: string) {
  const position = await sdk.Position.getSipmlePosition(posObjectId)
  console.log('buildTestPosition: ', position)
  return position
}

export function buildTestAccount(): Ed25519Keypair {
    // Please enter your test account secret or mnemonics
   const mnemonics =''
  const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics)
  console.log(' Address: ', testAccountObject.getPublicKey().toSuiAddress())

  return testAccountObject
}

export function buildTestAccountNew(): Ed25519Keypair {
   // Please enter your test account secret or mnemonics
  const mnemonics =''
  const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics)
  console.log(' Address: ', testAccountObject.getPublicKey().toSuiAddress())

  return testAccountObject
}
