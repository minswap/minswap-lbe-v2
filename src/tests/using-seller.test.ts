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

let warehouse: {
  t: T.Translucent;
  baseAsset: {
    policyId: string;
    assetName: string;
  };
  warehouseOptions: WarehouseBuilderOptions;
  treasuryDatum: TreasuryValidateTreasurySpending["treasuryInDatum"];
  treasuryUTxO: T.UTxO;
  sellerDatum: SellerValidateSellerSpending["sellerInDatum"];
  sellerUTxO: T.UTxO;
  owner: string;
};
let utxoIndex = 0;
beforeAll(async () => {
  await loadModule();
});

beforeEach(async () => {
  const baseAsset = {
    policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
    assetName: "4d494e",
  };
  const ACCOUNT_0 = await generateAccount({
    lovelace: 2000000000000000000n,
    [T.toUnit(baseAsset.policyId, baseAsset.assetName)]: 69_000_000_000_000n,
  });
  const emulator = new T.Emulator([ACCOUNT_0]);
  let t = await T.Translucent.new(emulator);
  emulator.awaitBlock(10_000); // For validity ranges to be valid
  t.selectWalletFromPrivateKey(ACCOUNT_0.privateKey);
  const warehouseOptions = await genWarehouseOptions(t);

  const builder = new WarehouseBuilder(warehouseOptions);
  const owner = await t.wallet.address();
  const treasuryDatum = {
    factoryPolicyId: builder.factoryHash,
    sellerHash: builder.sellerHash,
    orderHash: builder.orderHash,
    managerHash: builder.managerHash,
    collectedFund: 0n,
    baseAsset: baseAsset,
    raiseAsset: {
      policyId: "",
      assetName: "",
    },
    startTime: BigInt(builder.t.utils.slotToUnixTime(1000)),
    endTime: BigInt(builder.t.utils.slotToUnixTime(2000)),
    owner: address2PlutusAddress(owner),
    minimumRaise: null,
    maximumRaise: null,
    reserveBase: 69000000000000n,
    reserveRaise: 0n,
    totalLiquidity: 0n,
    penaltyConfig: null,
    totalPenalty: 0n,
    isCancelable: false,
    isCancelled: false,
    minimumOrderRaise: null,
    isManagerCollected: false,
  };
  const treasuryUTxO = {
    txHash: "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
    outputIndex: ++utxoIndex,
    assets: {
      lovelace: TREASURY_MIN_ADA,
      [builder.treasuryToken]: 1n,
      [T.toUnit(baseAsset.policyId, baseAsset.assetName)]:
        treasuryDatum.reserveBase,
    },
    address: builder.treasuryAddress,
    datum: T.Data.to(
      treasuryDatum,
      TreasuryValidateTreasurySpending.treasuryInDatum
    ),
  };
  const sellerDatum = {
    factoryPolicyId: builder.factoryHash,
    baseAsset: baseAsset,
    raiseAsset: { policyId: "", assetName: "" },
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
  warehouse = {
    baseAsset,
    warehouseOptions,
    t,
    treasuryDatum,
    treasuryUTxO,
    sellerDatum,
    sellerUTxO,
    owner,
  };
});

function genOrderOutDatum(
  builder: WarehouseBuilder
): FeedTypeOrder["_datum"][] {
  return [
    {
      factoryPolicyId: builder.factoryHash,
      baseAsset: warehouse.baseAsset,
      raiseAsset: { policyId: "", assetName: "" },
      owner: address2PlutusAddress(warehouse.owner),
      amount: 100n,
      isCollected: false,
      penaltyAmount: 0n,
    },
    {
      factoryPolicyId: builder.factoryHash,
      baseAsset: warehouse.baseAsset,
      raiseAsset: { policyId: "", assetName: "" },
      owner: address2PlutusAddress(warehouse.owner),
      amount: 200n,
      isCollected: false,
      penaltyAmount: 0n,
    },
  ];
}

function genOrderUTxO(builder: WarehouseBuilder): T.UTxO[] {
  const orederDatums: FeedTypeOrder["_datum"][] = [
    {
      factoryPolicyId: builder.factoryHash,
      baseAsset: warehouse.baseAsset,
      raiseAsset: { policyId: "", assetName: "" },
      owner: address2PlutusAddress(warehouse.owner),
      amount: 12n,
      isCollected: false,
      penaltyAmount: 0n,
    },
    {
      factoryPolicyId: builder.factoryHash,
      baseAsset: warehouse.baseAsset,
      raiseAsset: { policyId: "", assetName: "" },
      owner: address2PlutusAddress(warehouse.owner),
      amount: 33n,
      isCollected: false,
      penaltyAmount: 0n,
    },
    {
      factoryPolicyId: builder.factoryHash,
      baseAsset: warehouse.baseAsset,
      raiseAsset: { policyId: "", assetName: "" },
      owner: address2PlutusAddress(warehouse.owner),
      amount: 1000n,
      isCollected: false,
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
