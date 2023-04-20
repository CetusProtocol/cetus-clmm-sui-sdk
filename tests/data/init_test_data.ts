import { Ed25519Keypair, fromB64, getCreatedObjects, getObjectId, getObjectPreviousTransactionDigest, getSharedObjectInitialVersion, RawSigner, toB64, TransactionBlock } from '@mysten/sui.js'
import { CoinAssist, sendTransaction } from '../../src'
import { SDK, SdkOptions } from '../../src/sdk'
import { secretKeyToEd25519Keypair } from '../../src/utils/common'
import { netConfig, sdkEnv } from './config'


export const faucetObjectId = sdkEnv.faucet_router

const clmm_display = sdkEnv.clmm.clmm_display

export const position_object_id = '0x958e886f4fcde99da46eff40df8d54e6fce5669300fc1e84c06fa42c9a3aad0a'
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
    poolObjectId: ['0x7e279224f1dd455860d65fa975cce5208485fd98b8e9a0cb6bd087c6dc9f5e03'],
  },
}


export async  function mintAll(sdk: SDK,sendKeypair: Ed25519Keypair , packageId: string,modules: string,funName: string){
  const objects = await sdk.fullClient.getObject({id: packageId, options: {showPreviousTransaction: true}})
    const previousTx =   getObjectPreviousTransactionDigest(objects)
    console.log("previousTx",previousTx);
    if(previousTx){
      const txResult = await sdk.Resources.getSuiTransactionResponse(previousTx)

      if(txResult?.effects?.created){
        const faucetCoins = CoinAssist.getFaucetCoins(txResult)
        console.log("faucetCoins: ",faucetCoins);

        const tx = new  TransactionBlock()
        const sharedObjectIds = faucetCoins.map((coin) => {
          return tx.object(coin.suplyID)
        })


        const signer = new RawSigner(sendKeypair, sdk.fullClient)
        tx.setGasBudget(300000000)
        tx.moveCall({
          target: `${packageId}::${modules}::${funName}`,
          typeArguments : [],
          arguments: [...sharedObjectIds],
        })
        const result =  await sendTransaction(signer , tx)
        console.log("result: ",result);
      }
    }
}

export function buildSdk(): SDK {
  const sdk =  new SDK(sdkEnv)
  sdk.gasConfig = sdkEnv.gasConfig
  return sdk
}

export async function printSDKConfig(sdk: SDK) {
  const initEventConfig = await sdk.Resources.getInitEvent()
  const tokenConfig = await sdk.Token.getTokenConfigEvent()
  console.log('printSDKConfig: ', {
    initEventConfig,
    tokenConfig,
  })
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


// 64d3ff30a4ef6af64a7b510dae8c5f89015bdefc
export function buildTestAccount(): Ed25519Keypair {
  const mnemonics = 'east whip forward system hour enforce innocent identify predict escape immense main'
  const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics)
  console.log(' Address: ', testAccountObject.getPublicKey().toSuiAddress())

  return testAccountObject
}
// 57ea9026ef905e69e6238b66f405146f5a88472d
export function buildTestAccount1(): Ed25519Keypair {
  const mnemonics = 'garden naive sibling glow thumb spawn spare claw nasty choice hero south'
  const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics)
  console.log('toSuiAddress', testAccountObject.getPublicKey().toSuiAddress())
  return testAccountObject
}
// 0xa4a8171e745f2bd73313c58e53ee0dc223f9aec2a99a65eb7a2a46b93f4b501b
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


