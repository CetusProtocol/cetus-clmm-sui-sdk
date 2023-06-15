import { clmm_mainnet } from './mainnet_config'
import { clmm_testnet } from './testnet_config'

export enum sdkEnv {
  mainnet = 'mainnet',
  testnet = 'testnet',
}

export const currSdkEnv: sdkEnv = sdkEnv.testnet

export function buildSdkOptions() {
  switch (currSdkEnv) {
    case sdkEnv.mainnet:
      return clmm_mainnet
    case sdkEnv.testnet:
      return clmm_testnet
  }
}
