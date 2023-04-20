import {
  Ed25519Keypair,
  normalizeSuiAddress,
  RawSigner,
} from '@mysten/sui.js'
import { TickMath } from '../src/math/tick'
import {  LaunchpadPool, LaunchpadPoolActivityState } from '../src/types/luanchpa_type';
import { d } from '../src/utils/numbers';
import { buildSdk, buildTestAccount, buildSKAccount, buildWJLaunchPadAccountLocal, buildWJLaunchPadAccount, mintAll } from './data/init_test_data';
import { creatPoolList, tokenList } from './data/launchpad_pool_data'
import { cacheTime24h, Pool } from '../src/modules/resourcesModule';
import { toDecimalsAmount } from '../src/utils/common';
import 'isomorphic-fetch';
import { printTransaction, sendTransaction, TransactionUtil } from '../src/utils/transaction-util';
import { LauncpadUtil } from '../src/utils/launchpad';
import BN from 'bn.js';

let sendKeypair: Ed25519Keypair
let launchPadKeypair: Ed25519Keypair

const poolAddress = '0x1e9e02a6a4abbd80e9a46e469a489c4204bf03eb53666346a5a5f2a98e500737'

describe('launch pad Module', () => {
  const sdk = buildSdk()

  beforeEach(async () => {
    sendKeypair = buildTestAccount()
    launchPadKeypair = buildWJLaunchPadAccount()
    sdk.Token.updateCache("getAllRegisteredTokenList",tokenList,cacheTime24h)
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
    const lpCoins = await sdk.Launchpad.getOwnerLaunchpadCoins("0xb5f1e4c53062e4e693d162c271b3ec67619ca2dd4f7d1c3c72efcaceeca2b44b")
    console.log("lpCoins ", lpCoins);

    const joinPools: LaunchpadPool[] = []

    pools.forEach((pool) => {
     const lpType =  sdk.Launchpad.buildLaunchpadCoinType(pool.coin_type_sale,pool.coin_type_raise)
      for (const coin of lpCoins) {
        if (coin.coinAddress === lpType) {
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
      recipient: pool.recipient.length === 0 ?  launchPadKeypair.getPublicKey().toSuiAddress(): pool.recipient,
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

    const transferTxn = await sendTransaction(signer,payload)
    console.log('create_launchpool: ', transferTxn)

    if(transferTxn?.status?.status === "success"){
      const poolImmutables = await sdk.Launchpad.getPoolImmutables()
      console.log('poolImmutables:', poolImmutables)
    }
  })

  test('purchase', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await sdk.Launchpad.getPool(poolAddress)
    sdk.senderAddress = await signer.getAddress()
    console.log('pool: ', pool)

    let raise_amount_in = 12

    if (pool.pool_status != LaunchpadPoolActivityState.Live) {
       throw new Error('The pool is not in live ')
    }

    const raiseCoin = await sdk.Token.getTokenListByCoinTypes([pool.coin_type_raise])
    raise_amount_in = toDecimalsAmount(raise_amount_in, raiseCoin[pool.coin_type_raise].decimals)


    const payload = await sdk.Launchpad.creatPurchasePayload({
      pool_address: pool.pool_address,
      purchase_amount: raise_amount_in.toString(),
      coin_type_sale: pool.coin_type_sale,
      coin_type_raise: pool.coin_type_raise,
    })
    printTransaction(payload)
    const transferTxn = await sendTransaction(signer,payload)
    console.log('purchase: ', transferTxn)
  })

  test('claim', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    sdk.senderAddress = await signer.getAddress()
    const pool = await sdk.Launchpad.getPool(poolAddress)
    console.log('pool: ', pool)

    if (pool.pool_status == LaunchpadPoolActivityState.Ended || pool.pool_status == LaunchpadPoolActivityState.Failed  || pool.pool_status == LaunchpadPoolActivityState.Canceled) {
      const purchaseMark =  await sdk.Launchpad.getPurchaseMark(sendKeypair.getPublicKey().toSuiAddress(),pool.pool_address)
      console.log("purchaseMark: ",purchaseMark);

      let amount_lp = 4
      const raiseCoin = await sdk.Token.getTokenListByCoinTypes([pool.coin_type_raise])
      amount_lp = toDecimalsAmount(amount_lp, raiseCoin[pool.coin_type_raise].decimals)

      if(amount_lp > Number(purchaseMark!.current_amount)){
        throw Error("Insufficient balance")
      }

      const payload = await sdk.Launchpad.creatClaimPayload({
        pool_address: pool.pool_address,
        amount_lp: purchaseMark!.current_amount.toString(),
        coin_type_sale: pool.coin_type_sale,
        coin_type_raise: pool.coin_type_raise,
      })
      printTransaction(payload)
      const transferTxn = await sendTransaction(signer,payload)
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
    let clmmPool : Pool | null= null
    let isOppositeCoinType = false
    const clmmImmutables  = await sdk.Resources.getPoolImmutables()
    for(const item of clmmImmutables){
      if(item.coinTypeA === pool.coin_type_sale && item.coinTypeB === pool.coin_type_raise && Number(item.tickSpacing) === pool.tick_spacing){
        clmmPool = await sdk.Resources.getPool(item.poolAddress)
        console.log('clmmPool: ', clmmPool)
        break
     }

     if(item.coinTypeA === pool.coin_type_raise && item.coinTypeB === pool.coin_type_sale && Number(item.tickSpacing) === pool.tick_spacing){
      clmmPool = await sdk.Resources.getPool(item.poolAddress)
      isOppositeCoinType = true
      console.log('clmmPool: ', clmmPool)
      break
   }
    }

    const coins = await sdk.Token.getTokenListByCoinTypes([pool.coin_type_raise,pool.coin_type_sale])
    const sale_decimals = coins[pool.coin_type_sale].decimals
    const raise_decimals = coins[pool.coin_type_raise].decimals


    if(clmmPool){

     const payload = await sdk.Launchpad.creatSettlePayload({
       pool_address: pool.pool_address,
       coin_type_sale: pool.coin_type_sale,
       coin_type_raise: pool.coin_type_raise,
       current_price: pool.current_price,
       clmm_pool_address: clmmPool.poolAddress,
       clmm_sqrt_price: clmmPool.current_sqrt_price.toString(),
       opposite: isOppositeCoinType,
       sale_decimals,
       raise_decimals
     })


    // console.log(await TransactionUtil.calculationTxGas(sdk,payload));
     printTransaction(payload)
      const transferTxn = await sendTransaction(signer,payload)
      console.log('settle: ', transferTxn)
    }


  })


  test('Withdraw', async () => {
    const signer = new RawSigner(sendKeypair, sdk.fullClient)
    const pool = await sdk.Launchpad.getPool(poolAddress)
    console.log('pool: ', pool)


    if (pool.pool_status == LaunchpadPoolActivityState.Ended || pool.pool_status == LaunchpadPoolActivityState.Failed
       || pool.pool_status == LaunchpadPoolActivityState.Canceled) {


      const saleAmount =  await LauncpadUtil.getWithdrawSale(pool)
      const raiseAmount = await LauncpadUtil.getWithdrawRaise(pool)

      console.log("amount: ",saleAmount,raiseAmount);

      if(BigInt(saleAmount) > 0 || BigInt(raiseAmount) > 0){
        const payload = sdk.Launchpad.creatWithdrawPayload({
          pool_address: pool.pool_address,
          coin_type_sale: pool.coin_type_sale,
          coin_type_raise: pool.coin_type_raise,
          sale_amount: BigInt(saleAmount),
          raise_amount: BigInt(raiseAmount)
        })
        console.log('payload: ', payload.blockData.transactions[0])
        const transferTxn =  await sendTransaction(signer,payload)
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

      const lockNftEvent =  await sdk.Launchpad.getLockNFTEvent(pool.pool_type,pool.tick_spacing,pool.recipient)

      if(lockNftEvent){
        const payload = sdk.Launchpad.creatUnlockNftPayload({
          lock_nft: lockNftEvent.lock_nft_id,
          nft_type: lockNftEvent.nft_type
        })
        console.log('payload: ', payload.blockData.transactions[0])
        const transferTxn =  await sendTransaction(signer,payload)
        console.log('unlock_nft: ', transferTxn)
      }
    } else {
      throw new Error('The pool is not in Ended  ')
    }
  })


  test('getLockNFT', async () => {
    const pool = await sdk.Launchpad.getPool(poolAddress)
     console.log('pool: ', pool)
     if(pool.pool_status === LaunchpadPoolActivityState.Ended){
      const lockNftEvent =  await sdk.Launchpad.getLockNFTEvent(pool.pool_type,pool.tick_spacing, pool.recipient)
      console.log("lockNftEvent: ", lockNftEvent);
      if(lockNftEvent){
        const lockNft =  await sdk.Launchpad.getLockNFT(lockNftEvent.lock_nft_id)
        console.log("lockNft: ", lockNft);
      }
    }
   })



  test('configWhitelistPayload', async () => {
    const signer = new RawSigner(launchPadKeypair, sdk.fullClient)

    const pool = await sdk.Launchpad.getPool(poolAddress)
    console.log('pool: ', pool)

    const localPool  =  creatPoolList.filter((item) => {
      return item.coin_type_sale === pool.coin_type_sale && item.coin_type_raise === pool.coin_type_raise
    })
    const white_config =  localPool[0].white_config

    if(white_config){
      const payload = sdk.Launchpad.configWhitelistPayload({
        pool_address: poolAddress,
        coin_type_raise: pool.coin_type_raise,
        coin_type_sale: pool.coin_type_sale,
        user_addrs: white_config.user_addrs,
        each_safe_cap: white_config.each_safe_cap,
        hard_cap_total: white_config.hard_cap_total
      })

      printTransaction(payload)
      const transferTxn =  await sendTransaction(signer,payload)
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
    const transferTxn =  await sendTransaction(signer,payload)
    console.log('whitelist: ', transferTxn)
  })

  test('isWhiteListUser', async () => {
    const pool = await sdk.Launchpad.getPool(poolAddress)
    console.log('pool: ', pool)
    const isWhiteListUser = await sdk.Launchpad.isWhiteListUser(pool.white_summary.white_handle,sendKeypair.getPublicKey().toSuiAddress())
    console.log('isWhiteListUser: ', isWhiteListUser)
  })

  test('getPurchaseAmount', async () => {
    const pool = await sdk.Launchpad.getPool(poolAddress)
    const purchaseAmount = await sdk.Launchpad.getPurchaseAmount(pool.white_summary.white_handle,"0xf751c72f6462d2c2f4434d085076c85c690a51b584d765bb8863669908835f41")
    console.log('purchaseAmount: ', purchaseAmount)

  })



  test('getPurchaseMark', async () => {
    const purchaseMark = await sdk.Launchpad.getPurchaseMark(sendKeypair.getPublicKey().toSuiAddress(),poolAddress)
    console.log('purchaseMark: ', purchaseMark)

  })

  test('getSettleEvent', async () => {
    const settleEvent = await sdk.Launchpad.getSettleEvent(poolAddress)
    console.log('settleEvent: ', settleEvent)

  })

  test('mint lauchpad token', async () => {
    await mintAll(sdk,sendKeypair,`0x1c0743bf78f52f950c2dd9466762d2f21568c302818f20c98ba5a94590781ca2`,"faucet", "faucetAll")
  })



  test('isAdminCap', async () => {
    //  const isAdminCap = await sdk.Launchpad.isAdminCap(launchPadKeypair.getPublicKey().toSuiAddress())
    //  console.log('isAdminCap: ', isAdminCap)
      //  console.log(TickMath.priceToSqrtPriceX64(d(1).div(2.2),6,6).toString());
      //  console.log(TickMath.sqrtPriceX64ToPrice(new BN("41248173712355948587"),6,9).toNumber());
    // const fixPrice = LauncpadUtil.priceFixToReal(1000000000/CONST_DENOMINATOR, 8, 9)
    // console.log(fixPrice);


  })

})
