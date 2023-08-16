import { SuiObjectIdType } from './sui'

/**
 * Represents configuration for tokens.
 */
export type TokenConfig = {
  /**
   * The object identifier of the coin registry.
   */
  coin_registry_id: SuiObjectIdType

  /**
   * The object identifier of the coin list owner.
   */
  coin_list_owner: SuiObjectIdType

  /**
   * The object identifier of the pool registry.
   */
  pool_registry_id: SuiObjectIdType

  /**
   * The object identifier of the pool list owner.
   */
  pool_list_owner: SuiObjectIdType
}

/**
 * Represents information about a token.
 */
export type TokenInfo = {
  /**
   * The name of the token.
   */
  name: string

  /**
   * The symbol of the token.
   */
  symbol: string

  /**
   * The official symbol of the token.
   */
  official_symbol: string

  /**
   * The Coingecko ID of the token.
   */
  coingecko_id: string

  /**
   * The number of decimal places for the token.
   */
  decimals: number

  /**
   * The project URL for the token.
   */
  project_url: string

  /**
   * The URL to the logo image of the token.
   */
  logo_url: string

  /**
   * The address of the token.
   */
  address: string

  /**
   * Additional properties for the token information.
   */
} & Record<string, any>

/**
 * Represents information about a liquidity pool.
 */
export type PoolInfo = {
  /**
   * The symbol of the pool.
   */
  symbol: string

  /**
   * The name of the pool.
   */
  name: string

  /**
   * The number of decimal places for the pool.
   */
  decimals: number

  /**
   * The fee for the pool.
   */
  fee: string

  /**
   * The tick spacing for the pool.
   */
  tick_spacing: number

  /**
   * The type of the pool.
   */
  type: string

  /**
   * The address of the pool.
   */
  address: string

  /**
   * The address of coin A for the pool.
   */
  coin_a_address: string

  /**
   * The address of coin B for the pool.
   */
  coin_b_address: string

  /**
   * The project URL for the pool.
   */
  project_url: string

  /**
   * The sort order for the pool.
   */
  sort: number

  /**
   * Indicates if the rewarder is displayed for the pool.
   */
  is_display_rewarder: boolean

  /**
   * Indicates if rewarder 1 is displayed for the pool.
   */
  rewarder_display1: boolean

  /**
   * Indicates if rewarder 2 is displayed for the pool.
   */
  rewarder_display2: boolean

  /**
   * Indicates if rewarder 3 is displayed for the pool.
   */
  rewarder_display3: boolean

  /**
   * Indicates if the pool is stable.
   */
  is_stable: boolean

  /**
   * Additional properties for the pool information.
   */
} & Record<string, any>

/**
 * Represents an event related to token configuration.
 */
export type TokenConfigEvent = {
  /**
   * The object identifier of the coin registry.
   */
  coin_registry_id: SuiObjectIdType

  /**
   * The object identifier of the coin list owner.
   */
  coin_list_owner: SuiObjectIdType

  /**
   * The object identifier of the pool registry.
   */
  pool_registry_id: SuiObjectIdType

  /**
   * The object identifier of the pool list owner.
   */
  pool_list_owner: SuiObjectIdType
}
