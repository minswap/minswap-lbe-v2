import invariant from "@minswap/tiny-invariant";
import * as T from "@minswap/translucent";
import {
  DUMMY_REDEEMER,
  WarehouseBuilder,
  genWarehouseBuilderOptions,
  type BuildInitFactoryOptions,
  type MaestroSupportedNetworks,
} from "..";
import lbeV2Script from "../../lbe-v2-script.json";
import logger from "../logger";
import { AlwaysSuccessSpend } from "../../amm-plutus";

const main = async () => {
  logger.info("init-lbe | start");
  await T.loadModule();
  const network: MaestroSupportedNetworks = "Preprod";
  await T.CModuleLoader.load();
  const maestroApiKey = "E0n5jUy4j40nhKCuB7LrYabTNieG0egu";
  const maestro = new T.Maestro({ network, apiKey: maestroApiKey });
  const t = await T.Translucent.new(maestro, network);
  t.selectWalletFromSeed(
    "muffin spell cement resemble frame pupil grow gloom hawk wild item hungry polar ice maximum sport economy drop sun timber stone circle army jazz",
  );
  const secretNumber = parseInt(process.argv[2]);
  invariant(secretNumber, "not found secret Number");
  const C = T.CModuleLoader.get;
  const plutusData = C.PlutusData.new_integer(
    C.BigInt.from_str(secretNumber.toString()),
  );
  const datum = T.toHex(plutusData.to_bytes());

  const warehouseOptions = genWarehouseBuilderOptions(t);
  const builder = new WarehouseBuilder(warehouseOptions);

  logger.info("waiting Reference Script deploy");
  await Promise.all([
    t.awaitTx(lbeV2Script.factoryOutRef.txHash),
    t.awaitTx(lbeV2Script.treasuryOutRef.txHash),
    t.awaitTx(lbeV2Script.managerOutRef.txHash),
    t.awaitTx(lbeV2Script.sellerOutRef.txHash),
    t.awaitTx(lbeV2Script.orderOutRef.txHash),
  ]);
  logger.info("wait done");

  const seedUtxo = (await builder.t.utxosByOutRef([lbeV2Script.seedOutRef]))[0];
  const options: BuildInitFactoryOptions = {
    seedUtxo,
    skipCollect: true,
  };

  const completedTx = await builder
    .buildInitFactory(options)
    .complete()
    .attachSpendingValidator(new AlwaysSuccessSpend())
    .unlockWithDatumHash(seedUtxo, datum, DUMMY_REDEEMER)
    .complete({ witnessSet: { ignoreScriptDataHash: true } });

  const signedTx = await completedTx.sign().complete();
  const txHash = await signedTx.submit();
  logger.info(`init LBE success | txHash: ${txHash}`);
  await t.awaitTx(txHash);

  logger.info("init-lbe | end");
};

main();
