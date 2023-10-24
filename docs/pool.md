# Operate the clmm pool and position

- the clmm pool not contains the token metadata.
- all liquidity and swap operations are based on clmm pool.
- code example for this guide can be found [pool.test.ts](https://github.com/CetusProtocol/cetus-clmm-sui-sdk/blob/main/tests/pool.test.ts)

## Fetch the clmm pool and position

```ts
//Fetch all clmm pools
const assignPools = [''] // query assign pool, if it's empty, query all.
const offset = 0  // optional paging cursor
const limit = 10  // maximum number of items per page
const pools = await sdk.Pool.getPools(assignPools, offset, limit)

//Fetch all clmm pools (only contain immutable info)
const poolImmutables = await sdk.Pool.getPoolImmutables(assignPools, offset, limit)

//Fetch clmm pool by poolAddress
const pool = await sdk.Pool.getPool(poolAddress)

//Fetch clmm position list of accountAddress for assign poolIds (not contains position rewarders)
const pool = sdk.Position.getPositionList(accountAddress, assignPoolIds)

//Fetch clmm position by position_object_id  (contains position rewarders)
sdk.Position.getPosition(pool.positions_handle, position_object_id)
sdk.Position.getPositionById(position_object_id)
```