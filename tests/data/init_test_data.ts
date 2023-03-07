import { Ed25519Keypair } from '@mysten/sui.js'
import { SDK, SdkOptions } from '../../src/sdk'
import { d, decimalsMultiplier } from '../../src/utils/numbers'
import { netConfig } from './config'

export const sdkEnv = netConfig.devnet

const defaultNetworkOptions: SdkOptions = {
  fullRpcUrl: sdkEnv.fullRpcUrl,
  faucetURL: sdkEnv.faucetURL,
  networkOptions: {
    simulationAccount: sdkEnv.simulationAccount,
    token: {
      token_deployer: sdkEnv.TokenDeployer,
      config: sdkEnv.tokenConfig,
    },
    modules: {
      cetus_clmm: sdkEnv.cetusClmm,
      cetus_integrate: sdkEnv.cetusIntegrate,
      integer_mate: sdkEnv.integerMate,
      swap_partner: sdkEnv.swapPartner,
      config: {
        global_config_id: sdkEnv.initEventConfig.initConfigEvent.global_config_id,
        pools_id: sdkEnv.initEventConfig.initFactoryEvent.pools_id,
      },
    },
  },
}
export const faucetObjectId = sdkEnv.faucetObjectId

const LiquidswapDeployer = defaultNetworkOptions.networkOptions.modules.cetus_clmm

export const position_object_id = '0xb79709f464a5324dacd9efd689d2742f7882d60f'
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
    address: `${LiquidswapDeployer}::pool::Pool<${faucetObjectId}::usdt::USDT, ${faucetObjectId}::usdc::USDC>`,
    decimals: 8,
    poolObjectId: ['0x36df34fbf538e4e391f89dda3b4a07eeeec44d1c'],
  },
}

export function buildSdk(): SDK {
  return new SDK(defaultNetworkOptions)
}

export const CoinInfo: any = {
  ETH: { decimals: 8 },
  BTC: { decimals: 8 },
  BTC_ETH_LP: { decimals: 6 },
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
  const position = await sdk.Resources.getPosition(posObjectId)
  console.log('buildTestPosition: ', position)
  return position
}

export function convertToDecimals(amount: number | string, token: string) {
  const mul = decimalsMultiplier(CoinInfo[token]?.decimals || 0)

  return d(amount).mul(mul)
}
// 64d3ff30a4ef6af64a7b510dae8c5f89015bdefc
export function buildTestAccount(): Ed25519Keypair {
  const mnemonics = 'uphold pill enemy zone observe clay toward awesome mistake rigid identify boring'
  const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics)
  console.log('toSuiAddress', testAccountObject.getPublicKey().toSuiAddress())
  return testAccountObject
}
// 57ea9026ef905e69e6238b66f405146f5a88472d
export function buildTestAccount1(): Ed25519Keypair {
  const mnemonics = 'garden naive sibling glow thumb spawn spare claw nasty choice hero south'
  const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics)
  console.log('toSuiAddress', testAccountObject.getPublicKey().toSuiAddress())
  return testAccountObject
}
