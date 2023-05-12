import { Ed25519Keypair, fromB64, getCreatedObjects, getObjectId, getObjectPreviousTransactionDigest, getSharedObjectInitialVersion, RawSigner, toB64, TransactionBlock } from '@mysten/sui.js'
import { CoinAssist, sendTransaction } from '../../src'
import { SDK, SdkOptions } from '../../src/sdk'
import { secretKeyToEd25519Keypair } from '../../src/utils/common'
import { buildSdkOptions, currSdkEnv } from './config'


const sdkEnv = buildSdkOptions()
export const faucetObjectId = sdkEnv.faucet.faucet_display

const clmm_display = sdkEnv.clmm.clmm_display

export const position_object_id = '0x74055642637856f8e8ea2a9724be86250a4fa2b87969ba663aabfcf4c99db33c'
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
    poolObjectId: ['0x6e20639f49444fa8ff6012ce3f7b6064517c0ad7bda5730a0557ad1b1bded372'],
  },
}


export async  function mintAll(sdk: SDK,sendKeypair: Ed25519Keypair ,  faucet: {
  faucet_display: string,
  faucet_router: string,
},funName: string){
  const objects = await sdk.fullClient.getObject({id: faucet.faucet_display, options: {showPreviousTransaction: true}})
    const previousTx =   getObjectPreviousTransactionDigest(objects)
    console.log("previousTx",previousTx);
    if(previousTx){
      const txResult = await sdk.Resources.getSuiTransactionResponse(previousTx)

      if(txResult){
        const faucetCoins = CoinAssist.getFaucetCoins(txResult)
        console.log("faucetCoins: ",faucetCoins);

        const tx = new  TransactionBlock()
        const signer = new RawSigner(sendKeypair, sdk.fullClient)

        faucetCoins.forEach((coin) => {
          tx.moveCall({
            target: `${faucet.faucet_router}::${coin.transactionModule}::${funName}`,
            typeArguments : [],
            arguments: [tx.object(coin.suplyID)],
          })
        })

        tx.setGasBudget(30000000)

        const result =  await sendTransaction(signer , tx)
        console.log("result: ",result);
      }
    }
}

export function buildSdk(): SDK {
  const sdk =  new SDK(sdkEnv)
  sdk.gasConfig = sdkEnv.gasConfig
  console.log(`currSdkEnv: ${currSdkEnv} ; fullRpcUrl: ${sdk.sdkOptions.fullRpcUrl}`)
  return sdk
}


export async function buildTestPool(sdk: SDK, poolObjectId: string) {
  const pool = await sdk.Resources.getPool(poolObjectId)
  console.log('buildPool: ', pool)
  return pool
}

export async function buildTestPosition(sdk: SDK, posObjectId: string) {
  const position = await sdk.Resources.getSipmlePosition(posObjectId)
  console.log('buildTestPosition: ', position)
  return position
}


// 0xcd0247d0b67e53dde69b285e7a748e3dc390e8a5244eb9dd9c5c53d95e4cf0aa
export function buildTestAccount(): Ed25519Keypair {
  const mnemonics = ''
  const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics)
  console.log(' Address: ', testAccountObject.getPublicKey().toSuiAddress())

  return testAccountObject
}

export function generateAccount(): Ed25519Keypair {
  const keypair =  Ed25519Keypair.generate()
  console.log('new Address: ', keypair.getPublicKey().toSuiAddress())
  console.log('keypair: ', keypair.export())
  return keypair
}


