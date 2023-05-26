/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable camelcase */
import {
  Ed25519Keypair,
  getMoveObjectType,
  getObjectDeletedResponse,
  getObjectDisplay,
  getObjectFields,
  getObjectId,
  getObjectNotExistsResponse,
  getObjectOwner,
  ObjectContentFields,
  ObjectType,
  PaginatedObjectsResponse,
  PaginationArguments,
  Secp256k1Keypair,
  SuiAddress,
  SuiObjectDataOptions,
  SuiObjectResponse,
  SuiObjectResponseQuery,
} from '@mysten/sui.js'
import BN from 'bn.js'
import { fromB64, fromHEX } from '@mysten/bcs'
import { ClmmPositionStatus, Pool, Position, PositionReward, Rewarder } from '../types'
import { MathUtil } from '../math'
import { NFT, SuiObjectIdType } from '../types/sui'
import { extractStructTagFromType } from './contracts'
import { TickData } from '../types/clmmpool'
import { d, decimalsMultiplier } from './numbers'
import SDK from '../main'

export function toDecimalsAmount(amount: number | string, decimals: number | string): number {
  const mul = decimalsMultiplier(d(decimals))

  return Number(d(amount).mul(mul))
}

export function asUintN(int: bigint, bits = 32) {
  return BigInt.asUintN(bits, BigInt(int)).toString()
}

export function asIntN(int: bigint, bits = 32) {
  return Number(BigInt.asIntN(bits, BigInt(int)))
}

export function fromDecimalsAmount(amount: number | string, decimals: number | string): number {
  const mul = decimalsMultiplier(d(decimals))

  return Number(d(amount).div(mul))
}

export function secretKeyToEd25519Keypair(secretKey: string | Uint8Array, ecode: 'hex' | 'base64' = 'hex'): Ed25519Keypair {
  if (secretKey instanceof Uint8Array) {
    const key = Buffer.from(secretKey)
    return Ed25519Keypair.fromSecretKey(key)
  }

  const hexKey = ecode === 'hex' ? fromHEX(secretKey) : fromB64(secretKey)
  return Ed25519Keypair.fromSecretKey(hexKey)
}

export function secretKeyToSecp256k1Keypair(secretKey: string | Uint8Array, ecode: 'hex' | 'base64' = 'hex'): Secp256k1Keypair {
  if (secretKey instanceof Uint8Array) {
    const key = Buffer.from(secretKey)
    return Secp256k1Keypair.fromSecretKey(key)
  }
  const hexKey = ecode === 'hex' ? fromHEX(secretKey) : fromB64(secretKey)
  return Secp256k1Keypair.fromSecretKey(hexKey)
}

function buildPoolName(coin_type_a: string, coin_type_b: string, tick_spacing: string) {
  const coinNameA = extractStructTagFromType(coin_type_a).name
  const coinNameB = extractStructTagFromType(coin_type_b).name
  return `${coinNameA}-${coinNameB}[${tick_spacing}]`
}

export function buildPool(objects: SuiObjectResponse): Pool {
  const type = getMoveObjectType(objects) as ObjectType
  const formatType = extractStructTagFromType(type)
  const fields = getObjectFields(objects) as ObjectContentFields
  // console.log('fields: ', fields, type)

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

  let fields = getObjectFields(objects) as ObjectContentFields
  if (fields) {
    const type = getMoveObjectType(objects) as ObjectType
    const ownerWarp = getObjectOwner(objects) as {
      AddressOwner: string
    }

    if ('nft' in fields) {
      fields = fields.nft.fields
      nft.description = fields.description
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

  const possition: PositionReward = {
    liquidity: fields.liquidity,
    tick_lower_index: asIntN(BigInt(fields.tick_lower_index.fields.bits)),
    tick_upper_index: asIntN(BigInt(fields.tick_upper_index.fields.bits)),
    ...rewarders,
    fee_growth_inside_a: fields.fee_growth_inside_a,
    fee_owed_a: fields.fee_owned_a,
    fee_growth_inside_b: fields.fee_growth_inside_b,
    fee_owed_b: fields.fee_owned_b,
    pos_object_id: fields.position_id,
  }
  return possition
}

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

export function buildTickData(objects: SuiObjectResponse): TickData {
  const fields = getObjectFields(objects) as ObjectContentFields

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

export async function loopToGetAllQueryEvents(sdk: any, params: any): Promise<any> {
  let result: any = []
  let cursor = null

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const res: any = await sdk.fullClient.queryEvents({
      ...params,
      cursor,
    })
    if (res.data) {
      result = [...result, ...res.data]
      if (res.hasNextPage) {
        cursor = res.nextCursor
      } else {
        break
      }
    } else {
      break
    }
  }

  return { data: result }
}

export async function getOwnedObjects(
  sdk: SDK,
  owner: SuiAddress,
  params: PaginationArguments<PaginatedObjectsResponse['nextCursor']> & SuiObjectResponseQuery
): Promise<any> {
  let result: any = []
  let cursor = null

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const res: any = await sdk.fullClient.getOwnedObjects({
      owner,
      ...params,
      cursor,
    })
    if (res.data) {
      result = [...result, ...res.data]
      if (res.hasNextPage) {
        cursor = res.nextCursor
      } else {
        break
      }
    } else {
      break
    }
  }

  return { data: result }
}

export async function getDynamicFields(sdk: SDK, parentId: SuiObjectIdType): Promise<any> {
  let result: any = []
  let cursor = null

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const res: any = await sdk.fullClient.getDynamicFields({
      parentId,
      cursor,
    })

    if (res.data) {
      result = [...result, ...res.data]
      if (res.hasNextPage) {
        cursor = res.nextCursor
      } else {
        break
      }
    } else {
      break
    }
  }

  return { data: result }
}

export async function multiGetObjects(sdk: SDK, ids: SuiObjectIdType[], options?: SuiObjectDataOptions, limit = 50): Promise<any[]> {
  let objectDataResponses: any[] = []

  try {
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < Math.ceil(ids.length / limit); i++) {
      // eslint-disable-next-line no-await-in-loop
      const res = await sdk.fullClient.multiGetObjects({
        ids: ids.slice(i * limit, limit * (i + 1)),
        options,
      })
      objectDataResponses = [...objectDataResponses, ...res]
    }
  } catch (error) {
    console.log(error)
  }

  return objectDataResponses
}
