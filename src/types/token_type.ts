import { SuiObjectIdType } from './sui'

export type TokenConfig = {
  coin_registry_id: SuiObjectIdType
  coin_list_owner: SuiObjectIdType
  pool_registry_id: SuiObjectIdType
  pool_list_owner: SuiObjectIdType
}

export type TokenInfo = {
  name: string
  symbol: string
  official_symbol: string
  coingecko_id: string
  decimals: number
  project_url: string
  logo_url: string
  address: string
} & Record<string, any>

export type PoolInfo = {
  symbol: string
  name: string
  decimals: number
  fee: string
  tick_spacing: number
  type: string
  address: string
  coin_a_address: string
  coin_b_address: string
  project_url: string
  sort: number
  is_display_rewarder: boolean
  rewarder_display1: boolean
  rewarder_display2: boolean
  rewarder_display3: boolean
  is_stable: boolean
} & Record<string, any>

export type TokenConfigEvent = {
  coin_registry_id: SuiObjectIdType
  coin_list_owner: SuiObjectIdType
  pool_registry_id: SuiObjectIdType
  pool_list_owner: SuiObjectIdType
}
