import * as T from "@minswap/translucent";
import { FactoryValidateFactoryMinting } from "../../plutus";
import { WarehouseBuilder } from "../build-tx";
import { LBE_INIT_FACTORY_HEAD, LBE_INIT_FACTORY_TAIL } from "../constants";
import type { FactoryDatum, ProtocolParameters } from "../types";
import { toUnit } from "../utils";
import {
  DUMMY_SEED_UTXO,
  assertValidator,
  assertValidatorFail,
  genWarehouseOptions,
  generateAccount,
  loadModule,
} from "./utils";

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
    [toUnit(baseAsset.policyId, baseAsset.assetName)]: 69_000_000_000_000n,
  });
  let protocolParameters: ProtocolParameters = {
    ...T.PROTOCOL_PARAMETERS_DEFAULT,
    maxTxSize: 36384,
  };
  const emulator = new T.Emulator([ACCOUNT_0], protocolParameters);
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

test("init-factory | PASS | happy case", async () => {
  const { warehouseOptions } = warehouse;
  let builder = new WarehouseBuilder(warehouseOptions);
  builder.buildInitFactory({ seedUtxo: DUMMY_SEED_UTXO });
  const tx = builder.complete();
  await tx.complete();
});

test("init-factory | FAIL | absent @out_ref", async () => {
  const { warehouseOptions } = warehouse;
  let builder = new WarehouseBuilder(warehouseOptions);
  builder.buildInitFactory({ seedUtxo: DUMMY_SEED_UTXO });
  builder.tasks = [builder.tasks[0], ...builder.tasks.slice(2)];
  // Must spend @out_ref
  assertValidatorFail(builder);
});

test("init-factory | FAIL | mint redundant Factory Token", async () => {
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
  // Must mint 1 Factory Token
  assertValidatorFail(builder);
});

test("init-factory | FAIL | missing Factory Token", async () => {
  const { warehouseOptions } = warehouse;
  let builder = new WarehouseBuilder(warehouseOptions);
  builder.buildInitFactory({ seedUtxo: DUMMY_SEED_UTXO });
  builder.tasks.pop();
  builder.tasks.push(() => {
    const factoryDatum: FactoryDatum = {
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
  assertValidatorFail(builder);
});

test("init-factory | FAIL | Factory Datum is not correct", async () => {
  const { warehouseOptions } = warehouse;
  let builder = new WarehouseBuilder(warehouseOptions);
  builder.buildInitFactory({ seedUtxo: DUMMY_SEED_UTXO });
  builder.tasks.pop();
  builder.tasks.push(() => {
    const factoryDatum: FactoryDatum = {
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
  // Factory Datum must be correct!
  assertValidatorFail(builder);
});
