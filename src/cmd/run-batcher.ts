import * as T from "@minswap/translucent";
import { type MaestroSupportedNetworks } from "..";
import { WarehouseBatcher } from "../batching/warehouse-batcher";
import { WarehouseBuilder, genWarehouseBuilderOptions } from "../build-tx";
import logger from "../logger";

let seed =
  "muffin spell cement resemble frame pupil grow gloom hawk wild item hungry polar ice maximum sport economy drop sun timber stone circle army jazz";

let main = async () => {
  logger.info("run-batcher | start");
  await T.loadModule();
  await T.CModuleLoader.load();
  let network: MaestroSupportedNetworks = "Preprod";
  let maestroApiKey = "E0n5jUy4j40nhKCuB7LrYabTNieG0egu";
  let maestro = new T.Maestro({ network, apiKey: maestroApiKey });
  let t = await T.Translucent.new(maestro, network);
  t.selectWalletFromSeed(seed);

  let warehouseOptions = genWarehouseBuilderOptions(t);
  let builder = new WarehouseBuilder(warehouseOptions);
  let batcher = new WarehouseBatcher(builder);
  await batcher.batching();
  logger.info("run-batcher | end");
};

main();
