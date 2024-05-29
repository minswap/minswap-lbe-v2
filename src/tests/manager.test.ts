import { loadModule } from "@minswap/translucent";
import { genWarehouse, skipToCountingPhase } from "./warehouse";
import { WarehouseBuilder, type BuildCollectManagerOptions } from "../build-tx";
import type { UTxO } from "../types";
import type {
  ManagerValidateManagerSpending,
  TreasuryValidateTreasurySpending,
} from "../../plutus";
import { TREASURY_MIN_ADA } from "../constants";

let warehouse: any;

beforeAll(async () => {
  await loadModule();
});

beforeEach(async () => {
  warehouse = await genWarehouse();
  const {
    warehouseOptions,
    defaultManagerDatum,
    defaultTreasuryDatum,
    minswapTokenRaw,
  } = warehouse;
  let builder = new WarehouseBuilder(warehouseOptions);
  const managerDatum: ManagerValidateManagerSpending["managerInDatum"] = {
    ...defaultManagerDatum,
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
    ...defaultTreasuryDatum,
  };
  const treasuryInput: UTxO = {
    txHash: "00".repeat(32),
    outputIndex: 1,
    assets: {
      [builder.treasuryToken]: 1n,
      [minswapTokenRaw]: treasuryDatum.reserveBase,
      lovelace: TREASURY_MIN_ADA,
    },
    address: builder.treasuryAddress,
    datum: builder.toDatumTreasury(treasuryDatum),
  };

  warehouse = {
    ...warehouse,
    managerInput,
    treasuryInput,
    treasuryDatum,
  };
});

test("collect-manager | PASS | happy case", async () => {
  const {
    emulator,
    managerInput,
    treasuryInput,
    t,
    treasuryDatum,
    warehouseOptions,
  } = warehouse;
  let builder = new WarehouseBuilder(warehouseOptions);
  skipToCountingPhase({ e: emulator, t, datum: treasuryDatum });
  const options: BuildCollectManagerOptions = {
    treasuryInput,
    managerInput,
    validFrom: t.utils.slotToUnixTime(emulator.slot),
    validTo: t.utils.slotToUnixTime(emulator.slot + 100),
  };
  builder.buildCollectManager(options);
  builder.complete();
});

test("collect-manager | FAIL | no auth treasury", async () => {
  let {
    emulator,
    managerInput,
    treasuryInput,
    t,
    treasuryDatum,
    warehouseOptions,
  } = warehouse;
  let builder = new WarehouseBuilder(warehouseOptions);
  managerInput = {
    ...managerInput,
    assets: {
      ...managerInput.assets,
      [builder.treasuryToken]: 1n,
    },
  };
  treasuryInput = {
    ...treasuryInput,
    assets: {
      ...treasuryInput.assets,
      [builder.treasuryToken]: 0n,
    },
  };
  skipToCountingPhase({ e: emulator, t, datum: treasuryDatum });
  const options: BuildCollectManagerOptions = {
    treasuryInput,
    managerInput,
    validFrom: t.utils.slotToUnixTime(emulator.slot),
    validTo: t.utils.slotToUnixTime(emulator.slot + 100),
  };
  builder.buildCollectManager(options);
  const tx = builder.complete();
  let errMessage = "";
  try {
    await tx.complete();
  } catch (err) {
    if (typeof err == "string") errMessage = err;
  }
  expect(errMessage).toContain("Treasury UTxO must contain 1 Treasury Token");
});

test("collect-manager | FAIL | no minting", async () => {
  let {
    emulator,
    managerInput,
    treasuryInput,
    t,
    treasuryDatum,
    warehouseOptions,
  } = warehouse;
  let builder = new WarehouseBuilder(warehouseOptions);
  skipToCountingPhase({ e: emulator, t, datum: treasuryDatum });
  const options: BuildCollectManagerOptions = {
    treasuryInput,
    managerInput,
    validFrom: t.utils.slotToUnixTime(emulator.slot),
    validTo: t.utils.slotToUnixTime(emulator.slot + 100),
  };
  builder.buildCollectManager(options);
  builder.tasks = [...builder.tasks.slice(0, 3), ...builder.tasks.slice(4)];
  const tx = builder.complete();
  let errMessage = "";
  try {
    await tx.complete();
  } catch (err) {
    if (typeof err == "string") errMessage = err;
  }
  expect(errMessage).toContain("Must burn 1 Manager Token");
});

test("collect-manager | FAIL | different LBE", async () => {
  let {
    emulator,
    managerInput,
    treasuryInput,
    t,
    treasuryDatum,
    warehouseOptions,
  } = warehouse;
  let builder = new WarehouseBuilder(warehouseOptions);
  skipToCountingPhase({ e: emulator, t, datum: treasuryDatum });
  const options: BuildCollectManagerOptions = {
    treasuryInput,
    managerInput,
    validFrom: t.utils.slotToUnixTime(emulator.slot),
    validTo: t.utils.slotToUnixTime(emulator.slot + 100),
  };
  builder.buildCollectManager(options);
  builder.tasks = [...builder.tasks.slice(0, 3), ...builder.tasks.slice(4)];
  const tx = builder.complete();
  let errMessage = "";
  try {
    await tx.complete();
  } catch (err) {
    if (typeof err == "string") errMessage = err;
  }
  expect(errMessage).toContain("Must burn 1 Manager Token");
});
