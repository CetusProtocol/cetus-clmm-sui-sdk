import { SuiObjectIdType } from './sui'

/**
 * Represents configurations specific to the Cetus protocol.
 */
export type CetusConfigs = {
  /**
   * The object identifier of the coin list.
   */
  coin_list_id: SuiObjectIdType

  /**
   * The object identifier of the coin list handle.
   */
  coin_list_handle: SuiObjectIdType

  /**
   * The object identifier of the launchpad pools.
   */
  launchpad_pools_id: SuiObjectIdType

  /**
   * The object identifier of the launchpad pools handle.
   */
  launchpad_pools_handle: SuiObjectIdType

  /**
   * The object identifier of the CLMM (Cryptocurrency Liquidity Mining Module) pools.
   */
  clmm_pools_id: SuiObjectIdType

  /**
   * The object identifier of the CLMM pools handle.
   */
  clmm_pools_handle: SuiObjectIdType

  /**
   * The object identifier of the admin cap.
   */
  admin_cap_id: SuiObjectIdType

  /**
   * The object identifier of the global configuration.
   */
  global_config_id: SuiObjectIdType
}

/**
 * Represents configuration data for a cryptocurrency coin.
 */
export type CoinConfig = {
  /**
   * The unique identifier of the coin.
   */
  id: string

  /**
   * The name of the coin.
   */
  name: string

  /**
   * The symbol of the coin.
   */
  symbol: string

  /**
   * The address associated with the coin.
   */
  address: string

  /**
   * The Pyth identifier of the coin.
   */
  pyth_id: string

  /**
   * The project URL related to the coin.
   */
  project_url: string

  /**
   * The URL to the logo image of the coin.
   */
  logo_url: string

  /**
   * The number of decimal places used for the coin.
   */
  decimals: number

  /**
   * Additional properties for the coin configuration.
   */
} & Record<string, any>

/**
 * Represents configuration data for a CLMM pool.
 */
export type ClmmPoolConfig = {
  /**
   * The unique identifier of the CLMM pool.
   */
  id: string

  /**
   * Indicates if the CLMM pool is closed.
   */
  is_closed: boolean

  /**
   * Indicates if the rewarder for the CLMM pool is shown.
   */
  is_show_rewarder: boolean

  /**
   * The address of the CLMM pool.
   */
  pool_address: string

  /**
   * The type of the CLMM pool.
   */
  pool_type: string

  /**
   * The project URL related to the CLMM pool.
   */
  project_url: string

  /**
   * Indicates if rewarder 1 is shown for the CLMM pool.
   */
  show_rewarder_1: boolean

  /**
   * Indicates if rewarder 2 is shown for the CLMM pool.
   */
  show_rewarder_2: boolean

  /**
   * Indicates if rewarder 3 is shown for the CLMM pool.
   */
  show_rewarder_3: boolean

  /**
   * Additional properties for the CLMM pool configuration.
   */
} & Record<string, any>

/**
 * Represents configuration data for a launchpad pool.
 */
export type LaunchpadPoolConfig = {
  /**
   * The object identifier of the launchpad pool.
   */
  id: SuiObjectIdType

  /**
   * Indicates if the settlement is shown for the launchpad pool.
   */
  show_settle: boolean

  /**
   * The symbol of the coin associated with the launchpad pool.
   */
  coin_symbol: string

  /**
   * The name of the coin associated with the launchpad pool.
   */
  coin_name: string

  /**
   * The icon of the coin associated with the launchpad pool.
   */
  coin_icon: string

  /**
   * An array of banner URLs for the launchpad pool.
   */
  banners: string[]

  /**
   * The introduction text for the launchpad pool.
   */
  introduction: string

  /**
   * Indicates if the launchpad pool is closed.
   */
  is_closed: boolean

  /**
   * The address of the launchpad pool.
   */
  pool_address: string

  /**
   * The project details for the launchpad pool.
   */
  project_details: string

  /**
   * The regulation details for the launchpad pool.
   */
  regulation: string

  /**
   * An array of social media links for the launchpad pool.
   */
  social_media: {
    name: string
    link: string
  }[]

  /**
   * The terms and conditions for the launchpad pool.
   */
  terms: string

  /**
   * The tokenomics information for the launchpad pool.
   */
  tokenomics: string

  /**
   * The website URL for the launchpad pool.
   */
  website: string

  /**
   * The terms and conditions for the white list of the launchpad pool.
   */
  white_list_terms: string

  /**
   * Additional properties for the launchpad pool configuration.
   */
} & Record<string, any>
