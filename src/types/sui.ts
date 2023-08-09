import { TransactionArgument } from '@mysten/sui.js/transactions'
import Decimal from 'decimal.js'

export type SuiAddressType = string
export type SuiObjectIdType = string
export type BigNumber = Decimal.Value | number | string

export const CLOCK_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000006'

export const ClmmIntegratePoolModule = 'pool_script'
export const ClmmIntegrateRouterModule = 'router'
export const ClmmIntegrateRouterWithPartnerModule = 'router_with_partner'
export const ClmmFetcherModule = 'fetcher_script'
export const ClmmExpectSwapModule = 'expect_swap'
export const ClmmIntegrateUtilsModule = 'utils'

export const CoinInfoAddress = '0x1::coin::CoinInfo'
export const CoinStoreAddress = '0x1::coin::CoinStore'
export const PoolLiquidityCoinType = 'PoolLiquidityCoin'

export const DeepbookCustodianV2Moudle = 'custodian_v2'
export const DeepbookClobV2Moudle = 'clob_v2'
export const DeepbookEndpointsV2Moudle = 'endpoints_v2'

export type SuiResource = any

export type DataPage<T> = {
  data: T[]
  nextCursor?: any
  hasNextPage: boolean
}

export type PageQuery = {
  cursor?: any
  limit?: number | null
}

export type PaginationArgs = 'all' | PageQuery

export type NFT = {
  creator: string
  description: string
  image_url: string
  link: string
  name: string
  project_url: string
}

export type SuiStructTag = {
  full_address: string
  source_address: string
  address: SuiAddressType
  module: string
  name: string
  type_arguments: SuiAddressType[]
}

export type SuiBasicTypes = 'address' | 'bool' | 'u8' | 'u16' | 'u32' | 'u64' | 'u128' | 'u256'

export type SuiTxArg = TransactionArgument | string | number | bigint | boolean

export type SuiInputTypes = 'object' | SuiBasicTypes

export const getDefaultSuiInputType = (value: any): SuiInputTypes => {
  if (typeof value === 'string' && value.startsWith('0x')) {
    return 'object'
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return 'u64'
  }
  if (typeof value === 'boolean') {
    return 'bool'
  }
  throw new Error(`Unknown type for value: ${value}`)
}
