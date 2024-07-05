import * as T from "@minswap/translucent";
import { type BluePrintAsset, type MaestroSupportedNetworks } from "..";
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
  let lbeId:
    | { baseAsset: BluePrintAsset; raiseAsset: BluePrintAsset }
    | undefined = undefined;
  lbeId = {
    baseAsset: {
      policyId: "7b7ac17b920be487849b4a7e75d455bb5e55aeacd9372bf904b6656c",
      assetName: "544f4e592d544553542d31373139393039363635303332",
    },
    raiseAsset: {
      policyId: "",
      assetName: "",
    },
  };
  await batcher.batching(lbeId);

  // const poolBatcher = new WarehouseBatcher(
  //   new WarehouseBuilder(warehouseOptions),
  // );
  // await poolBatcher.poolBatching();

  logger.info("run-batcher | end");
};

main();
