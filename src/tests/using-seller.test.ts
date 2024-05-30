import {
  FeedTypeOrder,
  SellerValidateSellerSpending,
  TreasuryValidateTreasurySpending,
} from "../../plutus";
import {
  WarehouseBuilder,
  type BuildUsingSellerOptions,
  type WarehouseBuilderOptions,
} from "../build-tx";
import { TREASURY_MIN_ADA } from "../constants";
import { assertValidator, genWarehouseOptions, loadModule } from "./utils";
import * as T from "@minswap/translucent";
import { genWarehouse } from "./warehouse";
import type { BluePrintAsset, UTxO } from "../types";
import { plutusAddress2Address } from "../utils";

let warehouse: {
  t: T.Translucent;
  builder: WarehouseBuilder;
  options: BuildUsingSellerOptions;
  baseAsset: BluePrintAsset;
  warehouseOptions: WarehouseBuilderOptions;
  treasuryDatum: TreasuryValidateTreasurySpending["treasuryInDatum"];
  treasuryUTxO: UTxO;
  sellerDatum: SellerValidateSellerSpending["sellerInDatum"];
  sellerUTxO: UTxO;
  orderOutDatums: FeedTypeOrder["_datum"][];
  orderInDatums: FeedTypeOrder["_datum"][];
  owner: string;
};

let utxoIndex = 0;

beforeAll(async () => {
  await loadModule();
});

beforeEach(async () => {
  const {
    t,
    minswapToken,
    defaultTreasuryDatum,
    defaultSellerDatum,
    defaultOrderDatum,
  } = await genWarehouse();
  const baseAsset = minswapToken;
  const warehouseOptions = await genWarehouseOptions(t);

  const builder = new WarehouseBuilder(warehouseOptions);
  const treasuryUTxO = {
    txHash: "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
    outputIndex: ++utxoIndex,
    assets: {
      lovelace: TREASURY_MIN_ADA,
      [builder.treasuryToken]: 1n,
      [T.toUnit(baseAsset.policyId, baseAsset.assetName)]:
        defaultTreasuryDatum.reserveBase,
    },
    address: builder.treasuryAddress,
    datum: T.Data.to(
      defaultTreasuryDatum,
      TreasuryValidateTreasurySpending.treasuryInDatum,
    ),
  };
  const sellerDatum = {
    ...defaultSellerDatum,
    amount: -1000n,
    penaltyAmount: 10n,
  };
  const sellerUTxO = {
    txHash: "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
    outputIndex: ++utxoIndex,
    assets: {
      [builder.sellerToken]: 1n,
    },
    address: builder.sellerAddress,
    datum: T.Data.to(sellerDatum, SellerValidateSellerSpending.sellerInDatum),
  };
  const orderInDatums: FeedTypeOrder["_datum"][] = [
    {
      ...defaultOrderDatum,
      amount: 12n,
      penaltyAmount: 0n,
    },
    {
      ...defaultOrderDatum,
      amount: 33n,
      penaltyAmount: 0n,
    },
    {
      ...defaultOrderDatum,
      amount: 1000n,
      penaltyAmount: 0n,
    },
  ];
  const orderOutDatums: FeedTypeOrder["_datum"][] = [
    {
      ...defaultOrderDatum,
      amount: 100n,
      penaltyAmount: 0n,
    },
    {
      ...defaultOrderDatum,
      amount: 200n,
      penaltyAmount: 0n,
    },
  ];
  const orderInputUTxOs = orderInDatums.map((datum) =>
    genOrderUTxO(datum, builder),
  );
  const options: BuildUsingSellerOptions = {
    treasuryRefInput: treasuryUTxO,
    sellerUtxo: sellerUTxO,
    validFrom: Number(defaultTreasuryDatum.startTime) + 1000,
    validTo: Number(defaultTreasuryDatum.startTime) + 2000,
    owners: [warehouse.owner],
    orderInputs: orderInputUTxOs,
    orderOutputDatums: orderOutDatums,
  };
  warehouse = {
    builder,
    options,
    baseAsset,
    warehouseOptions,
    t,
    treasuryDatum: defaultTreasuryDatum,
    treasuryUTxO,
    sellerDatum,
    sellerUTxO,
    orderInDatums,
    orderOutDatums,
    owner: plutusAddress2Address(t.network, defaultTreasuryDatum.owner),
  };
});

function genOrderUTxO(
  datum: FeedTypeOrder["_datum"],
  builder: WarehouseBuilder,
): UTxO {
  return {
    txHash: "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
    outputIndex: ++utxoIndex,
    assets: {
      [builder.orderToken]: 1n,
      lovelace: 5_000_000n + datum.amount + datum.penaltyAmount,
    },
    address: builder.orderAddress,
    datum: T.Data.to(datum, FeedTypeOrder["_datum"]),
  };
}

test("Create order happy case", async () => {
  const { builder, options } = warehouse;
  builder.buildUsingSeller(options);
  const tx = builder.complete();
  await tx.complete();
});

test("using-seller | FAIL | create order after discovery phase", async () => {
  const { builder, treasuryDatum } = warehouse;
  const options: BuildUsingSellerOptions = {
    ...warehouse.options,
    validTo: Number(treasuryDatum.endTime) + 1000,
  };
  builder.buildUsingSeller(options);
  await assertValidator(builder, "After discovery phase");
});

test("Create order: before discovery phase", async () => {
  const {
    warehouseOptions,
    treasuryUTxO,
    sellerUTxO,
    treasuryDatum,
    orderInDatums,
  } = warehouse;
  const builder = new WarehouseBuilder(warehouseOptions);
  const orderOutDatums: FeedTypeOrder["_datum"][] = warehouse.orderOutDatums;
  const orderInputUTxOs = orderInDatums.map((datum) =>
    genOrderUTxO(datum, builder),
  );
  const options: BuildUsingSellerOptions = {
    treasuryRefInput: treasuryUTxO,
    sellerUtxo: sellerUTxO,
    validFrom: Number(treasuryDatum.startTime) - 1000,
    validTo: Number(treasuryDatum.startTime) + 2000,
    owners: [warehouse.owner],
    orderInputs: orderInputUTxOs,
    orderOutputDatums: orderOutDatums,
  };

  builder.buildUsingSeller(options);
  const tx = builder.complete();

  let errMessage = "";
  try {
    await tx.complete();
  } catch (err) {
    if (typeof err == "string") errMessage = err;
  }
  expect(errMessage).toContain("Before discovery phase");
});

test("Create order: LBE is cancelled", async () => {
  const {
    warehouseOptions,
    treasuryUTxO,
    sellerUTxO,
    treasuryDatum,
    orderInDatums,
  } = warehouse;
  const builder = new WarehouseBuilder(warehouseOptions);
  const orderOutDatums: FeedTypeOrder["_datum"][] = warehouse.orderOutDatums;
  const orderInputUTxOs = orderInDatums.map((datum) =>
    genOrderUTxO(datum, builder),
  );
  const customTreasuryDatum = { ...treasuryDatum, isCancelled: true };
  const options: BuildUsingSellerOptions = {
    treasuryRefInput: {
      ...treasuryUTxO,
      datum: T.Data.to(
        customTreasuryDatum,
        TreasuryValidateTreasurySpending.treasuryInDatum,
      ),
    },
    sellerUtxo: sellerUTxO,
    validFrom: Number(treasuryDatum.startTime) + 1000,
    validTo: Number(treasuryDatum.startTime) + 2000,
    owners: [warehouse.owner],
    orderInputs: orderInputUTxOs,
    orderOutputDatums: orderOutDatums,
  };

  builder.buildUsingSeller(options);
  const tx = builder.complete();

  let errMessage = "";
  try {
    await tx.complete();
  } catch (err) {
    if (typeof err == "string") errMessage = err;
  }
  expect(errMessage).toContain("LBE is cancelled");
});
