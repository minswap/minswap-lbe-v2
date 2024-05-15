import { beforeEach, expect, test } from "bun:test";
import * as T from "@minswap/translucent";
import {
  buildCreateTreasury,
  buildInitFactory,
} from "../build-tx";
import {
  deployValidators,
  type DeployedValidators,
  type Validators,
  collectValidators,
} from "../deploy-validators";
import {
  generateAccount,
  quickSubmitBuilder,
  type GeneratedAccount,
} from "./utils";
import type {
  Emulator,
  Translucent,
  UTxO,
} from "../types";
import type { TreasuryValidatorValidateTreasurySpending } from "../../plutus";
import { address2PlutusAddress } from "../utils";
import { DEFAULT_NUMBER_SELLER } from "../constants";

let ACCOUNT_0: GeneratedAccount;
let ACCOUNT_1: GeneratedAccount;
let emulator: Emulator;
let t: Translucent;
let validators: Validators;
let deployedValidators: DeployedValidators;
let seedUtxo: UTxO;
let baseAsset: {
  policyId: string;
  assetName: string;
};

beforeEach(async () => {
  await T.loadModule();
  await T.CModuleLoader.load();

  baseAsset = {
    policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
    assetName: "4d494e",
  };
  ACCOUNT_0 = await generateAccount({
    lovelace: 2000000000000000000n,
    [T.toUnit(baseAsset.policyId, baseAsset.assetName)]: 69_000_000_000_000n,
  });
  ACCOUNT_1 = await generateAccount({
    lovelace: 2000000000000000000n,
  });
  emulator = new T.Emulator([ACCOUNT_0, ACCOUNT_1]);
  t = await T.Translucent.new(emulator);
  emulator.awaitBlock(10_000); // For validity ranges to be valid
  t.selectWalletFromPrivateKey(ACCOUNT_0.privateKey);
  const utxos = await emulator.getUtxos(ACCOUNT_1.address);
  seedUtxo = utxos[utxos.length - 1];
  validators = collectValidators({
    t: t,
    seedOutRef: {
      txHash: seedUtxo.txHash,
      outputIndex: seedUtxo.outputIndex,
    },
    dry: true,
  });
  deployedValidators = await deployValidators(t, validators);
  emulator.awaitBlock(1);
});

test("happy case - full flow", async () => {
  /** Steps:
   * 1. Init Factory
   * 2. Create Treasury
   * 3. Deposit Order
   * 4. Apply Orders
   * 5. Create Pool
   * 6. Redeem for LPs
   */

  // Step 1: Init Factory
  const initFactoryBuilder = buildInitFactory({
    t: t,
    tx: t.newTx(),
    validatorRefs: {
      validators,
      deployedValidators,
    },
    seedUtxo,
  });
  const initFactoryTx = await quickSubmitBuilder(emulator)({
    txBuilder: initFactoryBuilder.txBuilder,
    extraSignatures: [ACCOUNT_1.privateKey],
  });
  expect(initFactoryTx).toBeTruthy();
  console.info("Init Factory done");

  // Step 2: Create Treasury
  const discoveryStartSlot = emulator.slot;
  const discoveryEndSlot = discoveryStartSlot + 60 * 60 * 24 * 2; // 2 days

  // const encounterStartSlot = discoveryEndSlot + 60 * 60; // 1 hour

  const treasuryDatum: TreasuryValidatorValidateTreasurySpending["treasuryInDatum"] = {
    sellerHash: t.utils.validatorToScriptHash(validators.sellerValidator),
    orderHash: t.utils.validatorToScriptHash(validators.orderValidator),
    sellerCount: DEFAULT_NUMBER_SELLER,
    collectedFund: 0n,
    baseAsset: baseAsset,
    raiseAsset: {
      policyId: "",
      assetName: "",
    },
    startTime: BigInt(t.utils.slotToUnixTime(discoveryStartSlot)),
    endTime: BigInt(t.utils.slotToUnixTime(discoveryEndSlot)),
    owner: address2PlutusAddress(ACCOUNT_0.address),
    minimumRaise: null,
    maximumRaise: null,
    reserveBase: 69_000_000_000_000n,
    reserveRaise: 0n,
    totalLiquidity: 0n,
    penaltyConfig: null,
    totalPenalty: 0n,
  };

  let factoryUtxo: UTxO = (
    await emulator.getUtxos(
      t.utils.validatorToAddress(validators!.factoryValidator),
    )
  ).find((u) => !u.scriptRef) as UTxO;

  const createFactoryBuilder = buildCreateTreasury({
    t: t,
    tx: t.newTx(),
    validatorRefs: {
      validators,
      deployedValidators,
    },
    treasuryDatum,
    factoryUtxo,
  });
  const createTreasuryTx = await quickSubmitBuilder(emulator)({
    txBuilder: createFactoryBuilder.txBuilder,
    debug: true,
  });
  expect(createTreasuryTx).toBeTruthy();
  console.info("create treasury done");

  // // Step 3: Deposit Orders
  // const pendingOrderTxIds: string[] = [];
  // for (let i = 0; i < 2; i++) {
  //   const depositBuilder = buildDeposit({
  //     t: t,
  //     tx: t.newTx(),
  //     validatorRefs: {
  //       validators,
  //       deployedValidators,
  //     },
  //     owner: ACCOUNT_0.address,
  //     baseAsset: treasuryDatum.baseAsset,
  //     raiseAsset: treasuryDatum.raiseAsset,
  //     amount: 69_000_000_000n,
  //   });
  //   const txHash = await quickSubmitBuilder(emulator)({
  //     txBuilder: depositBuilder.txBuilder,
  //   });
  //   pendingOrderTxIds.push(txHash);
  // }
  // console.info("deposit orders done");

  // // Step 4: Cancel first order
  // const shouldCancelOrderTxId = pendingOrderTxIds.splice(0, 1)[0];
  // const cancelUtxo = (
  //   await emulator.getUtxosByOutRef([
  //     {
  //       txHash: shouldCancelOrderTxId!,
  //       outputIndex: 0,
  //     },
  //   ])
  // )[0];
  // const cancelBuilder = buildCancelOrder({
  //   t: t,
  //   tx: t.newTx(),
  //   validatorRefs: {
  //     validators,
  //     deployedValidators,
  //   },
  //   owner: ACCOUNT_0.address,
  //   utxo: cancelUtxo,
  // });
  // const cancelTx = await quickSubmitBuilder(emulator)({
  //   txBuilder: cancelBuilder.txBuilder,
  // });
  // expect(cancelTx).toBeTruthy();
  // console.info("cancel order done");

  // // Step 5: Apply Orders
  // const pendingOrders = await emulator.getUtxosByOutRef(
  //   pendingOrderTxIds.map((o) => ({
  //     txHash: o,
  //     outputIndex: 0,
  //   })),
  // );
  // let treasuryUTxO = (
  //   await emulator.getUtxos(
  //     t.utils.validatorToAddress(validators!.treasuryValidator),
  //   )
  // ).find((u) => u.scriptRef === undefined)!;
  // let validFrom = t.utils.slotToUnixTime(emulator.slot);
  // let validTo = t.utils.slotToUnixTime(emulator.slot + 60 * 10);
  // const applyOrderBuilder = buildApplyOrders({
  //   t: t,
  //   tx: t.newTx(),
  //   validatorRefs: {
  //     validators,
  //     deployedValidators,
  //   },
  //   orderUTxOs: pendingOrders,
  //   treasuryUTxO,
  //   validFrom,
  //   validTo,
  // });
  // const applyOrderTx = await quickSubmitBuilder(emulator)({
  //   txBuilder: applyOrderBuilder.txBuilder,
  // });
  // expect(applyOrderTx).toBeTruthy();
  // console.info("apply orders done");

  // // Step 6: Create Pool
  // const waitSlots = encounterStartSlot - emulator.slot + 1;
  // emulator.awaitSlot(waitSlots);
  // treasuryUTxO = treasuryUTxO = (
  //   await emulator.getUtxos(
  //     t.utils.validatorToAddress(validators!.treasuryValidator),
  //   )
  // ).find((u) => u.scriptRef === undefined)!;
  // const ammFactoryUTxO = await emulator.getUtxoByUnit(
  //   T.toUnit(
  //     minswapData!.factoryAuthAsset.policyId,
  //     minswapData!.factoryAuthAsset.tokenName,
  //   ),
  // );
  // const createPoolValidFrom = t.utils.slotToUnixTime(emulator.slot);

  // const curTreasuryDatum: TreasuryValidatorValidateTreasury["datum"] =
  //   T.Data.from(treasuryUTxO.datum!, TreasuryValidatorValidateTreasury.datum);
  // console.log({
  //   curTreasuryDatum,
  //   reserveRaise: curTreasuryDatum.reserveRaise,
  // });

  // const buildCreatePoolResult = buildCreateAmmPool({
  //   t: t,
  //   tx: t.newTx(),
  //   validatorRefs: {
  //     validators,
  //     deployedValidators,
  //   },
  //   treasuryUTxO,
  //   ammAuthenPolicyId: minswapData.authenPolicyId,
  //   validFrom: createPoolValidFrom,
  // });
  // console.log({ ...buildCreatePoolResult, txBuilder: undefined });
  // const buildAmmPoolResult = buildCreatePool({
  //   t: t,
  //   tx: buildCreatePoolResult.txBuilder,
  //   minswapDeployedValidators,
  //   factoryUTxO: ammFactoryUTxO,
  //   pool: {
  //     assetA: buildCreatePoolResult.assetA,
  //     assetB: buildCreatePoolResult.assetB,
  //     amountA: buildCreatePoolResult.amountA,
  //     amountB: buildCreatePoolResult.amountB,
  //     tradingFeeNumerator: 30n,
  //   },
  // });
  // const buildAmmPoolTx = await quickSubmitBuilder(emulator)({
  //   txBuilder: buildAmmPoolResult.txBuilder,
  //   debug: true,
  // });
  // expect(buildAmmPoolTx).toBeTruthy();
  // console.info("build AMM Pool done");
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
