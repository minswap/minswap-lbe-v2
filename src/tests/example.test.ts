import { beforeEach, expect, test } from "bun:test";
import * as T from "@minswap/translucent";
import {
  WarehouseBuilder,
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
import { FactoryValidatorValidateFactory, type TreasuryValidatorValidateTreasurySpending } from "../../plutus";
import { address2PlutusAddress, computeLPAssetName } from "../utils";
import { DEFAULT_NUMBER_SELLER, LBE_INIT_FACTORY_HEAD, LBE_INIT_FACTORY_TAIL } from "../constants";

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
});

test("quick", async()=>{
  const lpAssetName = computeLPAssetName(
    baseAsset.policyId + baseAsset.assetName,
    "",
  );
  const factoryDatumHead: FactoryValidatorValidateFactory["datum"] = {
    head: LBE_INIT_FACTORY_HEAD,
    tail: lpAssetName,
  }
  const factoryDatumTail: FactoryValidatorValidateFactory["datum"] = {
    head: lpAssetName,
    tail: LBE_INIT_FACTORY_TAIL,
  }
  const headRaw = T.Data.to(factoryDatumHead, FactoryValidatorValidateFactory.datum);
  const tailRaw = T.Data.to(factoryDatumTail, FactoryValidatorValidateFactory.datum);
  console.log({headRaw, tailRaw});
  expect(headRaw < tailRaw).toBeTruthy();
});

test("example flow", async () => {
  const options: WarehouseBuilderOptions = {
    t,
    validators,
    deployedValidators,
    ammValidators,
    ammDeployedValidators,
  };
  let builder = new WarehouseBuilder(options);
  builder.buildInitFactory({ seedUtxo });
  const tx = builder.complete();

  const initFactoryTx = await quickSubmitBuilder(emulator)({
    txBuilder: tx,
    extraSignatures: [ACCOUNT_1.privateKey],
  });
  expect(initFactoryTx).toBeTruthy();
  console.info("Init Factory done");

  const discoveryStartSlot = emulator.slot;
  const discoveryEndSlot = discoveryStartSlot + 60 * 60 * 24 * 2; // 2 days
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
    reserveBase: 69000000000000n,
    reserveRaise: 0n,
    totalLiquidity: 0n,
    penaltyConfig: null,
    totalPenalty: 0n,
    isCancelled: false,
  };
  builder = new WarehouseBuilder(options);
  let factoryUtxo: UTxO = (
    await emulator.getUtxos(
      t.utils.validatorToAddress(validators.factoryValidator),
    )
  ).find((u) => !u.scriptRef) as UTxO;
  builder.buildCreateTreasury({ factoryUtxo, treasuryDatum });
  const createTreasuryTx = await quickSubmitBuilder(emulator)({
    txBuilder: builder.complete(),
  });
  expect(createTreasuryTx).toBeTruthy();
  console.info("create treasury done");

  let treasuryUtxo = (
    await emulator.getUtxos(
      t.utils.validatorToAddress(validators.treasuryValidator),
    )
  ).find((u) => u.scriptRef === undefined)!;
  let validFrom = t.utils.slotToUnixTime(emulator.slot);
  let validTo = t.utils.slotToUnixTime(emulator.slot + 60 * 10);
  builder = new WarehouseBuilder(options);
  builder.buildAddSeller({
    treasuryUtxo,
    addSellerCount: 5n,
    validFrom,
    validTo,
  })
  const addSellersTx = await quickSubmitBuilder(emulator)({
    txBuilder: builder.complete(),
  });
  expect(addSellersTx).toBeTruthy();
  console.info("Add Sellers done");
});
