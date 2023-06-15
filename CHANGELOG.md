# @cetusprotocol/cetus-sui-clmm-sdk


## 3.0.x

### Patch Changes

- Add `calculateFee` in `PositionModule`
- Add `calculateSwapFeeAndImpact` in `SwapModule`

## 3.0.2

### Patch Changes

- Add `createAddLiquidityPayload` to support input totalAmount for add liquidity
- Change `loopToGetAllQueryEvents` rename to `queryEvents` and support PaginationArgs
- Change `SDK` rename to `CetusClmmSDK`
- Updated dependencies
  - @mysten/sui.js@0.35.1

## 2.7.2

### Patch Changes

- Add `getPoolImmutablesWithPage` support page
- Add `getPoolsWithPage` support page
- Add `getPositionList` in the `PoolModule`
- Updated dependencies
  - @mysten/sui.js@0.34.1

## 2.6.14

### Patch Changes

- Delete `resoucesModule` and merge code to `PoolModule` and `PositionModule`
- Change `getOwnerCoinAssets` is placed in the SDK.

## 2.6.10

### Patch Changes

- Fix `adjustTransactionForGas` for sui amount less then gas amount
- Add  fetch token and pool list add limit
- Optimize `getTokenListByCoinTypes` for coinType contain zero prefix

## 2.6.7

### Patch Changes

- Optimize `getPositionList` add Package fiter
- Optimize `closePositionTransactionPayload` add collect_fee field

## 2.6.6

### Patch Changes

- Add `moveCallCoinZero`
- Optimize delete gas-config.ts, use default gas budget
- Updated dependencies
  - @mysten/sui.js@0.34.0
- Fix `buildLaunchPadPoolConfig` for decode64 error
