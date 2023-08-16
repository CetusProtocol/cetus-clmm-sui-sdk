
# Partner
We offer a partner function. When you utilize the standard swap method, we will allocate the agreed-upon share to the partner. But, because of sui contract limitations, partner doesn't work in the latesd smart router function with split order and integrate other pools like `deepbook`. 

## 1. Partner AccountCap
Only verified account are eligible to collect partner ref fees. When creating a partner, we generate an object **partner AccountCap**(you can see it in your NFT list). Only accounts that possess the AccountCap are able to claim the fees.

## 2. Claim AccountCap
You can claim the partner ref fee by curl movecall about cetus contract entry function `cetus::partner_script::claim_ref_fee()` on sui explore.

## 3. Scope of application
Now, in smart router, if you open enable options: `orderSplit` or `externalRouter`, it can't support Partner.

### Example
In this example, if you want to use partner, orderSplit must equal `false`.

```ts
  async getBestRouter(
    from: string,
    to: string,
    amount: number,
    byAmountIn: boolean,
    priceSplitPoint: number,
    partner: string,
    senderAddress: string,
    swapWithMultiPoolParams?: PreSwapWithMultiPoolParams,
    orderSplit = true,
    externalRouter = false
  ) {}
```

## 4. check ref fee of partner
How to check ref fee of partner?
We provider one function `sdk.Pool.getPartnerRefFeeAmount()`` to check ref fee.
### Function input params
Please refer to the original function for specific parameter types.
partnerID: The object id about partner.
### Example
```ts
const partnerID = '0x...'
const refFee = await sdk.Pool.getPartnerRefFeeAmount(partnerID)
console.log('ref fee:', refFee)
```