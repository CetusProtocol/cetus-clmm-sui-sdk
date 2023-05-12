import { Ed25519Keypair, normalizeSuiAddress, RawSigner } from '@mysten/sui.js'
import { LaunchpadPool, LaunchpadPoolActivityState } from '../src/types/luanchpa_type'
import {
  buildSdk,
  buildTestAccount,
  mintAll,
} from './data/init_test_data'
import { creatPoolList, tokenList } from './data/launchpad_pool_data'
import { cacheTime24h, Pool } from '../src/modules/resourcesModule'
import { toDecimalsAmount } from '../src/utils/common'
import 'isomorphic-fetch'
import { printTransaction, sendTransaction } from '../src/utils/transaction-util'
import { LauncpadUtil } from '../src/utils/launchpad'
import {TickMath} from '../src/math'
import BN from 'bn.js'
import Decimal from '../src/utils/decimal'

let sendKeypair: Ed25519Keypair
let launchPadKeypair: Ed25519Keypair

const poolAddress = '0x07405eabb4ffd80f219e9689eb733e0176f71750ccea84f31a646f6c96272ffe'

describe('launch pad Module', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
    launchPadKeypair = buildTestAccount()
    sdk.Token.updateCache('getAllRegisteredTokenList', tokenList, cacheTime24h)
  })

  test('getPoolImmutables', async () => {
    const poolImmutables = await sdk.Launchpad.getPoolImmutables()
    console.log('poolImmutables:', poolImmutables)
  })

  test('getAllPools', async () => {
    const pools = await sdk.Launchpad.getPools()
    console.log('pools:', pools)
  })

  test('getJoinPools', async () => {
    const pools = await sdk.Launchpad.getPools()
    const purchaseMarks = await sdk.Launchpad.getPurchaseMarks(sendKeypair.getPublicKey().toSuiAddress())
    console.log('purchaseMarks ', purchaseMarks)

    const joinPools: LaunchpadPool[] = []

    pools.forEach((pool) => {
      for (const purchaseMark of purchaseMarks) {
        if (purchaseMark.pool_id  === pool.pool_address) {
          joinPools.push(pool)
          break
        }
      }
    })
    console.log('getJoinPools', joinPools)
  })

  test('getOwnerPools', async () => {
    const ownerAddress = normalizeSuiAddress(sendKeypair.getPublicKey().toSuiAddress())
    const pools = await sdk.Launchpad.getPools()

    const joinPools: LaunchpadPool[] = []

    pools.forEach((pool) => {
      if (pool.recipient === ownerAddress) {
        joinPools.push(pool)
      }
    })
    console.log('getJoinPools', joinPools)
  })

  test('getSignlePools', async () => {
    const pool = await sdk.Launchpad.getPool(poolAddress)
    console.log('pool:', pool)
  })

  test('create_launchpool', async () => {
    const signer = new RawSigner(launchPadKeypair, sdk.fullClient)
    const pool = creatPoolList[0]
    sdk.senderAddress = await signer.getAddress()

    const payload = await sdk.Launchpad.creatPoolTransactionPayload({
      recipient: pool.recipient.length === 0 ? launchPadKeypair.getPublicKey().toSuiAddress() : pool.recipient,
      initialize_price: pool.initialize_price.toString(),
      sale_total: pool.sale_total.toString(),
      min_purchase: pool.min_purchase.toString(),
      max_purchase: pool.max_purchase.toString(),
      least_raise_amount: pool.least_raise_amount.toString(),
      hardcap: pool.hardcap.toString(),
      liquidity_rate: pool.liquidity_rate,
      start_time: pool.start_time,
      activity_duration: pool.activity_duration,
      settle_duration: pool.settle_duration,
      locked_duration: pool.locked_duration,
      sale_decimals: pool.sale_decimals,
      raise_decimals: pool.raise_decimals,
      coin_type_sale: pool.coin_type_sale,
      coin_type_raise: pool.coin_type_raise,
      tick_spacing: pool.tick_spacing,
    })
    printTransaction(payload)

    const transferTxn = await sendTransaction(signer, payload)
    console.log('create_launchpool: ', transferTxn)

    if (transferTxn?.status?.status === 'success') {
      const poolImmutables = await sdk.Launchpad.getPoolImmutables()
      console.log('poolImmutables:', poolImmutables)
    }
  })

  test('purchase', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await sdk.Launchpad.getPool(poolAddress)
    sdk.senderAddress = await signer.getAddress()
    console.log('pool: ', pool)

    let raise_amount_in = 0.1

    if (pool.pool_status != LaunchpadPoolActivityState.Live) {
      throw new Error('The pool is not in live ')
    }

    const raiseCoin = await sdk.Token.getTokenListByCoinTypes([pool.coin_type_raise])
    console.log(raiseCoin);

    raise_amount_in = toDecimalsAmount(raise_amount_in, raiseCoin[pool.coin_type_raise].decimals)

    const payload = await sdk.Launchpad.creatPurchasePayload({
      pool_address: pool.pool_address,
      purchase_amount: raise_amount_in.toString(),
      coin_type_sale: pool.coin_type_sale,
      coin_type_raise: pool.coin_type_raise,
    })
    printTransaction(payload)
    const transferTxn = await sendTransaction(signer, payload)
    console.log('purchase: ', transferTxn)
  })

  test('claim', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    sdk.senderAddress = await signer.getAddress()
    const pool = await sdk.Launchpad.getPool(poolAddress)
    console.log('pool: ', pool)

    if (
      pool.pool_status == LaunchpadPoolActivityState.Ended ||
      pool.pool_status == LaunchpadPoolActivityState.Failed ||
      pool.pool_status == LaunchpadPoolActivityState.Canceled
    ) {
      const purchaseMark = (await sdk.Launchpad.getPurchaseMarks(sendKeypair.getPublicKey().toSuiAddress(), [pool.pool_address]))[0]
      console.log('purchaseMark: ', purchaseMark)


      if (Number(purchaseMark!.purchase_total) === 0 ) {
        throw Error('Insufficient balance')
      }

      const payload = await sdk.Launchpad.creatClaimPayload({
        pool_address: pool.pool_address,
        coin_type_sale: pool.coin_type_sale,
        coin_type_raise: pool.coin_type_raise,
      })
      printTransaction(payload)
      const transferTxn = await sendTransaction(signer, payload)
      console.log('claim: ', transferTxn)
    } else {
      throw new Error('The pool is not in Ended or Cancel ')
    }
  })

  test('Settle ', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    sdk.senderAddress = await signer.getAddress()
    const pool = await sdk.Launchpad.getPool(poolAddress)
    console.log('pool: ', pool)

    if (pool.pool_status != LaunchpadPoolActivityState.Settle) {
      throw new Error('The pool is not in settle ')
    }
    // find clmm Pool
    let clmmPool: Pool | null = null
    let isOppositeCoinType = false
    const clmmImmutables = await sdk.Resources.getPoolImmutables()
    for (const item of clmmImmutables) {
      if (
        item.coinTypeA === pool.coin_type_sale &&
        item.coinTypeB === pool.coin_type_raise &&
        Number(item.tickSpacing) === pool.tick_spacing
      ) {
        clmmPool = await sdk.Resources.getPool(item.poolAddress)
        console.log('clmmPool: ', clmmPool)
        break
      }

      if (
        item.coinTypeA === pool.coin_type_raise &&
        item.coinTypeB === pool.coin_type_sale &&
        Number(item.tickSpacing) === pool.tick_spacing
      ) {
        clmmPool = await sdk.Resources.getPool(item.poolAddress)
        isOppositeCoinType = true
        console.log('clmmPool: ', clmmPool)
        break
      }
    }

    const coins = await sdk.Token.getTokenListByCoinTypes([pool.coin_type_raise, pool.coin_type_sale])
    const sale_decimals = coins[pool.coin_type_sale].decimals
    const raise_decimals = coins[pool.coin_type_raise].decimals
    if(pool.liquidity_rate > 0 && clmmPool === null){
      throw new Error('not found clmmPool ')
    }
    let payload
    if (clmmPool) {
       payload = await sdk.Launchpad.creatSettlePayload({
        pool_address: pool.pool_address,
        coin_type_sale: pool.coin_type_sale,
        coin_type_raise: pool.coin_type_raise,
        clmm_args: {
          current_price: pool.current_price,
          clmm_pool_address: clmmPool.poolAddress,
          clmm_sqrt_price: clmmPool.current_sqrt_price.toString(),
          opposite: isOppositeCoinType,
          sale_decimals,
          raise_decimals,
        }
      })
    }else{
      payload = await sdk.Launchpad.creatSettlePayload({
        pool_address: pool.pool_address,
        coin_type_sale: pool.coin_type_sale,
        coin_type_raise: pool.coin_type_raise,
      })
    }

    // const signer = new RawSigner(sendKeypair, sdk.fullClient)
    // sdk.senderAddress = await signer.getAddress()

    // const pool = await sdk.Launchpad.getPool('0x0cf17df95fe570b195629ee9ad0b5de530558b588575c93099f4b42a4511269e')
    // const clmmPool = await sdk.Resources.getPool('0x5b95ff6c8e523181b0439c4c74d83e3d220ccd7c554cfc09253d7f4612b5e4cf')
    // const isOppositeCoinType = false
    // const sale_decimals = 9
    // const raise_decimals = 9

    // const payload = await sdk.Launchpad.creatSettlePayload({
    //   pool_address: pool.pool_address,
    //   coin_type_sale: pool.coin_type_sale,
    //   coin_type_raise: pool.coin_type_raise,
    //   clmm_args: {
    //     current_price: pool.current_price,
    //     clmm_pool_address: clmmPool.poolAddress,
    //     clmm_sqrt_price: clmmPool.current_sqrt_price.toString(),
    //     opposite: isOppositeCoinType,
    //     sale_decimals,
    //     raise_decimals,
    //   }
    // })

    printTransaction(payload)
    const transferTxn = await sendTransaction(signer, payload)
    console.log('settle: ', transferTxn)
  })

  test('Withdraw', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await sdk.Launchpad.getPool(poolAddress)
    console.log('pool: ', pool)

    if (
      pool.pool_status == LaunchpadPoolActivityState.Ended ||
      pool.pool_status == LaunchpadPoolActivityState.Failed ||
      pool.pool_status == LaunchpadPoolActivityState.Canceled
    ) {
      const saleAmount = await LauncpadUtil.getWithdrawSale(pool)
      const raiseAmount = await LauncpadUtil.getWithdrawRaise(pool)

      console.log('amount: ', saleAmount, raiseAmount)

      if (BigInt(saleAmount) > 0 || BigInt(raiseAmount) > 0) {
        const payload = sdk.Launchpad.creatWithdrawPayload({
          pool_address: pool.pool_address,
          coin_type_sale: pool.coin_type_sale,
          coin_type_raise: pool.coin_type_raise,
          sale_amount: BigInt(saleAmount),
          raise_amount: BigInt(raiseAmount),
        })
        console.log('payload: ', payload.blockData.transactions[0])
        const transferTxn = await sendTransaction(signer, payload)
        console.log('Withdraw: ', transferTxn)
      }
    } else {
      throw new Error('The pool is not in Ended or Cancel ')
    }
  })

  test('unlock_nft', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await sdk.Launchpad.getPool(poolAddress)
    console.log('pool: ', pool)

    if (pool.pool_status == LaunchpadPoolActivityState.Ended) {
      // const lockNftEvent = await sdk.Launchpad.getLockNFTEvent(pool.pool_type, pool.tick_spacing, pool.recipient)
      const lockNftInfo = {
        lock_nft_id:'0x71a80f33373cb7fb15819def2e6a5becef3442c3b223a296e18261a9df40e4a8',
        nft_type: '755bf5686c0c51f5ebc6893e4d6fb1a83e577bb10eaa3ed4b7b24407d9de7c6a::position::Position'
      }
      if (lockNftInfo) {
        const payload = sdk.Launchpad.creatUnlockNftPayload({
          lock_nft: lockNftInfo.lock_nft_id,
          nft_type: lockNftInfo.nft_type,
        })
        console.log('payload: ', payload.blockData.transactions[0])
        const transferTxn = await sendTransaction(signer, payload)
        console.log('unlock_nft: ', transferTxn)
      }
    } else {
      throw new Error('The pool is not in Ended  ')
    }
  })

  test('getLockNFTList', async () => {
    const pool = await sdk.Launchpad.getPool(poolAddress)
    if (pool.pool_status === LaunchpadPoolActivityState.Ended) {
      const result = await sdk.Launchpad.getLockNFTList(pool.pool_type, pool.recipient)
      console.log('getLockNFTList: ', result)
    }
  })

  test('addUserToWhitelisPayload', async () => {
    const signer = new RawSigner(launchPadKeypair, sdk.fullClient)

    const pool = await sdk.Launchpad.getPool(poolAddress)
    console.log('pool: ', pool)

    const localPool = creatPoolList.filter((item) => {
      return item.coin_type_sale === pool.coin_type_sale && item.coin_type_raise === pool.coin_type_raise
    })
    const white_config = localPool[0].white_config

    if (white_config) {
      const payload = sdk.Launchpad.addUserToWhitelisPayload({
        pool_address: poolAddress,
        coin_type_raise: pool.coin_type_raise,
        coin_type_sale: pool.coin_type_sale,
        user_addrs: white_config.user_addrs,
        safe_limit_amount: white_config.safe_limit_amount.toString()
      })

      printTransaction(payload)
      const transferTxn = await sendTransaction(signer, payload)
      console.log('whitelist: ', transferTxn)
    }
  })

  test('configWhitelistPayload', async () => {
    const signer = new RawSigner(launchPadKeypair, sdk.fullClient)

    const pool = await sdk.Launchpad.getPool(poolAddress)
    console.log('pool: ', pool)

    const localPool = creatPoolList.filter((item) => {
      return item.coin_type_sale === pool.coin_type_sale && item.coin_type_raise === pool.coin_type_raise
    })
    const white_config = localPool[0].white_config

    if (white_config) {
      const payload = sdk.Launchpad.updateWhitelistCaPayload({
        pool_address: poolAddress,
        coin_type_raise: pool.coin_type_raise,
        coin_type_sale: pool.coin_type_sale,
        hard_cap_total: white_config.hard_cap_total,
        white_list_member: '0xf751c72f6462d2c2f4434d085076c85c690a51b584d765bb8863669908835f41',
        safe_limit_amount: 10_000000000
      })

      printTransaction(payload)
      const transferTxn = await sendTransaction(signer, payload)
      console.log('whitelist: ', transferTxn)
    }
  })

  test('creatRemoveWhitelistPayload', async () => {
    const signer = new RawSigner(launchPadKeypair, sdk.fullClient)

    const pool = await sdk.Launchpad.getPool(poolAddress)
    console.log('pool: ', pool)

    const payload = sdk.Launchpad.creatRemoveWhitelistPayload({
      pool_address: poolAddress,
      coin_type_raise: pool.coin_type_raise,
      coin_type_sale: pool.coin_type_sale,
      user_addrs: [sendKeypair.getPublicKey().toSuiAddress()],
    })

    printTransaction(payload)
    const transferTxn = await sendTransaction(signer, payload)
    console.log('whitelist: ', transferTxn)
  })

  test('isWhiteListUser', async () => {
    const pool = await sdk.Launchpad.getPool(poolAddress)
    console.log('pool: ', pool)
    // const isWhiteListUser = await sdk.Launchpad.isWhiteListUser(pool.white_summary.white_handle, sendKeypair.getPublicKey().toSuiAddress())
    const isWhiteListUser = await sdk.Launchpad.isWhiteListUser(pool.white_summary.white_handle, '0x66fb9f23e7a608317d91a036cb16b44363459fbfa2ab1595d4202ac4d95bb589  ')
    console.log('isWhiteListUser: ', isWhiteListUser)
  })

  test('getPurchaseAmount', async () => {
    const pool = await sdk.Launchpad.getPool(poolAddress)
    const purchaseAmount = await sdk.Launchpad.getPurchaseAmount(
      // pool.white_summary.white_handle,
      '0xfa3b431f67ff07f4469fc9f56b36d07b8c98a696e60102f97bee919a977db658',
      '0x4b253f028ed137c76c66ce3e4d1d19c25227ba9f4c60674099bb19ee52f0bd39'
    )
    console.log('purchaseAmount: ', purchaseAmount)
  })

  test('getPurchaseMark', async () => {
    const purchaseMark = await sdk.Launchpad.getPurchaseMarks("0xf751c72f6462d2c2f4434d085076c85c690a51b584d765bb8863669908835f41", [poolAddress])
    console.log('purchaseMark: ', purchaseMark)
  })

  test('getSettleEvent', async () => {
    const settleEvent = await sdk.Launchpad.getSettleEvent(poolAddress)
    console.log('settleEvent: ', settleEvent)
  })

  test('mint lauchpad token', async () => {
    await mintAll(sdk, launchPadKeypair, {
      faucet_display:`0x8258af69b6d71e5f85670ec062a0ff7c5eb4323148e7fbc00950780f1b876ac7`,
      faucet_router:`0x8258af69b6d71e5f85670ec062a0ff7c5eb4323148e7fbc00950780f1b876ac7`,
    }, 'faucet', 'faucetAll')
  })

  test('isAdminCap', async () => {
    //  const isAdminCap = await sdk.Launchpad.isAdminCap(launchPadKeypair.getPublicKey().toSuiAddress())
    //  console.log('isAdminCap: ', isAdminCap)
    //  console.log(TickMath.priceToSqrtPriceX64(d(1).div(2.2),6,6).toString());
    //  console.log(TickMath.sqrtPriceX64ToPrice(new BN("41248173712355948587"),6,9).toNumber());
    // const fixPrice = LauncpadUtil.priceFixToReal(1000000000/CONST_DENOMINATOR, 8, 9)
    // console.log(fixPrice);

    console.log(TickMath.sqrtPriceX64ToPrice(new BN("3689348814741910323"),6,9).toString());
    // console.log(TickMath.priceToSqrtPriceX64(new Decimal("1"),6,6).toString());
  })
})
