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
import { address2PlutusAddress } from "../utils";
import { genWarehouseOptions, generateAccount, loadModule } from "./utils";
import * as T from "@minswap/translucent";
import { genWarehouse } from "./warehouse";
import type { UTxO } from "../types";

let warehouse: {
  t: T.Translucent;
  baseAsset: {
    policyId: string;
    assetName: string;
  };
  warehouseOptions: WarehouseBuilderOptions;
  treasuryDatum: TreasuryValidateTreasurySpending["treasuryInDatum"];
  treasuryUTxO: UTxO;
  sellerDatum: SellerValidateSellerSpending["sellerInDatum"];
  sellerUTxO: UTxO;
  orderOutDatums: FeedTypeOrder["_datum"][];
  orderInDatums: UTxO;
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
      TreasuryValidateTreasurySpending.treasuryInDatum
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
  orderInDatums: UTxO[];
  orderOutDatums: FeedTypeOrder["_datum"][];
  warehouse = {
    baseAsset,
    warehouseOptions,
    t,
    treasuryDatum: defaultTreasuryDatum,
    treasuryUTxO,
    sellerDatum,
    sellerUTxO,orderInDatums,
    orderOutDatums
  };
});

function getOrderOutDatum(
  defaultOrderDatum: FeedTypeOrder["_datum"]
): FeedTypeOrder["_datum"][] {
  return [
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
}

function getOrderUTxO(
  defaultOrderDatum: FeedTypeOrder["_datum"],
  builder: WarehouseBuilder
): UTxO[] {
  const orederDatums: FeedTypeOrder["_datum"][] = [
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
  return orederDatums.map((datum) => ({
    txHash: "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
    outputIndex: ++utxoIndex,
    assets: {
      [builder.orderToken]: 1n,
      lovelace: 5_000_000n + datum.amount + datum.penaltyAmount,
    },
    address: builder.orderAddress,
    datum: T.Data.to(datum, FeedTypeOrder["_datum"]),
  }));
}

test("Create order happy case", async () => {
  const { warehouseOptions, t, treasuryUTxO, sellerUTxO } = warehouse;
  const builder = new WarehouseBuilder(warehouseOptions);
  const orderOutDatums: FeedTypeOrder["_datum"][] = genOrderOutDatum(builder);
  const orderInputUTxOs = genOrderUTxO(builder);
  const options: BuildUsingSellerOptions = {
    treasuryRefInput: treasuryUTxO,
    sellerUtxo: sellerUTxO,
    validFrom: t.utils.slotToUnixTime(1001),
    validTo: t.utils.slotToUnixTime(1003),
    owners: [warehouse.owner],
    orderInputs: orderInputUTxOs,
    orderOutputDatums: orderOutDatums,
  };

  builder.buildUsingSeller(options);
  const tx = builder.complete();
  await tx.complete();
});

test("Create order: after discovery phase", async () => {
  const { warehouseOptions, t, treasuryUTxO, sellerUTxO } = warehouse;
  const builder = new WarehouseBuilder(warehouseOptions);
  const orderOutDatums: FeedTypeOrder["_datum"][] = genOrderOutDatum(builder);
  const orderInputUTxOs = genOrderUTxO(builder);
  const options: BuildUsingSellerOptions = {
    treasuryRefInput: treasuryUTxO,
    sellerUtxo: sellerUTxO,
    validFrom: t.utils.slotToUnixTime(1999),
    validTo: t.utils.slotToUnixTime(2003),
    owners: [warehouse.owner],
    orderInputs: orderInputUTxOs,
    orderOutputDatums: orderOutDatums,
  };

  builder.buildUsingSeller(options);
  const tx = builder.complete();
  await tx.complete();
});

test("Create order: before discovery phase", async () => {
  const { warehouseOptions, t, treasuryUTxO, sellerUTxO } = warehouse;
  const builder = new WarehouseBuilder(warehouseOptions);
  const orderOutDatums: FeedTypeOrder["_datum"][] = genOrderOutDatum(builder);
  const orderInputUTxOs = genOrderUTxO(builder);
  const options: BuildUsingSellerOptions = {
    treasuryRefInput: treasuryUTxO,
    sellerUtxo: sellerUTxO,
    validFrom: t.utils.slotToUnixTime(900),
    validTo: t.utils.slotToUnixTime(1001),
    owners: [warehouse.owner],
    orderInputs: orderInputUTxOs,
    orderOutputDatums: orderOutDatums,
  };

  builder.buildUsingSeller(options);
  const tx = builder.complete();
  await tx.complete();
});

test("Create order: LBE is cancelled", async () => {
  const { warehouseOptions, t, treasuryDatum, treasuryUTxO, sellerUTxO } =
    warehouse;
  const builder = new WarehouseBuilder(warehouseOptions);
  const orderOutDatums: FeedTypeOrder["_datum"][] = genOrderOutDatum(builder);
  const orderInputUTxOs = genOrderUTxO(builder);
  const options: BuildUsingSellerOptions = {
    treasuryRefInput: {
      ...treasuryUTxO,
      datum: T.Data.to(
        { ...treasuryDatum, isCancelled: true },
        TreasuryValidateTreasurySpending.treasuryInDatum
      ),
    },
    sellerUtxo: sellerUTxO,
    validFrom: t.utils.slotToUnixTime(1001),
    validTo: t.utils.slotToUnixTime(1003),
    owners: [warehouse.owner],
    orderInputs: orderInputUTxOs,
    orderOutputDatums: orderOutDatums,
  };

  builder.buildUsingSeller(options);
  const tx = builder.complete();
  await tx.complete();
});
