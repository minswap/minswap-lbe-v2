import * as T from "@minswap/translucent";
import { MINSWAP_V2_FACTORY_AUTH_AN } from "..";
import { FactoryValidateFactory } from "../../plutus";
import { type BuildCancelLBEOptions } from "../build-tx";
import type { FactoryDatum, UTxO } from "../types";
import { toUnit } from "../utils";
import { loadModule, quickSubmitBuilder } from "./utils";
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
  console.log(ammFactoryDatum);
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
  console.log(ammFactoryUTxO);
  const options: BuildCancelLBEOptions = {
    treasuryInput: defaultTreasuryInput,
    ammFactoryRefInput: ammFactoryUTxO,
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
