import * as T from "@minswap/translucent";
import { MINSWAP_V2_FACTORY_AUTH_AN } from "..";
import { FactoryValidateFactory } from "../../plutus";
import { WarehouseBuilder, type BuildCancelLBEOptions } from "../build-tx";
import type { FactoryDatum, LbeUTxO, TreasuryDatum, UTxO } from "../types";
import { toUnit } from "../utils";
import { assertValidatorFail, loadModule, quickSubmitBuilder } from "./utils";
import { genWarehouse } from "./warehouse";

let warehouse: Awaited<ReturnType<typeof genTestWarehouse>>;

async function genTestWarehouse() {
  const w = await genWarehouse();
  const { t, defaultTreasuryDatum, defaultTreasuryInput } = w;
  w.builder.setInnerAssets(
    defaultTreasuryDatum.baseAsset,
    defaultTreasuryDatum.raiseAsset,
  );
  const ammFactoryDatum: FactoryDatum = {
    head: w.builder.lpAssetName!,
    tail: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
  };
  const ammFactoryUTxO: UTxO = {
    txHash: "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
    outputIndex: 0,
    address: w.builder.ammFactoryAddress,
    datum: T.Data.to(ammFactoryDatum, FactoryValidateFactory.datum),
    assets: {
      lovelace: 2_000_000n,
      [toUnit(w.builder.ammAuthenHash, MINSWAP_V2_FACTORY_AUTH_AN)]: 1n,
    },
  };
  const options: BuildCancelLBEOptions = {
    treasuryInput: defaultTreasuryInput as LbeUTxO,
    ammFactoryRefInput: ammFactoryUTxO as LbeUTxO,
    reason: "CreatedPool",
    validFrom: t.utils.slotToUnixTime(w.emulator.slot),
    validTo: t.utils.slotToUnixTime(w.emulator.slot + 60),
  };

  return {
    ...w,
    options,
    t,
    ammFactoryDatum,
    ammFactoryUTxO,
  };
}

beforeAll(async () => {
  await loadModule();
});

beforeEach(async () => {
  warehouse = await genTestWarehouse();
});

test("cancel-event | PASS | Cancel By Pool Exist", async () => {
  const { builder, options, emulator } = warehouse;

  emulator.addUTxO(options.ammFactoryRefInput!);
  emulator.addUTxO(options.treasuryInput);

  const txHash = await quickSubmitBuilder(emulator)({
    txBuilder: builder.buildCancelLBE(options).complete(),
  });
  expect(txHash).toBeTruthy();
});

test("cancel-event | PASS | Cancel By owner before discovery phase", async () => {
  const { builder, options, defaultTreasuryDatum } = warehouse;
  builder.buildCancelLBE({
    ...options,
    ammFactoryRefInput: undefined,
    validFrom: Number(defaultTreasuryDatum.startTime - 2n),
    validTo: Number(defaultTreasuryDatum.startTime - 1n),
    reason: "ByOwner",
  });
  const tx = builder.complete();
  await tx.complete();
});

test("cancel-event | PASS | Cancel by owner in discovery phase and lbe is revocalbe", async () => {
  const { builder, defaultTreasuryDatum, defaultTreasuryInput } = warehouse;
  const treasuryDatum: TreasuryDatum = {
    ...defaultTreasuryDatum,
    revocable: true,
  };
  const treasuryRefInput: LbeUTxO = {
    ...defaultTreasuryInput,
    datum: WarehouseBuilder.toDatumTreasury(treasuryDatum),
  };
  builder.buildCancelLBE({
    treasuryInput: treasuryRefInput,
    ammFactoryRefInput: undefined,
    validFrom: Number(defaultTreasuryDatum.startTime + 1n),
    validTo: Number(defaultTreasuryDatum.startTime + 2n),
    reason: "ByOwner",
  });
  const tx = builder.complete();
  await tx.complete();
});

test("cancel-event | PASS | Cancel when not reaching minimum", async () => {
  const { builder, defaultTreasuryDatum, defaultTreasuryInput } = warehouse;
  const treasuryDatum: TreasuryDatum = {
    ...defaultTreasuryDatum,
    isManagerCollected: true,
    reserveRaise: 1_000_000_000n,
    totalPenalty: 1_000_000n,
    minimumRaise: 2_000_000_000n,
  };
  const treasuryRefInput: LbeUTxO = {
    ...defaultTreasuryInput,
    datum: WarehouseBuilder.toDatumTreasury(treasuryDatum),
  };
  builder.buildCancelLBE({
    treasuryInput: treasuryRefInput,
    ammFactoryRefInput: undefined,
    validFrom: Number(defaultTreasuryDatum.startTime + 1n),
    validTo: Number(defaultTreasuryDatum.startTime + 2n),
    reason: "NotReachMinimum",
  });
  const tx = builder.complete();
  await tx.complete();
});

test("cancel-event | FAIL | Cancel By Pool Exist but invalid amm factory ref input", async () => {
  const { builder, options } = warehouse;
  builder.buildCancelLBE({
    ...options,
    ammFactoryRefInput: {
      ...options.ammFactoryRefInput!,
      datum: T.Data.to(
        {
          head: "00",
          tail: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
        },
        FactoryValidateFactory.datum,
      ),
    },
  });
  await assertValidatorFail(builder);
});

test("cancel-event | FAIL | Cancel not By owner before discovery phase", async () => {
  const { builder, options, defaultTreasuryDatum } = warehouse;
  builder.buildCancelLBE({
    ...options,
    ammFactoryRefInput: undefined,
    validFrom: Number(defaultTreasuryDatum.startTime - 2n),
    validTo: Number(defaultTreasuryDatum.startTime - 1n),
    reason: "ByOwner",
  });
  builder.tasks[1] = () => {};
  await assertValidatorFail(builder);
});

test("cancel-event | FAIL | Cancel not by owner in discovery phase and lbe is revocalbe", async () => {
  const { builder, defaultTreasuryDatum, defaultTreasuryInput } = warehouse;
  const treasuryDatum: TreasuryDatum = {
    ...defaultTreasuryDatum,
    revocable: true,
  };
  const treasuryRefInput: LbeUTxO = {
    ...defaultTreasuryInput,
    datum: WarehouseBuilder.toDatumTreasury(treasuryDatum),
  };
  builder.buildCancelLBE({
    treasuryInput: treasuryRefInput,
    ammFactoryRefInput: undefined,
    validFrom: Number(defaultTreasuryDatum.startTime + 1n),
    validTo: Number(defaultTreasuryDatum.startTime + 2n),
    reason: "ByOwner",
  });
  builder.tasks[1] = () => {};
  await assertValidatorFail(builder);
});

test("cancel-event | FAIL | Cancel not By owner before discovery phase", async () => {
  const { builder, options, defaultTreasuryDatum } = warehouse;
  builder.buildCancelLBE({
    ...options,
    ammFactoryRefInput: undefined,
    validFrom: Number(defaultTreasuryDatum.startTime),
    validTo: Number(defaultTreasuryDatum.startTime + 1n),
    reason: "ByOwner",
  });
  await assertValidatorFail(builder);
});

test("cancel-event | FAIL | Cancel not by owner in discovery phase and lbe is revocalbe", async () => {
  const { builder, defaultTreasuryDatum, defaultTreasuryInput } = warehouse;
  const treasuryDatum: TreasuryDatum = {
    ...defaultTreasuryDatum,
    revocable: true,
  };
  const treasuryRefInput: LbeUTxO = {
    ...defaultTreasuryInput,
    datum: WarehouseBuilder.toDatumTreasury(treasuryDatum),
  };
  builder.buildCancelLBE({
    treasuryInput: treasuryRefInput,
    ammFactoryRefInput: undefined,
    validFrom: Number(defaultTreasuryDatum.endTime),
    validTo: Number(defaultTreasuryDatum.endTime + 1n),
    reason: "ByOwner",
  });
  await assertValidatorFail(builder);
});

test("cancel-event | PASS | Cancel when reaching minimum", async () => {
  const { builder, defaultTreasuryDatum, defaultTreasuryInput } = warehouse;
  const treasuryDatum: TreasuryDatum = {
    ...defaultTreasuryDatum,
    isManagerCollected: true,
    reserveRaise: 1_000_000_000n,
    totalPenalty: 1_000_000n,
    minimumRaise: 1_000_000_000n,
  };
  const treasuryRefInput: LbeUTxO = {
    ...defaultTreasuryInput,
    datum: WarehouseBuilder.toDatumTreasury(treasuryDatum),
  };
  builder.buildCancelLBE({
    treasuryInput: treasuryRefInput,
    ammFactoryRefInput: undefined,
    validFrom: Number(defaultTreasuryDatum.startTime + 1n),
    validTo: Number(defaultTreasuryDatum.startTime + 2n),
    reason: "NotReachMinimum",
  });
  await assertValidatorFail(builder);
});
