/*
Using Seller Tx:
  - Inputs:
    - 1 seller(UsingSeller)
    - n order(s)(UpdateOrder)
  - Outputs:
    - 1 seller
    - m order(s)
  - Mint (m-n) order tokens
  - Ref:
    - 1 treasury 
  - Time:
    - In discovery phase
PASS:
- update order
- create order
- withdraw all orders
- Update orders(withdraw fund) in penalty time
FAIL:
- Out of discovery phase
  - before discovery phase
  - after discovery phase
- LBE is cancelled
- Invalid minting value
- TODO: No seller input
- Invalid seller output datum
  - invalid amount
  - invalid penalty amount
  - invalid factory pid
- Seller output don't have any seller tokens
- Invalid order output value
- penalty_amount is less than 0
- Order's input LBE ID miss match
- Order's output LBE ID miss match
- Seller's input LBE ID miss match
- Update orders(withdraw fund): invalid penalty amount
- TODO: No Treasury ref inputs
*/
import { WarehouseBuilder, type BuildUsingSellerOptions } from "../build-tx";
import { LBE_FEE, LBE_MIN_OUTPUT_ADA, ORDER_MIN_ADA, TREASURY_MIN_ADA } from "../constants";
import type { OrderDatum, UTxO } from "../types";
import { plutusAddress2Address, toUnit } from "../utils";
import { assertValidator, genWarehouseOptions, loadModule } from "./utils";
import { genWarehouse } from "./warehouse";

const MINt = {
  policyId: "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6",
  assetName: "4d494e74",
};
let utxoIndex: number;

let warehouse: Awaited<ReturnType<typeof genTestWarehouse>>;
async function genTestWarehouse() {
  const {
    t,
    minswapToken,
    defaultTreasuryDatum,
    defaultSellerDatum,
    defaultOrderDatum,
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
      [toUnit(baseAsset.policyId, baseAsset.assetName)]:
        treasuryDatum.reserveBase,
    },
    address: builder.treasuryAddress,
    datum: builder.toDatumTreasury(treasuryDatum),
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
  const orderInDatums: OrderDatum[] = [
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
  const orderOutDatums: OrderDatum[] = [
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
  const owner = plutusAddress2Address(t.network, treasuryDatum.owner);
  const options: BuildUsingSellerOptions = {
    treasuryRefInput: treasuryUTxO,
    sellerUtxo: sellerUTxO,
    validFrom: Number(treasuryDatum.startTime) + 1000,
    validTo: Number(treasuryDatum.startTime) + 2000,
    owners: [owner],
    orderInputs: orderInputUTxOs,
    orderOutputDatums: orderOutDatums,
  };
  return {
    builder,
    options,
    baseAsset,
    warehouseOptions,
    t,
    treasuryDatum,
    treasuryUTxO,
    sellerDatum,
    sellerUTxO,
    orderInDatums,
    orderOutDatums,
    owner,
    penaltyTimeRange: {
      validFrom: Number(treasuryDatum.endTime - 3000n),
      validTo: Number(treasuryDatum.endTime - 2000n),
    },
  };
}
beforeAll(async () => {
  await loadModule();
});

beforeEach(async () => {
  warehouse = await genTestWarehouse();
});

function genOrderUTxO(datum: OrderDatum, builder: WarehouseBuilder): UTxO {
  return {
    txHash: "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
    outputIndex: ++utxoIndex,
    assets: {
      [builder.orderToken]: 1n,
      lovelace: ORDER_MIN_ADA + 2n*LBE_FEE + datum.amount + datum.penaltyAmount,
    },
    address: builder.orderAddress,
    datum: builder.toDatumOrder(datum),
  };
}

test("using-seller | PASS | update orders: success", async () => {
  const { builder, options } = warehouse;
  builder.buildUsingSeller(options);
  const tx = builder.complete();
  await tx.complete();
});

test("using-seller | PASS | create orders: success", async () => {
  const { builder, options } = warehouse;
  builder.buildUsingSeller({ ...options, orderInputs: [] });
  const tx = builder.complete();
  await tx.complete();
});

test("using-seller | PASS | withdraw all orders: success", async () => {
  const { builder, options } = warehouse;
  builder.buildUsingSeller({ ...options, orderOutputDatums: [] });
  const tx = builder.complete();
  await tx.complete();
});

test("using-seller | FAIL | update orders: after discovery phase", async () => {
  const { builder, treasuryDatum } = warehouse;
  // tricky to pass penalty condition()
  warehouse.options.orderOutputDatums[0].penaltyAmount = 186n;
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

test("using-seller | FAIL | update orders: LBE is cancelled", async () => {
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
//   await assertValidator(builder, "TODO:");
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

test("using-seller | FAIL | update orders: penalty_amount is less than 0", async () => {
  const { builder, options } = warehouse;
  options.orderOutputDatums[0].penaltyAmount = -1n;
  builder.buildUsingSeller(options);
  await assertValidator(
    builder,
    "penalty_amount must higher than or equal to 0",
  );
});

test("using-seller | FAIL | update orders: Order's input LBE ID miss match", async () => {
  const { builder, options, orderInDatums } = warehouse;
  options.orderInputs[0].datum = builder.toDatumOrder({
    ...orderInDatums[0],
    // MINt
    baseAsset: MINt,
  });
  builder.buildUsingSeller(options);
  await assertValidator(builder, "Invalid order input LBE ID");
});

test("using-seller | FAIL | update orders: Order's output LBE ID miss match", async () => {
  const { builder, options, orderOutDatums } = warehouse;
  options.orderOutputDatums[0] = {
    ...orderOutDatums[0],
    // MINt
    baseAsset: MINt,
  };
  builder.buildUsingSeller(options);
  await assertValidator(builder, "Invalid order output LBE ID");
});

test("using-seller | FAIL | update orders: Seller's input LBE ID miss match", async () => {
  const { builder, options, sellerDatum } = warehouse;
  options.sellerUtxo.datum = builder.toDatumSeller({
    ...sellerDatum,
    // MINt
    baseAsset: MINt,
  });
  builder.buildUsingSeller(options);
  builder.tasks[4] = () => {
    builder.payingSellerOutput({
      outDatum: {
        ...sellerDatum,
        amount: -1745n,
      },
    });
  };
  await assertValidator(builder, "Invalid seller input LBE ID");
});

test("using-seller | PASS | update orders(withdraw fund) in penalty time", async () => {
  const { builder, penaltyTimeRange } = warehouse;
  // withdraw 745 -> penalty will be 186
  warehouse.options.orderOutputDatums[0].penaltyAmount = 186n;
  const options = {
    ...warehouse.options,
    ...penaltyTimeRange,
  };
  builder.buildUsingSeller(options);
  const tx = builder.complete();
  await tx.complete();
});

test("using-seller | FAIL | update orders(withdraw fund): invalid penalty amount", async () => {
  const { builder, penaltyTimeRange } = warehouse;
  // withdraw 745 -> penalty will be 745/4 = 186
  warehouse.options.orderOutputDatums[0].penaltyAmount = 185n;
  const options = {
    ...warehouse.options,
    ...penaltyTimeRange,
  };
  builder.buildUsingSeller(options);
  await assertValidator(builder, "Invalid penalty amount");
});
