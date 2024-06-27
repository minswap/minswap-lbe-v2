import * as T from "@minswap/translucent";
import { WarehouseBuilder } from "../build-tx";
import {
  WarehouseBatcher,
  type CollectOrdersMapInput,
  type LbeUTxO,
} from "../cmd/batcher";
import type { ManagerDatum, TreasuryDatum } from "../types";
import { loadModule, quickSubmitBuilder } from "./utils";
import {
  genWarehouse,
  skipToCountingPhase,
  type GenWarehouse,
} from "./warehouse";

let warehouse: GenWarehouse;
let defaultMaxTxSize = T.PROTOCOL_PARAMETERS_DEFAULT.maxTxSize;

const SELLER_COUNT = 100;
const ORDER_COUNT = 10;

beforeAll(async () => {
  await loadModule();
});

beforeEach(async () => {
  warehouse = await genWarehouse(defaultMaxTxSize);
});

/**
 * Gen new Wallet.
 * Test 3 cases:
 *   1. Found seed
 *   2. Not found seed -> create seed
 *   3. Not found seed -> can't create seed
 */
test("batcher | find-seed", async () => {
  let { builder, emulator, warehouseOptions } = warehouse;

  // case-1
  {
    let trans = await T.Translucent.new(emulator);
    trans.selectWalletFromPrivateKey(T.generatePrivateKey());
    let address = await trans.wallet.address();
    // prepare seed
    await quickSubmitBuilder(emulator)({
      txBuilder: builder.t
        .newTx()
        .payToAddress(address, { lovelace: 1000_000_000n }),
    });
    let builder2 = new WarehouseBuilder({ ...warehouseOptions, t: trans });
    let batcher = new WarehouseBatcher(builder2);
    let seed = await batcher.findSeed();
    expect(seed).toBeTruthy();
  }

  // case-2
  {
    let trans = await T.Translucent.new(emulator);
    trans.selectWalletFromPrivateKey(T.generatePrivateKey());
    let address = await trans.wallet.address();
    // prepare seed
    await quickSubmitBuilder(emulator)({
      txBuilder: builder.t
        .newTx()
        .payToAddress(address, { lovelace: 40_000_000n })
        .payToAddress(address, { lovelace: 90_000_000n }),
    });
    let builder2 = new WarehouseBuilder({ ...warehouseOptions, t: trans });
    let batcher = new WarehouseBatcher(builder2);
    let seed = await batcher.findSeed();
    expect(seed).toBeTruthy();
  }

  // case-3
  {
    let trans = await T.Translucent.new(emulator);
    trans.selectWalletFromPrivateKey(T.generatePrivateKey());
    let address = await trans.wallet.address();
    // prepare seed
    await quickSubmitBuilder(emulator)({
      txBuilder: builder.t
        .newTx()
        .payToAddress(address, { lovelace: 40_000_000n }),
    });
    let builder2 = new WarehouseBuilder({ ...warehouseOptions, t: trans });
    let batcher = new WarehouseBatcher(builder2);
    expect(async () => {
      await batcher.findSeed();
    }).toThrow();
  }
});

test("batcher | buildMapLbeUTxO", async () => {
  let { builder, emulator } = warehouse;

  emulator.addUTxO(warehouse.defaultTreasuryInput);
  emulator.addUTxO(warehouse.defaultManagerInput);
  emulator.addUTxO(warehouse.defaultSellerInput);
  emulator.addUTxO(warehouse.defaultOrderInput);

  let expectMapLbeUTxO = {
    treasury: warehouse.defaultTreasuryInput,
    manager: warehouse.defaultManagerInput,
    sellers: [warehouse.defaultSellerInput],
    orders: [warehouse.defaultOrderInput],
  };
  let batcher = new WarehouseBatcher(builder);
  await batcher.buildMapLbeUTxO();

  expect(Object.keys(batcher.mapLbeUTxO).length).toEqual(1);
  let mapLbeUTxO = Object.values(batcher.mapLbeUTxO)[0];
  expect(mapLbeUTxO).toEqual(expectMapLbeUTxO);
});

test("batcher | collect-manager", async () => {
  let { builder, emulator } = warehouse;
  // IMPORTANT!!! Update LBE End Time
  let treasuryDatum: TreasuryDatum = {
    ...warehouse.defaultTreasuryDatum,
    startTime: BigInt(Date.now() - 3 * 24 * 60 * 60 * 1000),
    endTime: BigInt(Date.now() - 60 * 60 * 1000),
  };
  let treasuryInput = {
    ...warehouse.defaultTreasuryInput,
    datum: WarehouseBuilder.toDatumTreasury(treasuryDatum),
  };
  let managerDatum: ManagerDatum = {
    ...warehouse.defaultManagerDatum,
    sellerCount: 0n,
  };
  let managerInput = {
    ...warehouse.defaultManagerInput,
    datum: WarehouseBuilder.toDatumManager(managerDatum),
  };

  emulator.addUTxO(treasuryInput);
  emulator.addUTxO(managerInput);
  skipToCountingPhase({
    t: builder.t,
    e: emulator,
    datum: treasuryDatum,
  });

  let batcher = new WarehouseBatcher(builder);
  await batcher.batching();

  // wait txs from mem-pool going to new block
  emulator.awaitBlock(1);

  let managers = await warehouse.findManagers();
  expect(managers.length).toEqual(0);

  let treasury = await warehouse.findTreasuryInput();
  let treasuryOutDatum = WarehouseBuilder.fromDatumTreasury(treasury.datum!);
  expect(treasuryOutDatum.isManagerCollected).toEqual(true);
});

test("batcher | collect-sellers", async () => {
  let { builder, emulator } = warehouse;
  // IMPORTANT!!! Update LBE End Time
  let treasuryDatum: TreasuryDatum = {
    ...warehouse.defaultTreasuryDatum,
    startTime: BigInt(Date.now() - 3 * 24 * 60 * 60 * 1000),
    endTime: BigInt(Date.now() - 60 * 60 * 1000),
  };
  let treasuryInput = {
    ...warehouse.defaultTreasuryInput,
    datum: WarehouseBuilder.toDatumTreasury(treasuryDatum),
  };
  let managerDatum: ManagerDatum = {
    ...warehouse.defaultManagerDatum,
    sellerCount: BigInt(SELLER_COUNT),
  };
  let managerInput = {
    ...warehouse.defaultManagerInput,
    datum: WarehouseBuilder.toDatumManager(managerDatum),
  };
  let sellerInputs: T.UTxO[] = [];
  for (let i = 0; i < SELLER_COUNT; i++) {
    let utxo: T.UTxO = {
      ...warehouse.defaultSellerInput,
      outputIndex: warehouse.outputIndex++,
    };
    sellerInputs.push(utxo);
  }

  emulator.addUTxO(treasuryInput);
  emulator.addUTxO(managerInput);
  for (let s of sellerInputs) emulator.addUTxO(s);
  skipToCountingPhase({
    t: builder.t,
    e: emulator,
    datum: treasuryDatum,
  });

  let batcher = new WarehouseBatcher(builder);
  await batcher.batching();

  // wait txs from mem-pool going to new block
  emulator.awaitBlock(1);

  // collect all sellers => Seller Address doesn't have any UTxO
  let sellers = await warehouse.findSellers();
  expect(sellers.length).toEqual(0);

  let manager = (await warehouse.findManagers())[0]!;
  expect(WarehouseBuilder.fromDatumManager(manager.datum!).sellerCount).toEqual(
    0n,
  );
});

test("batcher | collect-orders", async () => {
  let { builder, emulator } = warehouse;
  let orderInputs: T.UTxO[] = [];
  let totalReserveRaise = 0n;
  let totalPenalty = 0n;
  for (let i = 0; i < ORDER_COUNT; i++) {
    let utxo: T.UTxO = {
      ...warehouse.defaultOrderInput,
      outputIndex: warehouse.outputIndex++,
    };
    orderInputs.push(utxo);
    totalReserveRaise += warehouse.defaultOrderDatum.amount;
    totalPenalty += warehouse.defaultOrderDatum.penaltyAmount;
  }
  // IMPORTANT!!! Update LBE End Time
  let treasuryDatum: TreasuryDatum = {
    ...warehouse.defaultTreasuryDatum,
    startTime: BigInt(Date.now() - 3 * 24 * 60 * 60 * 1000),
    endTime: BigInt(Date.now() - 60 * 60 * 1000),
    isManagerCollected: true,
    reserveRaise: totalReserveRaise,
    totalPenalty: totalPenalty,
  };
  let treasuryInput = {
    ...warehouse.defaultTreasuryInput,
    datum: WarehouseBuilder.toDatumTreasury(treasuryDatum),
  };

  emulator.addUTxO(treasuryInput);
  for (let s of orderInputs) emulator.addUTxO(s);
  skipToCountingPhase({
    t: builder.t,
    e: emulator,
    datum: treasuryDatum,
  });

  console.log({
    treasuryAddress: builder.treasuryAddress,
    orderAddress: builder.orderAddress,
    walletAddress: await builder.t.wallet.address(),
  });
  let batcher = new WarehouseBatcher(builder);

  await batcher.buildMapLbeUTxO();
  let walletAddress = await builder.t.wallet.address();
  await quickSubmitBuilder(emulator)({
    txBuilder: builder.t
      .newTx()
      .payToAddress(walletAddress, { lovelace: 100_000_000n })
      .payToAddress(walletAddress, { lovelace: 10_000_000n }),
  });
  let seed = (await emulator.getUtxos(walletAddress)).find(
    (u) => u.assets["lovelace"] == 100_000_000n,
  )!;
  let collateral = (await emulator.getUtxos(walletAddress)).find(
    (u) => u.assets["lovelace"] == 10_000_000n,
  )!;

  console.log({ seed, collateral });
  let lbeUTxO: LbeUTxO = Object.values(batcher.mapLbeUTxO)[0];

  let mapInput: CollectOrdersMapInput = {
    seed: [seed],
    treasury: [lbeUTxO.treasury],
    collateral: [collateral],
  };

  let orders = lbeUTxO.orders;
  let txSigned = await batcher.buildCollectOrders(mapInput, { orders });

  // // await batcher.batching();

  // // wait txs from mem-pool going to new block
  // emulator.awaitBlock(1);

  // let treasury = await warehouse.findTreasuryInput();
  // let treasuryOutDatum = WarehouseBuilder.fromDatumTreasury(treasury.datum!);
  // expect(treasuryOutDatum.collectedFund).toEqual(
  //   totalReserveRaise + totalPenalty,
  // );
});

test("alo", async () => {
  let { builder } = warehouse;
  let wallet = builder.t.selectWalletFromSeed(
    "muffin spell cement resemble frame pupil grow gloom hawk wild item hungry polar ice maximum sport economy drop sun timber stone circle army jazz",
  );
});
