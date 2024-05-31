import * as T from "@minswap/translucent";
import { WarehouseBuilder, type BuildCreateTreasuryOptions } from "../build-tx";
import type { UTxO } from "../types";
import { assertValidator, assertValidatorFail, loadModule } from "./utils";
import { genWarehouse } from "./warehouse";
import { FactoryValidateFactory } from "../../plutus";

let W: any;

beforeAll(async () => {
  await loadModule();
});

beforeEach(async () => {
  W = await genWarehouse();
  const {
    emulator,
    t,
    warehouseOptions,
    defaultFactoryDatum,
    defaultTreasuryDatum,
  } = W;
  const builder = new WarehouseBuilder(warehouseOptions);
  let factoryUtxo: UTxO = {
    txHash: "5428517bd92102ce1af705f8b66560d445e620aead488b47fb824426484912f8",
    outputIndex: 5,
    assets: {
      lovelace: 2_000_000n,
      [builder.factoryToken]: 1n,
    },
    datum: builder.toDatumFactory(defaultFactoryDatum),
    address: builder.factoryAddress,
  };
  let options: BuildCreateTreasuryOptions = {
    factoryUtxo,
    treasuryDatum: defaultTreasuryDatum,
    validFrom: t.utils.slotToUnixTime(emulator.slot),
    validTo: t.utils.slotToUnixTime(emulator.slot + 60),
  };
  let dummyUtxo: UTxO = {
    txHash: "00".repeat(32),
    outputIndex: 12,
    assets: {
      lovelace: 2_000_000n,
      [builder.factoryToken]: 1n,
    },
    address: "addr_test1vp4s6v3uny93ezxe4czyu8zywrh7d3p39sgwmngdn3rdm7gmp6c5r",
  };
  W = {
    ...W,
    builder,
    factoryUtxo,
    options,
    dummyUtxo,
  };
});

test("create-treasury | PASS | happy happy claps your hand!", async () => {
  assertValidator(W.builder.buildCreateTreasury(W.options), "");
});

test("create-treasury | FAIL | missing Factory Token", async () => {
  let { builder } = W;
  let options = {
    ...W.options,
    factoryUtxo: {
      ...W.options.factoryUtxo,
      assets: {
        lovelace: 2_000_000n,
      },
    },
  };
  builder.tasks.push(() => {
    builder.tx.collectFrom([W.dummyUtxo]);
  });
  assertValidator(
    W.builder.buildCreateTreasury(options),
    "Factory Input must be Legit!",
  );
});

test("create-treasury | FAIL | have 2 Factory Inputs", async () => {
  let { builder, options } = W;
  let txBuilder = builder.buildCreateTreasury(options);
  let dummyFactoryInput = {
    ...options.factoryUtxo,
    outputIndex: options.factoryUtxo.outputIndex + 1,
  };
  builder.tasks.push(() => {
    builder.tx.collectFrom(
      [dummyFactoryInput],
      builder.toRedeemerFactory(builder.factoryRedeemer),
    );
  });
  assertValidatorFail(txBuilder);
});
