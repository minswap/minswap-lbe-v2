import * as T from "@minswap/translucent";
import { Api, WarehouseBuilder } from "..";
import logger from "../logger";

const seed =
  "vocal shock limit you spell damp buzz jazz magnet poet toe lunar crater reject elite alien tornado noodle control race proof pull favorite brief";

let main = async () => {
  logger.info(`START`);
  await T.loadModule();
  await T.CModuleLoader.load();
  let api = await Api.newBySeed(seed);
  const treasuries = await api.getLbes();
  for (const treasury of treasuries) {
    const treasuryDatum = WarehouseBuilder.fromDatumTreasury(treasury.datum);
    // SKIP when LBE is cancelled or LBE is success and created Pool
    if (treasuryDatum.isCancelled || treasuryDatum.totalLiquidity > 0n)
      continue;
    try {
      await api.checkPoolExist(treasuryDatum);
    } catch (err) {
      const tx = await api.cancelByPoolExist(treasuryDatum);
      const txHash = await api.signAndSubmit(tx);
      logger.info(`cancel by pool exist: ${txHash}`);
      await api.builder.t.awaitTx(txHash);
      logger.info(`wait done!`);
    }
  }
  logger.info(`FINISH`);
};

main();
