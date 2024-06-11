import { WarehouseBuilder, type BuildUpdateLBEOptions } from "../build-tx";
import { TREASURY_MIN_ADA } from "../constants";
import type { TreasuryDatum, UTxO } from "../types";
import { toUnit } from "../utils";
import { assertValidator, assertValidatorFail, loadModule } from "./utils";
import { genWarehouse } from "./warehouse";

let W: GenTestWarehouse;
type GenTestWarehouse = Awaited<ReturnType<typeof genTestWarehouse>>;

async function genTestWarehouse() {
  let warehouse = await genWarehouse();
  let { minswapTokenRaw, defaultTreasuryDatum, warehouseOptions, t, emulator } =
    warehouse;
  let builder = new WarehouseBuilder(warehouseOptions);
  const treasuryDatum: TreasuryDatum = {
    ...defaultTreasuryDatum,
  };
  const treasuryInput: UTxO = {
    txHash: "00".repeat(32),
    outputIndex: 1,
    assets: {
      [builder.treasuryToken]: 1n,
      [minswapTokenRaw]: treasuryDatum.reserveBase,
      lovelace: TREASURY_MIN_ADA,
    },
    address: builder.treasuryAddress,
    datum: builder.toDatumTreasury(treasuryDatum),
  };
  let options: BuildUpdateLBEOptions = {
    treasuryInput,
    validFrom: t.utils.slotToUnixTime(emulator.slot),
    validTo: t.utils.slotToUnixTime(emulator.slot + 100),
  };
  return {
    ...warehouse,
    treasuryInput,
    treasuryDatum,
    options,
    builder,
  };
}

beforeAll(async () => {
  await loadModule();
});

beforeEach(async () => {
  W = await genTestWarehouse();
});

test("Update LBE | PASS | update startTime", async () => {
  let { options, builder, treasuryDatum } = W;
  options = {
    ...options,
    startTime: treasuryDatum.startTime + BigInt(24 * 60 * 60 * 1000),
  };
  builder.buildUpdateLBE(options);
  assertValidator(builder, "");
});

test("Update LBE | FAIL | update when LBE is cancelled", async () => {
  let { options, builder, treasuryDatum, treasuryInput } = W;
  treasuryDatum = {
    ...treasuryDatum,
    isCancelled: true,
  };
  treasuryInput = {
    ...treasuryInput,
    datum: builder.toDatumTreasury(treasuryDatum),
  };
  options = {
    ...options,
    treasuryInput,
    startTime: treasuryDatum.startTime + BigInt(24 * 60 * 60 * 1000),
  };
  builder.buildUpdateLBE(options);
  assertValidatorFail(builder);
});

test("Update LBE | FAIL | update LBE ID", async () => {
  let { options, builder, treasuryDatum } = W;
  options = {
    ...options,
    startTime: treasuryDatum.startTime + BigInt(24 * 60 * 60 * 1000),
  };
  let address = await W.t.wallet.address();
  builder.buildUpdateLBE(options);
  builder.tasks[3] = () => {
    let treasuryOutDatum: TreasuryDatum = {
      ...treasuryDatum,
      baseAsset: {
        policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
        assetName: "",
      },
    };
    let dummyUTxO: UTxO = {
      txHash: "00".repeat(32),
      outputIndex: 123,
      assets: {
        lovelace: 1_000_000_000n,
        [toUnit(
          treasuryOutDatum.baseAsset.policyId,
          treasuryOutDatum.baseAsset.assetName,
        )]: treasuryOutDatum.reserveBase,
      },
      address,
    };
    builder.tx.collectFrom([dummyUTxO]);
    builder.payingTreasuryOutput({ treasuryOutDatum });
  };
  assertValidatorFail(builder);
});
