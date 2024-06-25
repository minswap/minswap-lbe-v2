/*
Refund Tx
Input:
  - 1 Treasury input
  - n order inputs
Output:
  - n user outputs(the first n outputs)
  - 1 Treasury output
Minting:
  - Burn n order asset
Validation:
  - Collected all manager
  - Collected all orders
  - LBE is cancelled
  - Treasury out:
    - Datum: reduce collected_fund, reserve_raise, total_penalty
    - Value: remove collected_fund raise asset
  - Users' Value
*/
import { WarehouseBuilder, type BuildRedeemOrdersOptions } from "../build-tx";
import {
  ORDER_COMMISSION,
  ORDER_MIN_ADA,
  TREASURY_MIN_ADA,
} from "../constants";
import type {
  Address,
  Assets,
  OrderDatum,
  TreasuryDatum,
  UTxO,
} from "../types";
import { plutusAddress2Address, sortUTxOs, toUnit } from "../utils";
import { assertValidatorFail, genWarehouseOptions, loadModule } from "./utils";
import { genWarehouse } from "./warehouse";

let utxoIndex: number;

let warehouse: Awaited<ReturnType<typeof genTestWarehouse>>;

async function genTestWarehouse() {
  const { t, adaToken, defaultTreasuryDatum, defaultOrderDatum, minswapToken } =
    await genWarehouse();
  utxoIndex = 0;
  const raiseAsset = adaToken;
  const warehouseOptions = await genWarehouseOptions(t);

  const builder = new WarehouseBuilder(warehouseOptions);
  const reserveRaise = 12n + 33n + 1000n;
  const totalPenalty = 0n;
  const collectedFund = reserveRaise + totalPenalty;
  const treasuryDatum: TreasuryDatum = {
    ...defaultTreasuryDatum,
    collectedFund,
    reserveRaise,
    totalPenalty,
    isCancelled: true,
    isManagerCollected: true,
  };
  builder.setInnerAssets(treasuryDatum.baseAsset, treasuryDatum.raiseAsset);
  const baseAsset = minswapToken;

  const treasuryUTxO = {
    txHash: "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
    outputIndex: ++utxoIndex,
    assets: {
      lovelace: TREASURY_MIN_ADA + collectedFund,
      [builder.treasuryToken]: 1n,
      [toUnit(baseAsset.policyId, baseAsset.assetName)]:
        treasuryDatum.reserveBase,
    },
    address: builder.treasuryAddress,
    datum: builder.toDatumTreasury(treasuryDatum),
  };
  const orderInDatums: OrderDatum[] = [
    {
      ...defaultOrderDatum,
      amount: 12n,
      penaltyAmount: 0n,
      isCollected: true,
    },
    {
      ...defaultOrderDatum,
      amount: 33n,
      penaltyAmount: 0n,
      isCollected: true,
    },
    {
      ...defaultOrderDatum,
      amount: 1000n,
      penaltyAmount: 0n,
      isCollected: true,
    },
  ];
  const orderInputUTxOs = orderInDatums.map((datum) =>
    genOrderUTxO(datum, builder),
  );
  const owner = plutusAddress2Address(t.network, treasuryDatum.owner);
  const options: BuildRedeemOrdersOptions = {
    treasuryInput: treasuryUTxO,
    orderInputs: orderInputUTxOs,
    validFrom: Number(treasuryDatum.endTime) + 1000,
    validTo: Number(treasuryDatum.endTime) + 2000,
  };
  const userOutputs: { address: Address; assets: Assets }[] = [];
  const raiseAssetUnit = toUnit(raiseAsset.policyId, raiseAsset.assetName);
  const sortedOrders = sortUTxOs(orderInputUTxOs);
  for (const order of sortedOrders) {
    const { penaltyAmount, amount, owner } = builder.fromDatumOrder(
      order.datum!,
    );
    const assets: Record<string, bigint> = {
      lovelace: ORDER_MIN_ADA,
    };
    assets[raiseAssetUnit] = assets[raiseAssetUnit]
      ? assets[raiseAssetUnit] + amount + penaltyAmount
      : amount + penaltyAmount;
    const output: { address: Address; assets: Assets } = {
      address: plutusAddress2Address(t.network, owner),
      assets,
    };
    userOutputs.push(output);
  }
  return {
    builder,
    options,
    raiseAsset,
    warehouseOptions,
    t,
    treasuryDatum,
    treasuryUTxO,
    orderInDatums,
    owner,
    userOutputs,
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
      lovelace: ORDER_MIN_ADA + ORDER_COMMISSION,
    },
    address: builder.orderAddress,
    datum: builder.toDatumOrder(datum),
  };
}

test("Refund | PASS | success", async () => {
  const { builder, options } = warehouse;
  builder.buildRefundOrders(options);
  const tx = builder.complete();
  await tx.complete();
});

test("Refund | FAIL | not enough n user output", async () => {
  const { builder, options, userOutputs } = warehouse;
  builder.buildRefundOrders(options);
  builder.tasks[2] = () => {
    for (let i = 0; i < userOutputs.length - 1; ++i) {
      const output = userOutputs[i];
      builder.tx.payToAddress(output.address, output.assets);
    }
  };
  assertValidatorFail(builder);
});
test("Refund | FAIL | Invalid user out value ", async () => {
  const { builder, options, userOutputs } = warehouse;
  builder.buildRefundOrders(options);
  builder.tasks[2] = () => {
    for (let i = 0; i < userOutputs.length - 1; ++i) {
      const output = userOutputs[i];
      builder.tx.payToAddress(output.address, output.assets);
    }
    const output = userOutputs[userOutputs.length - 1];
    builder.tx.payToAddress(output.address, {});
  };
  assertValidatorFail(builder);
});

test("Refund | FAIL | not Treasury out", async () => {
  const { builder, options } = warehouse;
  builder.buildRefundOrders(options);
  builder.tasks[1] = () => {};
  assertValidatorFail(builder);
});

test("Refund | FAIL | not burn exactly n order asset", async () => {
  const { builder, options, orderInDatums } = warehouse;
  builder.buildRefundOrders(options);
  builder.tasks[5] = () => {
    builder.mintingOrderToken(-1n * BigInt(orderInDatums.length - 1));
  };
  assertValidatorFail(builder);
});

test("Refund | FAIL | Not collected manager", async () => {
  const { builder, options, treasuryDatum } = warehouse;
  options.treasuryInput = {
    ...options.treasuryInput,
    datum: builder.toDatumTreasury({
      ...treasuryDatum,
      isManagerCollected: false,
    }),
  };
  builder.buildRefundOrders(options);
  assertValidatorFail(builder);
});
test("Refund | FAIL | Not collected all orders", async () => {
  const { builder, options, treasuryDatum } = warehouse;
  options.treasuryInput = {
    ...options.treasuryInput,
    datum: builder.toDatumTreasury({
      ...treasuryDatum,
      collectedFund: treasuryDatum.collectedFund - 10n,
    }),
  };
  builder.buildRefundOrders(options);
  assertValidatorFail(builder);
});
test("Refund | FAIL | Not collected all orders", async () => {
  const { builder, options, treasuryDatum } = warehouse;
  options.treasuryInput = {
    ...options.treasuryInput,
    datum: builder.toDatumTreasury({
      ...treasuryDatum,
      isCancelled: false,
    }),
  };
  builder.buildRefundOrders(options);
  assertValidatorFail(builder);
});
test("Refund | FAIL | No treasury input", async () => {
  const { builder, options, treasuryUTxO } = warehouse;
  builder.buildRefundOrders(options);
  builder.tasks[3] = () => {};
  attachValueToInput(treasuryUTxO.assets);

  assertValidatorFail(builder);
});

function attachValueToInput(value: Assets): void {
  const { builder, owner } = warehouse;
  builder.tasks.push(() => {
    // 1 UTxO contain 1 seller tokens for tx value balance
    builder.tx.collectFrom([
      {
        txHash:
          "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
        outputIndex: ++utxoIndex,
        assets: value,
        address: owner,
      },
    ]);
  });
}
/*
TODO:
- Custom treaury out datum....
- Invalid treasury out value
*/
