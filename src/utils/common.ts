import BN from 'bn.js'
import { fromB64, fromHEX } from '@mysten/bcs'
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519'
import { Secp256k1Keypair } from '@mysten/sui.js/keypairs/secp256k1'
import { SuiObjectResponse } from '@mysten/sui.js/client'
import { ClmmPositionStatus, Pool, Position, PositionReward, Rewarder } from '../types'
import { MathUtil } from '../math'
import { NFT } from '../types/sui'
import { extractStructTagFromType } from './contracts'
import { TickData } from '../types/clmmpool'
import { d, decimalsMultiplier } from './numbers'
import {
  getMoveObjectType,
  getObjectDeletedResponse,
  getObjectDisplay,
  getObjectFields,
  getObjectId,
  getObjectNotExistsResponse,
  getObjectOwner,
} from './objects'

/**
 * Converts an amount to a decimal value, based on the number of decimals specified.
 * @param  {number | string} amount - The amount to convert to decimal.
 * @param  {number | string} decimals - The number of decimals to use in the conversion.
 * @returns {number} - Returns the converted amount as a number.
 */
export function toDecimalsAmount(amount: number | string, decimals: number | string): number {
  const mul = decimalsMultiplier(d(decimals))

  return Number(d(amount).mul(mul))
}
/**
 * Converts a bigint to an unsigned integer of the specified number of bits.
 * @param {bigint} int - The bigint to convert.
 * @param {number} bits - The number of bits to use in the conversion. Defaults to 32 bits.
 * @returns {string} - Returns the converted unsigned integer as a string.
 */
export function asUintN(int: bigint, bits = 32) {
  return BigInt.asUintN(bits, BigInt(int)).toString()
}
/**
 * Converts a bigint to a signed integer of the specified number of bits.
 * @param {bigint} int - The bigint to convert.
 * @param {number} bits - The number of bits to use in the conversion. Defaults to 32 bits.
 * @returns {number} - Returns the converted signed integer as a number.
 */
export function asIntN(int: bigint, bits = 32) {
  return Number(BigInt.asIntN(bits, BigInt(int)))
}
/**
 * Converts an amount in decimals to its corresponding numerical value.
 * @param {number|string} amount - The amount to convert.
 * @param {number|string} decimals - The number of decimal places used in the amount.
 * @returns {number} - Returns the converted numerical value.
 */
export function fromDecimalsAmount(amount: number | string, decimals: number | string): number {
  const mul = decimalsMultiplier(d(decimals))

  return Number(d(amount).div(mul))
}
/**
 * Converts a secret key in string or Uint8Array format to an Ed25519 key pair.
 * @param {string|Uint8Array} secretKey - The secret key to convert.
 * @param {string} ecode - The encoding of the secret key ('hex' or 'base64'). Defaults to 'hex'.
 * @returns {Ed25519Keypair} - Returns the Ed25519 key pair.
 */
export function secretKeyToEd25519Keypair(secretKey: string | Uint8Array, ecode: 'hex' | 'base64' = 'hex'): Ed25519Keypair {
  if (secretKey instanceof Uint8Array) {
    const key = Buffer.from(secretKey)
    return Ed25519Keypair.fromSecretKey(key)
  }

  const hexKey = ecode === 'hex' ? fromHEX(secretKey) : fromB64(secretKey)
  return Ed25519Keypair.fromSecretKey(hexKey)
}
/**
 * Converts a secret key in string or Uint8Array format to a Secp256k1 key pair.
 * @param {string|Uint8Array} secretKey - The secret key to convert.
 * @param {string} ecode - The encoding of the secret key ('hex' or 'base64'). Defaults to 'hex'.
 * @returns {Ed25519Keypair} - Returns the Secp256k1 key pair.
 */
export function secretKeyToSecp256k1Keypair(secretKey: string | Uint8Array, ecode: 'hex' | 'base64' = 'hex'): Secp256k1Keypair {
  if (secretKey instanceof Uint8Array) {
    const key = Buffer.from(secretKey)
    return Secp256k1Keypair.fromSecretKey(key)
  }
  const hexKey = ecode === 'hex' ? fromHEX(secretKey) : fromB64(secretKey)
  return Secp256k1Keypair.fromSecretKey(hexKey)
}
/**
 * Builds a pool name based on two coin types and tick spacing.
 * @param {string} coin_type_a - The type of the first coin.
 * @param {string} coin_type_b - The type of the second coin.
 * @param {string} tick_spacing - The tick spacing of the pool.
 * @returns {string} - The name of the pool.
 */
function buildPoolName(coin_type_a: string, coin_type_b: string, tick_spacing: string) {
  const coinNameA = extractStructTagFromType(coin_type_a).name
  const coinNameB = extractStructTagFromType(coin_type_b).name
  return `${coinNameA}-${coinNameB}[${tick_spacing}]`
}
/**
 * Builds a Pool object based on a SuiObjectResponse.
 * @param {SuiObjectResponse} objects - The SuiObjectResponse containing information about the pool.
 * @returns {Pool} - The built Pool object.
 */
export function buildPool(objects: SuiObjectResponse): Pool {
  const type = getMoveObjectType(objects) as string
  const formatType = extractStructTagFromType(type)
  const fields = getObjectFields(objects) as any
  const rewarders: Rewarder[] = []
  fields.rewarder_manager.fields.rewarders.forEach((item: any) => {
    const { emissions_per_second } = item.fields
    const emissionSeconds = MathUtil.fromX64(new BN(emissions_per_second))
    const emissionsEveryDay = Math.floor(emissionSeconds.toNumber() * 60 * 60 * 24)

    rewarders.push({
      emissions_per_second,
      coinAddress: extractStructTagFromType(item.fields.reward_coin.fields.name).source_address,
      growth_global: item.fields.growth_global,
      emissionsEveryDay,
    })
  })

  const pool: Pool = {
    poolAddress: getObjectId(objects),
    poolType: type,
    coinTypeA: formatType.type_arguments[0],
    coinTypeB: formatType.type_arguments[1],
    coinAmountA: fields.coin_a,
    coinAmountB: fields.coin_b,
    current_sqrt_price: fields.current_sqrt_price,
    current_tick_index: asIntN(BigInt(fields.current_tick_index.fields.bits)),
    fee_growth_global_a: fields.fee_growth_global_a,
    fee_growth_global_b: fields.fee_growth_global_b,
    fee_protocol_coin_a: fields.fee_protocol_coin_a,
    fee_protocol_coin_b: fields.fee_protocol_coin_b,
    fee_rate: fields.fee_rate,
    is_pause: fields.is_pause,
    liquidity: fields.liquidity,
    position_manager: {
      positions_handle: fields.position_manager.fields.positions.fields.id.id,
      size: fields.position_manager.fields.positions.fields.size,
    },
    rewarder_infos: rewarders,
    rewarder_last_updated_time: fields.rewarder_manager.fields.last_updated_time,
    tickSpacing: fields.tick_spacing,
    ticks_handle: fields.tick_manager.fields.ticks.fields.id.id,
    uri: fields.url,
    index: Number(fields.index),
    name: '',
  }
  pool.name = buildPoolName(pool.coinTypeA, pool.coinTypeB, pool.tickSpacing)
  return pool
}
/**
 * Builds an NFT object based on a response containing information about the NFT.
 * @param {any} objects - The response containing information about the NFT.
 * @returns {NFT} - The built NFT object.
 */
export function buildNFT(objects: any): NFT {
  const fields = getObjectDisplay(objects).data
  const nft: NFT = {
    creator: '',
    description: '',
    image_url: '',
    link: '',
    name: '',
    project_url: '',
  }
  if (fields) {
    nft.creator = fields.creator
    nft.description = fields.description
    nft.image_url = fields.image_url
    nft.link = fields.link
    nft.name = fields.name
    nft.project_url = fields.project_url
  }
  return nft
}

/** Builds a Position object based on a SuiObjectResponse.
 * @param {SuiObjectResponse} objects - The SuiObjectResponse containing information about the position.
 * @returns {Position} - The built Position object.
 */
export function buildPosition(objects: SuiObjectResponse): Position {
  let nft: NFT = {
    creator: '',
    description: '',
    image_url: '',
    link: '',
    name: '',
    project_url: '',
  }

  let position = {
    ...nft,
    pos_object_id: '',
    owner: '',
    type: '',
    coin_type_a: '',
    coin_type_b: '',
    liquidity: '',
    tick_lower_index: 0,
    tick_upper_index: 0,
    index: 0,
    pool: '',
    reward_amount_owed_0: '0',
    reward_amount_owed_1: '0',
    reward_amount_owed_2: '0',
    reward_growth_inside_0: '0',
    reward_growth_inside_1: '0',
    reward_growth_inside_2: '0',
    fee_growth_inside_a: '0',
    fee_owed_a: '0',
    fee_growth_inside_b: '0',
    fee_owed_b: '0',
    position_status: ClmmPositionStatus.Exists,
  }
  let fields = getObjectFields(objects)
  if (fields) {
    const type = getMoveObjectType(objects) as string
    const ownerWarp = getObjectOwner(objects) as {
      AddressOwner: string
    }

    if ('nft' in fields) {
      fields = fields.nft.fields
      nft.description = fields.description as string
      nft.name = fields.name
      nft.link = fields.url
    } else {
      nft = buildNFT(objects)
    }

    position = {
      ...nft,
      pos_object_id: fields.id.id,
      owner: ownerWarp.AddressOwner,
      type,
      coin_type_a: fields.coin_type_a.fields.name,
      coin_type_b: fields.coin_type_b.fields.name,
      liquidity: fields.liquidity,
      tick_lower_index: asIntN(BigInt(fields.tick_lower_index.fields.bits)),
      tick_upper_index: asIntN(BigInt(fields.tick_upper_index.fields.bits)),
      index: fields.index,
      pool: fields.pool,
      reward_amount_owed_0: '0',
      reward_amount_owed_1: '0',
      reward_amount_owed_2: '0',
      reward_growth_inside_0: '0',
      reward_growth_inside_1: '0',
      reward_growth_inside_2: '0',
      fee_growth_inside_a: '0',
      fee_owed_a: '0',
      fee_growth_inside_b: '0',
      fee_owed_b: '0',
      position_status: ClmmPositionStatus.Exists,
    }
  }

  const deletedResponse = getObjectDeletedResponse(objects)
  if (deletedResponse) {
    position.pos_object_id = deletedResponse.objectId
    position.position_status = ClmmPositionStatus.Deleted
  }
  const objectNotExistsResponse = getObjectNotExistsResponse(objects)
  if (objectNotExistsResponse) {
    position.pos_object_id = objectNotExistsResponse
    position.position_status = ClmmPositionStatus.NotExists
  }

  return position
}
/**
 * Builds a PositionReward object based on a response containing information about the reward.
 * @param {any} fields - The response containing information about the reward.
 * @returns {PositionReward} - The built PositionReward object.
 */
export function buildPositionReward(fields: any): PositionReward {
  const rewarders = {
    reward_amount_owed_0: '0',
    reward_amount_owed_1: '0',
    reward_amount_owed_2: '0',
    reward_growth_inside_0: '0',
    reward_growth_inside_1: '0',
    reward_growth_inside_2: '0',
  }
  fields = 'fields' in fields ? fields.fields : fields

  fields.rewards.forEach((item: any, index: number) => {
    const { amount_owned, growth_inside } = 'fields' in item ? item.fields : item
    if (index === 0) {
      rewarders.reward_amount_owed_0 = amount_owned
      rewarders.reward_growth_inside_0 = growth_inside
    } else if (index === 1) {
      rewarders.reward_amount_owed_1 = amount_owned
      rewarders.reward_growth_inside_1 = growth_inside
    } else if (index === 2) {
      rewarders.reward_amount_owed_2 = amount_owned
      rewarders.reward_growth_inside_2 = growth_inside
    }
  })

  const tick_lower_index = 'fields' in fields.tick_lower_index ? fields.tick_lower_index.fields.bits : fields.tick_lower_index.bits
  const tick_upper_index = 'fields' in fields.tick_upper_index ? fields.tick_upper_index.fields.bits : fields.tick_upper_index.bits

  const possition: PositionReward = {
    liquidity: fields.liquidity,
    tick_lower_index: asIntN(BigInt(tick_lower_index)),
    tick_upper_index: asIntN(BigInt(tick_upper_index)),
    ...rewarders,
    fee_growth_inside_a: fields.fee_growth_inside_a,
    fee_owed_a: fields.fee_owned_a,
    fee_growth_inside_b: fields.fee_growth_inside_b,
    fee_owed_b: fields.fee_owned_b,
    pos_object_id: fields.position_id,
  }
  return possition
}
/**
 * Builds a TickData object based on a response containing information about tick data.
 * @param {SuiObjectResponse} objects - The response containing information about tick data.
 * @returns {TickData} - The built TickData object.
 */
export function buildTickData(objects: SuiObjectResponse): TickData {
  const fields = getObjectFields(objects)

  const valueItem = fields.value.fields.value.fields
  const possition: TickData = {
    objectId: getObjectId(objects),
    index: asIntN(BigInt(valueItem.index.fields.bits)),
    sqrtPrice: new BN(valueItem.sqrt_price),
    liquidityNet: new BN(valueItem.liquidity_net.fields.bits),
    liquidityGross: new BN(valueItem.liquidity_gross),
    feeGrowthOutsideA: new BN(valueItem.fee_growth_outside_a),
    feeGrowthOutsideB: new BN(valueItem.fee_growth_outside_b),
    rewardersGrowthOutside: valueItem.rewards_growth_outside,
  }

  return possition
}
/**
 * Builds a TickData object based on a given event's fields.
 * @param {any} fields - The fields of an event.
 * @returns {TickData} - The built TickData object.
 */
export function buildTickDataByEvent(fields: any): TickData {
  const tick: TickData = {
    objectId: '',
    index: asIntN(BigInt(fields.index.bits)),
    sqrtPrice: new BN(fields.sqrt_price),
    liquidityNet: new BN(fields.liquidity_net.bits),
    liquidityGross: new BN(fields.liquidity_gross),
    feeGrowthOutsideA: new BN(fields.fee_growth_outside_a),
    feeGrowthOutsideB: new BN(fields.fee_growth_outside_b),
    rewardersGrowthOutside: fields.rewards_growth_outside,
  }

  return tick
}
