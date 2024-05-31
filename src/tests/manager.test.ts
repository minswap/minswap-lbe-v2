import * as T from "@minswap/translucent";
import {
  TreasuryValidateTreasurySpending,
  type ManagerValidateManagerSpending,
} from "../../plutus";
import { WarehouseBuilder, type BuildCollectManagerOptions } from "../build-tx";
import { TREASURY_MIN_ADA } from "../constants";
import type { UTxO } from "../types";
import { assertValidator, loadModule } from "./utils";
import { genWarehouse } from "./warehouse";

let W: any; // warehouse

beforeAll(async () => {
  await loadModule();
});

beforeEach(async () => {
  W = await genWarehouse();
  let builder = new WarehouseBuilder(W.warehouseOptions);
  const managerDatum: ManagerValidateManagerSpending["managerInDatum"] = {
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
  const treasuryDatum: TreasuryValidateTreasurySpending["treasuryInDatum"] = {
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
  assertValidator(W.builder.buildCollectManager(W.options).complete(), "");
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
  await assertValidator(
    W.builder,
    "Treasury UTxO must contain 1 Treasury Token",
  );
});

test("collect-manager | FAIL | no minting", async () => {
  let { builder, options } = W;
  builder.buildCollectManager(options);
  builder.tasks = [...builder.tasks.slice(0, 3), ...builder.tasks.slice(4)];
  await assertValidator(builder, "Must burn 1 Manager Token");
});

test("collect-manager | FAIL | wrong treasury out datum", async () => {
  const { builder } = W;
  const options = {
    ...W.options,
    treasuryOutDatum: W.treasuryDatum,
  };
  builder.buildCollectManager(options);
  await assertValidator(builder, "Treasury Out Datum must be correct!");
});

test("collect-manager | FAIL | LBE ID missmatch", async () => {
  const { builder } = W;
  const treasuryInDatum = {
    ...W.treasuryDatum,
    baseAsset: W.adaToken,
  };
  const treasuryInput: UTxO = {
    ...W.treasuryInput,
    datum: T.Data.to(
      treasuryInDatum,
      TreasuryValidateTreasurySpending.treasuryInDatum,
    ),
  };
  const options = {
    ...W.options,
    treasuryInput: treasuryInput,
    managerInput: W.managerInput,
  };
  builder.buildCollectManager(options);
  await assertValidator(builder, "Treasury In Datum must be correct!");
});
