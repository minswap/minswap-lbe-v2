import { beforeEach, expect, test } from "bun:test";
import {
  Data,
  Emulator,
  Translucent,
  toUnit,
  type Address,
  type Assets,
  type OutputData,
  type UTxO,
} from "translucent-cardano";
import type { TreasuryValidatorValidateTreasury } from "../../plutus";
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
} from "../deploy_validators";
import {
  buildCreatePool,
  collectMinswapValidators,
  generateMinswapParams,
  type GenerateMinswapParams,
  type MinswapValidators,
} from "../minswap-amm";
import { FactoryValidatorValidateFactory } from "../minswap-amm/plutus";
import {
  address2PlutusAddress,
  collectValidators,
  utxo2ORef,
  type DeployedValidators,
  type Validators,
} from "../utils";
import {
  generateAccount,
  quickSubmitBuilder,
  type GeneratedAccount,
} from "./utils";

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
let minswapData: GenerateMinswapParams;
let minswapValidators: MinswapValidators;
let minswapDeployedValidators: DeployedValidators;

beforeEach(async () => {
  baseAsset = {
    policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
    assetName: "4d494e",
  };
  ACCOUNT_0 = await generateAccount({
    lovelace: 2000000000000000000n,
    [toUnit(baseAsset.policyId, baseAsset.assetName)]: 69_000_000_000_000n,
  });
  ACCOUNT_1 = await generateAccount({
    lovelace: 2000000000000000000n,
  });
  minswapData = generateMinswapParams();
  const factoryAccount: {
    address: Address;
    outputData: OutputData;
    assets: Assets;
  } = {
    address: minswapData!.factoryAddress,
    outputData: {
      inline: Data.to(
        {
          head: "00",
          tail: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
        },
        FactoryValidatorValidateFactory.datum,
      ),
    },
    assets: {
      lovelace: 10_000_000n,
      [toUnit(
        minswapData!.factoryAuthAsset.policyId,
        minswapData!.factoryAuthAsset.tokenName,
      )]: 1n,
    },
  };
  emulator = new Emulator([ACCOUNT_0, ACCOUNT_1, factoryAccount]);
  lucid = await Translucent.new(emulator);
  emulator.awaitBlock(10_000); // For validity ranges to be valid
  lucid.selectWalletFromPrivateKey(ACCOUNT_0.privateKey);
  const utxos = await emulator.getUtxos(ACCOUNT_1.address);
  seedUtxo = utxos[utxos.length - 1];
  const seedTxIn = utxo2ORef(seedUtxo);
  validators = collectValidators(lucid, seedTxIn);
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

  // Step 3: Deposit 81 Orders
  const pendingOrderTxIds: string[] = [];
  for (let i = 0; i < 81; i++) {
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
      amount: 1_000_000_000n,
    });
    const txHash = await quickSubmitBuilder(emulator)({
      txBuilder: depositBuilder.txBuilder,
    });
    pendingOrderTxIds.push(txHash);
  }

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

  // Step 6: Create Pool
  const waitSlots = encounterStartSlot - emulator.slot + 1;
  emulator.awaitSlot(waitSlots);
  treasuryUTxO = treasuryUTxO = (
    await emulator.getUtxos(
      lucid.utils.validatorToAddress(validators!.treasuryValidator),
    )
  ).find((u) => u.scriptRef === undefined)!;
  const ammFactoryUTxO = await emulator.getUtxoByUnit(
    toUnit(
      minswapData!.factoryAuthAsset.policyId,
      minswapData!.factoryAuthAsset.tokenName,
    ),
  );
  const buildCreatePoolResult = buildCreateAmmPool({
    lucid,
    tx: lucid.newTx(),
    validatorRefs: {
      validators,
      deployedValidators,
    },
    treasuryUTxO,
    ammPolicyId: minswapData["poolHash"],
  });
  const buildAmmPoolResult = buildCreatePool({
    lucid,
    tx: buildCreatePoolResult.txBuilder,
    minswapValidators,
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
  });
  expect(buildAmmPoolTx).toBeTruthy();
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
