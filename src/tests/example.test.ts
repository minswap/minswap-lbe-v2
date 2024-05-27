import { beforeEach, expect, test } from "bun:test";
import * as T from "@minswap/translucent";
import {
  WarehouseBuilder,
  type BuildAddSellersOptions,
  type BuildCollectManagerOptions,
  type BuildCollectSellersOptions,
  type BuildUsingSellerOptions,
  type WarehouseBuilderOptions,
} from "../build-tx";
import {
  deployValidators,
  type DeployedValidators,
  type Validators,
  collectValidators,
  type MinswapValidators,
  deployMinswapValidators,
  collectMinswapValidators,
} from "../deploy-validators";
import { generateAccount, quickSubmitBuilder, type GeneratedAccount } from "./utils";
import type { Emulator, Translucent, UTxO } from "../types";
import { address2PlutusAddress, computeLPAssetName } from "../utils";
import { DEFAULT_NUMBER_SELLER, LBE_INIT_FACTORY_HEAD, LBE_INIT_FACTORY_TAIL } from "../constants";
import {
  FactoryValidateFactory,
  FeedTypeOrder,
  type TreasuryValidateTreasurySpending,
} from "../../plutus";

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

beforeEach(async () => {
  await T.loadModule();
  await T.CModuleLoader.load();

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
    [T.toUnit(baseAsset.policyId, baseAsset.assetName)]: 69_000_000_000_000n,
  });
  ACCOUNT_1 = await generateAccount({
    lovelace: 2000000000000000000n,
  });
  emulator = new T.Emulator([ACCOUNT_0, ACCOUNT_1]);
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

  let ammSeedUtxo = (await emulator.getUtxos(ACCOUNT_1.address))[utxos.length - 1];

  ammValidators = collectMinswapValidators({
    t,
    seedOutRef: {
      txHash: ammSeedUtxo.txHash,
      outputIndex: ammSeedUtxo.outputIndex,
    },
  });
  ammDeployedValidators = await deployMinswapValidators(t, ammValidators);

  // registerStake
  await quickSubmitBuilder(emulator)({
    txBuilder: t
      .newTx()
      .registerStake(t.utils.validatorToRewardAddress(validators.sellerValidator)),
  });
});

test("quick", async () => {
  const lpAssetName = computeLPAssetName(baseAsset.policyId + baseAsset.assetName, "");
  const factoryDatumHead: FactoryValidateFactory["datum"] = {
    head: LBE_INIT_FACTORY_HEAD,
    tail: lpAssetName,
  };
  const factoryDatumTail: FactoryValidateFactory["datum"] = {
    head: lpAssetName,
    tail: LBE_INIT_FACTORY_TAIL,
  };
  const headRaw = T.Data.to(factoryDatumHead, FactoryValidateFactory.datum);
  const tailRaw = T.Data.to(factoryDatumTail, FactoryValidateFactory.datum);
  expect(headRaw < tailRaw).toBeTruthy();
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
  const treasuryDatum: TreasuryValidateTreasurySpending["treasuryInDatum"] = {
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
    isCancelled: false,
    minimumOrderRaise: null,
    isManagerCollected: false,
  };
  builder = new WarehouseBuilder(warehouseOptions);
  let factoryUtxo: UTxO = (
    await emulator.getUtxos(t.utils.validatorToAddress(validators.factoryValidator))
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
    await emulator.getUtxos(t.utils.validatorToAddress(validators.treasuryValidator))
  ).find((u) => !u.scriptRef) as UTxO;
  let orderDatum: FeedTypeOrder["_datum"] = {
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
      await emulator.getUtxos(t.utils.validatorToAddress(validators.managerValidator))
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
      await emulator.getUtxos(t.utils.validatorToAddress(validators.sellerValidator))
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
  await depositing(30);

  // update + orders
  const updatingOrders = async (maxCount?: number) => {
    const sellerUtxo: UTxO = (
      await emulator.getUtxos(t.utils.validatorToAddress(validators.sellerValidator))
    ).find((u) => !u.scriptRef) as UTxO;
    const orderUtxos: UTxO[] = (
      await emulator.getUtxos(t.utils.validatorToAddress(validators.orderValidator))
    ).filter((u) => !u.scriptRef) as UTxO[];
    maxCount = maxCount ?? orderUtxos.length;
    while (orderUtxos.length > maxCount) {
      orderUtxos.pop();
    }
    console.log(`trying to update ${orderUtxos.length} orders`);
    builder = new WarehouseBuilder(warehouseOptions);
    const newOrderDatums = Array.from({ length: orderUtxos.length }, () => ({
      ...orderDatum,
      amount: 80n,
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
  await updatingOrders(15);

  // collect manager
  while (emulator.slot <= discoveryEndSlot) {
    emulator.awaitBlock(100);
  }

  const collectingSeller = async (maxCount?: number) => {
    const managerUtxo: UTxO = (
      await emulator.getUtxos(t.utils.validatorToAddress(validators.managerValidator))
    ).find((u) => !u.scriptRef) as UTxO;
    const sellerUtxos: UTxO[] = (
      await emulator.getUtxos(t.utils.validatorToAddress(validators.sellerValidator))
    ).filter((u) => !u.scriptRef) as UTxO[];
    maxCount = maxCount ?? sellerUtxos.length;

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

  await collectingSeller(2);

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
