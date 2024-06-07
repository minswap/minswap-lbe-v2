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
  - Validate pminting value:
    + to ensure this Tx is create AMM Pool Tx(forward logic to AMM Authen Minting -> AMM Factory(main logics of create AMM Pool))
    + don't mint any other tokens
  - collected all fund in order(collected_fund == reserve_raise+total_penalty)
    + must reach minimum before collecting orders so we dont need to check this condition
    + on the other hand, The LBE raised 0 raise asset(or not collect manager or,...), 
                    so the contract will assume that the funds have been fully collected
                    but it will be failed by create pool contracts(reserve_a or reserve_b can not be 0)
  - Not cancelled
  - Outputs:
    + 1 Treasury output contain remaining raise asset and lp asset
    + sum owner outputs = owner lp asset
*/
import * as T from "@minswap/translucent";
import type { FeedTypeAmmPool } from "../../plutus";
import { WarehouseBuilder, type BuildCreateAmmPoolOptions } from "../build-tx";
import { TREASURY_MIN_ADA } from "../constants";
import type { TreasuryDatum, UTxO } from "../types";
import { calculateInitialLiquidity, toUnit } from "../utils";
import { assertValidatorFail, genWarehouseOptions, loadModule } from "./utils";
import { genWarehouse } from "./warehouse";
import { FactoryValidatorValidateFactory } from "../../amm-plutus";

let utxoIndex = 0;

let warehouse: Awaited<ReturnType<typeof genTestWarehouse>>;

async function genTestWarehouse() {
  const { t, minswapToken, defaultTreasuryDatum, ammPoolDatum } =
    await genWarehouse();
  utxoIndex = 0;
  const baseAsset = minswapToken;
  const warehouseOptions = await genWarehouseOptions(t);
  const builder = new WarehouseBuilder(warehouseOptions);
  const reserveRaise = 100_000_000_000n;
  const totalPenalty = 10_000_000_000n;
  const collectedFund = reserveRaise + totalPenalty;
  const treasuryDatum: TreasuryDatum = {
    ...defaultTreasuryDatum,
    collectedFund,
    totalPenalty,
    reserveRaise,
    isManagerCollected: true,
  };
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

  const ammFactoryDatum: FactoryValidatorValidateFactory["datum"] = {
    head: "00",
    tail: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
  };
  const ammFactoryUTxO: UTxO = {
    txHash: "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
    outputIndex: ++utxoIndex,
    address: builder.ammFactoryAddress,
    datum: T.Data.to(ammFactoryDatum, FactoryValidatorValidateFactory.datum),
    assets: {
      lovelace: 10_000_000n,
      [toUnit(builder.ammAuthenHash, "4d5346")]: 1n,
    },
  };

  const reserveA = treasuryDatum.collectedFund;
  const reserveB = treasuryDatum.reserveBase;
  const totalLiquidity = calculateInitialLiquidity(reserveA, reserveB);

  const poolDatum: FeedTypeAmmPool["_datum"] = {
    ...ammPoolDatum,
    totalLiquidity: totalLiquidity,
    reserveA: reserveA,
    reserveB: reserveB,
  };
  const options: BuildCreateAmmPoolOptions = {
    treasuryInput: treasuryUTxO,
    ammFactoryInput: ammFactoryUTxO,
    ammPoolDatum: poolDatum,
    validFrom: Number(treasuryDatum.endTime + 1000n),
    validTo: Number(treasuryDatum.endTime + 1100n),
    totalLiquidity: totalLiquidity,
  };
  return {
    builder,
    options,
    baseAsset,
    warehouseOptions,
    t,
    treasuryDatum,
    treasuryUTxO,
    // AMM Info
    ammFactoryDatum,
    ammFactoryUTxO,
    poolDatum,
  };
}

beforeAll(async () => {
  await loadModule();
});

beforeEach(async () => {
  warehouse = await genTestWarehouse();
});

test("Create AMM Pool | PASS | Happy case", async () => {
  const { builder, options } = warehouse;
  builder.buildCreateAmmPool(options);
  const tx = builder.complete();
  await tx.complete();
});

async function buildTxWithStupidTreasuryDatum(
  treasuryDatum: TreasuryDatum,
): Promise<void> {
  const { options, builder } = warehouse;
  const { collectedFund, baseAsset } = treasuryDatum;
  // raise asset === ADA
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
  builder.buildCreateAmmPool({ ...options, treasuryInput: treasuryUTxO });
  await assertValidatorFail(builder);
}

test("Create AMM Pool | FAIL | LBE is cancelled", async () => {
  const { treasuryDatum } = warehouse;
  await buildTxWithStupidTreasuryDatum({ ...treasuryDatum, isCancelled: true });
});

test("Create AMM Pool | FAIL | Not reach min raise", async () => {
  const { treasuryDatum } = warehouse;
  await buildTxWithStupidTreasuryDatum({
    ...treasuryDatum,
    minimumRaise: treasuryDatum.collectedFund + 1n,
  });
});

test("Create AMM Pool | FAIL | Not collected all order yet", async () => {
  const { treasuryDatum } = warehouse;
  await buildTxWithStupidTreasuryDatum({
    ...treasuryDatum,
    collectedFund: treasuryDatum.reserveRaise + treasuryDatum.totalPenalty - 1n,
  });
});

test("Create AMM Pool | FAIL | manager is collected", async () => {
  const { treasuryDatum } = warehouse;
  await buildTxWithStupidTreasuryDatum({
    ...treasuryDatum,
    isManagerCollected: false,
  });
});
/*
TODO: 
  - Outputs:
    + 1 Treasury output contain remaining raise asset and lp asset
    + sum owner outputs = owner lp asset
*/
