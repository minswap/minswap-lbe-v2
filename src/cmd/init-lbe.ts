import invariant from "@minswap/tiny-invariant";
import * as T from "@minswap/translucent";
import {
  WarehouseBuilder,
  genWarehouseBuilderOptions,
  type BuildInitFactoryOptions,
  type MaestroSupportedNetworks,
} from "..";
import lbeV2Script from "../../lbe-v2-script.json";
import logger from "../logger";

const getParams = () => {
  let network = process.env["NETWORK"];
  let maestroApiKey = process.env["MAESTRO_KEY"];
  let fromSeedPhase = process.env["FROM_SEED_PHASE"];
  let toSeedPhase = process.env["TO_SEED_PHASE"];
  let toAddress = process.env["TO_ADDRESS"];

  invariant(network, "missing network");
  invariant(maestroApiKey, "missing maestroApiKey");
  invariant(fromSeedPhase, "missing fromSeedPhase");
  invariant(toSeedPhase, "missing toSeedPhase");
  invariant(toAddress, "missing toAddress");

  return {
    network: network as MaestroSupportedNetworks,
    maestroApiKey,
    fromSeedPhase,
    toSeedPhase,
    toAddress,
  };
};

const main = async () => {
  logger.info("init-lbe | start");

  await T.loadModule();
  await T.CModuleLoader.load();
  const inputParams = getParams();
  let { network, maestroApiKey, fromSeedPhase, toSeedPhase } = inputParams;
  let maestro = new T.Maestro({ network, apiKey: maestroApiKey });
  let t = await T.Translucent.new(maestro, network);
  t.selectWalletFromSeed(fromSeedPhase);

  const toWallet = T.walletFromSeed(toSeedPhase);

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
  };

  const completedTx = await builder
    .buildInitFactory(options)
    .complete()
    .complete();

  const signedTx = await completedTx
    .sign()
    .signWithPrivateKey(toWallet.paymentKey)
    .complete();
  const txHash = await signedTx.submit();
  logger.info(`init LBE success | txHash: ${txHash}`);
  await t.awaitTx(txHash);

  logger.info("init-lbe | end");
};

main();
