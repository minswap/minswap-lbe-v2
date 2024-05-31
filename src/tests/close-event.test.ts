import type {
  FactoryValidateFactory,
  TreasuryValidateTreasurySpending,
} from "../../plutus";
import { WarehouseBuilder, type BuildCloseEventOptions } from "../build-tx";
import {
  LBE_INIT_FACTORY_HEAD,
  LBE_INIT_FACTORY_TAIL,
  TREASURY_MIN_ADA,
} from "../constants";
import type { UTxO } from "../types";
import { computeLPAssetName } from "../utils";
import { assertValidator, loadModule } from "./utils";
import { genWarehouse } from "./warehouse";

let W: any; // warehouse

beforeAll(async () => {
  await loadModule();
});

beforeEach(async () => {
  W = await genWarehouse();
  let builder = new WarehouseBuilder(W.warehouseOptions);
  let treasuryDatum: TreasuryValidateTreasurySpending["treasuryInDatum"] = {
    ...W.defaultTreasuryDatum,
    isCancelled: true,
    isManagerCollected: true,
  };
  let treasuryInput: UTxO = {
    address: builder.treasuryAddress,
    datum: builder.toDatumTreasury(treasuryDatum),
    assets: {
      [builder.treasuryToken]: 1n,
      lovelace: TREASURY_MIN_ADA,
    },
    scriptRef: undefined,
    txHash: "00".repeat(32),
    outputIndex: 0,
  };
  const lpAssetName = computeLPAssetName(
    treasuryDatum.baseAsset.policyId + treasuryDatum.baseAsset.assetName,
    treasuryDatum.raiseAsset.policyId + treasuryDatum.raiseAsset.assetName,
  );
  let factoryHeadDatum: FactoryValidateFactory["datum"] = {
    head: LBE_INIT_FACTORY_HEAD,
    tail: lpAssetName,
  };
  let factoryTailDatum: FactoryValidateFactory["datum"] = {
    head: lpAssetName,
    tail: LBE_INIT_FACTORY_TAIL,
  };
  let factoryInputs: UTxO[] = [
    {
      txHash: "00".repeat(32),
      outputIndex: 1,
      scriptRef: undefined,
      assets: {
        lovelace: 2_000_000n,
        [builder.factoryToken]: 1n,
      },
      address: builder.factoryAddress,
      datum: builder.toDatumFactory(factoryHeadDatum),
    },
    {
      txHash: "00".repeat(32),
      outputIndex: 2,
      scriptRef: undefined,
      assets: {
        lovelace: 2_000_000n,
        [builder.factoryToken]: 1n,
      },
      address: builder.factoryAddress,
      datum: builder.toDatumFactory(factoryTailDatum),
    },
  ];
  let options: BuildCloseEventOptions = {
    treasuryInput,
    factoryInputs,
    validFrom: W.t.utils.slotToUnixTime(W.emulator.slot),
    validTo: W.t.utils.slotToUnixTime(W.emulator.slot + 60),
  };
  W = {
    ...W,
    builder,
    options,
    treasuryInput,
    factoryInputs,
  };
});

test("close-event | PASS | happy case", async () => {
  assertValidator(W.builder.buildCloseEvent(W.options), "");
});
