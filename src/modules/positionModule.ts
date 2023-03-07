/* eslint-disable camelcase */
/* eslint-disable no-nested-ternary */
/* eslint-disable class-methods-use-this */
import { MoveCallTransaction } from '@mysten/sui.js'
import { ClmmIntegrateModule, GasBudget, LiquidityGasBudget, SuiAddressType, SuiObjectIdType } from '../types/sui'
import { SDK } from '../sdk'
import { IModule } from '../interfaces/IModule'
import { CoinPairType } from './resourcesModule'

type CommonParams = {
  pool_id: SuiObjectIdType
  pos_id: SuiObjectIdType
}

export type AddLiquidityFixTokenParams = {
  amount_a: number | string
  amount_b: number | string
  fix_amount_a: boolean
} & AddLiquidityCommonParams

export type AddLiquidityParams = {
  delta_liquidity: string
  max_amount_a: number | string
  max_amount_b: number | string
} & AddLiquidityCommonParams

export type AddLiquidityCommonParams = {
  coin_object_ids_a: SuiObjectIdType[]
  coin_object_ids_b: SuiObjectIdType[]
  tick_lower: string | number
  tick_upper: string | number
  is_open: boolean // control whether or not to create a new position or add liquidity on existed position.
} & CoinPairType &
  CommonParams

export type OpenPositionParams = {
  tick_lower: string
  tick_upper: string
  pool_id: SuiObjectIdType
} & CoinPairType

export type RemoveLiquidityParams = {
  coin_types: SuiAddressType[]
  delta_liquidity: string
  min_amount_a: string
  min_amount_b: string
} & CommonParams

export type RemoveLiquidityAndCloseParams = {
  coin_types: SuiAddressType[]
  min_amount_a: string
  min_amount_b: string
} & CommonParams

export type ClosePositionParams = CommonParams & CoinPairType

export type CollectFeeParams = CommonParams & CoinPairType

export class PositionModule implements IModule {
  protected _sdk: SDK

  constructor(sdk: SDK) {
    this._sdk = sdk
  }

  get sdk() {
    return this._sdk
  }

  createAddLiquidityTransactionPayload(
    params: AddLiquidityParams | AddLiquidityFixTokenParams,
    gasBudget = LiquidityGasBudget
  ): MoveCallTransaction {
    const { modules } = this.sdk.sdkOptions.networkOptions

    if (params.coin_object_ids_a.length === 0) {
      throw Error('this coin_object_ids_a is empty')
    }

    if (params.coin_object_ids_b.length === 0) {
      throw Error('this coin_object_ids_a is empty')
    }

    const isFixToken = !('delta_liquidity' in params)
    const isOpen = params.is_open

    const functionName = isFixToken
      ? isOpen
        ? 'open_and_add_liquidity_fix_token'
        : 'add_liquidity_fix_token'
      : isOpen
      ? 'open_and_add_liquidity'
      : 'add_liquidity'
    const typeArguments = [params.coinTypeA, params.coinTypeB]
    const tick_lower = BigInt.asUintN(64, BigInt(params.tick_lower)).toString()
    const tick_upper = BigInt.asUintN(64, BigInt(params.tick_upper)).toString()
    const args = isFixToken
      ? isOpen
        ? [
            params.pool_id,
            params.coin_object_ids_a,
            params.coin_object_ids_b,
            tick_lower,
            tick_upper,
            params.amount_a.toString(),
            params.amount_b.toString(),
            params.fix_amount_a,
          ]
        : [
            params.pool_id,
            params.pos_id,
            params.coin_object_ids_a,
            params.coin_object_ids_b,
            params.amount_a.toString(),
            params.amount_b.toString(),
            params.fix_amount_a,
          ]
      : isOpen
      ? [params.pool_id, params.coin_object_ids_a, params.coin_object_ids_b, tick_lower, tick_upper, params.delta_liquidity]
      : [params.pool_id, params.pos_id, params.coin_object_ids_a, params.coin_object_ids_b, params.delta_liquidity]

    return {
      packageObjectId: modules.cetus_integrate,
      module: ClmmIntegrateModule,
      function: functionName,
      gasBudget,
      typeArguments,
      arguments: args,
    }
  }

  removeLiquidityTransactionPayload(
    params: RemoveLiquidityParams | RemoveLiquidityAndCloseParams,
    gasBudget = LiquidityGasBudget
  ): MoveCallTransaction {
    const { modules } = this.sdk.sdkOptions.networkOptions

    const onlyRemoveLiquidity = 'delta_liquidity' in params
    let functionName = 'remove_liquidity'
    const functionNameArray = ['remove_position', 'remove_position_for_one', 'remove_position_for_two', 'remove_position_for_three']

    if (!onlyRemoveLiquidity) {
      functionName = functionNameArray[params.coin_types.length - 2]
    }

    const typeArguments = [...params.coin_types]
    const args = onlyRemoveLiquidity
      ? [params.pool_id, params.pos_id, params.delta_liquidity, params.min_amount_a, params.min_amount_b]
      : [params.pool_id, params.pos_id, params.min_amount_a, params.min_amount_b]
    return {
      packageObjectId: modules.cetus_integrate,
      module: ClmmIntegrateModule,
      function: functionName,
      gasBudget,
      typeArguments,
      arguments: args,
    }
  }

  closePositionTransactionPayload(params: ClosePositionParams, gasBudget = GasBudget): MoveCallTransaction {
    const { modules } = this.sdk.sdkOptions.networkOptions

    const typeArguments = [params.coinTypeA, params.coinTypeB]
    const args = [params.pool_id, params.pos_id]
    return {
      packageObjectId: modules.cetus_integrate,
      module: ClmmIntegrateModule,
      function: 'close_position',
      gasBudget,
      typeArguments,
      arguments: args,
    }
  }

  openPositionTransactionPayload(params: OpenPositionParams, gasBudget = GasBudget): MoveCallTransaction {
    const { modules } = this.sdk.sdkOptions.networkOptions
    const typeArguments = [params.coinTypeA, params.coinTypeB]
    const tick_lower = BigInt.asUintN(64, BigInt(params.tick_lower)).toString()
    const tick_upper = BigInt.asUintN(64, BigInt(params.tick_upper)).toString()
    const args = [params.pool_id, tick_lower, tick_upper]
    return {
      packageObjectId: modules.cetus_integrate,
      module: ClmmIntegrateModule,
      function: 'open_position',
      gasBudget,
      typeArguments,
      arguments: args,
    }
  }

  collectFeeTransactionPayload(params: CollectFeeParams, gasBudget = GasBudget): MoveCallTransaction {
    const { modules } = this.sdk.sdkOptions.networkOptions

    const typeArguments = [params.coinTypeA, params.coinTypeB]
    const args = [params.pool_id, params.pos_id]
    return {
      packageObjectId: modules.cetus_integrate,
      module: ClmmIntegrateModule,
      function: 'collect_fee',
      gasBudget,
      typeArguments,
      arguments: args,
    }
  }
}
