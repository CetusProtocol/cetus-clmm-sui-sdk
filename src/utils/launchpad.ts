/* eslint-disable camelcase */
import {
  getMoveObjectType,
  getObjectFields,
  getObjectId,
  ObjectContentFields,
  ObjectType,
  normalizeSuiObjectId,
  SuiObjectResponse,
} from '@mysten/sui.js'
import BN, { min } from 'bn.js'
import { Base64 } from 'js-base64'
import { SDK } from '../sdk'
import {
  CONST_DENOMINATOR,
  LaunchpadPool,
  LaunchpadPoolActivityState,
  LaunchpadPoolConfig,
  LaunchpadPoolState,
} from '../types/luanchpa_type'
import { composeType, extractStructTagFromType } from './contracts'
import { d } from './numbers'

export class LauncpadUtil {
  static priceRealToFix(price: number, saleDecimals: number, raiseDecimals: number): number {
    const subDecimals = d(saleDecimals - raiseDecimals).toNumber()
    return Number(
      d(price)
        .div(d(10).pow(d(subDecimals)))
        .toString()
    )
  }

  static priceFixToReal(price: number, saleDecimals: number, raiseDecimals: number): number {
    const subDecimals = d(saleDecimals - raiseDecimals).toNumber()
    return Number(
      d(price)
        .mul(d(10).pow(d(subDecimals)))
        .toString()
    )
  }

  static raiseTotalAmount(pool: LaunchpadPool, saleDecimals: number, raiseDecimals: number): number {
    const subDecimals = d(saleDecimals - raiseDecimals)
      .abs()
      .toNumber()
    if (saleDecimals > raiseDecimals) {
      return Number(
        d(pool.sale_total)
          .mul(pool.current_price)
          .div(d(10).pow(d(subDecimals)))
          .toString()
      )
    }
    return Number(
      d(pool.sale_total)
        .mul(pool.current_price)
        .mul(d(10).pow(d(subDecimals)))
        .toString()
    )
  }

  static buildLaunchPadPool(objects: SuiObjectResponse): LaunchpadPool {
    const type = getMoveObjectType(objects) as ObjectType
    const formatType = extractStructTagFromType(type)
    const fields = getObjectFields(objects) as ObjectContentFields
    // console.log('fields: ', fields)

    const pool: LaunchpadPool = {
      coin_type_sale: formatType.type_arguments[0],
      coin_type_raise: formatType.type_arguments[1],
      pool_address: normalizeSuiObjectId(getObjectId(objects)),
      pool_type: composeType(formatType.full_address, formatType.type_arguments),
      is_settle: fields.is_settle,
      current_price: d(fields.initialize_price).div(d(CONST_DENOMINATOR)).toString(),
      min_price: '0',
      max_price: '0',
      sale_coin_amount: fields.sale_coin,
      raise_coin_amount: fields.raise_coin,
      reality_raise_total: fields.reality_raise_total,
      sale_total: fields.sale_total,
      min_purchase: fields.min_purchase,
      max_purchase: fields.max_purchase,
      least_raise_amount: fields.least_raise_amount,
      softcap: fields.softcap,
      hardcap: fields.hardcap,
      liquidity_rate: Number(fields.liquidity_rate) / 10000,
      activity_start_time: Number(fields.duration_manager.fields.start_time),
      activity_end_time: 0,
      settle_end_time: 0,
      activity_duration: Number(fields.duration_manager.fields.activity_duration),
      settle_duration: Number(fields.duration_manager.fields.settle_duration),
      locked_duration: Number(fields.duration_manager.fields.locked_duration),
      is_cancel: fields.is_cancel,
      white_summary: {
        white_handle: fields.white_list.fields.users.fields.id.id,
        white_hard_cap_total: fields.white_list.fields.hard_cap_total,
        white_purchase_total: fields.white_list.fields.purchase_total,
        size: Number(fields.white_list.fields.users.fields.size),
      },
      unused_sale: fields.unused_sale,
      harvest_raise: fields.harvest_raise,
      tick_spacing: Number(fields.tick_spacing),
      recipient: fields.recipient,
      purchase_summary: {
        purchase_handle: fields.purchase_list.fields.id.id,
        size: Number(fields.purchase_list.fields.size),
      },
      pool_status: LaunchpadPoolActivityState.Failed,
    }
    LauncpadUtil.updatePoolStatus(pool)
    return pool
  }

  static updatePoolStatus(pool: LaunchpadPoolState): LaunchpadPoolState {
    const now = Number(d(Date.now() / 1000).toFixed(0))
    const end_activity_time = pool.activity_start_time + pool.activity_duration
    const end_settle_time = end_activity_time + pool.settle_duration

    pool.activity_end_time = end_activity_time
    pool.settle_end_time = end_settle_time

    if (pool.is_settle) {
      pool.pool_status = LaunchpadPoolActivityState.Ended
    } else if (pool.is_cancel) {
      pool.pool_status = LaunchpadPoolActivityState.Canceled
    } else if (now < pool.activity_start_time) {
      pool.pool_status = LaunchpadPoolActivityState.Upcoming
    } else if (now > pool.activity_start_time && now < end_activity_time) {
      pool.pool_status = LaunchpadPoolActivityState.Live
    } else if (now > end_activity_time && now < end_settle_time) {
      const raise_value = pool.raise_coin_amount

      if (Number(raise_value) < Number(pool.least_raise_amount)) {
        pool.pool_status = LaunchpadPoolActivityState.Failed
      } else {
        pool.pool_status = LaunchpadPoolActivityState.Settle
      }
    }
    return pool
  }

  /**
   * update Pool Current Price
   * @param pool
   * @param saleDecimals
   * @param raiseDecimals
   * @returns
   */
  static updatePoolCurrentPrice(pool: LaunchpadPool, saleDecimals: number, raiseDecimals: number): number {
    // const raise_value = BigInt(pool.reality_raise_total)

    // if (raise_value < BigInt(pool.softcap)) {
    //   pool.current_price = pool.min_price
    // } else if (raise_value <= BigInt(pool.hardcap)) {
    //   pool.current_price = this.priceFixToReal(
    //     d(raise_value.toString()).div(d(pool.sale_total)).toNumber(),
    //     saleDecimals,
    //     raiseDecimals
    //   ).toString()
    // } else if (raise_value > BigInt(pool.hardcap)) {
    //   pool.current_price = pool.max_price
    // }

    pool.current_price = this.priceFixToReal(Number(pool.current_price), saleDecimals, raiseDecimals).toString()

    return Number(pool.current_price)
  }

  /**
   * calculate Pool Price
   * @param sdk
   * @param pool
   */
  static async calculatePoolPrice(sdk: SDK, pool: LaunchpadPool) {
    const coinInfos = await sdk.Token.getTokenListByCoinTypes([pool.coin_type_sale, pool.coin_type_raise])

    const saleDecimals = coinInfos[pool.coin_type_sale].decimals
    const raiseDecimals = coinInfos[pool.coin_type_raise].decimals

    pool.min_price = this.priceFixToReal(Number(d(pool.softcap).div(d(pool.sale_total))), saleDecimals, raiseDecimals).toString()
    pool.max_price = this.priceFixToReal(Number(d(pool.hardcap).div(d(pool.sale_total))), saleDecimals, raiseDecimals).toString()

    LauncpadUtil.updatePoolCurrentPrice(pool, saleDecimals, raiseDecimals)
  }

  /**
   * https://git.cplus.link/cetus/cetus-launchpad/-/blob/whitelist/sui/IDO/sources/pool.move#L887
   * withdraw_sale_internal
   * @param pool
   * @returns
   */
  static async getWithdrawRaise(pool: LaunchpadPool) {
    if (pool.pool_status === LaunchpadPoolActivityState.Ended) {
      return pool.harvest_raise
    }
    return '0'
  }

  /**
   * https://git.cplus.link/cetus/cetus-launchpad/-/blob/whitelist/sui/IDO/sources/pool.move#L906
   * withdraw_raise_internal
   * @param pool
   * @returns
   */
  static async getWithdrawSale(pool: LaunchpadPool) {
    if (pool.pool_status === LaunchpadPoolActivityState.Ended) {
      return pool.unused_sale
    }
    return pool.sale_coin_amount
  }

  /**
   * https://m8bj5905cd.larksuite.com/docx/V5AKdlbm3o3muFxh2dwu5C9RsTb
   * $$raiseAmount=min(totalRaised，hardcap)$$
   * @param sdk
   * @param pool
   * @returns
   */
  static async getHistoryWithdrawRaise(sdk: SDK, pool: LaunchpadPool) {
    if (pool.pool_status === LaunchpadPoolActivityState.Ended) {
      if (d(pool.harvest_raise).equals(d(0))) {
        const settleEvent = await sdk.Launchpad.getSettleEvent(pool.pool_address)
        if (settleEvent) {
          pool.harvest_raise = settleEvent.unused_raise
        }
      }
      const minAmount = min(new BN(pool.reality_raise_total), new BN(pool.hardcap))
      return d(minAmount.toString()).mul(1 - pool.liquidity_rate)
    }
    return '0'
  }

  static async getHistoryWithdrawSale(sdk: SDK, pool: LaunchpadPool) {
    if (pool.pool_status === LaunchpadPoolActivityState.Ended) {
      const settleEvent = await sdk.Launchpad.getSettleEvent(pool.pool_address)
      if (settleEvent) {
        pool.unused_sale = settleEvent.unused_sale
      }
      return pool.unused_sale
    }
    return '0'
  }

  /**
   * https://m8bj5905cd.larksuite.com/docx/V5AKdlbm3o3muFxh2dwu5C9RsTb
   * Returning the user's assets in excess
   * @param sdk
   * @param pool
   * @returns
   */
  static async getOverrecruitReverseAmount(sdk: SDK, pool: LaunchpadPool) {
    const purchaseMarks = await sdk.Launchpad.getPurchaseMarks(sdk.senderAddress, [pool.pool_address], false)
    if (purchaseMarks.length > 0) {
      const userStakeAmount = purchaseMarks[0].purchase_total
      const userProtectAmount = (await sdk.Launchpad.getPurchaseAmount(pool.white_summary.white_handle, sdk.senderAddress))
        .safe_purchased_amount
      const { white_purchase_total } = pool.white_summary

      return d(userStakeAmount)
        .sub(userProtectAmount)
        .div(d(pool.reality_raise_total).sub(white_purchase_total))
        .mul(d(pool.reality_raise_total).sub(pool.hardcap))
        .toString()
    }
    return '0'
  }

  /**
   * https://m8bj5905cd.larksuite.com/docx/V5AKdlbm3o3muFxh2dwu5C9RsTb
   * @param sdk
   * @param pool
   * @returns
   */
  static async getCanPurchaseAmount(sdk: SDK, pool: LaunchpadPool) {
    const overrecruitReverseAmount = await LauncpadUtil.getOverrecruitReverseAmount(sdk, pool)
    const purchaseMarks = await sdk.Launchpad.getPurchaseMarks(sdk.senderAddress, [pool.pool_address], false)
    if (purchaseMarks) {
      const userStakeAmount = purchaseMarks[0].purchase_total
      d(userStakeAmount).sub(overrecruitReverseAmount).div(pool.current_price)
    }
    return '0'
  }

  static buildLaunchPadPoolConfig(objects: SuiObjectResponse): LaunchpadPoolConfig {
    const fields = getObjectFields(objects) as ObjectContentFields
    const item = fields.value.fields

    const pool: LaunchpadPoolConfig = {
      ...item,
      id: fields.id.id,
    }
    const social_medias: {
      name: string
      link: string
    }[] = []
    item.social_media.fields.contents.forEach((item: any) => {
      social_medias.push({
        name: item.fields.value.fields.name,
        link: item.fields.value.fields.link,
      })
    })
    pool.social_media = social_medias
    try {
      pool.regulation = decodeURIComponent(Base64.decode(pool.regulation).replace(/%/g, '%25'))
    } catch (error) {
      pool.regulation = Base64.decode(pool.regulation)
    }
    return pool
  }
}
