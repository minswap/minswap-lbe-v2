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
import { LBE_FEE, ORDER_MIN_ADA, TREASURY_MIN_ADA } from "../constants";
import type { OrderDatum, TreasuryDatum, UTxO } from "../types";
import { plutusAddress2Address, toUnit } from "../utils";
import { genWarehouseOptions, loadModule } from "./utils";
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
  const reserveRaise = 1000_000_000_000n;
  const totalPenalty = 100_000_000_000n;
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
    genOrderUTxO(datum, builder)
  );
  const owner = plutusAddress2Address(t.network, treasuryDatum.owner);
  const options: BuildRedeemOrdersOptions = {
    treasuryInput: treasuryUTxO,
    orderInputs: orderInputUTxOs,
    validFrom: Number(treasuryDatum.endTime) + 1000,
    validTo: Number(treasuryDatum.endTime) + 2000,
  };
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
      lovelace: ORDER_MIN_ADA + LBE_FEE,
    },
    address: builder.orderAddress,
    datum: builder.toDatumOrder(datum),
  };
}

test("Refund | PASS | update orders: success", async () => {
  const { builder, options } = warehouse;
  builder.buildRefundOrders(options);
  const tx = builder.complete();
  await tx.complete();
});
