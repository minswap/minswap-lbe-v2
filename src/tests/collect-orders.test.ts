import { WarehouseBuilder, type BuildCollectOrdersOptions } from "../build-tx";
import { LBE_FEE, ORDER_MIN_ADA, TREASURY_MIN_ADA } from "../constants";
import type { OrderDatum, TreasuryDatum, UTxO } from "../types";
import { assertValidator, loadModule, quickSubmitBuilder } from "./utils";
import { genWarehouse } from "./warehouse";

let W: GenTestWarehouse;
const MAX_SIZE = 15;

beforeAll(async () => {
  await loadModule();
});

type GenTestWarehouse = Awaited<ReturnType<typeof genTestWarehouse>>;
async function genTestWarehouse() {
  let warehouse = await genWarehouse();
  let builder = new WarehouseBuilder(warehouse.warehouseOptions);
  let orderAmount = 100_000_000n;
  let penaltyAmount = 20_000_000n;
  const treasuryDatum: TreasuryDatum = {
    ...warehouse.defaultTreasuryDatum,
    isManagerCollected: true,
    reserveRaise: orderAmount,
  };
  const treasuryInput: UTxO = {
    txHash: "00".repeat(32),
    outputIndex: 1,
    assets: {
      [builder.treasuryToken]: 1n,
      [warehouse.minswapTokenRaw]: treasuryDatum.reserveBase,
      lovelace: TREASURY_MIN_ADA,
    },
    address: builder.treasuryAddress,
    datum: builder.toDatumTreasury(treasuryDatum),
  };
  let orderDatum: OrderDatum = {
    ...warehouse.defaultOrderDatum,
    amount: orderAmount,
    penaltyAmount,
  };
  let orderInput: UTxO = {
    txHash: "00".repeat(32),
    outputIndex: 2,
    assets: {
      [builder.orderToken]: 1n,
      lovelace: ORDER_MIN_ADA + 2n * LBE_FEE + orderAmount,
    },
    address: builder.orderAddress,
    datum: builder.toDatumOrder(orderDatum),
  };
  const options: BuildCollectOrdersOptions = {
    treasuryInput: treasuryInput,
    orderInputs: [orderInput],
    validFrom: warehouse.t.utils.slotToUnixTime(warehouse.emulator.slot),
    validTo: warehouse.t.utils.slotToUnixTime(warehouse.emulator.slot + 100),
  };
  return {
    ...warehouse,
    orderAmount,
    treasuryInput,
    orderInput,
    orderDatum,
    treasuryDatum,
    builder,
    options,
  };
}

let remixTreasuryInput = (remixDatum: any): UTxO => {
  let treasuryDatum = {
    ...W.treasuryDatum,
    ...remixDatum,
  };
  return {
    ...W.treasuryInput,
    datum: W.builder.toDatumTreasury(treasuryDatum),
  };
};

let remixOptions = (remixOptions: {
  treasuryDatum: any;
}): BuildCollectOrdersOptions => {
  let { options } = W;
  let { treasuryDatum } = remixOptions;
  if (treasuryDatum) {
    options = {
      ...options,
      treasuryInput: remixTreasuryInput(treasuryDatum),
    };
  }
  return options;
};

beforeEach(async () => {
  W = await genTestWarehouse();
});

test("collect-orders | PASS | if you're happy!", async () => {
  assertValidator(W.builder.buildCollectOrders(W.options), "");
});

test("collect-orders | PASS | LBE was cancelled", async () => {
  let { options, builder } = W;
  let remix = {
    treasuryDatum: { isCancelled: true },
  };
  options = remixOptions(remix);
  assertValidator(builder.buildCollectOrders(options), "");
});

test(`collect-orders | PASS | collect ${MAX_SIZE} orders`, async () => {
  let orderInputs: UTxO[] = [];
  for (let i = 0; i < MAX_SIZE; i++) {
    let orderInput: UTxO = {
      ...W.orderInput,
      outputIndex: i * 10,
    };
    orderInputs.push(orderInput);
  }
  let options = remixOptions({
    treasuryDatum: { reserveRaise: W.orderAmount * BigInt(MAX_SIZE) },
  });
  options = { ...options, orderInputs };
  assertValidator(W.builder.buildCollectOrders(options), "");
});

test(`collect-orders | PASS | collect orders many times`, async () => {
  let { builder } = W;
  let orderInputs: UTxO[] = [];
  for (let i = 0; i < MAX_SIZE; i++) {
    let orderInput: UTxO = {
      ...W.orderInput,
      outputIndex: i * 10,
    };
    orderInputs.push(orderInput);
  }
  let options = remixOptions({
    treasuryDatum: { reserveRaise: W.orderAmount * BigInt(MAX_SIZE) },
  });
  W.emulator.addUTxO(options.treasuryInput);
  for (let o of orderInputs) {
    W.emulator.addUTxO(o);
  }

  options = { ...options, orderInputs: orderInputs.slice(0, 3) };
  builder.buildCollectOrders(options);
  const tx1 = await quickSubmitBuilder(W.emulator)({
    txBuilder: builder.complete(),
  });
  expect(tx1).toBeTruthy();

  let treasuryInput = await W.findTreasuryInput();
  options = { ...options, orderInputs: orderInputs.slice(3), treasuryInput };
  // restart builder
  builder = new WarehouseBuilder(W.warehouseOptions);
  builder.buildCollectOrders(options);
  const tx2 = await quickSubmitBuilder(W.emulator)({
    txBuilder: builder.complete(),
  });
  expect(tx2).toBeTruthy();
});

test(`collect-orders | PASS | collect -> cancel -> collect`, async () => {
  let { builder } = W;
  let orderInputs: UTxO[] = [];
  for (let i = 0; i < MAX_SIZE; i++) {
    let orderInput: UTxO = {
      ...W.orderInput,
      outputIndex: i * 10,
    };
    orderInputs.push(orderInput);
  }
  let options = remixOptions({
    treasuryDatum: { reserveRaise: W.orderAmount * BigInt(MAX_SIZE) },
  });
  W.emulator.addUTxO(options.treasuryInput);
  for (let o of orderInputs) {
    W.emulator.addUTxO(o);
  }

  options = { ...options, orderInputs: orderInputs.slice(0, 3) };
  builder.buildCollectOrders(options);
  const tx1 = await quickSubmitBuilder(W.emulator)({
    txBuilder: builder.complete(),
  });
  expect(tx1).toBeTruthy();
});
