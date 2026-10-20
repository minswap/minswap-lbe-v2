# 😻 Minswap LBE V2 Contract

> [!WARNING]
> **This contract has a known vulnerability and is deprecated.**
> Minswap no longer maintains or uses the LBE V2 contract. The deprecation was
> announced publicly on X on 19 July 2026:
> https://x.com/MinswapDEX/status/2067981437790191865
>
> Do not deploy this code, do not start new LBE events with it, and do not build
> on it. See [Known Vulnerability](#known-vulnerability) below.

## Known Vulnerability

### Order re-collection permanently freezes an LBE event (High)

**Where:** `apply_collecting_orders` in
[lib/lb_v2/order_validation.ak](/lib/lb_v2/order_validation.ak), called by
`validate_collect_orders`.

**What:** the collect step does not check that an order input is still
uncollected (`is_collected == False`). The only datum check is
`out_datum == OrderDatum { ..in_datum, is_collected: True }`. For an order that
is already collected, this is the identity, so the same order can be collected
again. A collected order keeps its order auth token, so it is still picked up as
a valid order input.

**Effect:** each re-collection adds the order's `amount + penalty_amount` to the
treasury `collected_fund` a second time. The attacker pays the matching raise
tokens into the treasury output. Once `collected_fund` is larger than
`reserve_raise + total_penalty`, no transaction can lower it back:

- `CreateAmmPool` requires `collected_fund == reserve_raise + total_penalty`, so
  the pool can never be created.
- Refund (`validate_refund`) requires the same equality, so a cancelled event
  cannot refund orders either.
- `CancelLBE` does not help: `ByOwner` is only valid before `end_time`,
  `NotReachMinimum` needs the minimum raise to be missed, and `CreatedPool`
  still leads to the blocked refund path.

All raise and base assets escrowed by the event are frozen with no way to
recover them. Nothing can be stolen, but users lose access to their funds.

**Who can trigger it:** anyone, without permission, once the manager is
collected (`is_manager_collected == True`) and at least
`minimum_order_collected` (30) orders are collected, until the AMM pool is
created. The cost to the attacker is the raise tokens of the re-collected orders
(lost to the treasury) plus transaction fees.

**Fix (not applied, contract is deprecated):** require
`in_datum.is_collected == False` in `apply_collecting_orders`.

**Disclosure:** reported through coordinated disclosure in September 2026. The
issue is not covered by the CertiK audit listed below.

**Credit:** found and reported by refangga1337
([GitHub](https://github.com/refangga1337), [X](https://x.com/hxcbtc)). Thank
you for the responsible disclosure.

## Structure

- Main contracts:
  - [Factory Validator](/validators/factory.ak)
  - [Treasury Validator](/validators/factory.ak)
  - [Manager Validator](/validators/manager.ak)
  - [Seller Validator](/validators/seller.ak)
  - [Order Validator](/validators/order.ak)
- Library: under [library](/lib/lb_v2) package

## Building

### Prerequisites

- Install [Bun v1.1.17](https://bun.sh/docs/installation)
- Install [Aiken v1.0.26-alpha](https://aiken-lang.org/installation-instructions)
- Run `aiken build` to double check scripts bytecode in `plutus.json` file
- Run `bun install` to install necessary dependencies

## Testing

- Run `bun check` to run all unit tests.

## Deployment

### Testnet Preprod

The smart contract has already been deployed on Testnet Preprod.

The detailed information on the deployment is located in [References](/lbe-v2-script.json)

#### Beta Testnet Interface:

https://interface-git-lbe-v2-fe-official-minswap.vercel.app/launch-bowl

#### Example Transactions:

- [Init Factory](https://preprod.cardanoscan.io/transaction/47819a36a4d8bde3a6b9baa2b50b4e146a310765e8f0c880d8195bed62b8993a)
- [Create Event](https://preprod.cardanoscan.io/transaction/407b765dc6af580600104b1d86787ef87ff02be82c8e744b135dbc7956c976a6)
- [Update Event](https://preprod.cardanoscan.io/transaction/c04157247a02f89f4585575eaee755f1e0410d7d81ee85b702ab19fb23846e58)
- [Cancel Event](https://preprod.cardanoscan.io/transaction/7502d91b811d81212dc2428d77ddf7581380b8f9b7a481665678a0c1666d967f)
- [Add Seller](https://preprod.cardanoscan.io/transaction/e21b1319348d9c9721edbbbdd94569d6c3bb371f06ca546ca93cbe19a8c56107)
- [Using Seller](https://preprod.cardanoscan.io/transaction/e7a2546117b4aec69f73df503f83e72884ac8a7cdaae19b719d557ab22911382)
- [Collect Seller](https://preprod.cardanoscan.io/transaction/4d0dcc3079e1fb460dda75f186f4081c8a7d0633d9d9dbe5408c71f341ccf99e)
- [Collect Order](https://preprod.cardanoscan.io/transaction/e82529b937cbbd2ffef9e5025e7bbb8ef844a77d094d8d87c9e5e37858e6c3c9)
- [Collect Manager](https://preprod.cardanoscan.io/transaction/0992cee10c321a9093feef1987746182973afb8c4ddf04973c14bff7e3d2c17d)
- [Create Amm Pool](https://preprod.cardanoscan.io/transaction/fd3e1aa1ebd5a735576fcf53eeb8a4b57972d26fa7b4e1e8902cd124f8088052)
- [Redeem Order](https://preprod.cardanoscan.io/transaction/5c537e504717d7535056f87fb3b0267b10cc4203b0710e7986dd3e6b5890e75f)

### Mainnet

TODO

## Audit Report

The contract audit has been conducted by Certik. The Audit report is available under [Audit Report](/audit-report/).

## References

1. [Specification](/lbe-docs/LBE%20Specification.pdf)
2. [Audit Report](/audit-report/certik-audit-report.pdf)
