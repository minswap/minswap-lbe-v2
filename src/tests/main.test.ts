import { beforeEach, expect, test } from "bun:test";
import * as T from "@minswap/translucent";
import { TreasuryValidatorValidateTreasury } from "../../plutus";
import {
  buildApplyOrders,
  buildCancelOrder,
  buildCreateAmmPool,
  buildCreateTreasury,
  buildDeposit,
  buildInitFactory,
} from "../build-tx";
import {
  deployMinswapValidators,
  deployValidators,
  type DeployedValidators,
  type Validators,
  collectValidators,
} from "../deploy-validators";
import {
  buildCreatePool,
  collectMinswapValidators,
  generateMinswapAmmParams,
  type BuildCreatePoolOptions,
  type GenerateMinswapAmmParams,
  type MinswapValidators,
} from "../minswap-amm";
import { FactoryValidatorValidateFactory } from "../minswap-amm/plutus";
import {
  address2PlutusAddress,
} from "../utils";
import {
  generateAccount,
  quickSubmitBuilder,
  type GeneratedAccount,
} from "./utils";
import type {
  Address,
  Assets,
  Emulator,
  OutputData,
  Translucent,
  UTxO,
} from "../types";

let ACCOUNT_0: GeneratedAccount;
let ACCOUNT_1: GeneratedAccount;
let emulator: Emulator;
let lucid: Translucent;
let validators: Validators;
let deployedValidators: DeployedValidators;
let seedUtxo: UTxO;
let baseAsset: {
  policyId: string;
  assetName: string;
};
let minswapData: GenerateMinswapAmmParams;
let minswapValidators: MinswapValidators;
let minswapDeployedValidators: DeployedValidators;

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
  minswapData = generateMinswapAmmParams(
    await T.Translucent.new(new T.Emulator([])),
  );
  const factoryAccount: {
    address: Address;
    outputData: OutputData;
    assets: Assets;
  } = {
    address: minswapData.factoryAddress,
    outputData: {
      inline: T.Data.to(
        {
          head: "00",
          tail: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
        },
        FactoryValidatorValidateFactory.datum,
      ),
    },
    assets: {
      lovelace: 10_000_000n,
      [T.toUnit(
        minswapData.factoryAuthAsset.policyId,
        minswapData.factoryAuthAsset.tokenName,
      )]: 1n,
    },
  };
  emulator = new T.Emulator([ACCOUNT_0, ACCOUNT_1, factoryAccount]);
  lucid = await T.Translucent.new(emulator);
  emulator.awaitBlock(10_000); // For validity ranges to be valid
  lucid.selectWalletFromPrivateKey(ACCOUNT_0.privateKey);
  const utxos = await emulator.getUtxos(ACCOUNT_1.address);
  seedUtxo = utxos[utxos.length - 1];
  validators = collectValidators(lucid, {
    txHash: seedUtxo.txHash,
    outputIndex: seedUtxo.outputIndex,
  });
  deployedValidators = await deployValidators(lucid, validators);
  emulator.awaitBlock(1);

  // registerStake
  await quickSubmitBuilder(emulator)({
    txBuilder: lucid
      .newTx()
      .registerStake(
        lucid.utils.validatorToRewardAddress(
          validators!.orderSpendingValidator,
        ),
      ),
  });

  minswapValidators = collectMinswapValidators();
  minswapDeployedValidators = await deployMinswapValidators(
    lucid,
    minswapValidators,
  );
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
    lucid,
    tx: lucid.newTx(),
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
  const encounterStartSlot = discoveryEndSlot + 60 * 60; // 1 hour

  const treasuryDatum: TreasuryValidatorValidateTreasury["datum"] = {
    baseAsset: baseAsset,
    raiseAsset: {
      policyId: "",
      assetName: "",
    },
    discoveryStartTime: BigInt(lucid.utils.slotToUnixTime(discoveryStartSlot)),
    discoveryEndTime: BigInt(lucid.utils.slotToUnixTime(discoveryEndSlot)),
    encounterStartTime: BigInt(lucid.utils.slotToUnixTime(encounterStartSlot)),
    owner: address2PlutusAddress(ACCOUNT_0.address),
    minimumRaise: null,
    maximumRaise: null,
    orderHash: lucid.utils.validatorToScriptHash(validators!.orderValidator),
    reserveBase: 69_000_000_000_000n,
    reserveRaise: 0n,
    totalLiquidity: 0n,
    isCancel: 0n,
    isCreatedPool: 0n,
  };
  const createFactoryBuilder = buildCreateTreasury({
    lucid,
    tx: lucid.newTx(),
    validatorRefs: {
      validators,
      deployedValidators,
    },
    treasuryDatum,
    factoryUtxo: (
      await emulator.getUtxos(
        lucid.utils.validatorToAddress(validators!.factoryValidator),
      )
    ).find((u) => !u.scriptRef) as UTxO,
  });
  const createTreasuryTx = await quickSubmitBuilder(emulator)({
    txBuilder: createFactoryBuilder.txBuilder,
  });
  expect(createTreasuryTx).toBeTruthy();
  console.info("create treasury done");

  // Step 3: Deposit Orders
  const pendingOrderTxIds: string[] = [];
  for (let i = 0; i < 2; i++) {
    const depositBuilder = buildDeposit({
      lucid,
      tx: lucid.newTx(),
      validatorRefs: {
        validators,
        deployedValidators,
      },
      owner: ACCOUNT_0.address,
      baseAsset: treasuryDatum.baseAsset,
      raiseAsset: treasuryDatum.raiseAsset,
      amount: 69_000_000_000n,
    });
    const txHash = await quickSubmitBuilder(emulator)({
      txBuilder: depositBuilder.txBuilder,
    });
    pendingOrderTxIds.push(txHash);
  }
  console.info("deposit orders done");

  // Step 4: Cancel first order
  const shouldCancelOrderTxId = pendingOrderTxIds.splice(0, 1)[0];
  const cancelUtxo = (
    await emulator.getUtxosByOutRef([
      {
        txHash: shouldCancelOrderTxId!,
        outputIndex: 0,
      },
    ])
  )[0];
  const cancelBuilder = buildCancelOrder({
    lucid,
    tx: lucid.newTx(),
    validatorRefs: {
      validators,
      deployedValidators,
    },
    owner: ACCOUNT_0.address,
    utxo: cancelUtxo,
  });
  const cancelTx = await quickSubmitBuilder(emulator)({
    txBuilder: cancelBuilder.txBuilder,
  });
  expect(cancelTx).toBeTruthy();
  console.info("cancel order done");

  // Step 5: Apply Orders
  const pendingOrders = await emulator.getUtxosByOutRef(
    pendingOrderTxIds.map((o) => ({
      txHash: o,
      outputIndex: 0,
    })),
  );
  let treasuryUTxO = (
    await emulator.getUtxos(
      lucid.utils.validatorToAddress(validators!.treasuryValidator),
    )
  ).find((u) => u.scriptRef === undefined)!;
  let validFrom = lucid.utils.slotToUnixTime(emulator.slot);
  let validTo = lucid.utils.slotToUnixTime(emulator.slot + 60 * 10);
  const applyOrderBuilder = buildApplyOrders({
    lucid,
    tx: lucid.newTx(),
    validatorRefs: {
      validators,
      deployedValidators,
    },
    orderUTxOs: pendingOrders,
    treasuryUTxO,
    validFrom,
    validTo,
  });
  const applyOrderTx = await quickSubmitBuilder(emulator)({
    txBuilder: applyOrderBuilder.txBuilder,
  });
  expect(applyOrderTx).toBeTruthy();
  console.info("apply orders done");

  // Step 6: Create Pool
  const waitSlots = encounterStartSlot - emulator.slot + 1;
  emulator.awaitSlot(waitSlots);
  treasuryUTxO = treasuryUTxO = (
    await emulator.getUtxos(
      lucid.utils.validatorToAddress(validators!.treasuryValidator),
    )
  ).find((u) => u.scriptRef === undefined)!;
  const ammFactoryUTxO = await emulator.getUtxoByUnit(
    T.toUnit(
      minswapData!.factoryAuthAsset.policyId,
      minswapData!.factoryAuthAsset.tokenName,
    ),
  );
  const createPoolValidFrom = lucid.utils.slotToUnixTime(emulator.slot);

  const curTreasuryDatum: TreasuryValidatorValidateTreasury["datum"] =
    T.Data.from(treasuryUTxO.datum!, TreasuryValidatorValidateTreasury.datum);
  console.log({
    curTreasuryDatum,
    reserveRaise: curTreasuryDatum.reserveRaise,
  });

  const buildCreatePoolResult = buildCreateAmmPool({
    lucid,
    tx: lucid.newTx(),
    validatorRefs: {
      validators,
      deployedValidators,
    },
    treasuryUTxO,
    ammAuthenPolicyId: minswapData.authenPolicyId,
    validFrom: createPoolValidFrom,
  });
  console.log({ ...buildCreatePoolResult, txBuilder: undefined });
  const buildAmmPoolResult = buildCreatePool({
    lucid,
    tx: buildCreatePoolResult.txBuilder,
    minswapDeployedValidators,
    factoryUTxO: ammFactoryUTxO,
    pool: {
      assetA: buildCreatePoolResult.assetA,
      assetB: buildCreatePoolResult.assetB,
      amountA: buildCreatePoolResult.amountA,
      amountB: buildCreatePoolResult.amountB,
      tradingFeeNumerator: 30n,
    },
  });
  const buildAmmPoolTx = await quickSubmitBuilder(emulator)({
    txBuilder: buildAmmPoolResult.txBuilder,
    debug: true,
  });
  expect(buildAmmPoolTx).toBeTruthy();
  console.info("build AMM Pool done");
});

test("test only create AMM Pool", async () => {
  const ammFactoryUTxO = await emulator.getUtxoByUnit(
    T.toUnit(
      minswapData!.factoryAuthAsset.policyId,
      minswapData!.factoryAuthAsset.tokenName,
    ),
  );
  const options: BuildCreatePoolOptions = {
    lucid,
    tx: lucid.newTx(),
    minswapDeployedValidators,
    factoryUTxO: ammFactoryUTxO,
    pool: {
      assetA: { policyId: "", assetName: "" },
      assetB: baseAsset,
      amountA: 100_000_000n,
      amountB: 100_000_000n,
      tradingFeeNumerator: 30n,
    },
  };
  const result = buildCreatePool(options);
  const tx = await quickSubmitBuilder(emulator)({
    txBuilder: result.txBuilder,
  });
  expect(tx).toBeTruthy();
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
