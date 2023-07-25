import { Ed25519Keypair, getObjectPreviousTransactionDigest, RawSigner, TransactionBlock } from '@mysten/sui.js'
import { CoinAssist, sendTransaction } from '../../src'
import { CetusClmmSDK } from '../../src/sdk'
import { buildSdkOptions, currSdkEnv } from './sdk_config'

const sdkEnv = buildSdkOptions()
export const faucetObjectId = sdkEnv.faucet?.package_id
export const faucet = sdkEnv.faucet

const clmm_display = sdkEnv.clmm_pool.package_id

export const position_object_id = '0xa4573dbb55e47608cd15aaa0f2094215571d981488f5eaeabc83e07d69c11318'
export const TokensMapping = {
  SUI: {
    address: '0x2::sui::SUI',
    decimals: 8,
  },
  USDC: {
    address: `${faucetObjectId}::usdc::USDC`,
    decimals: 8,
  },
  USDT: {
    address: `${faucetObjectId}::usdt::USDT`,
    decimals: 8,
  },
  USDT_USDC_LP: {
    address: `${clmm_display}::pool::Pool<${faucetObjectId}::usdt::USDC, ${faucetObjectId}::usdc::USDT>`,
    decimals: 8,
    poolObjectIds: ['0x83c101a55563b037f4cd25e5b326b26ae6537dc8048004c1408079f7578dd160'],
  },
}

export async function mintAll(
  sdk: CetusClmmSDK,
  sendKeypair: Ed25519Keypair,
  faucet: {
    faucet_display: string
    faucet_router: string
  },
  funName: string
) {
  const objects = await sdk.fullClient.getObject({ id: faucet.faucet_display, options: { showPreviousTransaction: true } })
  const previousTx = getObjectPreviousTransactionDigest(objects)
  console.log('previousTx', previousTx)
  if (previousTx) {
    const txResult = await sdk.Pool.getSuiTransactionResponse(previousTx)

    if (txResult) {
      const faucetCoins = CoinAssist.getFaucetCoins(txResult)
      console.log('faucetCoins: ', faucetCoins)

      const tx = new TransactionBlock()
      const signer = new RawSigner(sendKeypair, sdk.fullClient)

      faucetCoins.forEach((coin) => {
        tx.moveCall({
          target: `${faucet.faucet_router}::${coin.transactionModule}::${funName}`,
          typeArguments: [],
          arguments: [tx.object(coin.suplyID)],
        })
      })

      const result = await sendTransaction(signer, tx)
      console.log('result: ', result)
    }
  }
}

export function buildSdk(): CetusClmmSDK {
  const sdk = new CetusClmmSDK(sdkEnv)
  console.log(`currSdkEnv: ${currSdkEnv} ; fullRpcUrl: ${sdk.sdkOptions.fullRpcUrl}`)
  return sdk
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
  const mnemonics = ''
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
