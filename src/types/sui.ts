import { TransactionArgument } from '@mysten/sui/transactions'
import Decimal from 'decimal.js'
import { ClmmpoolsError, TypesErrorCode } from '../errors/errors'

/**
 * Represents a SUI address, which is a string.
 */
export type SuiAddressType = string
/**
 * Represents a SUI object identifier, which is a string.
 */
export type SuiObjectIdType = string
/**
 * Represents a BigNumber, which can be a Decimal.Value, number, or string.
 */
export type BigNumber = Decimal.Value | number | string
/**
 * The address representing the clock in the system.
 */
export const CLOCK_ADDRESS = '0x0000000000000000000000000000000000000000000000000000000000000006'

/**
 * Constants for different modules in the CLMM (Cryptocurrency Liquidity Mining Module).
 */
export const ClmmPartnerModule = 'partner'
export const ClmmIntegratePoolModule = 'pool_script'
export const ClmmIntegratePoolV2Module = 'pool_script_v2'
export const ClmmIntegratePoolV3Module = 'pool_script_v3'
export const ClmmIntegrateRouterModule = 'router'
export const ClmmIntegrateRouterWithPartnerModule = 'router_with_partner'
export const ClmmFetcherModule = 'fetcher_script'
export const ClmmExpectSwapModule = 'expect_swap'
export const ClmmIntegrateUtilsModule = 'utils'

/**
 * The address for CoinInfo module.
 */
export const CoinInfoAddress = '0x1::coin::CoinInfo'
/**
 * The address for CoinStore module.
 */
export const CoinStoreAddress = '0x1::coin::CoinStore'
/**
 * Constants for different modules in the Deepbook system.
 */

export const DeepbookCustodianV2Moudle = 'custodian_v2'
export const DeepbookClobV2Moudle = 'clob_v2'
export const DeepbookEndpointsV2Moudle = 'endpoints_v2'

/**
 * Represents a SUI resource, which can be of any type.
 */
export type SuiResource = any

/**
 * Represents a paginated data page with optional cursor and limit.
 */
export type DataPage<T> = {
  data: T[]
  nextCursor?: any
  hasNextPage: boolean
}

/**
 * Represents query parameters for pagination.
 */
export type PageQuery = {
  cursor?: any
  limit?: number | null
}

/**
 * Represents arguments for pagination, with options for fetching all data or using PageQuery.
 */
export type PaginationArgs = 'all' | PageQuery

/**
 * Represents a Non-Fungible Token (NFT) with associated metadata.
 */
export type NFT = {
  /**
   * The address or identifier of the creator of the NFT.
   */
  creator: string

  /**
   * A description providing additional information about the NFT.
   */
  description: string

  /**
   * The URL to the image representing the NFT visually.
   */
  image_url: string

  /**
   * A link associated with the NFT, providing more details or interactions.
   */
  link: string

  /**
   * The name or title of the NFT.
   */
  name: string

  /**
   * The URL to the project or collection associated with the NFT.
   */
  project_url: string
}

/**
 * Represents a SUI struct tag.
 */
export type SuiStructTag = {
  /**
   * The full address of the struct.
   */
  full_address: string

  /**
   * The source address of the struct.
   */
  source_address: string

  /**
   * The address of the struct.
   */
  address: SuiAddressType

  /**
   * The module to which the struct belongs.
   */
  module: string

  /**
   * The name of the struct.
   */
  name: string

  /**
   * An array of type arguments (SUI addresses) for the struct.
   */
  type_arguments: SuiAddressType[]
}

/**
 * Represents basic SUI data types.
 */
export type SuiBasicTypes = 'address' | 'bool' | 'u8' | 'u16' | 'u32' | 'u64' | 'u128' | 'u256'

/**
 * Represents a SUI transaction argument, which can be of various types.
 */
export type SuiTxArg = TransactionArgument | string | number | bigint | boolean

/**
 * Represents input types for SUI data.
 */
export type SuiInputTypes = 'object' | SuiBasicTypes

/**
 * Gets the default SUI input type based on the provided value.
 * @param value - The value to determine the default input type for.
 * @returns The default SUI input type.
 * @throws Error if the type of the value is unknown.
 */
export const getDefaultSuiInputType = (value: any): SuiInputTypes => {
  if (typeof value === 'string' && value.startsWith('0x')) {
    return 'object' // Treat value as an object if it starts with '0x'.
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return 'u64' // Treat number or bigint values as 'u64' type.
  }
  if (typeof value === 'boolean') {
    return 'bool' // Treat boolean values as 'bool' type.
  }
  throw new ClmmpoolsError(`Unknown type for value: ${value}`, TypesErrorCode.InvalidType)
}
