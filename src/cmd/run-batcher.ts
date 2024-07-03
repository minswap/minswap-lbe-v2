import * as T from "@minswap/translucent";
import { type MaestroSupportedNetworks } from "..";
import { WarehouseBatcher } from "../batching/warehouse-batcher";
import { WarehouseBuilder, genWarehouseBuilderOptions } from "../build-tx";
import logger from "../logger";

const seed =
  "muffin spell cement resemble frame pupil grow gloom hawk wild item hungry polar ice maximum sport economy drop sun timber stone circle army jazz";

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
  // const builder = new WarehouseBuilder(warehouseOptions);
  // const batcher = new WarehouseBatcher(builder);

  const poolBatcher = new WarehouseBatcher(
    new WarehouseBuilder(warehouseOptions),
  );

  await poolBatcher.poolBatching();
  // await Promise.allSettled([batcher.batching(), poolBatcher.poolBatching()]);
  logger.info("run-batcher | end");
};

main();
