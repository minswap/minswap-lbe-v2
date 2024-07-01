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
- Install [Aiken v1.0.24-alpha](https://aiken-lang.org/installation-instructions)
- Run `aiken build` to double check scripts bytecode in `plutus.json` file 
- Run `bun install` to install necessary dependencies 

## Testing

- Run `bun check` to run all unit tests.

## Deployment

### Testnet Preprod
The smart contract has already been deployed on Testnet Preprod.

The detailed information on the deployment is located in [References](/lbe-v2-script.json)

## Audit Report

The contract audit is being conducted by Certik.

The audit report will be available later.

## References

1. [Specification](/lbe-docs)
