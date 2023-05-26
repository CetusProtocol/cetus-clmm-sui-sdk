import { Ed25519Keypair, fromB64, getCreatedObjects, getObjectId, getObjectPreviousTransactionDigest, getSharedObjectInitialVersion, RawSigner, toB64, TransactionBlock } from '@mysten/sui.js'
import { CoinAssist, sendTransaction } from '../../src'
import { SDK, SdkOptions } from '../../src/sdk'
import { secretKeyToEd25519Keypair } from '../../src/utils/common'
import { buildSdkOptions, currSdkEnv } from './config'


const sdkEnv = buildSdkOptions()
export const faucetObjectId = sdkEnv.faucet.faucet_display
export const faucet = sdkEnv.faucet

const clmm_display = sdkEnv.clmm.clmm_display

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
    poolObjectId: ['0xd40feebfcf7935d40c9e82c9cb437442fee6b70a4be84d94764d0d89bb28ab07'],
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
      const txResult = await sdk.Pool.getSuiTransactionResponse(previousTx)

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

        const result =  await sendTransaction(signer , tx)
        console.log("result: ",result);
      }
    }
}

export function buildSdk(): SDK {
  const sdk =  new SDK(sdkEnv)
  console.log(`currSdkEnv: ${currSdkEnv} ; fullRpcUrl: ${sdk.sdkOptions.fullRpcUrl}`)
  return sdk
}

export async function printSDKConfig(sdk: SDK) {
  const initEventConfig = await sdk.Pool.getInitEvent()
  const tokenConfig = await sdk.Token.getTokenConfigEvent()
  console.log('printSDKConfig: ', {
    initEventConfig,
    tokenConfig,
  })
}

export async function buildTestPool(sdk: SDK, poolObjectId: string) {
  const pool = await sdk.Pool.getPool(poolObjectId)
  // console.log('buildPool: ', pool)
  return pool
}

export async function buildTestPosition(sdk: SDK, posObjectId: string) {
  const position = await sdk.Position.getSipmlePosition(posObjectId)
  console.log('buildTestPosition: ', position)
  return position
}


// 0xcd0247d0b67e53dde69b285e7a748e3dc390e8a5244eb9dd9c5c53d95e4cf0aa
export function buildTestAccount(): Ed25519Keypair {
  const mnemonics = 'garden naive sibling glow thumb spawn spare claw nasty choice hero south'
  const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics)
  console.log(' Address: ', testAccountObject.getPublicKey().toSuiAddress())

  return testAccountObject
}


export function buildTestAccount2(): Ed25519Keypair {
  const mnemonics = 'brain awful gentle history because detail undo squeeze night lend news pull'
  const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics)
  console.log('toSuiAddress', testAccountObject.getPublicKey().toSuiAddress())
  return testAccountObject
}

// daidai 0xe0c0bb644ffa16ea656a5e36c265f3d7c24001baf8ef152d7ecff280e66665b5
export function buildTestAccount3(): Ed25519Keypair {
  const mnemonics = 'analyst tower pave same control sand denial equal online turtle erode result'
  const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics)
  console.log('toSuiAddress', testAccountObject.getPublicKey().toSuiAddress())
  return testAccountObject
}

// 6d49ddaaacf57fc92a2bd0f4d30da78b23f03772
export function buildWJLaunchPadAccount(): Ed25519Keypair {
  const testAccountObject = secretKeyToEd25519Keypair("b05df387a460bee9fdc96e30068faf2956316696e4ffc1b0717733e2f22a6c05")
  console.log('wj Address: ', testAccountObject.getPublicKey().toSuiAddress())
  return testAccountObject
}

export function buildWJLaunchPadAccountLocal(): Ed25519Keypair {
  const testAccountObject = secretKeyToEd25519Keypair("d8f0e38dcd1c649225c039d9cf7acce62f6b61bc623b9429a2d306edbbf9224b")
  console.log('wj Address local: ', testAccountObject.getPublicKey().toSuiAddress())
  return testAccountObject
}


export function buildSKAccount(): Ed25519Keypair {
  const testAccountObject = secretKeyToEd25519Keypair("ac9b1e48ac96ac187b952b1c6f4094e2d00ba8f4f4dedd9906d8ea39a4d98042")
  console.log('sk Address: ', testAccountObject.getPublicKey().toSuiAddress())
  return testAccountObject
}


export function generateAccount(): Ed25519Keypair {
  const keypair =  Ed25519Keypair.generate()
  console.log('new Address: ', keypair.getPublicKey().toSuiAddress())
  console.log('keypair: ', keypair.export())
  return keypair
}


