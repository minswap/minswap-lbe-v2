import { WarehouseBuilder, type BuildCollectManagerOptions } from "../build-tx";
import { TREASURY_MIN_ADA } from "../constants";
import type { ManagerDatum, TreasuryDatum, UTxO } from "../types";
import { assertValidator, assertValidatorFail, loadModule } from "./utils";
import { genWarehouse } from "./warehouse";

let W: any; // warehouse

beforeAll(async () => {
  await loadModule();
});

beforeEach(async () => {
  W = await genWarehouse();
  let builder = new WarehouseBuilder(W.warehouseOptions);
  const managerDatum: ManagerDatum = {
    ...W.defaultManagerDatum,
    sellerCount: 0n,
    reserveRaise: 100_000_000_000n,
    totalPenalty: 0n,
  };
  const managerInput: UTxO = {
    txHash: "00".repeat(32),
    outputIndex: 0,
    assets: {
      [builder.managerToken]: 1n,
      lovelace: 2_000_000n,
    },
    address: builder.managerAddress,
    datum: builder.toDatumManager(managerDatum),
  };
  const treasuryDatum: TreasuryDatum = {
    ...W.defaultTreasuryDatum,
  };
  const treasuryInput: UTxO = {
    txHash: "00".repeat(32),
    outputIndex: 1,
    assets: {
      [builder.treasuryToken]: 1n,
      [W.minswapTokenRaw]: treasuryDatum.reserveBase,
      lovelace: TREASURY_MIN_ADA,
    },
    address: builder.treasuryAddress,
    datum: builder.toDatumTreasury(treasuryDatum),
  };
  const options: BuildCollectManagerOptions = {
    treasuryInput: treasuryInput,
    managerInput: managerInput,
    validFrom: W.t.utils.slotToUnixTime(W.emulator.slot),
    validTo: W.t.utils.slotToUnixTime(W.emulator.slot + 100),
  };
  W = {
    ...W,
    managerInput,
    treasuryInput,
    treasuryDatum,
    builder,
    options,
  };
});

test("collect-manager | PASS | happy case", async () => {
  assertValidator(W.builder.buildCollectManager(W.options), "");
});

test("collect-manager | FAIL | no auth treasury", async () => {
  let managerInput = {
    ...W.managerInput,
    assets: {
      ...W.managerInput.assets,
      [W.builder.treasuryToken]: 1n,
    },
  };
  let treasuryInput = {
    ...W.treasuryInput,
    assets: {
      ...W.treasuryInput.assets,
      [W.builder.treasuryToken]: 0n,
    },
  };
  let options = { ...W.options, treasuryInput, managerInput };
  W.builder.buildCollectManager(options);
  // Treasury UTxO must contain 1 Treasury Token
  await assertValidatorFail(W.builder);
});

test("collect-manager | FAIL | no minting", async () => {
  let { builder, options } = W;
  builder.buildCollectManager(options);
  builder.tasks = [...builder.tasks.slice(0, 3), ...builder.tasks.slice(4)];
  // Must burn 1 Manager Token
  await assertValidatorFail(builder);
});

test("collect-manager | FAIL | wrong treasury out datum", async () => {
  const { builder } = W;
  const options = {
    ...W.options,
    treasuryOutDatum: W.treasuryDatum,
  };
  builder.buildCollectManager(options);
  // Treasury Out Datum must be correct!
  await assertValidatorFail(builder);
});

test("collect-manager | FAIL | LBE ID missmatch", async () => {
  let builder: WarehouseBuilder = W.builder;
  const treasuryInDatum = {
    ...W.treasuryDatum,
    baseAsset: W.adaToken,
  };
  const treasuryInput: UTxO = {
    ...W.treasuryInput,
    datum: builder.toDatumTreasury(treasuryInDatum),
  };
  const options = {
    ...W.options,
    treasuryInput: treasuryInput,
    managerInput: W.managerInput,
  };
  builder.buildCollectManager(options);
  // Treasury In Datum must be correct!
  await assertValidatorFail(builder);
});
