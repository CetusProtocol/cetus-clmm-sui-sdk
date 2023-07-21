import {  Ed25519Keypair, PublicKey } from '@mysten/sui.js';
import { SDK, SdkOptions } from "../src/sdk";
import { d, decimalsMultiplier } from "../src/utils/numbers";
import { logCat, secretKeyToEd25519Keypair } from '../src/utils/common';
import BN from 'bn.js';



const defaultNetworkOptions: SdkOptions = {
  fullRpcUrl: "https://fullnode.devnet.sui.io:443",
  // fullRpcUrl: "https://fullnode.testnet.sui.io:443",
  networkOptions: {
    modules: {
      LiquidswapDeployer: "0xfad39a7f1abb5d69c98a5a49eac38100cd10fc67",
      globalPauseStatusObjectId: ""
    }
  }
};

export const faucetObjectId = "0x6740d70296035d0345bed636a820af129f6ed422"

const LiquidswapDeployer = defaultNetworkOptions.networkOptions.modules.LiquidswapDeployer
// The test data come from 'sdk.Resources.getAllPool(0xa32a1a12fa8d5d7be589783daf37ffb4d69edaa5)'
export const TokensMapping = {
  "SUI": {
    "address": "0x2::sui::SUI",
    "decimals": 8
  },
  "BTC": {
    "address": `${faucetObjectId}::btc::BTC`,
    "decimals": 8
  },
  "ETH": {
    "address": `${faucetObjectId}::eth::ETH`,
    "decimals": 8
  },
  "USDC": {
    "address":  `${faucetObjectId}::usdc::USDC`,
    "decimals": 8
  },
  "USDT": {
    "address":  `${faucetObjectId}::usdt::USDT`,
    "decimals": 8
  },
  "BTC_ETH_LP": {
    "address": "",
    "decimals": 8,
    "poolObjectId": ""
  },
  "USDT_USDC_LP": {
    "address": `${LiquidswapDeployer}::amm_swap::PoolLiquidityCoin<${faucetObjectId}::usdt::USDT, ${faucetObjectId}::usdc::USDC>`,
    "decimals": 8,
    "poolObjectId": "0x0cfc178be37b95260770bc78d29a100614131d3d"
  },
  "ETH_USDC_LP": {
    "address": `${LiquidswapDeployer}::amm_swap::PoolLiquidityCoin<${faucetObjectId}::eth::ETH, ${faucetObjectId}::usdc::USDC>`,
    "decimals": 8,
    "poolObjectId": "0x2f2eb5e2c5b5c01db521b3caf37b28bea753613a"
  },
  "BTC_USDC_LP": {
    "address": `${LiquidswapDeployer}::amm_swap::PoolLiquidityCoin<${faucetObjectId}::btc::BTC, ${faucetObjectId}::usdc::USDC>`,
    "decimals": 8,
    "poolObjectId": "0xf551ce6053e96cddebc2b67ed99ab9aa008efa15"
  },
  "BAS_SUI_LP": {
    "address": `${LiquidswapDeployer}::amm_swap::PoolLiquidityCoin<0x8595b742525aaf22371f6c6c8cabd58338501a69::babyapessociety::BABYAPESSOCIETY, 0x2::sui::SUI>`,
    "decimals": 8,
    "poolObjectId": "0x96c0645985795851f03cc621411315497202a913"
  }

}

export function buildSdk(): SDK {
  return new SDK(defaultNetworkOptions)
}

export const CoinInfo: any = {
  ETH: { decimals: 8 },
  BTC: { decimals: 8 },
  BTC_ETH_LP: { decimals: 6 },
}

export function convertToDecimals(amount: number | string, token: string) {
  const mul = decimalsMultiplier(CoinInfo[token]?.decimals || 0);

  return d(amount).mul(mul)
}

function prettyAmount(amount: number | string, token: string) {
  const mul = decimalsMultiplier(CoinInfo[token]?.decimals || 0);

  return d(amount).div(mul)
}

export function buildTestAccount1(): Ed25519Keypair {
  const secretKey = "mdqVWeFekT7pqy5T49+tV12jO0m+ESW7ki4zSU9JiCgbL0kJbj5dvQ/PqcDAzZLZqzshVEs01d1KZdmLh4uZIg=="
  const publicUint32 = Uint8Array.from([201, 225, 221, 177, 204, 156, 195,
    221, 112, 205, 233, 168, 254, 130,
    166, 235, 106, 199, 153, 130, 129,
      2, 243, 164, 165,  91,  80,  71,
    115, 155, 177, 143])
  const secretKeyUint32 = Uint8Array.from([228, 160,  37, 143,  93, 238, 187,  13, 211, 182,
    231, 112,  58, 140,   9, 198, 236,  74, 198,  63,
    110, 146, 194, 124, 224, 108,  69,  30, 119, 171,
     28,  82, 201, 225, 221, 177, 204, 156, 195, 221,
    112, 205, 233, 168, 254, 130, 166, 235, 106, 199,
    153, 130, 129,   2, 243, 164, 165,  91,  80,  71,
    115, 155, 177, 143])
  //const testAccountObject =  secretKeyTo9Keypair(secretKey)
  const testAccountObject = secretKeyToEd25519Keypair(secretKeyUint32)
  logCat("toSuiAddress", testAccountObject.getPublicKey().toSuiAddress())
  // change to base64
  //logCat("Base64DataBuffer",new Base64DataBuffer(secretKeyUint32).toString())
  return testAccountObject;
}

export function buildTestAccount(): Ed25519Keypair {
  const mnemonics = "uphold pill enemy zone observe clay toward awesome mistake rigid identify boring"
  const testAccountObject = Ed25519Keypair.deriveKeypair(mnemonics)
  logCat("toSuiAddress", testAccountObject.getPublicKey().toSuiAddress())
  return testAccountObject;
}
