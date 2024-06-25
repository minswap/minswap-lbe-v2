import * as T from "@minswap/translucent";
import { WarehouseBuilder } from "../build-tx";
import { WarehouseBatcher } from "../cmd/batcher";
import type { ManagerDatum, TreasuryDatum } from "../types";
import { loadModule } from "./utils";
import {
  genWarehouse,
  skipToCountingPhase,
  type GenWarehouse,
} from "./warehouse";

let warehouse: GenWarehouse;
let defaultMaxTxSize = T.PROTOCOL_PARAMETERS_DEFAULT.maxTxSize;

const SELLER_COUNT = 3;

beforeAll(async () => {
  await loadModule();
});

beforeEach(async () => {
  warehouse = await genWarehouse(defaultMaxTxSize);
});

test("batcher | buildMapLbeUTxO", async () => {
  let { builder, emulator } = warehouse;

  emulator.addUTxO(warehouse.defaultTreasuryInput);
  emulator.addUTxO(warehouse.defaultManagerInput);
  emulator.addUTxO(warehouse.defaultSellerInput);
  emulator.addUTxO(warehouse.defaultOrderInput);

  let expectMapLbeUTxO = {
    treasury: warehouse.defaultTreasuryInput,
    manager: warehouse.defaultManagerInput,
    sellers: [warehouse.defaultSellerInput],
    orders: [warehouse.defaultOrderInput],
  };
  let batcher = new WarehouseBatcher(builder);
  await batcher.buildMapLbeUTxO();

  expect(Object.keys(batcher.mapLbeUTxO).length).toEqual(1);
  let mapLbeUTxO = Object.values(batcher.mapLbeUTxO)[0];
  expect(mapLbeUTxO).toEqual(expectMapLbeUTxO);
});

test("batcher | collect-sellers", async () => {
  let { builder, emulator } = warehouse;
  // IMPORTANT!!! Update LBE End Time
  let treasuryDatum: TreasuryDatum = {
    ...warehouse.defaultTreasuryDatum,
    startTime: BigInt(Date.now() - 3 * 24 * 60 * 60 * 1000),
    endTime: BigInt(Date.now() - 60 * 60 * 1000),
  };
  let treasuryInput = {
    ...warehouse.defaultTreasuryInput,
    datum: WarehouseBuilder.toDatumTreasury(treasuryDatum),
  };
  let managerDatum: ManagerDatum = {
    ...warehouse.defaultManagerDatum,
    sellerCount: BigInt(SELLER_COUNT),
  };
  let managerInput = {
    ...warehouse.defaultManagerInput,
    datum: WarehouseBuilder.toDatumManager(managerDatum),
  };
  let sellerInputs: T.UTxO[] = [];
  for (let i = 0; i < SELLER_COUNT; i++) {
    let utxo: T.UTxO = {
      ...warehouse.defaultSellerInput,
      outputIndex: warehouse.outputIndex++,
    };
    sellerInputs.push(utxo);
  }

  emulator.addUTxO(treasuryInput);
  emulator.addUTxO(managerInput);
  for (let s of sellerInputs) emulator.addUTxO(s);
  skipToCountingPhase({
    t: builder.t,
    e: emulator,
    datum: treasuryDatum,
  });

  let batcher = new WarehouseBatcher(builder);
  await batcher.batching();

  // collect all sellers => Seller Address doesn't have any UTxO
  let sellers = await warehouse.findSellers();
  expect(sellers.length).toEqual(0);
});
