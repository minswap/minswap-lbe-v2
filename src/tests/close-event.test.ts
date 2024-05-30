import { WarehouseBuilder } from "../build-tx";
import type { UTxO } from "../types";
import { loadModule, quickSubmitBuilder } from "./utils";
import { genWarehouse } from "./warehouse";

let warehouse: any;

beforeAll(async () => {
  await loadModule();
});

beforeEach(async () => {
  warehouse = await genWarehouse();
});

test("happ-case", async () => {
  const {
    emulator,
    t,
    warehouseOptions,
    defaultFactoryDatum,
    defaultTreasuryDatum,
  } = warehouse;
  const builder = new WarehouseBuilder(warehouseOptions);
  let factoryUtxo: UTxO = {
    txHash: "5428517bd92102ce1af705f8b66560d445e620aead488b47fb824426484912f8",
    outputIndex: 5,
    assets: {
      lovelace: 2_000_000n,
      [builder.factoryToken]: 1n,
    },
    datum: builder.toDatumFactory(defaultFactoryDatum),
    address: builder.factoryAddress,
  };
  emulator.addUTxO(factoryUtxo);
  builder.buildCreateTreasury({
    factoryUtxo,
    treasuryDatum: defaultTreasuryDatum,
    validFrom: t.utils.slotToUnixTime(emulator.slot),
    validTo: t.utils.slotToUnixTime(emulator.slot + 60),
  });
  const createTreasuryTx = await quickSubmitBuilder(emulator)({
    txBuilder: builder.complete(),
  });
  expect(createTreasuryTx).toBeTruthy();
});
