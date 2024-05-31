/*
Tx:
  - Input:
    - 1 Manager(ManageSeller)
    - n Seller(s)(CountingSeller)
  - Output:
    - 1 new Manager
  - Mint: -n Seller Token(MintSeller)
  - Ref Input: Treasury
  - Time: after end of discovery phase
PASS
- default
- one more seller
FAIL
- Before end of discovery phase
- invalid minting
- No ref input
- 1 seller out
- seller value dont have seller token
- invalid manager out datum:
  - total raise
  - total penalty
- no manager out
- managre value dont have any manager token
- Invalid LBE ID:
  - Seller input
  - Manager input
  - Manager output
*/
import {
  ManagerValidateManagerSpending,
  SellerValidateSellerSpending,
  TreasuryValidateTreasurySpending,
} from "../../plutus";
import {
  WarehouseBuilder,
  type BuildCollectSellersOptions,
  type WarehouseBuilderOptions,
} from "../build-tx";
import { TREASURY_MIN_ADA } from "../constants";
import { genWarehouseOptions, loadModule } from "./utils";
import * as T from "@minswap/translucent";
import { genWarehouse } from "./warehouse";
import type { BluePrintAsset, UTxO } from "../types";

let utxoIndex: number;
let warehouse: {
  t: T.Translucent;
  builder: WarehouseBuilder;
  options: BuildCollectSellersOptions;
  baseAsset: BluePrintAsset;
  warehouseOptions: WarehouseBuilderOptions;
  treasuryDatum: TreasuryValidateTreasurySpending["treasuryInDatum"];
  treasuryUTxO: UTxO;
  managerDatum: ManagerValidateManagerSpending["managerInDatum"];
  managerUTxO: UTxO;
  expectedManagerDatumOut: ManagerValidateManagerSpending["managerInDatum"];
  sellerDatums: SellerValidateSellerSpending["sellerInDatum"][];
  sellerUTxOs: UTxO[];
};

beforeAll(async () => {
  await loadModule();
});

//1 manager + n seller + 1 treasury

beforeEach(async () => {
  const {
    t,
    minswapToken,
    defaultTreasuryDatum,
    defaultSellerDatum,
    defaultManagerDatum,
  } = await genWarehouse();
  utxoIndex = 0;
  const baseAsset = minswapToken;
  const warehouseOptions = await genWarehouseOptions(t);

  const builder = new WarehouseBuilder(warehouseOptions);
  const treasuryDatum = {
    ...defaultTreasuryDatum,
    penaltyConfig: {
      penaltyStartTime: defaultTreasuryDatum.endTime - 5000n,
      percent: 25n,
    },
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
    datum: builder.toDatumTreasury(treasuryDatum),
  };
  const managerDatum: ManagerValidateManagerSpending["managerInDatum"] = {
    ...defaultManagerDatum,
  };
  const managerUTxO = {
    txHash: "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
    outputIndex: ++utxoIndex,
    assets: {
      [builder.managerToken]: 1n,
    },
    address: builder.managerAddress,
    datum: builder.toDatumManager(managerDatum),
  };
  const sellerDatums: SellerValidateSellerSpending["sellerInDatum"][] = [
    {
      ...defaultSellerDatum,
      amount: -1_000n,
      penaltyAmount: 10n,
    },
    {
      ...defaultSellerDatum,
      amount: -20_000n,
      penaltyAmount: 1000n,
    },
    {
      ...defaultSellerDatum,
      amount: 30_000n,
      penaltyAmount: 1000n,
    },
  ];
  const sellerUTxOs: UTxO[] = sellerDatums.map((datum) =>
    genSellerUTxO(datum, builder),
  );
  const options: BuildCollectSellersOptions = {
    treasuryRefInput: treasuryUTxO,
    managerInput: managerUTxO,
    sellerInputs: sellerUTxOs,
    validFrom: Number(treasuryDatum.endTime + 1000n),
    validTo: Number(treasuryDatum.endTime + 5000n),
  };
  const expectedManagerDatumOut = {
    ...managerDatum,
    sellerCount: managerDatum.sellerCount - 3n,
    reserveRaise: managerDatum.reserveRaise + 9_000n,
    totalPenalty: managerDatum.totalPenalty + 2010n,
  };
  warehouse = {
    t,
    builder,
    options,
    baseAsset,
    warehouseOptions,
    treasuryDatum,
    treasuryUTxO,
    managerDatum,
    managerUTxO,
    expectedManagerDatumOut,
    sellerDatums,
    sellerUTxOs,
  };
});

function genSellerUTxO(
  datum: SellerValidateSellerSpending["sellerInDatum"],
  builder: WarehouseBuilder,
): UTxO {
  return {
    txHash: "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
    outputIndex: ++utxoIndex,
    assets: {
      [builder.sellerToken]: 1n,
    },
    address: builder.sellerAddress,
    datum: builder.toDatumSeller(datum),
  };
}

test("collect sellers | PASS | happy case 1", async () => {
  const { builder, options, expectedManagerDatumOut } = warehouse;
  builder.buildCollectSeller(options);
  builder.tasks[4] = () => {
    builder.payingManagerOutput(expectedManagerDatumOut);
  };
  const tx = builder.complete();
  await tx.complete();
});

test("collect sellers | PASS | happy case 2", async () => {
  const { builder, options, sellerDatums } = warehouse;
  warehouse.expectedManagerDatumOut.reserveRaise += 1000n;
  warehouse.expectedManagerDatumOut.totalPenalty += 20_000n;
  builder.buildCollectSeller({
    ...options,
    sellerInputs: [
      ...options.sellerInputs,
      genSellerUTxO(
        { ...sellerDatums[0], amount: 1000n, penaltyAmount: 20_000n },
        builder,
      ),
    ],
  });
  const tx = builder.complete();
  await tx.complete();
});
