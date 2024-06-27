/*
Redeem LP Tx
Input:
  - 1 Treasury input
  - n order inputs
Output:
  - n user outputs(the first n outputs)
  - 1 Treasury output
Minting:
  - Burn n order asset
Validation:
  - Created pool success
  - Treasury out:
    - Datum: reduce collected_fund
    - Value: remove lp asset, bonus raise asset
  - Users' Value
*/
import { WarehouseBuilder, type BuildRedeemOrdersOptions } from "../build-tx";
import {
  ORDER_COMMISSION,
  LP_COLATERAL,
  ORDER_MIN_ADA,
  TREASURY_MIN_ADA,
} from "../constants";
import type { Address, Assets, OrderDatum, UTxO } from "../types";
import {
  calculateInitialLiquidity,
  plutusAddress2Address,
  sortUTxOs,
  toUnit,
} from "../utils";
import { assertValidatorFail, genWarehouseOptions, loadModule } from "./utils";
import { genWarehouse } from "./warehouse";

let utxoIndex: number;

let warehouse: Awaited<ReturnType<typeof genTestWarehouse>>;

async function genTestWarehouse() {
  const { t, adaToken, defaultTreasuryDatum, defaultOrderDatum } =
    await genWarehouse();
  utxoIndex = 0;
  const raiseAsset = adaToken;
  const warehouseOptions = await genWarehouseOptions(t);

  const builder = new WarehouseBuilder(warehouseOptions);
  const reserveRaise = 1000_000_000_000n;
  const totalPenalty = 100_000_000_000n;
  const collectedFund = 12n + 33n + 1000n;
  const maximumRaise = 1000_000_000_000n;
  const initLiquidity =
    calculateInitialLiquidity(maximumRaise, defaultTreasuryDatum.reserveBase) -
    LP_COLATERAL;
  const totalLiquidity = initLiquidity - initLiquidity / 2n;
  const treasuryDatum = {
    ...defaultTreasuryDatum,
    maximumRaise,
    collectedFund,
    reserveRaise,
    totalLiquidity,
    totalPenalty,
  };
  builder.setInnerAssets(treasuryDatum.baseAsset, treasuryDatum.raiseAsset);
  const treasuryUTxO = {
    txHash: "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
    outputIndex: ++utxoIndex,
    assets: {
      // remaining raise asset
      lovelace: TREASURY_MIN_ADA + 100_000_000_000n,
      [builder.treasuryToken]: 1n,
      [builder.ammLpToken!]: totalLiquidity,
    },
    address: builder.treasuryAddress,
    datum: WarehouseBuilder.toDatumTreasury(treasuryDatum),
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

  const sortedOrders = sortUTxOs(orderInputUTxOs);
  const userOutputs: { address: Address; assets: Assets }[] = [];
  const totalBonusRaiseAsset =
    treasuryDatum.maximumRaise &&
    treasuryDatum.reserveRaise + treasuryDatum.totalPenalty >
      treasuryDatum.maximumRaise
      ? treasuryDatum.reserveRaise +
        treasuryDatum.totalPenalty -
        treasuryDatum.maximumRaise
      : 0n;
  const raiseAssetUnit = toUnit(raiseAsset.policyId, raiseAsset.assetName);
  for (const order of sortedOrders) {
    const datum = WarehouseBuilder.fromDatumOrder(order.datum!);
    const lpAmount =
      (datum.amount * treasuryDatum.totalLiquidity) /
      treasuryDatum.reserveRaise;
    const bonusRaise =
      (datum.amount * totalBonusRaiseAsset) / treasuryDatum.reserveRaise;
    const assets = {
      lovelace: ORDER_MIN_ADA,
      [builder.ammLpToken!]: lpAmount,
    };
    assets[raiseAssetUnit] = assets[raiseAssetUnit]
      ? assets[raiseAssetUnit] + bonusRaise
      : bonusRaise;
    const output: { address: Address; assets: Assets } = {
      address: plutusAddress2Address(t.network, datum.owner),
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
    datum: WarehouseBuilder.toDatumOrder(datum),
  };
}

test("Redeem LP | PASS | update orders: success", async () => {
  const { builder, options } = warehouse;
  builder.buildRedeemOrders(options);
  const tx = builder.complete();
  await tx.complete();
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

test("Redeem LP | PASS | penalty orders", async () => {});

test("Redeem LP | FAIL | No treasury input", async () => {
  const { builder, options, treasuryUTxO } = warehouse;
  builder.buildRedeemOrders(options);
  builder.tasks[3] = () => {};
  attachValueToInput(treasuryUTxO.assets);
  assertValidatorFail(builder);
});
test("Redeem LP | FAIL | Invalid user out value", async () => {
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
test("Redeem LP | FAIL | not burn exactly n order asset", async () => {
  const { builder, options, orderInDatums } = warehouse;
  builder.buildRefundOrders(options);
  builder.tasks[5] = () => {
    builder.mintingOrderToken(-1n * BigInt(orderInDatums.length - 1));
  };
  assertValidatorFail(builder);
});
test("Redeem LP | FAIL | Not created pool yet", async () => {
  const { builder, options, treasuryDatum } = warehouse;
  options.treasuryInput = {
    ...options.treasuryInput,
    assets: { ...options.treasuryInput.assets, [builder.ammLpToken!]: 0n },
    datum: WarehouseBuilder.toDatumTreasury({
      ...treasuryDatum,
      totalLiquidity: 0n,
    }),
  };
  builder.buildRefundOrders(options);
  assertValidatorFail(builder);
});
/*
Test case:
  - Invalid pool out value
  - Invalid pool out datum
*/
