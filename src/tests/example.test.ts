import invariant from "@minswap/tiny-invariant";
import * as T from "@minswap/translucent";
import { beforeEach, expect, test } from "bun:test";
import { FactoryValidatorValidateFactory as AmmValidateFactory } from "../../amm-plutus";
import {
  FeedTypeAmmPool,
  FeedTypeOrder,
  TreasuryValidateTreasurySpending,
} from "../../plutus";
import {
  WarehouseBuilder,
  type BuildAddSellersOptions,
  type BuildCollectManagerOptions,
  type BuildCollectOrdersOptions,
  type BuildCollectSellersOptions,
  type BuildCreateAmmPoolOptions,
  type BuildRedeemOrdersOptions,
  type BuildUsingSellerOptions,
  type WarehouseBuilderOptions,
} from "../build-tx";
import {
  collectMinswapValidators,
  collectValidators,
  deployMinswapValidators,
  deployValidators,
  type DeployedValidators,
  type MinswapValidators,
  type Validators,
} from "../deploy-validators";
import type {
  Address,
  Assets,
  Emulator,
  OrderDatum,
  OutputData,
  ProtocolParameters,
  Translucent,
  TreasuryDatum,
  UTxO,
} from "../types";
import {
  address2PlutusAddress,
  calculateInitialLiquidity,
  toUnit,
} from "../utils";
import {
  generateAccount,
  quickSubmitBuilder,
  type GeneratedAccount,
} from "./utils";

let ACCOUNT_0: GeneratedAccount;
let ACCOUNT_1: GeneratedAccount;
let emulator: Emulator;
let t: Translucent;
let validators: Validators;
let ammValidators: MinswapValidators;
let deployedValidators: DeployedValidators;
let ammDeployedValidators: DeployedValidators;
let seedUtxo: UTxO;
let baseAsset: {
  policyId: string;
  assetName: string;
};
let raiseAsset: {
  policyId: string;
  assetName: string;
};
let ammFactoryAddress: string;

beforeEach(async () => {
  await T.loadModule();
  await T.CModuleLoader.load();
  let protocolParameters: ProtocolParameters = {
    ...T.PROTOCOL_PARAMETERS_DEFAULT,
    maxTxSize: 36384,
  };
  emulator = new T.Emulator([], protocolParameters);
  t = await T.Translucent.new(emulator);
  ammValidators = collectMinswapValidators({
    t,
    seedOutRef: {
      txHash:
        "5428517bd92102ce1af705f8b66560d445e620aead488b47fb824426484912f8", // dummy
      outputIndex: 0,
    },
  });
  // console.log("AMM Authen Policy Id", t.utils.validatorToScriptHash(ammValidators.authenValidator));
  // console.log("AMM Pool Validator Hash", t.utils.validatorToScriptHash(ammValidators.poolValidator));
  ammFactoryAddress = t.utils.validatorToAddress(
    ammValidators.factoryValidator,
  );
  const factoryAccount: {
    address: Address;
    outputData: OutputData;
    assets: Assets;
  } = {
    address: ammFactoryAddress,
    outputData: {
      inline: T.Data.to(
        {
          head: "00",
          tail: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
        },
        AmmValidateFactory.datum,
      ),
    },
    assets: {
      lovelace: 10_000_000n,
      [toUnit(
        t.utils.validatorToScriptHash(ammValidators.authenValidator),
        "4d5346",
      )]: 1n,
    },
  };
  baseAsset = {
    policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
    assetName: "4d494e",
  };
  raiseAsset = {
    policyId: "",
    assetName: "",
  };
  ACCOUNT_0 = await generateAccount({
    lovelace: 2000000000000000000n,
    [toUnit(baseAsset.policyId, baseAsset.assetName)]: 69_000_000_000_000n,
  });
  ACCOUNT_1 = await generateAccount({
    lovelace: 2000000000000000000n,
  });
  emulator = new T.Emulator(
    [ACCOUNT_0, ACCOUNT_1, factoryAccount],
    protocolParameters,
  );
  t = await T.Translucent.new(emulator);
  emulator.awaitBlock(10_000); // For validity ranges to be valid
  t.selectWalletFromPrivateKey(ACCOUNT_0.privateKey);
  let utxos = await emulator.getUtxos(ACCOUNT_1.address);
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
  emulator.awaitBlock(10);

  ammDeployedValidators = await deployMinswapValidators(t, ammValidators);

  // registerStake
  await quickSubmitBuilder(emulator)({
    txBuilder: t
      .newTx()
      .registerStake(
        t.utils.validatorToRewardAddress(validators.sellerValidator),
      ),
  });
});

test("example flow", async () => {
  const warehouseOptions: WarehouseBuilderOptions = {
    t,
    validators,
    deployedValidators,
    ammValidators,
    ammDeployedValidators,
  };
  let builder = new WarehouseBuilder(warehouseOptions);
  builder.buildInitFactory({ seedUtxo });
  const tx = builder.complete();
  const initFactoryTx = await quickSubmitBuilder(emulator)({
    txBuilder: tx,
    extraSignatures: [ACCOUNT_1.privateKey],
    stats: true,
  });
  expect(initFactoryTx).toBeTruthy();
  console.info("Init Factory done");

  // create treasury
  const discoveryStartSlot = emulator.slot + 60 * 60;
  const discoveryEndSlot = discoveryStartSlot + 60 * 60 * 24 * 2; // 2 days
  const treasuryDatum: TreasuryDatum = {
    factoryPolicyId: t.utils.validatorToScriptHash(validators.factoryValidator),
    sellerHash: t.utils.validatorToScriptHash(validators.sellerValidator),
    orderHash: t.utils.validatorToScriptHash(validators.orderValidator),
    managerHash: t.utils.validatorToScriptHash(validators.managerValidator),
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
    reserveBase: 69000000000000n,
    reserveRaise: 0n,
    totalLiquidity: 0n,
    penaltyConfig: null,
    totalPenalty: 0n,
    isCancelable: false,
    isCancelled: false,
    minimumOrderRaise: null,
    isManagerCollected: false,
  };
  builder = new WarehouseBuilder(warehouseOptions);
  let factoryUtxo: UTxO = (
    await emulator.getUtxos(
      t.utils.validatorToAddress(validators.factoryValidator),
    )
  ).find((u) => !u.scriptRef) as UTxO;
  builder.buildCreateTreasury({
    factoryUtxo,
    treasuryDatum,
    validFrom: t.utils.slotToUnixTime(emulator.slot),
    validTo: t.utils.slotToUnixTime(emulator.slot + 60),
  });
  const createTreasuryTx = await quickSubmitBuilder(emulator)({
    txBuilder: builder.complete(),
    stats: true,
    awaitBlock: 60 * 60 + 5,
  });
  expect(createTreasuryTx).toBeTruthy();
  console.info("create treasury done");

  // deposit orders
  let treasuryRefInput: UTxO = (
    await emulator.getUtxos(
      t.utils.validatorToAddress(validators.treasuryValidator),
    )
  ).find((u) => !u.scriptRef) as UTxO;
  let orderDatum: OrderDatum = {
    factoryPolicyId: t.utils.validatorToScriptHash(validators.factoryValidator),
    baseAsset,
    raiseAsset,
    owner: address2PlutusAddress(ACCOUNT_0.address),
    amount: 100_000_000n,
    isCollected: false,
    penaltyAmount: 0n,
  };

  const addingSeller = async (addSellerCount: bigint = 1n) => {
    if (!addSellerCount) {
      return;
    }
    const managerUtxo: UTxO = (
      await emulator.getUtxos(
        t.utils.validatorToAddress(validators.managerValidator),
      )
    ).find((u) => !u.scriptRef) as UTxO;
    const buildAddSellersOptions: BuildAddSellersOptions = {
      treasuryRefUtxo: treasuryRefInput,
      managerUtxo,
      addSellerCount,
      validFrom: t.utils.slotToUnixTime(emulator.slot),
      validTo: t.utils.slotToUnixTime(emulator.slot + 100),
    };
    builder = new WarehouseBuilder(warehouseOptions);
    builder.buildAddSeller(buildAddSellersOptions);
    await quickSubmitBuilder(emulator)({
      txBuilder: builder.complete(),
    });
    console.info(`adding Seller ${addSellerCount} done.`);
  };
  await addingSeller(20n);

  const depositing = async (maxCount?: number) => {
    const sellerUtxos: UTxO[] = (
      await emulator.getUtxos(
        t.utils.validatorToAddress(validators.sellerValidator),
      )
    ).filter((u) => !u.scriptRef) as UTxO[];
    maxCount = maxCount ?? sellerUtxos.length;
    let depositCount = 0;
    for (const sellerUtxo of sellerUtxos) {
      if (depositCount >= maxCount) break;
      depositCount += 1;
      builder = new WarehouseBuilder(warehouseOptions);
      const buildUsingSellerOptions: BuildUsingSellerOptions = {
        treasuryRefInput,
        sellerUtxo: sellerUtxo,
        validFrom: t.utils.slotToUnixTime(emulator.slot),
        validTo: t.utils.slotToUnixTime(emulator.slot + 100),
        owners: [ACCOUNT_0.address],
        orderInputs: [],
        orderOutputDatums: [orderDatum],
      };
      builder.buildUsingSeller(buildUsingSellerOptions);
      await quickSubmitBuilder(emulator)({
        txBuilder: builder.complete(),
      });
    }
    console.info(`deposit ${depositCount} orders done.`);
  };
  await depositing();

  // update + orders
  const updatingOrders = async (maxCount?: number) => {
    const sellerUtxo: UTxO = (
      await emulator.getUtxos(
        t.utils.validatorToAddress(validators.sellerValidator),
      )
    ).find((u) => !u.scriptRef) as UTxO;
    const orderUtxos: UTxO[] = (
      await emulator.getUtxos(
        t.utils.validatorToAddress(validators.orderValidator),
      )
    ).filter((u) => !u.scriptRef) as UTxO[];
    maxCount = maxCount ?? orderUtxos.length;
    while (orderUtxos.length > maxCount) {
      orderUtxos.pop();
    }
    console.log(`trying to update ${orderUtxos.length} orders`);
    builder = new WarehouseBuilder(warehouseOptions);
    const newOrderDatums = Array.from({ length: orderUtxos.length }, () => ({
      ...orderDatum,
      amount: 80_000_000n,
    }));
    const buildUsingSellerOptions: BuildUsingSellerOptions = {
      treasuryRefInput,
      sellerUtxo: sellerUtxo,
      validFrom: t.utils.slotToUnixTime(emulator.slot),
      validTo: t.utils.slotToUnixTime(emulator.slot + 100),
      owners: [ACCOUNT_0.address],
      orderInputs: orderUtxos,
      orderOutputDatums: newOrderDatums,
    };
    builder.buildUsingSeller(buildUsingSellerOptions);
    await quickSubmitBuilder(emulator)({
      txBuilder: builder.complete(),
    });
    console.info(`update ${orderUtxos.length} orders done.`);
  };
  await updatingOrders(0);

  // collect manager
  while (emulator.slot <= discoveryEndSlot) {
    emulator.awaitBlock(100);
  }

  const collectingSeller = async (maxCount?: number) => {
    const managerUtxo: UTxO = (
      await emulator.getUtxos(
        t.utils.validatorToAddress(validators.managerValidator),
      )
    ).find((u) => !u.scriptRef) as UTxO;
    const sellerUtxos: UTxO[] = (
      await emulator.getUtxos(
        t.utils.validatorToAddress(validators.sellerValidator),
      )
    ).filter((u) => !u.scriptRef) as UTxO[];
    maxCount = maxCount ?? sellerUtxos.length;
    maxCount = maxCount > sellerUtxos.length ? sellerUtxos.length : maxCount;
    if (maxCount == 0) {
      return;
    }
    while (sellerUtxos.length > maxCount) {
      sellerUtxos.pop();
    }
    const options: BuildCollectSellersOptions = {
      treasuryRefInput,
      managerInput: managerUtxo,
      sellerInputs: sellerUtxos,
      validFrom: t.utils.slotToUnixTime(emulator.slot),
      validTo: t.utils.slotToUnixTime(emulator.slot + 100),
    };
    builder = new WarehouseBuilder(warehouseOptions);
    builder.buildCollectSeller(options);
    await quickSubmitBuilder(emulator)({
      txBuilder: builder.complete(),
    });
    console.info(`collect sellers ${maxCount} done.`);
  };
  await collectingSeller(15);
  await collectingSeller(15);
  await collectingSeller(15);
  await collectingSeller(15);

  const collectingManager = async () => {
    const managerUtxo: UTxO = (
      await emulator.getUtxos(
        t.utils.validatorToAddress(validators.managerValidator),
      )
    ).find((u) => !u.scriptRef) as UTxO;
    const options: BuildCollectManagerOptions = {
      treasuryInput: treasuryRefInput,
      managerInput: managerUtxo,
      validFrom: t.utils.slotToUnixTime(emulator.slot),
      validTo: t.utils.slotToUnixTime(emulator.slot + 100),
    };
    builder = new WarehouseBuilder(warehouseOptions);
    builder.buildCollectManager(options);
    await quickSubmitBuilder(emulator)({
      txBuilder: builder.complete(),
    });
    console.info(`collect manager done`);
  };
  await collectingManager();

  const collectingOrders = async (maxCount?: number) => {
    const treasuryUtxo: UTxO = (
      await emulator.getUtxos(
        t.utils.validatorToAddress(validators.treasuryValidator),
      )
    ).find((u) => !u.scriptRef) as UTxO;
    const orderUtxos: UTxO[] = (
      await emulator.getUtxos(
        t.utils.validatorToAddress(validators.orderValidator),
      )
    )
      .filter((u) => !u.scriptRef)
      .filter((u) => {
        const datum = T.Data.from(u.datum!, FeedTypeOrder._datum);
        return datum.isCollected == false;
      }) as UTxO[];
    maxCount = maxCount ?? orderUtxos.length;
    maxCount = maxCount > orderUtxos.length ? orderUtxos.length : maxCount;
    if (maxCount == 0) {
      return;
    }
    while (orderUtxos.length > maxCount) {
      orderUtxos.pop();
    }
    const options: BuildCollectOrdersOptions = {
      treasuryInput: treasuryUtxo,
      orderInputs: orderUtxos,
      validFrom: t.utils.slotToUnixTime(emulator.slot),
      validTo: t.utils.slotToUnixTime(emulator.slot + 100),
    };
    builder = new WarehouseBuilder(warehouseOptions);
    builder.buildCollectOrders(options);
    await quickSubmitBuilder(emulator)({
      txBuilder: builder.complete(),
    });
    console.info(`collect order ${maxCount} done.`);
  };
  await collectingOrders(1);
  await collectingOrders(15);
  await collectingOrders(15);
  await collectingOrders(15);

  const creatingPool = async () => {
    const ammFactoryInput: UTxO = (
      await emulator.getUtxos(ammFactoryAddress)
    ).find((u) => !u.scriptRef) as UTxO;
    const treasuryUtxo: UTxO = (
      await emulator.getUtxos(
        t.utils.validatorToAddress(validators.treasuryValidator),
      )
    ).find((u) => !u.scriptRef) as UTxO;
    invariant(treasuryUtxo.datum);
    const treasuryDatum = T.Data.from(
      treasuryUtxo.datum,
      TreasuryValidateTreasurySpending.treasuryInDatum,
    );
    const reserveA = treasuryDatum.reserveBase;
    const reserveB = treasuryDatum.reserveRaise + treasuryDatum.totalPenalty;
    const totalLiquidity = calculateInitialLiquidity(reserveA, reserveB);
    const poolDatum: FeedTypeAmmPool["_datum"] = {
      poolBatchingStakeCredential: {
        Inline: [
          {
            ScriptCredential: [
              t.utils.validatorToScriptHash(
                ammValidators.poolBatchingValidator,
              ),
            ],
          },
        ],
      },
      assetA: treasuryDatum.raiseAsset,
      assetB: treasuryDatum.baseAsset,
      totalLiquidity: totalLiquidity,
      reserveA: reserveB,
      reserveB: reserveA,
      baseFeeANumerator: 30n,
      baseFeeBNumerator: 30n,
      feeSharingNumeratorOpt: null,
      allowDynamicFee: false,
    };

    const options: BuildCreateAmmPoolOptions = {
      treasuryInput: treasuryUtxo,
      ammFactoryInput: ammFactoryInput,
      ammPoolDatum: poolDatum,
      validFrom: t.utils.slotToUnixTime(emulator.slot),
      validTo: t.utils.slotToUnixTime(emulator.slot + 100),
      totalLiquidity,
    };
    builder = new WarehouseBuilder(warehouseOptions);
    builder.buildCreateAmmPool(options);
    await quickSubmitBuilder(emulator)({
      txBuilder: builder.complete(),
    });
    console.info(`create AMM pool done.`);
  };
  await creatingPool();

  const redeemingOrders = async (maxCount?: number) => {
    const treasuryUtxo: UTxO = (
      await emulator.getUtxos(
        t.utils.validatorToAddress(validators.treasuryValidator),
      )
    ).find((u) => !u.scriptRef) as UTxO;
    const orderUtxos: UTxO[] = (
      await emulator.getUtxos(
        t.utils.validatorToAddress(validators.orderValidator),
      )
    ).filter((u) => !u.scriptRef) as UTxO[];
    maxCount = maxCount ?? orderUtxos.length;
    maxCount = maxCount > orderUtxos.length ? orderUtxos.length : maxCount;
    if (maxCount == 0) {
      return;
    }
    while (orderUtxos.length > maxCount) {
      orderUtxos.pop();
    }
    const options: BuildRedeemOrdersOptions = {
      treasuryInput: treasuryUtxo,
      orderInputs: orderUtxos,
      validFrom: t.utils.slotToUnixTime(emulator.slot),
      validTo: t.utils.slotToUnixTime(emulator.slot + 100),
    };
    builder = new WarehouseBuilder(warehouseOptions);
    builder.buildRedeemOrders(options);
    await quickSubmitBuilder(emulator)({
      txBuilder: builder.complete(),
      stats: true,
    });
    console.info(`Redeem order ${maxCount} done.`);
  };
  await redeemingOrders(1);
  await redeemingOrders(15);
  await redeemingOrders(15);
  await redeemingOrders(15);

  // let treasuryUtxo = (
  //   await emulator.getUtxos(
  //     t.utils.validatorToAddress(validators.treasuryValidator),
  //   )
  // ).find((u) => u.scriptRef === undefined)!;
  // let validFrom = t.utils.slotToUnixTime(emulator.slot);
  // let validTo = t.utils.slotToUnixTime(emulator.slot + 60 * 10);
  // builder = new WarehouseBuilder(options);
  // builder.buildAddSeller({
  //   treasuryUtxo,
  //   addSellerCount: 5n,
  //   validFrom,
  //   validTo,
  // })
  // const addSellersTx = await quickSubmitBuilder(emulator)({
  //   txBuilder: builder.complete(),
  // });
  // expect(addSellersTx).toBeTruthy();
  // console.info("Add Sellers done");
});
