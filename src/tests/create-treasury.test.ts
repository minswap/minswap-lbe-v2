import { WarehouseBuilder, type BuildCreateTreasuryOptions } from "../build-tx";
import {
  CREATE_POOL_COMMISION,
  DEFAULT_NUMBER_SELLER,
  MANAGER_MIN_ADA,
  MAX_PENALTY_RATE,
  TREASURY_MIN_ADA,
} from "../constants";
import type { Assets, TreasuryDatum, UTxO } from "../types";
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
    minswapTokenRaw,
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
  let treasuryOutValue = {
    [builder.treasuryToken]: 1n,
    [minswapTokenRaw]: defaultTreasuryDatum.reserveBase,
    lovelace: TREASURY_MIN_ADA + CREATE_POOL_COMMISION,
  };
  W = {
    ...W,
    builder,
    factoryUtxo,
    options,
    dummyUtxo,
    treasuryOutValue,
  };
});

test("create-treasury | PASS | happy happy claps your hand!", async () => {
  assertValidator(W.builder.buildCreateTreasury(W.options), "");
});

test("create-treasury | PASS | Penalty Config", async () => {
  // penalty rate exceeds MAX_PENALTY_RATE
  let penaltyConfig = {
    penaltyStartTime:
      W.defaultTreasuryDatum.endTime - BigInt(2 * 24 * 60 * 60 * 1000),
    percent: MAX_PENALTY_RATE,
  };
  assertValidator(remixTreasuryDatum({ penaltyConfig }), "");
});

test("create-treasury | PASS | concu Receiver Datum Hash", async () => {
  let { defaultTreasuryDatum, options } = W;
  let builder: WarehouseBuilder = W.builder;
  let extraDatum = builder.toDatumFactory({ head: "00", tail: "ff" });
  let extraDatumHash = builder.t.utils.datumToHash(extraDatum);
  let treasuryDatum: TreasuryDatum = {
    ...defaultTreasuryDatum,
    receiverDatumHash: extraDatumHash,
  };
  options = {
    ...options,
    treasuryDatum,
    extraDatum,
  };
  builder = builder.buildCreateTreasury(options);
  assertValidator(builder, "");
  // let tx = builder.complete();
  // let finalTx = await tx.complete();
  // let a = finalTx.txComplete.to_json();
  // console.log(a);
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

const remixTreasuryDatum = (remixDatum: any) => {
  let builder: WarehouseBuilder = W.builder;
  builder = builder.buildCreateTreasury(W.options);
  let treasuryOutDatum = {
    ...W.defaultTreasuryDatum,
    ...remixDatum,
  };
  builder.tasks[8] = () => {
    builder.payingTreasuryOutput({ treasuryOutDatum });
  };
  return builder;
};

const remixTreasuryValue = (assets: Assets) => {
  let builder: WarehouseBuilder = W.builder;
  builder = builder.buildCreateTreasury(W.options);
  builder.tasks[8] = () => {
    builder.tx.payToAddressWithData(
      builder.treasuryAddress,
      {
        inline: builder.toDatumTreasury(W.defaultTreasuryDatum),
      },
      assets,
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

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | factoryPolicyId", async () => {
  assertValidator(
    remixTreasuryDatum({ factoryPolicyId: "00" }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | managerHash", async () => {
  assertValidator(
    remixTreasuryDatum({ managerHash: "00" }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | sellerHash", async () => {
  assertValidator(
    remixTreasuryDatum({ sellerHash: "00" }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | orderHash", async () => {
  assertValidator(
    remixTreasuryDatum({ orderHash: "00" }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | orderHash", async () => {
  assertValidator(
    remixTreasuryDatum({ collectedFund: 100n }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | baseAsset", async () => {
  assertValidator(
    remixTreasuryDatum({ baseAsset: W.adaToken }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | raiseAsset", async () => {
  assertValidator(
    remixTreasuryDatum({ raiseAsset: W.minswapToken }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | isManagerCollected", async () => {
  assertValidator(
    remixTreasuryDatum({ isManagerCollected: true }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | isCancelled", async () => {
  assertValidator(
    remixTreasuryDatum({ isCancelled: true }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | totalPenalty", async () => {
  assertValidator(
    remixTreasuryDatum({ totalPenalty: 12n }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | totalLiquidity", async () => {
  assertValidator(
    remixTreasuryDatum({ totalLiquidity: 12n }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | reserveRaise", async () => {
  assertValidator(
    remixTreasuryDatum({ reserveRaise: 12n }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | startTime", async () => {
  // LBE start time < current
  let startTime = BigInt(W.emulator.now() - 60 * 60 * 1000);
  assertValidator(
    remixTreasuryDatum({ startTime }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | endTime", async () => {
  // LBE start time > LBE end time
  let endTime = W.defaultTreasuryDatum.startTime - 60n * 60n * 1000n;
  assertValidator(
    remixTreasuryDatum({ endTime }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | minimumOrderRaise", async () => {
  assertValidator(
    remixTreasuryDatum({ minimumOrderRaise: -100n }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | minimumOrderRaise", async () => {
  assertValidator(
    remixTreasuryDatum({ minimumRaise: -100n }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | maximumRaise", async () => {
  let minimumRaise = 100_000_000_000n;
  let maximumRaise = 1_000_000_000n;
  assertValidator(
    remixTreasuryDatum({ minimumRaise, maximumRaise }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | penaltyConfig.pecrent | 1", async () => {
  // penalty rate is negative
  let penaltyConfig = {
    penaltyStartTime:
      W.defaultTreasuryDatum.startTime + BigInt(24 * 60 * 60 * 1000),
    percent: -10n,
  };
  assertValidator(
    remixTreasuryDatum({ penaltyConfig }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | penaltyStartTime | 1", async () => {
  // penalty rate exceeds MAX_PENALTY_RATE
  let penaltyConfig = {
    penaltyStartTime: 0n,
    percent: MAX_PENALTY_RATE,
  };
  assertValidator(
    remixTreasuryDatum({ penaltyConfig }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | penaltyStartTime | 2", async () => {
  // penalty rate exceeds MAX_PENALTY_RATE
  let penaltyConfig = {
    penaltyStartTime: W.defaultTreasuryDatum.endTime,
    percent: MAX_PENALTY_RATE,
  };
  assertValidator(
    remixTreasuryDatum({ penaltyConfig }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | penaltyStartTime | 3", async () => {
  // penalty rate exceeds MAX_PENALTY_RATE
  let penaltyConfig = {
    penaltyStartTime:
      W.defaultTreasuryDatum.endTime - BigInt(3 * 24 * 60 * 60 * 1000),
    percent: MAX_PENALTY_RATE,
  };
  assertValidator(
    remixTreasuryDatum({ penaltyConfig }),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Value incorrect! | X | reserveBase", async () => {
  let remixAssets = {
    ...W.treasuryOutValue,
    [W.minswapTokenRaw]: 1_000_000_00n,
  };
  assertValidator(
    remixTreasuryValue(remixAssets),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Value incorrect! | X | treasury_minimum_ada", async () => {
  let remixAssets = {
    ...W.treasuryOutValue,
    lovelace: TREASURY_MIN_ADA - 1_000_000n,
  };
  assertValidator(
    remixTreasuryValue(remixAssets),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Treasury Output Value incorrect! | X | treasury_minimum_ada", async () => {
  let remixAssets = {
    ...W.treasuryOutValue,
    lovelace: TREASURY_MIN_ADA - 1_000_000n,
  };
  assertValidator(
    remixTreasuryValue(remixAssets),
    "Treasury Output must pay correctly!",
  );
});

test("create-treasury | FAIL | Minting incorrect! | X | Seller Token", async () => {
  let builder: WarehouseBuilder = W.builder;
  builder = builder.buildCreateTreasury(W.options);
  builder.tasks[4] = () => {
    builder.mintingSellerToken(DEFAULT_NUMBER_SELLER + 10n);
  };
  assertValidator(builder, "Mint Value must be correct!");
});
