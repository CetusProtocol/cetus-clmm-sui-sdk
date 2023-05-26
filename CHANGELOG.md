# @cetusprotocol/cetus-sui-clmm-sdk

## 2.6.x

### Patch Changes

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
