import { expect, beforeEach, test } from "bun:test";
import {
  generateAccount,
  quickSubmitBuilder,
  type GeneratedAccount,
} from "./utils";
import {
  Constr,
  Data,
  Emulator,
  Translucent,
  type UTxO,
} from "translucent-cardano";
import { deployValidators } from "../deploy_validators";
import {
  collectValidators,
  utxo2ORef,
  type DeployedValidators,
  type Validators,
} from "../utils";
import { initFactory } from "../build-tx";

let ACCOUNT_0: GeneratedAccount;
let ACCOUNT_1: GeneratedAccount;
let emulator: Emulator;
let lucid: Translucent;
let validators: Validators;
let deployedValidators: DeployedValidators;
let seedUtxo: UTxO;

beforeEach(async () => {
  ACCOUNT_0 = await generateAccount({
    lovelace: 2000000000000000000n,
  });
  ACCOUNT_1 = await generateAccount({
    lovelace: 2000000000000000000n,
  });
  emulator = new Emulator([ACCOUNT_0, ACCOUNT_1]);
  lucid = await Translucent.new(emulator);
  emulator.awaitBlock(10_000); // For validity ranges to be valid
  lucid.selectWalletFromPrivateKey(ACCOUNT_0.privateKey);
  const utxos = await emulator.getUtxos(ACCOUNT_1.address);
  seedUtxo = utxos[utxos.length - 1];
  const seedTxIn = utxo2ORef(seedUtxo);
  validators = collectValidators(lucid, seedTxIn);
  deployedValidators = await deployValidators(lucid, validators);
  emulator.awaitBlock(1);
});

test("happy case - full flow", async () => {
  /** Steps:
   * 1. Create Factory
   * 2. Create Treasury
   */
  const initFactoryBuilder = initFactory({
    lucid,
    tx: lucid.newTx(),
    validatorRefs: { validators, deployedValidators },
    seedUtxo,
  });
  const initFactoryTx = await quickSubmitBuilder(emulator)({
    txBuilder: initFactoryBuilder.txBuilder,
    extraSignatures: [ACCOUNT_1.privateKey],
  });
  expect(initFactoryTx).toBeTruthy();
});

// test("pay->spend always success contract", async () => {
//   const paysToSuccess = async () => {
//     const tx = lucid.newTx();
//     const utxos = await lucid.wallet.getUtxos();
//     const utxoToConsume = utxos[utxos.length - 1];
//     const successContractAddress = lucid.utils.validatorToAddress(validators.successValidator);
//     const datum = Data.to(1001n);
//     tx
//       .collectFrom([utxoToConsume])
//       .payToAddressWithData(
//         successContractAddress,
//         { inline: datum },
//         {
//           lovelace: 10_000_000n,
//         }
//       );
//     return tx;
//   };
//   const payTx = await quickSubmitBuilder(emulator)({ txBuilder: await paysToSuccess() });
//   const spendFromSuccess = async () => {
//     const tx = lucid.newTx();
//     const utxos = await emulator.getUtxosByOutRef([{ txHash: payTx, outputIndex: 0 }]);
//     tx
//       .readFrom([deployedValidators['successValidator']])
//       .collectFrom(utxos, Data.to(123n))
//     return tx;
//   };
//   const spendTx = await quickSubmitBuilder(emulator)({ txBuilder: await spendFromSuccess() });
//   expect(spendTx).toBeTruthy();
// });

// test("poc multi-validator", async () => {
//   const paysTo = async () => {
//     const tx = lucid.newTx();
//     const utxos = await lucid.wallet.getUtxos();
//     const utxoToConsume = utxos[utxos.length - 1];
//     const contractAddress = lucid.utils.validatorToAddress(validators.hihiScript);
//     const datum = Data.to(1001n);
//     tx
//       .collectFrom([utxoToConsume])
//       .registerStake(lucid.utils.validatorToRewardAddress(validators.hihiScript))
//       .payToAddressWithData(
//         contractAddress,
//         { inline: datum },
//         {
//           lovelace: 10_000_000n,
//         }
//       );
//     return tx;
//   }
//   const payTx = await quickSubmitBuilder(emulator)({ txBuilder: await paysTo() });

//   const spendFrom = async () => {
//     const tx = lucid.newTx();
//     const utxos = await emulator.getUtxosByOutRef([{ txHash: payTx, outputIndex: 0 }]);
//     const rewardsAddress = lucid.utils.validatorToRewardAddress(validators.hihiScript);
//     tx
//       .readFrom([deployedValidators['hihiValidator']])
//       .withdraw(
//         rewardsAddress,
//         0n,
//         Data.to(100n),
//       )
//       .collectFrom(utxos, Data.to(new Constr(1, [Data.to(123n)])));
//     return tx;
//   }
//   const spendTx = await quickSubmitBuilder(emulator, true)({ txBuilder: await spendFrom() },);
//   expect(spendTx).toBeTruthy();
// });
