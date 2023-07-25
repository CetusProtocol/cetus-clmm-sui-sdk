import { Package } from './clmm_type'
import { SuiObjectIdType } from './sui'

export type CetusConfigs = {
  coin_list_id: SuiObjectIdType
  coin_list_handle: SuiObjectIdType
  launchpad_pools_id: SuiObjectIdType
  launchpad_pools_handle: SuiObjectIdType
  clmm_pools_id: SuiObjectIdType
  clmm_pools_handle: SuiObjectIdType
  admin_cap_id: SuiObjectIdType
  global_config_id: SuiObjectIdType
}

export type CoinConfig = {
  id: string
  name: string
  symbol: string
  address: string
  pyth_id: string
  project_url: string
  logo_url: string
  decimals: number
  coingecko_id: string
} & Record<string, any>

export type ClmmPoolConfig = {
  id: string
  is_closed: boolean
  is_show_rewarder: boolean
  pool_address: string
  pool_type: string
  project_url: string
  show_rewarder_1: boolean
  show_rewarder_2: boolean
  show_rewarder_3: boolean
} & Record<string, any>

export type LaunchpadPoolConfig = {
  id: SuiObjectIdType
  show_settle: boolean
  coin_symbol: string
  coin_name: string
  coin_icon: string
  banners: string[]
  introduction: string
  is_closed: boolean
  pool_address: string
  project_details: string
  regulation: string
  social_media: {
    name: string
    link: string
  }[]
  terms: string
  tokenomics: string
  website: string
  white_list_terms: string
} & Record<string, any>
