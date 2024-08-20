# 😻 Minswap LBE V2 Contract

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

## Audit Report

The contract audit is being conducted by Certik.

The audit report will be available later.

## References

1. [Specification](/lbe-docs/LBE%20Specification.pdf)
2. [Audit Report](/audit-report/certik-audit-report.pdf)
