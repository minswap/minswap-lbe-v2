import {
  FactoryValidateFactory,
  FactoryValidateFactoryMinting,
} from "../../plutus";
import { WarehouseBuilder } from "../build-tx";
import { LBE_INIT_FACTORY_HEAD, LBE_INIT_FACTORY_TAIL } from "../constants";
import {
  DUMMY_SEED_UTXO,
  genWarehouseOptions,
  generateAccount,
  loadModule,
} from "./utils";
import * as T from "@minswap/translucent";

let warehouse: any;

beforeAll(async () => {
  await loadModule();
});

beforeEach(async () => {
  const baseAsset = {
    policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
    assetName: "4d494e",
  };
  const ACCOUNT_0 = await generateAccount({
    lovelace: 2000000000000000000n,
    [T.toUnit(baseAsset.policyId, baseAsset.assetName)]: 69_000_000_000_000n,
  });
  const emulator = new T.Emulator([ACCOUNT_0]);
  let t = await T.Translucent.new(emulator);
  emulator.awaitBlock(10_000); // For validity ranges to be valid
  t.selectWalletFromPrivateKey(ACCOUNT_0.privateKey);
  const warehouseOptions = await genWarehouseOptions(t);

  warehouse = {
    baseAsset,
    warehouseOptions,
    t,
  };
});

test("happy case", async () => {
  const { warehouseOptions } = warehouse;
  let builder = new WarehouseBuilder(warehouseOptions);
  builder.buildInitFactory({ seedUtxo: DUMMY_SEED_UTXO });
  const tx = builder.complete();
  await tx.complete();
});

test("absent @out_ref", async () => {
  const { warehouseOptions } = warehouse;
  let builder = new WarehouseBuilder(warehouseOptions);
  builder.buildInitFactory({ seedUtxo: DUMMY_SEED_UTXO });
  builder.tasks = [builder.tasks[0], ...builder.tasks.slice(2)];
  const tx = builder.complete();
  let errMessage = "";
  try {
    await tx.complete();
  } catch (err) {
    if (typeof err == "string") errMessage = err;
  }
  expect(errMessage).toContain("Must spend @out_ref");
});

test("mint redundant Factory Token", async () => {
  const { warehouseOptions } = warehouse;
  let builder = new WarehouseBuilder(warehouseOptions);
  builder.buildInitFactory({ seedUtxo: DUMMY_SEED_UTXO });
  builder.tasks = [...builder.tasks.slice(0, 2), ...builder.tasks.slice(3)];
  builder.tasks.push(() => {
    builder.tx
      .readFrom([builder.deployedValidators["factoryValidator"]])
      .mintAssets(
        {
          [builder.factoryToken]: 2n,
        },
        T.Data.to("Initialization", FactoryValidateFactoryMinting.redeemer),
      );
  });
  const tx = builder.complete();
  let errMessage = "";
  try {
    await tx.complete();
  } catch (err) {
    if (typeof err == "string") errMessage = err;
  }
  expect(errMessage).toContain("Must mint 1 Factory Token");
});

test("missing Factory Token", async () => {
  const { warehouseOptions } = warehouse;
  let builder = new WarehouseBuilder(warehouseOptions);
  builder.buildInitFactory({ seedUtxo: DUMMY_SEED_UTXO });
  builder.tasks.pop();
  builder.tasks.push(() => {
    const factoryDatum: FactoryValidateFactory["datum"] = {
      head: LBE_INIT_FACTORY_HEAD,
      tail: LBE_INIT_FACTORY_TAIL,
    };
    builder.tx.payToAddressWithData(
      builder.factoryAddress,
      {
        inline: builder.toDatumFactory(factoryDatum),
      },
      {
        lovelace: 2_000_000n,
      },
    );
  });
  const tx = builder.complete();
  let errMessage = "";
  try {
    await tx.complete();
  } catch (err) {
    if (typeof err == "string") errMessage = err;
  }
  expect(errMessage).toContain("Factory Output must contain 1 Factory Token");
});

test("missing Factory Token", async () => {
  const { warehouseOptions } = warehouse;
  let builder = new WarehouseBuilder(warehouseOptions);
  builder.buildInitFactory({ seedUtxo: DUMMY_SEED_UTXO });
  builder.tasks.pop();
  builder.tasks.push(() => {
    const factoryDatum: FactoryValidateFactory["datum"] = {
      head: LBE_INIT_FACTORY_HEAD,
      tail: LBE_INIT_FACTORY_TAIL,
    };
    builder.tx.payToAddressWithData(
      builder.factoryAddress,
      {
        inline: builder.toDatumFactory(factoryDatum),
      },
      {
        lovelace: 2_000_000n,
      },
    );
  });
  const tx = builder.complete();
  let errMessage = "";
  try {
    await tx.complete();
  } catch (err) {
    if (typeof err == "string") errMessage = err;
  }
  expect(errMessage).toContain("Factory Output must contain 1 Factory Token");
});

test("Factory Datum is not correct", async () => {
  const { warehouseOptions } = warehouse;
  let builder = new WarehouseBuilder(warehouseOptions);
  builder.buildInitFactory({ seedUtxo: DUMMY_SEED_UTXO });
  builder.tasks.pop();
  builder.tasks.push(() => {
    const factoryDatum: FactoryValidateFactory["datum"] = {
      head: LBE_INIT_FACTORY_HEAD,
      tail: LBE_INIT_FACTORY_HEAD, // wrong here
    };
    builder.tx.payToAddressWithData(
      builder.factoryAddress,
      {
        inline: builder.toDatumFactory(factoryDatum),
      },
      {
        [builder.factoryToken]: 1n,
      },
    );
  });
  const tx = builder.complete();
  let errMessage = "";
  try {
    await tx.complete();
  } catch (err) {
    if (typeof err == "string") errMessage = err;
  }
  expect(errMessage).toContain("Factory Datum must be correct!");
});
