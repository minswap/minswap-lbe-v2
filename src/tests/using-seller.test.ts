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
import { LBE_FEE, LBE_MIN_OUTPUT_ADA, TREASURY_MIN_ADA } from "../constants";
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
    datum: builder.toDatumTreasury(defaultTreasuryDatum),
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
    datum: builder.toDatumSeller(sellerDatum),
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
  const owner = plutusAddress2Address(t.network, defaultTreasuryDatum.owner);
  const options: BuildUsingSellerOptions = {
    treasuryRefInput: treasuryUTxO,
    sellerUtxo: sellerUTxO,
    validFrom: Number(defaultTreasuryDatum.startTime) + 1000,
    validTo: Number(defaultTreasuryDatum.startTime) + 2000,
    owners: [owner],
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
    owner,
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
    datum: builder.toDatumOrder(datum),
  };
}

test("using-seller | SUCCESS | update orders: success", async () => {
  const { builder, options } = warehouse;
  builder.buildUsingSeller(options);
  const tx = builder.complete();
  await tx.complete();
});

test("using-seller | FAIL | update orders: after discovery phase", async () => {
  const { builder, treasuryDatum } = warehouse;
  const options: BuildUsingSellerOptions = {
    ...warehouse.options,
    validTo: Number(treasuryDatum.endTime) + 1000,
  };
  builder.buildUsingSeller(options);
  await assertValidator(builder, "Using-seller: After discovery phase");
});

test("using-seller | FAIL | update orders: before discovery phase", async () => {
  const { builder, treasuryDatum } = warehouse;
  const options: BuildUsingSellerOptions = {
    ...warehouse.options,
    validFrom: Number(treasuryDatum.startTime) - 1000,
  };
  builder.buildUsingSeller(options);
  await assertValidator(builder, "Using-seller: Before discovery phase");
});

test("using-seller | FAIL | update orders: when LBE is cancelled", async () => {
  const { builder, treasuryDatum, treasuryUTxO } = warehouse;
  const options: BuildUsingSellerOptions = {
    ...warehouse.options,
    treasuryRefInput: {
      ...treasuryUTxO,
      datum: builder.toDatumTreasury({ ...treasuryDatum, isCancelled: true }),
    },
  };
  builder.buildUsingSeller(options);
  await assertValidator(builder, "Using-seller: LBE is cancelled");
});

test("using-seller | FAIL | update orders: Invalid minting 1", async () => {
  // 3 orders -> 2 orders
  const { builder, options } = warehouse;
  builder.buildUsingSeller(options);
  builder.tasks[3] = () => builder.mintingOrderToken(2n);
  await assertValidator(builder, "Using-seller: Invalid minting");
});

test("using-seller | FAIL | update orders: Invalid minting 2", async () => {
  // 3 orders -> 2 orders
  const { builder, options } = warehouse;
  builder.buildUsingSeller(options);
  // dont mint anything
  builder.tasks[3] = () => {};
  await assertValidator(builder, "Using-seller: Invalid minting");
});

test("using-seller | FAIL | update orders: Invalid minting 3", async () => {
  const { builder, options } = warehouse;
  // 1 order -> 1 order
  builder.buildUsingSeller({
    ...options,
    orderInputs: [options.orderInputs[0]],
    orderOutputDatums: [options.orderOutputDatums[0]],
  });
  builder.tasks[3] = () => {
    builder.mintRedeemer = "MintOrder";
    builder.mintingOrderToken(1n);
  };
  await assertValidator(builder, "Using-seller: Invalid minting");
});

// test("using-seller | FAIL | No Seller input", async () => {
//   const { builder, options, treasuryUTxO } = warehouse;
//   // add 1 seller token in order to balance input and output
//   options.orderInputs[0].assets[builder.sellerToken] = 1n;
//   builder.buildUsingSeller(options);
//   // dont mint anything
//   builder.tasks[0] = () => {
//     builder.treasuryRefInput = treasuryUTxO;
//     builder.orderInputs = options.orderInputs;
//     builder.orderRedeemer = "UpdateOrder";
//     builder.mintRedeemer = "MintOrder";
//     for (const owner of options.owners) {
//       builder.tx.addSigner(owner);
//     }
//   };
//   await assertValidator(builder, "Using-seller: Invalid minting");
// });

test("using-seller | FAIL | update orders: Invalid seller output datum 1(invalid amount)", async () => {
  const { builder, options, sellerDatum } = warehouse;
  builder.buildUsingSeller(options);
  // amount != -1745 or penalty != 0 or ...
  builder.tasks[4] = () =>
    builder.payingSellerOutput({ outDatum: { ...sellerDatum, amount: 123n } });
  await assertValidator(builder, "Invalid seller output datum");
});
test("using-seller | FAIL | update orders: Invalid seller output datum 2(invalid penalty amount)", async () => {
  const { builder, options, sellerDatum } = warehouse;
  builder.buildUsingSeller(options);
  builder.tasks[4] = () =>
    builder.payingSellerOutput({
      outDatum: { ...sellerDatum, amount: -1745n, penaltyAmount: 456n },
    });
  await assertValidator(builder, "Invalid seller output datum");
});

test("using-seller | FAIL | update orders: Invalid seller output datum 3(invalid factory pid)", async () => {
  const { builder, options, sellerDatum } = warehouse;
  builder.buildUsingSeller(options);
  builder.tasks[4] = () =>
    builder.payingSellerOutput({
      outDatum: {
        ...sellerDatum,
        amount: -1745n,
        factoryPolicyId: builder.sellerHash,
      },
    });
  await assertValidator(builder, "Invalid seller output datum");
});

test("using-seller | FAIL | update orders: Seller output don't have any seller tokens", async () => {
  const { builder, options, sellerDatum } = warehouse;
  builder.buildUsingSeller(options);
  // dont change any datum
  builder.tasks[4] = () => {
    builder.tx.payToAddressWithData(
      builder.sellerAddress,
      {
        inline: builder.toDatumSeller({
          ...sellerDatum,
          // new seller output datum
          amount: -1745n,
        }),
      },
      {},
    );
  };
  await assertValidator(builder, "Seller output don't have any seller token");
});

test("using-seller | FAIL | update orders: Invalid order output value", async () => {
  const { builder, options } = warehouse;
  builder.buildUsingSeller(options);
  // pay to orders
  builder.tasks[5] = () => {
    for (const datum of options.orderOutputDatums) {
      // raise asset is ADA
      const assets = {
        [builder.orderToken]: 1n,
        lovelace:
          LBE_MIN_OUTPUT_ADA +
          (datum.isCollected ? LBE_FEE : LBE_FEE * 2n) +
          datum.amount -
          1n,
      };

      builder.tx.payToAddressWithData(
        builder.orderAddress,
        {
          inline: builder.toDatumOrder(datum),
        },
        assets,
      );
    }
  };
  await assertValidator(builder, "Invalid order output value");
});

test("using-seller | FAIL | update orders: penalty_amount must higher than or equal to 0", async () => {
  const { builder, options } = warehouse;
  options.orderOutputDatums[0].penaltyAmount = -1n;
  builder.buildUsingSeller(options);
  await assertValidator(
    builder,
    "penalty_amount must higher than or equal to 0",
  );
});
