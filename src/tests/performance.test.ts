import * as T from "@minswap/translucent";
import type {
  BuildCollectOrdersOptions,
  BuildCollectSellersOptions,
  BuildRedeemOrdersOptions,
} from "../build-tx";
import type {
  Assets,
  ManagerDatum,
  OrderDatum,
  TreasuryDatum,
  UTxO,
} from "../types";
import { loadModule, quickSubmitBuilder } from "./utils";
import {
  genWarehouse,
  skipToCountingPhase,
  type GenWarehouse,
} from "./warehouse";
import { calculateInitialLiquidity, toUnit } from "../utils";
import { LP_COLATERAL, TREASURY_MIN_ADA } from "..";

let MAX_COLLECT_SELLER_COUNT = 28;
let MAX_COLLECT_ORDER_COUNT = 53;
let MAX_REFUND_ORDER_COUNT = 62;
let MAX_REDEEM_ORDER_COUNT = 60;

let warehouse: GenWarehouse;
let defaultMaxTxSize = T.PROTOCOL_PARAMETERS_DEFAULT.maxTxSize;

beforeAll(async () => {
  await loadModule();
});

beforeEach(async () => {
  warehouse = await genWarehouse(defaultMaxTxSize);
});

test("performance | collect-seller", async () => {
  let { builder, emulator } = warehouse;
  let managerDatum: ManagerDatum = {
    ...warehouse.defaultManagerDatum,
    sellerCount: 100n,
  };
  let managerInput = {
    ...warehouse.defaultManagerInput,
    datum: builder.toDatumManager(managerDatum),
  };
  let sellerInputs: UTxO[] = [];
  for (let i = 0; i < MAX_COLLECT_SELLER_COUNT; i++) {
    let utxo: UTxO = {
      ...warehouse.defaultSellerInput,
      outputIndex: warehouse.outputIndex++,
    };
    sellerInputs.push(utxo);
  }
  let validFrom = Number(warehouse.defaultTreasuryDatum.endTime) + 1000;
  let options: BuildCollectSellersOptions = {
    managerInput,
    sellerInputs,
    treasuryRefInput: warehouse.defaultTreasuryInput,
    validFrom,
    validTo: validFrom + 3 * 60 * 60 * 1000, // 3 hour
  };
  builder.buildCollectSeller(options);

  emulator.addUTxO(options.treasuryRefInput);
  emulator.addUTxO(options.managerInput);
  for (let s of sellerInputs) emulator.addUTxO(s);
  skipToCountingPhase({
    t: builder.t,
    e: emulator,
    datum: warehouse.defaultTreasuryDatum,
  });

  console.log(`collecting ${MAX_COLLECT_SELLER_COUNT} sellers`);
  const tx = await quickSubmitBuilder(emulator)({
    txBuilder: builder.complete(),
    stats: true,
  });
  expect(tx).toBeTruthy();
});

test("performance | collect-order", async () => {
  let { builder, emulator } = warehouse;
  let validFrom = Number(warehouse.defaultTreasuryDatum.endTime) + 1000;
  let orderInputs: UTxO[] = [];
  for (let i = 0; i < MAX_COLLECT_ORDER_COUNT; i++) {
    let utxo: UTxO = {
      ...warehouse.defaultOrderInput,
      outputIndex: warehouse.outputIndex++,
    };
    orderInputs.push(utxo);
  }
  let treasuryDatum: TreasuryDatum = {
    ...warehouse.defaultTreasuryDatum,
    isManagerCollected: true,
  };
  let treasuryInput: UTxO = {
    ...warehouse.defaultTreasuryInput,
    datum: builder.toDatumTreasury(treasuryDatum),
  };
  let options: BuildCollectOrdersOptions = {
    validFrom,
    validTo: validFrom + 3 * 60 * 60 * 1000,
    treasuryInput,
    orderInputs,
  };
  builder.buildCollectOrders(options);

  emulator.addUTxO(treasuryInput);
  for (let s of orderInputs) emulator.addUTxO(s);
  skipToCountingPhase({
    t: builder.t,
    e: emulator,
    datum: warehouse.defaultTreasuryDatum,
  });

  console.log(`collecting ${MAX_COLLECT_ORDER_COUNT} orders`);
  const tx = await quickSubmitBuilder(emulator)({
    txBuilder: builder.complete(),
    stats: true,
  });
  expect(tx).toBeTruthy();
});

test("performance | refund-order", async () => {
  let { builder, emulator } = warehouse;
  let orderInputs: UTxO[] = [];
  let orderDatum: OrderDatum = {
    ...warehouse.defaultOrderDatum,
    isCollected: true,
  };
  let collectedFund = 0n;
  let reserveRaise = 0n;
  for (let i = 0; i < MAX_REFUND_ORDER_COUNT; i++) {
    let utxo: UTxO = {
      ...warehouse.defaultOrderInput,
      outputIndex: warehouse.outputIndex++,
      datum: builder.toDatumOrder(orderDatum),
    };
    orderInputs.push(utxo);
    collectedFund += orderDatum.amount + orderDatum.penaltyAmount;
    reserveRaise += orderDatum.amount;
  }
  let treasuryDatum: TreasuryDatum = {
    ...warehouse.defaultTreasuryDatum,
    reserveRaise,
    isManagerCollected: true,
    isCancelled: true,
    collectedFund,
  };
  let raiseAsset = toUnit(
    treasuryDatum.raiseAsset.policyId,
    treasuryDatum.raiseAsset.assetName,
  );
  let treasuryAssets = warehouse.defaultTreasuryInput.assets;
  let treasuryInput: UTxO = {
    ...warehouse.defaultTreasuryInput,
    datum: builder.toDatumTreasury(treasuryDatum),
    assets: {
      ...treasuryAssets,
      [raiseAsset]: (treasuryAssets[raiseAsset] ?? 0n) + collectedFund,
    },
  };
  let options: BuildRedeemOrdersOptions = {
    validFrom: builder.t.utils.slotToUnixTime(emulator.slot),
    validTo: builder.t.utils.slotToUnixTime(emulator.slot + 100),
    treasuryInput,
    orderInputs,
  };
  builder.buildRefundOrders(options);

  emulator.addUTxO(treasuryInput);
  for (let s of orderInputs) emulator.addUTxO(s);

  console.log(`refunding ${MAX_REFUND_ORDER_COUNT} orders`);
  const tx = await quickSubmitBuilder(emulator)({
    txBuilder: builder.complete(),
    stats: true,
  });
  expect(tx).toBeTruthy();
});

test("performance | redeem-order", async () => {
  let { builder, emulator } = warehouse;
  let validFrom = Number(warehouse.defaultTreasuryDatum.endTime) + 1000;
  let orderInputs: UTxO[] = [];
  let orderDatum: OrderDatum = {
    ...warehouse.defaultOrderDatum,
    isCollected: true,
  };
  let collectedFund = 0n;
  let reserveRaise = 0n;
  for (let i = 0; i < MAX_REDEEM_ORDER_COUNT; i++) {
    let utxo: UTxO = {
      ...warehouse.defaultOrderInput,
      outputIndex: warehouse.outputIndex++,
      datum: builder.toDatumOrder(orderDatum),
    };
    orderInputs.push(utxo);
    collectedFund += orderDatum.amount + orderDatum.penaltyAmount;
    reserveRaise += orderDatum.amount;
  }
  let treasuryDatum: TreasuryDatum = {
    ...warehouse.defaultTreasuryDatum,
    reserveRaise,
    isManagerCollected: true,
    collectedFund,
  };
  builder.setInnerAssets(treasuryDatum.baseAsset, treasuryDatum.raiseAsset);
  const initLiquidity =
    calculateInitialLiquidity(
      treasuryDatum.reserveRaise,
      treasuryDatum.reserveBase,
    ) - LP_COLATERAL;
  const totalLiquidity = initLiquidity - initLiquidity / 2n;
  treasuryDatum = {
    ...treasuryDatum,
    totalLiquidity,
  };
  let treasuryAssets: Assets = {
    lovelace: TREASURY_MIN_ADA,
    [builder.treasuryToken]: 1n,
    [builder.ammLpToken!]: totalLiquidity,
  };
  let treasuryInput: UTxO = {
    ...warehouse.defaultTreasuryInput,
    datum: builder.toDatumTreasury(treasuryDatum),
    assets: treasuryAssets,
  };
  let options: BuildRedeemOrdersOptions = {
    validFrom,
    validTo: validFrom + 3 * 60 * 60 * 1000,
    treasuryInput,
    orderInputs,
  };
  builder.buildRedeemOrders(options);

  emulator.addUTxO(treasuryInput);
  for (let s of orderInputs) emulator.addUTxO(s);
  skipToCountingPhase({
    t: builder.t,
    e: emulator,
    datum: warehouse.defaultTreasuryDatum,
  });

  console.log(`redeeming ${MAX_REDEEM_ORDER_COUNT} orders`);
  const tx = await quickSubmitBuilder(emulator)({
    txBuilder: builder.complete(),
    stats: true,
  });
  expect(tx).toBeTruthy();
});
