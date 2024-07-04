import * as T from "@minswap/translucent";
import { type MaestroSupportedNetworks } from "..";
import { WarehouseBatcher } from "../batching/warehouse-batcher";
import { WarehouseBuilder, genWarehouseBuilderOptions } from "../build-tx";
import logger from "../logger";

const seed =
  "vocal shock limit you spell damp buzz jazz magnet poet toe lunar crater reject elite alien tornado noodle control race proof pull favorite brief";

const main = async () => {
  logger.info("run-batcher | start");
  await T.loadModule();
  await T.CModuleLoader.load();
  const network: MaestroSupportedNetworks = "Preprod";
  const maestroApiKey = "E0n5jUy4j40nhKCuB7LrYabTNieG0egu";
  const maestro = new T.Maestro({ network, apiKey: maestroApiKey });
  const t = await T.Translucent.new(maestro, network);
  t.selectWalletFromSeed(seed);

  const warehouseOptions = genWarehouseBuilderOptions(t);
  const builder = new WarehouseBuilder(warehouseOptions);
  const batcher = new WarehouseBatcher(builder);
  await batcher.batching();

  // const poolBatcher = new WarehouseBatcher(
  //   new WarehouseBuilder(warehouseOptions),
  // );
  // await poolBatcher.poolBatching();

  logger.info("run-batcher | end");
};

main();
