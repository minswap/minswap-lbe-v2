import { WarehouseBuilder, type BuildCreateTreasuryOptions } from "../build-tx";
import { MANAGER_MIN_ADA } from "../constants";
import type { UTxO } from "../types";
import { assertValidator, assertValidatorFail, loadModule } from "./utils";
import { genWarehouse } from "./warehouse";

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

test("create-treasury | FAIL | have 0 Factory Out", async () => {
  let builder: WarehouseBuilder = W.builder;
  builder = builder.buildCreateTreasury(W.options);
  builder.tasks[1] = () => {};
  // await (builder.complete()).complete();
  assertValidatorFail(builder);
});

test("create-treasury | FAIL | have 3 Factory Outs", async () => {
  let builder: WarehouseBuilder = W.builder;
  builder = builder.buildCreateTreasury(W.options);
  builder.tasks.push(() => {
    builder.tx.payToAddressWithData(
      builder.factoryAddress,
      {
        inline: builder.toDatumFactory({ head: "00", tail: "ff" }),
      },
      {
        lovelace: 1_000_000n,
      },
    );
  });
  // await (builder.complete()).complete();
  assertValidatorFail(builder);
});

test("create-treasury | FAIL | Factory Out Tail Datum incorrect!", async () => {
  let builder: WarehouseBuilder = W.builder;
  builder = builder.buildCreateTreasury(W.options);
  builder.tasks[1] = () => {
    const factoryDatum = builder.fromDatumFactory(
      builder.factoryInputs[0].datum!,
    );
    const newFactoryHeadDatum = {
      head: factoryDatum.head,
      tail: builder.lpAssetName!,
    };
    const newFactoryTailDatum = {
      // INCORRECT!
      head: builder.lpAssetName!,
      tail: "00".repeat(10),
    };
    builder.innerPayFactory(newFactoryHeadDatum);
    builder.innerPayFactory(newFactoryTailDatum);
  };
  assertValidator(builder, "2 Factory Outputs must pay correctly!");
});

test("create-treasury | FAIL | Factory Out Head Datum incorrect!", async () => {
  let builder: WarehouseBuilder = W.builder;
  builder = builder.buildCreateTreasury(W.options);
  builder.tasks[1] = () => {
    const factoryDatum = builder.fromDatumFactory(
      builder.factoryInputs[0].datum!,
    );
    const newFactoryHeadDatum = {
      // INCORRECT!
      head: "ff00ff",
      tail: builder.lpAssetName!,
    };
    const newFactoryTailDatum = {
      head: builder.lpAssetName!,
      tail: factoryDatum.tail,
    };
    builder.innerPayFactory(newFactoryHeadDatum);
    builder.innerPayFactory(newFactoryTailDatum);
  };
  assertValidator(builder, "2 Factory Outputs must pay correctly!");
});

const remixManagerDatum = (remixDatum: any) => {
  let builder: WarehouseBuilder = W.builder;
  builder = builder.buildCreateTreasury(W.options);
  builder.tasks[5] = () => {
    builder.tx.payToAddressWithData(
      builder.managerAddress,
      {
        inline: builder.toDatumManager({
          ...W.defaultManagerDatum,
          ...remixDatum,
        }),
      },
      {
        [builder.managerToken]: 1n,
        lovelace: MANAGER_MIN_ADA,
      },
    );
  };
  return builder;
};

test("create-treasury | FAIL | Manager Output Datum incorrect! | X | factory_policy_id", async () => {
  assertValidator(
    remixManagerDatum({ factoryPolicyId: "00" }),
    "Manager Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Manager Output Datum incorrect! | X | orderHash", async () => {
  assertValidator(
    remixManagerDatum({ orderHash: "00" }),
    "Manager Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Manager Output Datum incorrect! | X | sellerHash", async () => {
  assertValidator(
    remixManagerDatum({ sellerHash: "00" }),
    "Manager Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Manager Output Datum incorrect! | X | baseAsset", async () => {
  assertValidator(
    remixManagerDatum({ baseAsset: W.adaToken }),
    "Manager Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Manager Output Datum incorrect! | X | raiseAsset", async () => {
  assertValidator(
    remixManagerDatum({ raiseAsset: W.minswapToken }),
    "Manager Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Manager Output Datum incorrect! | X | sellerCount", async () => {
  assertValidator(
    remixManagerDatum({ sellerCount: 10n }),
    "Manager Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Manager Output Datum incorrect! | X | reserveRaise", async () => {
  assertValidator(
    remixManagerDatum({ reserveRaise: 10n }),
    "Manager Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Manager Output Datum incorrect! | X | totalPenalty", async () => {
  assertValidator(
    remixManagerDatum({ totalPenalty: 10n }),
    "Manager Output must pay correctly!",
  );
});
