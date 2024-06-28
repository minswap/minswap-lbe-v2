import { WarehouseBuilder, type BuildCreateTreasuryOptions } from "../build-tx";
import {
  CREATE_POOL_COMMISSION,
  MANAGER_MIN_ADA,
  MAX_PENALTY_RATE,
  TREASURY_MIN_ADA,
} from "../constants";
import type { Assets, LbeUTxO, TreasuryDatum, UTxO } from "../types";
import { assertValidator, assertValidatorFail, loadModule } from "./utils";
import { genWarehouse } from "./warehouse";

let W: any;
const DEFAULT_SELLER_AMOUNT = 20n;

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
  let factoryUtxo: LbeUTxO = {
    txHash: "5428517bd92102ce1af705f8b66560d445e620aead488b47fb824426484912f8",
    outputIndex: 5,
    assets: {
      lovelace: 2_000_000n,
      [builder.factoryToken]: 1n,
    },
    datum: WarehouseBuilder.toDatumFactory(defaultFactoryDatum),
    address: builder.factoryAddress,
  };
  const owner = await t.wallet.address();
  let options: BuildCreateTreasuryOptions = {
    sellerAmount: DEFAULT_SELLER_AMOUNT,
    factoryUtxo,
    sellerOwner: owner,
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
    lovelace: TREASURY_MIN_ADA + CREATE_POOL_COMMISSION,
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

test("create-treasury | PASS | Receiver Datum: DatumHash", async () => {
  let { defaultTreasuryDatum, options } = W;
  let builder: WarehouseBuilder = W.builder;
  let extraDatum = WarehouseBuilder.toDatumFactory({ head: "00", tail: "ff" });
  let extraDatumHash = builder.t.utils.datumToHash(extraDatum);
  let treasuryDatum: TreasuryDatum = {
    ...defaultTreasuryDatum,
    receiverDatum: { RDatumHash: { hash: extraDatumHash } },
  };
  options = {
    ...options,
    treasuryDatum,
    extraDatum,
  };
  builder = builder.buildCreateTreasury(options);
  assertValidator(builder, "");
});

test("create-treasury | PASS | Receiver Datum: InlineDatum", async () => {
  let { defaultTreasuryDatum, options } = W;
  let builder: WarehouseBuilder = W.builder;
  let extraDatum = WarehouseBuilder.toDatumFactory({ head: "00", tail: "ff" });
  let extraDatumHash = builder.t.utils.datumToHash(extraDatum);
  let treasuryDatum: TreasuryDatum = {
    ...defaultTreasuryDatum,
    receiverDatum: { RInlineDatum: { hash: extraDatumHash } },
  };
  options = {
    ...options,
    treasuryDatum,
    extraDatum,
  };
  builder = builder.buildCreateTreasury(options);
  assertValidator(builder, "");
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
  assertValidatorFail(W.builder.buildCreateTreasury(options));
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
      WarehouseBuilder.toRedeemerFactory(builder.factoryRedeemer),
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
        inline: WarehouseBuilder.toDatumFactory({ head: "00", tail: "ff" }),
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
    const factoryDatum = WarehouseBuilder.fromDatumFactory(
      builder.factoryInputs[0].datum,
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
  // 2 Factory Outputs must pay correctly!
  assertValidatorFail(builder);
});

test("create-treasury | FAIL | Factory Out Head Datum incorrect!", async () => {
  let builder: WarehouseBuilder = W.builder;
  builder = builder.buildCreateTreasury(W.options);
  builder.tasks[1] = () => {
    const factoryDatum = WarehouseBuilder.fromDatumFactory(
      builder.factoryInputs[0].datum,
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
  // 2 Factory Outputs must pay correctly!
  assertValidatorFail(builder);
});

const remixManagerDatum = (remixDatum: any) => {
  let builder: WarehouseBuilder = W.builder;
  builder = builder.buildCreateTreasury(W.options);
  builder.tasks[5] = () => {
    builder.tx.payToAddressWithData(
      builder.managerAddress,
      {
        inline: WarehouseBuilder.toDatumManager({
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
        inline: WarehouseBuilder.toDatumTreasury(W.defaultTreasuryDatum),
      },
      assets,
    );
  };
  return builder;
};

test("create-treasury | FAIL | Manager Output Datum incorrect! | X | factory_policy_id", async () => {
  assertValidatorFail(remixManagerDatum({ factoryPolicyId: "00" }));
});

test("create-treasury | FAIL | Manager Output Datum incorrect! | X | baseAsset", async () => {
  assertValidatorFail(remixManagerDatum({ baseAsset: W.adaToken }));
});

test("create-treasury | FAIL | Manager Output Datum incorrect! | X | raiseAsset", async () => {
  assertValidatorFail(remixManagerDatum({ raiseAsset: W.minswapToken }));
});

test("create-treasury | FAIL | Manager Output Datum incorrect! | X | sellerCount", async () => {
  assertValidatorFail(remixManagerDatum({ sellerCount: 10n }));
});

test("create-treasury | FAIL | Manager Output Datum incorrect! | X | reserveRaise", async () => {
  assertValidatorFail(remixManagerDatum({ reserveRaise: 10n }));
});

test("create-treasury | FAIL | Manager Output Datum incorrect! | X | totalPenalty", async () => {
  assertValidatorFail(remixManagerDatum({ totalPenalty: 10n }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | factoryPolicyId", async () => {
  assertValidatorFail(remixTreasuryDatum({ factoryPolicyId: "00" }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | managerHash", async () => {
  assertValidatorFail(remixTreasuryDatum({ managerHash: "00" }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | sellerHash", async () => {
  assertValidatorFail(remixTreasuryDatum({ sellerHash: "00" }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | orderHash", async () => {
  assertValidatorFail(remixTreasuryDatum({ orderHash: "00" }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | orderHash", async () => {
  assertValidatorFail(remixTreasuryDatum({ collectedFund: 100n }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | baseAsset", async () => {
  assertValidatorFail(remixTreasuryDatum({ baseAsset: W.adaToken }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | raiseAsset", async () => {
  assertValidatorFail(remixTreasuryDatum({ raiseAsset: W.minswapToken }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | isManagerCollected", async () => {
  assertValidatorFail(remixTreasuryDatum({ isManagerCollected: true }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | isCancelled", async () => {
  assertValidatorFail(remixTreasuryDatum({ isCancelled: true }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | totalPenalty", async () => {
  assertValidatorFail(remixTreasuryDatum({ totalPenalty: 12n }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | totalLiquidity", async () => {
  assertValidatorFail(remixTreasuryDatum({ totalLiquidity: 12n }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | reserveRaise", async () => {
  assertValidatorFail(remixTreasuryDatum({ reserveRaise: 12n }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | hihi discovery phase > 30 days", async () => {
  let endTime =
    W.defaultTreasuryDatum.startTime + BigInt(35 * 24 * 60 * 60 * 1000);
  assertValidatorFail(remixTreasuryDatum({ endTime }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | startTime", async () => {
  // LBE start time < current
  let startTime = BigInt(W.emulator.now() - 60 * 60 * 1000);
  assertValidatorFail(remixTreasuryDatum({ startTime }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | endTime", async () => {
  // LBE start time > LBE end time
  let endTime = W.defaultTreasuryDatum.startTime - 60n * 60n * 1000n;
  assertValidatorFail(remixTreasuryDatum({ endTime }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | minimumOrderRaise", async () => {
  assertValidatorFail(remixTreasuryDatum({ minimumOrderRaise: -100n }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | minimumOrderRaise", async () => {
  assertValidatorFail(remixTreasuryDatum({ minimumRaise: -100n }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | maximumRaise", async () => {
  let minimumRaise = 100_000_000_000n;
  let maximumRaise = 1_000_000_000n;
  assertValidatorFail(remixTreasuryDatum({ minimumRaise, maximumRaise }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | penaltyConfig.pecrent | 1", async () => {
  // penalty rate is negative
  let penaltyConfig = {
    penaltyStartTime:
      W.defaultTreasuryDatum.startTime + BigInt(24 * 60 * 60 * 1000),
    percent: -10n,
  };
  assertValidatorFail(remixTreasuryDatum({ penaltyConfig }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | penaltyStartTime | 1", async () => {
  // penalty rate exceeds MAX_PENALTY_RATE
  let penaltyConfig = {
    penaltyStartTime: 0n,
    percent: MAX_PENALTY_RATE,
  };
  assertValidatorFail(remixTreasuryDatum({ penaltyConfig }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | penaltyStartTime | 2", async () => {
  // penalty rate exceeds MAX_PENALTY_RATE
  let penaltyConfig = {
    penaltyStartTime: W.defaultTreasuryDatum.endTime,
    percent: MAX_PENALTY_RATE,
  };
  assertValidatorFail(remixTreasuryDatum({ penaltyConfig }));
});

test("create-treasury | FAIL | Treasury Output Datum incorrect! | X | penaltyStartTime | 3", async () => {
  // penalty rate exceeds MAX_PENALTY_RATE
  let penaltyConfig = {
    penaltyStartTime:
      W.defaultTreasuryDatum.endTime - BigInt(3 * 24 * 60 * 60 * 1000),
    percent: MAX_PENALTY_RATE,
  };
  assertValidatorFail(remixTreasuryDatum({ penaltyConfig }));
});

test("create-treasury | FAIL | Treasury Output Value incorrect! | X | reserveBase", async () => {
  let remixAssets = {
    ...W.treasuryOutValue,
    [W.minswapTokenRaw]: 1_000_000_00n,
  };
  assertValidatorFail(remixTreasuryValue(remixAssets));
});

test("create-treasury | FAIL | Treasury Output Value incorrect! | X | treasury_minimum_ada", async () => {
  let remixAssets = {
    ...W.treasuryOutValue,
    lovelace: TREASURY_MIN_ADA - 1_000_000n,
  };
  assertValidatorFail(remixTreasuryValue(remixAssets));
});

test("create-treasury | FAIL | Treasury Output Value incorrect! | X | treasury_minimum_ada", async () => {
  let remixAssets = {
    ...W.treasuryOutValue,
    lovelace: TREASURY_MIN_ADA - 1_000_000n,
  };
  assertValidatorFail(remixTreasuryValue(remixAssets));
});

test("create-treasury | FAIL | Minting incorrect! | X | Seller Token", async () => {
  let builder: WarehouseBuilder = W.builder;
  builder = builder.buildCreateTreasury(W.options);
  builder.tasks[4] = () => {
    builder.mintingSellerToken(DEFAULT_SELLER_AMOUNT + 10n);
  };
  // Mint Value must be correct!
  assertValidatorFail(builder);
});
