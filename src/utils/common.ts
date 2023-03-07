/* eslint-disable camelcase */
import {
  Ed25519Keypair,
  getMoveObjectType,
  GetObjectDataResponse,
  getObjectFields,
  getObjectId,
  ObjectContentFields,
  ObjectType,
  Secp256k1Keypair,
} from '@mysten/sui.js'
import BN from 'bn.js'
import { Pool, Position } from '../modules/resourcesModule'
import { extractStructTagFromType } from './contracts'
import { TickData } from '../types/clmmpool'

export function secretKeyToEd25519Keypair(secretKey: string | Uint8Array): Ed25519Keypair {
  if (secretKey instanceof Uint8Array) {
    const key = Buffer.from(secretKey)
    return Ed25519Keypair.fromSecretKey(key)
  }
  const key = Buffer.from(secretKey, 'base64')
  return Ed25519Keypair.fromSecretKey(key)
}

export function secretKeyToSecp256k1Keypair(secretKey: string | Uint8Array): Secp256k1Keypair {
  if (secretKey instanceof Uint8Array) {
    const key = Buffer.from(secretKey)
    return Secp256k1Keypair.fromSecretKey(key)
  }
  const key = Buffer.from(secretKey, 'base64')
  return Secp256k1Keypair.fromSecretKey(key)
}

function buildPoolName(coin_type_a: string, coin_type_b: string, tick_spacing: string) {
  const coinNameA = extractStructTagFromType(coin_type_a).name
  const coinNameB = extractStructTagFromType(coin_type_b).name
  return `${coinNameA}-${coinNameB}[${tick_spacing}]`
}

export function buildPool(objects: GetObjectDataResponse): Pool {
  const type = getMoveObjectType(objects) as ObjectType
  const formatType = extractStructTagFromType(type)
  const fields = getObjectFields(objects) as ObjectContentFields

  const pool: Pool = {
    poolAddress: getObjectId(objects),
    poolType: type,
    coinTypeA: formatType.type_arguments[0],
    coinTypeB: formatType.type_arguments[1],
    coinAmountA: fields.coin_a,
    coinAmountB: fields.coin_b,
    current_sqrt_price: fields.current_sqrt_price,
    current_tick_index: Number(BigInt.asIntN(64, BigInt(fields.current_tick_index.fields.bits)).toString()),
    fee_growth_global_a: fields.fee_growth_global_a,
    fee_growth_global_b: fields.fee_growth_global_b,
    fee_protocol_coin_a: fields.fee_protocol_coin_a,
    fee_protocol_coin_b: fields.fee_protocol_coin_b,
    fee_rate: fields.fee_rate,
    is_pause: fields.is_pause,
    liquidity: fields.liquidity,
    positionIndex: fields.position_index,
    positions_handle: fields.positions.fields.id.id,
    protocol_fee_rate: fields.protocol_fee_rate,
    rewarder_infos: fields.rewarder_infos,
    rewarder_last_updated_time: fields.rewarder_last_updated_time,
    tick_indexes_handle: fields.tick_indexes.fields.id.id,
    tickSpacing: fields.tick_spacing,
    ticks_handle: fields.ticks.fields.id.id,
    uri: fields.uri,
    rewarder_balances: fields.rewarder_balances.fields.id.id,
    name: '',
  }
  pool.name = buildPoolName(pool.coinTypeA, pool.coinTypeB, pool.tickSpacing)
  return pool
}

export function buildPosition(objects: GetObjectDataResponse): Position {
  const type = getMoveObjectType(objects) as ObjectType
  const fields = getObjectFields(objects) as ObjectContentFields

  const info = {
    amount_owed: 0,
    growth_inside: 0,
  }
  let rewarder_infos: any[] = [info, info, info]
  if (fields.rewarder_infos.length > 0) {
    rewarder_infos = fields.rewarder_infos
  }

  const possition: Position = {
    pos_object_id: getObjectId(objects),
    type,
    uri: fields.url,
    liquidity: fields.liquidity,
    tick_lower_index: BigInt.asIntN(64, BigInt(fields.tick_lower_index.fields.bits)).toString(),
    tick_upper_index: BigInt.asIntN(64, BigInt(fields.tick_upper_index.fields.bits)).toString(),
    fee_growth_inside_a: fields.fee_growth_inside_a,
    fee_owed_a: fields.fee_owed_a,
    fee_growth_inside_b: fields.fee_growth_inside_b,
    fee_owed_b: fields.fee_owed_b,
    index: fields.index,
    pool: fields.pool,
    name: fields.name,
    reward_amount_owed_0: rewarder_infos[0].amount_owed,
    reward_amount_owed_1: rewarder_infos[1].amount_owed,
    reward_amount_owed_2: rewarder_infos[2].amount_owed,
    reward_growth_inside_0: rewarder_infos[0].growth_inside,
    reward_growth_inside_1: rewarder_infos[1].growth_inside,
    reward_growth_inside_2: rewarder_infos[2].growth_inside,
  }

  return possition
}

export function buildTickData(objects: GetObjectDataResponse): TickData {
  const fields = getObjectFields(objects) as ObjectContentFields
  const valueItem = fields.value.fields
  const possition: TickData = {
    objectId: getObjectId(objects),
    index: BigInt.asIntN(64, BigInt(fields.name.fields.bits)).toString(),
    sqrtPrice: new BN(valueItem.sqrt_price),
    liquidityNet: new BN(valueItem.liquidity_net.fields.bits),
    liquidityGross: new BN(valueItem.liquidity_gross),
    feeGrowthOutsideA: new BN(valueItem.fee_growth_outside_a),
    feeGrowthOutsideB: new BN(valueItem.fee_growth_outside_b),
    rewardersGrowthOutside: valueItem.rewarders_growth_outside,
  }

  return possition
}

export function buildTickDataByEvent(fields: any): TickData {
  const tick: TickData = {
    objectId: '',
    index: BigInt.asIntN(64, BigInt(fields.index.fields.bits)).toString(),
    sqrtPrice: new BN(fields.sqrt_price),
    liquidityNet: new BN(fields.liquidity_net.fields.bits),
    liquidityGross: new BN(fields.liquidity_gross),
    feeGrowthOutsideA: new BN(fields.fee_growth_outside_a),
    feeGrowthOutsideB: new BN(fields.fee_growth_outside_b),
    rewardersGrowthOutside: fields.rewarders_growth_outside,
  }

  return tick
}
