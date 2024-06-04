/*
Creat AMM Pool Tx

Input:
  - 1 AMM Factory
  - 1 treasury
Output:
  - 2 AMM Factory
  - AMM Pool
  - 1 Treasury
  - 1 Owner Output
Minting: 
  +1 AMM Factory Token
  +1 AMM Pool Token
  +MAX AMM LP Token
Validation:
// validate more logic -> more more ensure
  - Validate pminting value:
    + to ensure this Tx is create AMM Pool Tx(forward logic to AMM Authen Minting -> AMM Factory(main logics of create AMM Pool))
    + don't mint any other tokens
  - collected all fund in order(collected_fund == reserve_raise+total_penalty)
    + must reach minimum before collecting orders so we dont need to check this condition
    + on the other hand, The LBE raised 0 raise asset(or not collect manager or,...), 
                    so the contract will assume that the funds have been fully collected
                    but it will be failed by create pool contracts(reserve_a or reserve_b can not be 0)
    + dont need to check is_cancelled beacause 
          if this LBE is cancelled, it could not collect orders before
          if this LBE is cancelled after collect all fund(only beacause of created pool), so this Tx failed too by AMM contract validator
  - 
*/
import type { FeedTypeOrder } from "../../plutus";
import { WarehouseBuilder } from "../build-tx";
import { TREASURY_MIN_ADA } from "../constants";
import { plutusAddress2Address } from "../utils";
import { genWarehouseOptions, loadModule } from "./utils";
import { genWarehouse } from "./warehouse";

beforeAll(async () => {
  await loadModule();
});
let utxoIndex = 0;

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
      [T.toUnit(baseAsset.policyId, baseAsset.assetName)]:
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
beforeEach(async () => {
  warehouse = await genTestWarehouse();
});
