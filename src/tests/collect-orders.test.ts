// import { TreasuryValidateTreasurySpending } from "../../plutus";
// import { WarehouseBuilder, type BuildCollectOrdersOptions } from "../build-tx";
// import { ORDER_MIN_ADA, TREASURY_MIN_ADA } from "../constants";
// import type { UTxO } from "../types";
// import { assertValidator, loadModule } from "./utils";
// import { genWarehouse } from "./warehouse";

// let W: GenTestWarehouse;

// beforeAll(async () => {
//   await loadModule();
// });

// type GenTestWarehouse = Awaited<ReturnType<typeof genTestWarehouse>>;
// async function genTestWarehouse() {
//   let warehouse = await genWarehouse();
//   let builder = new WarehouseBuilder(warehouse.warehouseOptions);
//   const treasuryDatum: TreasuryValidateTreasurySpending["treasuryInDatum"] = {
//     ...warehouse.defaultTreasuryDatum,
//   };
//   const treasuryInput: UTxO = {
//     txHash: "00".repeat(32),
//     outputIndex: 1,
//     assets: {
//       [builder.treasuryToken]: 1n,
//       [warehouse.minswapTokenRaw]: treasuryDatum.reserveBase,
//       lovelace: TREASURY_MIN_ADA,
//     },
//     address: builder.treasuryAddress,
//     datum: builder.toDatumTreasury(treasuryDatum),
//   };
//   let orderAmount = 100_000_000n;
//   let orderDatum: FeedTyp = {
//     ...warehouse.defaultOrderDatum,
//     amount:
//   };
//   let orderInput: UTxO = {
//     txHash: "00".repeat(32),
//     outputIndex: 2,
//     assets: {
//       [builder.orderToken]: 1n,
//       lovelace: ORDER_MIN_ADA + orderAmount,
//     },
//     address: builder.orderAddress,
//     datum: builder.toDatumOrder(orderDatum),
//   };
//   const options: BuildCollectOrdersOptions = {
//     treasuryInput: treasuryInput,
//     orderInputs: [orderInput],
//     validFrom: warehouse.t.utils.slotToUnixTime(warehouse.emulator.slot),
//     validTo: warehouse.t.utils.slotToUnixTime(warehouse.emulator.slot + 100),
//   };
//   return {
//     ...warehouse,
//     treasuryInput,
//     treasuryDatum,
//     builder,
//     options,
//   };
// }

// beforeEach(async () => {
//   W = await genTestWarehouse();
// });

// test("collect-orders | PASS | if you're happy!", async () => {
//   assertValidator(W.builder.buildCollectOrders(W.options), "");
// });
