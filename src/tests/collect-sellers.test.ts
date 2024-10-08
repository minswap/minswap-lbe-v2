/*
Tx:
  - Input:
    - 1 Manager(ManageSeller)
    - n Seller(s)(CountingSeller)
  - Output:
    - 1 new Manager
  - Mint: -n Seller Token(MintSeller)
  - Ref Input: Treasury
  - Time: after end of discovery phase
PASS
- default
- one more seller
FAIL
- Before end of discovery phase
- invalid minting
- No ref input
- 1 seller out
- seller value dont have seller token
- invalid manager out datum:
  - total raise
  - total penalty
- no manager out
- 2 manager input
- managre value dont have any manager token
- Invalid LBE ID:
  - Seller input
  - Manager input
  - Manager output
*/
import invariant from "@minswap/tiny-invariant";
import * as T from "@minswap/translucent";
import { ManagerValidateManagerSpending } from "../../plutus";
import { WarehouseBuilder, type BuildCollectSellersOptions } from "../build-tx";
import {
  MANAGER_MIN_ADA,
  MINIMUM_SELLER_COLLECTED,
  SELLER_COMMISSION,
  SELLER_MIN_ADA,
  TREASURY_MIN_ADA,
} from "../constants";
import type { Assets, ManagerDatum, SellerDatum, UTxO } from "../types";
import { plutusAddress2Address, toUnit } from "../utils";
import {
  assertValidatorFail,
  genWarehouseOptions,
  loadModule,
  quickSubmitBuilder,
} from "./utils";
import { genWarehouse, skipToCountingPhase } from "./warehouse";

let utxoIndex: number;

let warehouse: Awaited<ReturnType<typeof genTestWarehouse>>;

const MINt = {
  policyId: "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6",
  assetName: "4d494e74",
};

beforeAll(async () => {
  await loadModule();
});

async function genTestWarehouse() {
  let W = await genWarehouse();
  const {
    t,
    minswapToken,
    defaultTreasuryDatum,
    defaultSellerDatum,
    defaultManagerDatum,
  } = W;
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
      [toUnit(baseAsset.policyId, baseAsset.assetName)]:
        treasuryDatum.reserveBase,
    },
    address: builder.treasuryAddress,
    datum: builder.toDatumTreasury(treasuryDatum),
  };
  const managerDatum: ManagerDatum = {
    ...defaultManagerDatum,
    sellerCount: 3n,
  };
  const managerUTxO = {
    txHash: "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
    outputIndex: ++utxoIndex,
    assets: {
      [builder.managerToken]: 1n,
      lovelace: MANAGER_MIN_ADA,
    },
    address: builder.managerAddress,
    datum: builder.toDatumManager(managerDatum),
  };
  const sellerDatums: SellerDatum[] = [
    {
      ...defaultSellerDatum,
      amount: -1_000n,
      penaltyAmount: 10n,
    },
    {
      ...defaultSellerDatum,
      amount: -20_000n,
      penaltyAmount: 1000n,
    },
    {
      ...defaultSellerDatum,
      amount: 30_000n,
      penaltyAmount: 1000n,
    },
  ];
  const sellerUTxOs: UTxO[] = sellerDatums.map((datum) =>
    genSellerUTxO(datum, builder),
  );
  const options: BuildCollectSellersOptions = {
    treasuryRefInput: treasuryUTxO,
    managerInput: managerUTxO,
    sellerInputs: sellerUTxOs,
    validFrom: Number(treasuryDatum.endTime + 1000n),
    validTo: Number(treasuryDatum.endTime + BigInt(3 * 60 * 60 * 1000)),
  };
  const expectedManagerDatumOut = {
    ...managerDatum,
    sellerCount: managerDatum.sellerCount - 3n,
    reserveRaise: managerDatum.reserveRaise + 9_000n,
    totalPenalty: managerDatum.totalPenalty + 2010n,
  };
  return {
    t,
    builder,
    options,
    baseAsset,
    warehouseOptions,
    treasuryDatum,
    treasuryUTxO,
    managerDatum,
    managerUTxO,
    expectedManagerDatumOut,
    sellerDatums,
    sellerUTxOs,
    defaultSellerDatum,
    owner: plutusAddress2Address(t.network, treasuryDatum.owner),
    W,
  };
}

beforeEach(async () => {
  warehouse = await genTestWarehouse();
});

function genSellerUTxO(datum: SellerDatum, builder: WarehouseBuilder): UTxO {
  const rand = Math.floor(Math.random() * 100);
  return {
    txHash: "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
    outputIndex: ++utxoIndex,
    assets: {
      [builder.sellerToken]: 1n,
      lovelace: SELLER_MIN_ADA + BigInt(rand) * SELLER_COMMISSION,
    },
    address: builder.sellerAddress,
    datum: builder.toDatumSeller(datum),
  };
}

function attachValueToInput(value: Assets): void {
  const { builder, owner } = warehouse;
  builder.tasks.push(() => {
    // 1 UTxO contain 1 seller tokens for tx value balance
    builder.tx.collectFrom([
      {
        txHash:
          "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
        outputIndex: ++utxoIndex,
        assets: value,
        address: owner,
      },
    ]);
  });
}

test("collect sellers | PASS | happy case 1", async () => {
  // collect all sellers
  const { builder, options } = warehouse;
  builder.buildCollectSeller(options);
  const tx = builder.complete();
  await tx.complete();
});

test("collect sellers | PASS | happy case 2", async () => {
  const { defaultSellerDatum, builder, managerDatum } = warehouse;
  warehouse.options.sellerInputs.push(
    genSellerUTxO(
      { ...defaultSellerDatum, amount: 1000n, penaltyAmount: 20_000n },
      builder,
    ),
  );
  warehouse.options.managerInput = {
    ...warehouse.options.managerInput,
    datum: builder.toDatumManager({ ...managerDatum, sellerCount: 4n }),
  };
  const builder1 = stupidManagerDatumOut({
    reserveRaise: warehouse.expectedManagerDatumOut.reserveRaise + 1000n,
    totalPenalty: warehouse.expectedManagerDatumOut.totalPenalty + 20_000n,
    sellerCount: warehouse.expectedManagerDatumOut.sellerCount,
  });
  const tx = builder1.complete();
  await tx.complete();
});

test("collect sellers | PASS | happy case 3", async () => {
  // collect MINIMUM_SELLER_COLLECTED sellers
  let { builder, W, defaultSellerDatum, options, treasuryDatum } = warehouse;
  let managerDatum: ManagerDatum = {
    ...builder.fromDatumManager(options.managerInput.datum!),
    sellerCount: 100n,
  };
  let managerInput = {
    ...options.managerInput,
    datum: builder.toDatumManager(managerDatum),
  };
  let sellerInputs: UTxO[] = [];
  for (let i = 0; i <= MINIMUM_SELLER_COLLECTED; i++) {
    let utxo = genSellerUTxO(
      { ...defaultSellerDatum, amount: 1000n, penaltyAmount: 20_000n },
      builder,
    );
    sellerInputs.push(utxo);
  }
  options = {
    ...options,
    managerInput,
    sellerInputs,
  };
  builder.buildCollectSeller(options);

  W.emulator.addUTxO(options.treasuryRefInput);
  W.emulator.addUTxO(options.managerInput);
  for (let s of sellerInputs) W.emulator.addUTxO(s);
  skipToCountingPhase({ t: builder.t, e: W.emulator, datum: treasuryDatum });

  const tx = await quickSubmitBuilder(W.emulator)({
    txBuilder: builder.complete(),
  });
  expect(tx).toBeTruthy();
});

test("collect sellers | FAIL | Before end of discovery phase", async () => {
  const { builder, options, treasuryDatum } = warehouse;
  builder.buildCollectSeller({
    ...options,
    validFrom: Number(treasuryDatum.endTime - 1000n),
  });
  // Manager is determining whether the action is collect sellers
  //  or add sellers through valid time range and is_cancelled field, so...
  assertValidatorFail(builder);
});

test("collect sellers | FAIL | invalid minting", async () => {
  const { builder, options } = warehouse;
  builder.buildCollectSeller(options);
  // must not be -3 to be fail
  builder.tasks[3] = () => {
    builder.mintingSellerToken(-2n);
  };
  assertValidatorFail(builder);
});

test("collect sellers | FAIL | No treasury ref input", async () => {
  const { builder, options } = warehouse;
  builder.buildCollectSeller(options);
  builder.tasks[2] = () => {
    if (builder.sellerInputs.length === 0) {
      return;
    }
    invariant(builder.sellerRedeemer);
    builder.tx
      .readFrom([builder.deployedValidators["sellerValidator"]])
      .collectFrom(
        builder.sellerInputs,
        builder.toRedeemerSellerSpend(builder.sellerRedeemer),
      );
  };
  assertValidatorFail(builder);
});

test("collect sellers | FAIL | No treasury ref input", async () => {
  const { builder, options } = warehouse;
  builder.buildCollectSeller(options);
  builder.tasks[2] = () => {
    if (builder.sellerInputs.length === 0) {
      return;
    }
    invariant(builder.sellerRedeemer);
    builder.tx
      .readFrom([builder.deployedValidators["sellerValidator"]])
      .collectFrom(
        builder.sellerInputs,
        builder.toRedeemerSellerSpend(builder.sellerRedeemer),
      );
  };
  assertValidatorFail(builder);
});

function stupidManagerDatumOut(stupidInfo: any): WarehouseBuilder {
  const { builder, options } = warehouse;
  builder.buildCollectSeller(options);

  builder.tasks[4] = () => {
    builder.payingManagerOutput({
      ...warehouse.expectedManagerDatumOut,
      ...stupidInfo,
    });
  };
  return builder;
}

test("collect sellers | FAIL | Stupid Manager datum output(baseAsset)", async () => {
  const builder = stupidManagerDatumOut({
    baseAsset: MINt,
  });
  assertValidatorFail(builder);
});

test("collect sellers | FAIL | Stupid Manager datum output(raiseAsset)", async () => {
  const builder = stupidManagerDatumOut({
    raiseAsset: MINt,
  });
  assertValidatorFail(builder);
});

test("collect sellers | FAIL | Stupid Manager datum output(factoryPolicyId)", async () => {
  const builder = stupidManagerDatumOut({
    factoryPolicyId: "1234567890",
  });
  assertValidatorFail(builder);
});

test("collect sellers | FAIL | Stupid Manager datum output(sellerCount)", async () => {
  const { expectedManagerDatumOut } = warehouse;
  const builder = stupidManagerDatumOut({
    sellerCount: expectedManagerDatumOut.sellerCount + 1n,
  });
  assertValidatorFail(builder);
});

test("collect sellers | FAIL | Stupid Manager datum output(reserveRaise)", async () => {
  const { expectedManagerDatumOut } = warehouse;
  const builder = stupidManagerDatumOut({
    reserveRaise: expectedManagerDatumOut.reserveRaise + 1n,
  });
  assertValidatorFail(builder);
});

test("collect sellers | FAIL | Stupid Manager datum output(totalPenalty)", async () => {
  const { expectedManagerDatumOut } = warehouse;
  const builder = stupidManagerDatumOut({
    totalPenalty: expectedManagerDatumOut.totalPenalty + 1n,
  });
  assertValidatorFail(builder);
});

test("collect sellers | FAIL | No manager input", async () => {
  const { builder, options } = warehouse;
  builder.buildCollectSeller(options);
  builder.tasks[4] = () => {};
  assertValidatorFail(builder);
});

test("collect sellers | FAIL | Managre input value dont have any manager token", async () => {
  const { builder, options } = warehouse;
  builder.buildCollectSeller({
    ...options,
    managerInput: {
      ...options.managerInput,
      assets: {
        lovelace: MANAGER_MIN_ADA,
      },
    },
  });
  attachValueToInput({ [builder.managerToken]: 1n });
  assertValidatorFail(builder);
});

test("collect sellers | FAIL | Seller input value dont have seller token", async () => {
  const { builder, options } = warehouse;
  const { sellerInputs } = options;
  const assets = sellerInputs[0].assets;
  delete assets[builder.sellerToken];
  sellerInputs[0] = {
    ...sellerInputs[0],
    assets: assets,
  };
  builder.buildCollectSeller({
    ...options,
    sellerInputs,
  });
  attachValueToInput({ [builder.sellerToken]: 1n });
  assertValidatorFail(builder);
});

test("collect sellers | FAIL | Seller Input: Invalid LBE ID", async () => {
  const { builder, options, sellerDatums } = warehouse;
  const { sellerInputs } = options;
  sellerInputs[0] = {
    ...sellerInputs[0],
    datum: builder.toDatumSeller({
      ...sellerDatums[0],
      baseAsset: MINt,
    }),
  };
  builder.buildCollectSeller({
    ...options,
    sellerInputs,
  });
  // Collect Sellers: invalid seller inputs' LBE ID
  assertValidatorFail(builder);
});

test("collect sellers | FAIL | Manager Input: Invalid LBE ID", async () => {
  const { builder, options, managerDatum } = warehouse;
  const { managerInput } = options;
  builder.buildCollectSeller({
    ...options,
    managerInput: {
      ...managerInput,
      datum: builder.toDatumManager({ ...managerDatum, baseAsset: MINt }),
    },
  });
  assertValidatorFail(builder);
});

test("collect sellers | FAIL | More than 1 manager input", async () => {
  const { builder, options } = warehouse;
  const { managerInput } = options;
  builder.tasks.push(() => {
    builder.tx
      .readFrom([builder.deployedValidators["managerValidator"]])
      .collectFrom(
        [
          {
            ...managerInput,
            outputIndex: ++utxoIndex,
          },
        ],
        T.Data.to("CollectSellers", ManagerValidateManagerSpending.redeemer),
      );
  });
  assertValidatorFail(builder);
});

test("collect sellers | FAIL | spam collect sellers", async () => {
  let { builder, options } = warehouse;
  let managerDatum: ManagerDatum = {
    ...builder.fromDatumManager(options.managerInput.datum!),
    sellerCount: 100n,
  };
  let managerInput = {
    ...options.managerInput,
    datum: builder.toDatumManager(managerDatum),
  };
  options = {
    ...options,
    managerInput,
  };
  let task = async () => {
    builder.buildCollectSeller(options);
    const tx = builder.complete();
    await tx.complete();
  };
  expect(async () => await task()).toThrow(
    `Collect all sellers or at least ${MINIMUM_SELLER_COLLECTED}`,
  );
});
