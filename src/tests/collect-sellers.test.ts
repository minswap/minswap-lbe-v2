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
import {
  ManagerValidateManagerSpending,
  SellerValidateSellerSpending,
  TreasuryValidateTreasurySpending,
} from "../../plutus";
import {
  WarehouseBuilder,
  type BuildCollectSellersOptions,
  type WarehouseBuilderOptions,
} from "../build-tx";
import { MANAGER_MIN_ADA, TREASURY_MIN_ADA } from "../constants";
import {
  assertValidator,
  assertValidatorFail,
  genWarehouseOptions,
  loadModule,
} from "./utils";
import * as T from "@minswap/translucent";
import { genWarehouse } from "./warehouse";
import type { Assets, BluePrintAsset, UTxO } from "../types";
import { plutusAddress2Address } from "../utils";
import invariant from "@minswap/tiny-invariant";

let utxoIndex: number;
let warehouse: {
  t: T.Translucent;
  builder: WarehouseBuilder;
  options: BuildCollectSellersOptions;
  baseAsset: BluePrintAsset;
  warehouseOptions: WarehouseBuilderOptions;
  treasuryDatum: TreasuryValidateTreasurySpending["treasuryInDatum"];
  treasuryUTxO: UTxO;
  managerDatum: ManagerValidateManagerSpending["managerInDatum"];
  managerUTxO: UTxO;
  expectedManagerDatumOut: ManagerValidateManagerSpending["managerInDatum"];
  sellerDatums: SellerValidateSellerSpending["sellerInDatum"][];
  sellerUTxOs: UTxO[];
  defaultSellerDatum: SellerValidateSellerSpending["sellerInDatum"];
  owner: string;
};

const MINt = {
  policyId: "29d222ce763455e3d7a09a665ce554f00ac89d2e99a1a83d267170c6",
  assetName: "4d494e74",
};

beforeAll(async () => {
  await loadModule();
});

beforeEach(async () => {
  const {
    t,
    minswapToken,
    defaultTreasuryDatum,
    defaultSellerDatum,
    defaultManagerDatum,
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
  const managerDatum: ManagerValidateManagerSpending["managerInDatum"] = {
    ...defaultManagerDatum,
  };
  const managerUTxO = {
    txHash: "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
    outputIndex: ++utxoIndex,
    assets: {
      [builder.managerToken]: 1n,
    },
    address: builder.managerAddress,
    datum: builder.toDatumManager(managerDatum),
  };
  const sellerDatums: SellerValidateSellerSpending["sellerInDatum"][] = [
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
    validTo: Number(treasuryDatum.endTime + 5000n),
  };
  const expectedManagerDatumOut = {
    ...managerDatum,
    sellerCount: managerDatum.sellerCount - 3n,
    reserveRaise: managerDatum.reserveRaise + 9_000n,
    totalPenalty: managerDatum.totalPenalty + 2010n,
  };
  warehouse = {
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
  };
});

function genSellerUTxO(
  datum: SellerValidateSellerSpending["sellerInDatum"],
  builder: WarehouseBuilder,
): UTxO {
  return {
    txHash: "ce156ede4b5d1cd72b98f1d78c77c4e6bd3fc37bbe28e6c380f17a4f626e593c",
    outputIndex: ++utxoIndex,
    assets: {
      [builder.sellerToken]: 1n,
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
  const { builder, options } = warehouse;
  builder.buildCollectSeller(options);
  const tx = builder.complete();
  await tx.complete();
});

test("collect sellers | PASS | happy case 2", async () => {
  const { defaultSellerDatum, builder } = warehouse;
  warehouse.options.sellerInputs.push(
    genSellerUTxO(
      { ...defaultSellerDatum, amount: 1000n, penaltyAmount: 20_000n },
      builder,
    ),
  );
  const builder1 = stupidManagerDatumOut({
    reserveRaise: warehouse.expectedManagerDatumOut.reserveRaise + 1000n,
    totalPenalty: warehouse.expectedManagerDatumOut.totalPenalty + 20_000n,
    sellerCount: warehouse.expectedManagerDatumOut.sellerCount - 1n,
  });
  const tx = builder1.complete();
  await tx.complete();
});

test("collect sellers | FAIL | Before end of discovery phase", async () => {
  const { builder, options, treasuryDatum } = warehouse;
  builder.buildCollectSeller({
    ...options,
    validFrom: Number(treasuryDatum.endTime - 1000n),
  });
  // Manager is determining whether the action is collect sellers
  //  or add sellers through valid time range and is_cancelled field, so...
  assertValidator(builder, "Unable to determine action");
});

test("collect sellers | FAIL | invalid minting", async () => {
  const { builder, options } = warehouse;
  builder.buildCollectSeller(options);
  // must not be -3 to be fail
  builder.tasks[3] = () => {
    builder.mintingSellerToken(-2n);
  };
  assertValidator(builder, "Collect sellers: Invalid minting");
});

test("collect sellers | FAIL | 1 seller out", async () => {
  const { builder, options, defaultSellerDatum } = warehouse;
  builder.buildCollectSeller(options);
  builder.tasks.push(() => {
    // 1 UTxO contain 1 seller tokens for tx value balance
    attachValueToInput({
      [builder.sellerToken]: 1n,
    });
    // pay to seller UTxO
    builder.innerPaySeller(defaultSellerDatum);
  });
  assertValidator(builder, "Collect sellers: Tx mustn't have seller output");
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
  assertValidator(builder, "Collect sellers: Invalid manager datum");
});

test("collect sellers | FAIL | Stupid Manager datum output(raiseAsset)", async () => {
  const builder = stupidManagerDatumOut({
    raiseAsset: MINt,
  });
  assertValidator(builder, "Collect sellers: Invalid manager datum");
});

test("collect sellers | FAIL | Stupid Manager datum output(factoryPolicyId)", async () => {
  const builder = stupidManagerDatumOut({
    factoryPolicyId: "1234567890",
  });
  assertValidator(builder, "Collect sellers: Invalid manager datum");
});

test("collect sellers | FAIL | Stupid Manager datum output(orderHash)", async () => {
  const builder = stupidManagerDatumOut({
    orderHash: "1234567890",
  });
  assertValidator(builder, "Collect sellers: Invalid manager datum");
});

test("collect sellers | FAIL | Stupid Manager datum output(sellerHash)", async () => {
  const builder = stupidManagerDatumOut({
    sellerHash: "1234567890",
  });
  assertValidator(builder, "Collect sellers: Invalid manager datum");
});

test("collect sellers | FAIL | Stupid Manager datum output(sellerCount)", async () => {
  const { expectedManagerDatumOut } = warehouse;
  const builder = stupidManagerDatumOut({
    sellerCount: expectedManagerDatumOut.sellerCount + 1n,
  });
  assertValidator(builder, "Collect sellers: Invalid manager datum");
});

test("collect sellers | FAIL | Stupid Manager datum output(reserveRaise)", async () => {
  const { expectedManagerDatumOut } = warehouse;
  const builder = stupidManagerDatumOut({
    reserveRaise: expectedManagerDatumOut.reserveRaise + 1n,
  });
  assertValidator(builder, "Collect sellers: Invalid manager datum");
});

test("collect sellers | FAIL | Stupid Manager datum output(totalPenalty)", async () => {
  const { expectedManagerDatumOut } = warehouse;
  const builder = stupidManagerDatumOut({
    totalPenalty: expectedManagerDatumOut.totalPenalty + 1n,
  });
  assertValidator(builder, "Collect sellers: Invalid manager datum");
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
  assertValidator(builder, "Manager input dont have manager token");
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
  assertValidator(builder, "Manager input dont have manager token");
});

/*
TODO:
- seller input value dont have seller token
- Invalid LBE ID:
  - Seller input
  - Manager input
- 2 manager input
*/
