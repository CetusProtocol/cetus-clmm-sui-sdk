import { CoinAssist, Package } from '../../src'
import { CetusClmmSDK } from '../../src/sdk'
import { TransactionBlock } from '@mysten/sui.js/transactions'
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519'
import { getObjectPreviousTransactionDigest } from '../../src/utils/objects'
import { SDK } from './init_mainnet_sdk'
import { TestnetSDK } from './init_testnet_sdk'

export const PositionObjectID = '0x7cea8359f50318d88026d702462df7ce9d96a5b12f3efe9dce6d6450fba779a0'
export const PoolObjectID = '0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630'

export const USDT_USDC_POOL_10 = '0x40c2dd0a9395b1f15a477f0e368c55651b837fd27765395a9412ab07fc75971c'

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
export let currSdkEnv = SdkEnv.testnet

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
  const position = await sdk.Position.getSimplePosition(posObjectId)
  console.log('buildTestPosition: ', position)
  return position
}

export function buildTestAccount(): Ed25519Keypair {
  // Please enter your test account secret or mnemonics
  const mnemonics = ''
  const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics)
  return testAccountObject
}

export function buildTestAccountNew(): Ed25519Keypair {
  // Please enter your test account secret or mnemonics
  const mnemonics = ''
  const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics)
  return testAccountObject
}

export enum TestnetCoin {
  USDC = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdc::USDC',
  USDT = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::usdt::USDT',
  ETH = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::eth::ETH',
  AFR = '0x8ed60050f9c887864991b674cfc4b435be8e20e3e5a9970f7249794bd1319963::aifrens::AIFRENS',
  CETUS = '0x26b3bc67befc214058ca78ea9a2690298d731a2d4309485ec3d40198063c4abc::cetus::CETUS',
  SUI = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  HASUI = "0xac2afb455cbcdc2ff1a2e9bbb8aa4ccb4506a544b08c740886892a5cdf92f472::hasui::HASUI",
}

export enum MainnetCoin {
  USDC = '0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN',
  USDT = '0xc060006111016b8a020ad5b33834984a437aaa7d3c74c18e09a95d48aceab08c::coin::COIN',
  ETH = '0xaf8cd5edc19c4512f4259f0bee101a40d41ebed738ade5874359610ef8eeced5::coin::COIN',
  SUI = '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
  CETUS = '0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS'
}
