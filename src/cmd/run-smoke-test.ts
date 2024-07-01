import * as T from "@minswap/translucent";
import { type Assets, type MaestroSupportedNetworks } from "..";
import { WarehouseBatcher } from "../batching/warehouse-batcher";
import { WarehouseBuilder, genWarehouseBuilderOptions } from "../build-tx";
import logger from "../logger";

const seed =
  "muffin spell cement resemble frame pupil grow gloom hawk wild item hungry polar ice maximum sport economy drop sun timber stone circle army jazz";

/**
* 1. Mint Token
* 2. Create LBE
* 3. Deposit some orders
* 4. Do Counting
* 5. Create Pool
* 6. Redeems
*/
const happyCase = async (batcher: WarehouseBatcher) => {
  const C = T.CModuleLoader.get;
  let trans = batcher.builder.t;
  const addressDetails = T.getAddressDetails(await trans.wallet.address());
  const hash = addressDetails.paymentCredential!.hash;
  console.log({ hash });
  const keyHash = C.Ed25519KeyHash.from_hex(hash);
  const scriptPubKey = C.ScriptPubkey.new(keyHash);
  const nativeScript = C.NativeScript.new_script_pubkey(scriptPubKey);
  const policyId = nativeScript.hash().to_hex();
  const assets: Assets = {
    [`${policyId}68656865`]: 1_000_000_000n,
  };
  const completeTx = await trans.newTx().mintAssets(assets).complete();
  const signedTx = await completeTx.sign().complete();
  const txHash = await signedTx.submit();
  console.log({ txHash });
}


const main = async () => {
  logger.info("run-smoke-test | start");
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

  await happyCase(batcher);
  logger.info("run-smoke-test | end");
};

main();


