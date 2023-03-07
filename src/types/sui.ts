import {
  GetObjectDataResponse,
  SuiEvents,
  SuiMoveNormalizedModule,
  SuiMoveNormalizedModules,
  SuiObjectRef,
  SuiTransactionResponse,
} from '@mysten/sui.js'
import Decimal from 'decimal.js'
import { PoolInfo, TokenConfigEvent, TokenInfo } from '../modules/tokenModule'
import { CreatePartnerEvent, FaucetEvent, InitEvent, PoolImmutables, Pool } from '../modules/resourcesModule'

export type SuiAddressType = string
export type SuiObjectIdType = string
export type BigNumber = Decimal.Value | number | string

export const ClmmIntegrateModule = 'pool_script'
export const ClmmFetcherModule = 'fetcher_script'
export const GasBudget = 2500
export const LiquidityGasBudget = 15000

export const CoinInfoAddress = '0x1::coin::CoinInfo'
export const CoinStoreAddress = '0x1::coin::CoinStore'
export const PoolLiquidityCoinType = 'PoolLiquidityCoin'

export type SuiResource =
  | GetObjectDataResponse
  | SuiObjectRef
  | SuiMoveNormalizedModule
  | SuiMoveNormalizedModules
  | SuiEvents
  | InitEvent
  | PoolImmutables[]
  | Pool[]
  | Pool
  | SuiTransactionResponse
  | FaucetEvent
  | TokenConfigEvent
  | TokenInfo[]
  | PoolInfo[]
  | CreatePartnerEvent[]

export type SuiStructTag = {
  full_address: string
  address: SuiAddressType
  module: string
  name: string
  type_arguments: SuiAddressType[]
}
