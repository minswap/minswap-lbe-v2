import * as T from "@minswap/translucent";
import { generateMinswapValidators } from "./minswap-amm";
import * as fs from "fs";
import type { Network, OutRef, Provider, Translucent, UTxO } from "./types";
import path from "path";
import { collectValidators } from ".";

let t: Translucent;
let seedUtxo: UTxO;
let provider: Provider;
let network: Network;

type Action =
  | "init-params"
  | "collect-validators"
  | "deploy-scripts"
  | "collect-amm-validators";

const load = async () => {
  await T.loadModule();
  await T.CModuleLoader.load();

  network = "Preprod";
  provider = new T.Maestro({
    network,
    apiKey: "7TEJmbeCv6zlzJhGAdSoDI8xb5Kgk7lg",
  });
  t = await T.Translucent.new(provider, network);
  t.selectWalletFromSeed(
    "corn hollow run team clip abuse grant trick opinion idle egg federal risk cover giant erase recall rude deal survey moon now exhibit regular",
  );
};

const initParams = async () => {
  const seedAddress = await t.wallet.address();
  console.debug({ seedAddress });
  seedUtxo = (await t.utxosAt(seedAddress))[0];
  const seedOutRef: OutRef = {
    txHash: seedUtxo.txHash,
    outputIndex: seedUtxo.outputIndex,
  };
  console.debug({ seedOutRef });
  const jsonData = JSON.stringify({ seedOutRef }, null, 2);
  fs.writeFile("params.json", jsonData, "utf8", (err) => {
    if (err) {
      console.error("Error writing JSON file:", err);
      return;
    }
    console.log("params.json file has been saved.");
  });
};

const collect = () => {
  collectValidators({ t, dry: false });
};

const collectAmm = () => {
  generateMinswapValidators(t, true);
};

async function main() {
  await load();

  const action: Action = process.argv[2] as Action;
  const mapAction = {
    "init-params": initParams,
    "deploy-scripts": undefined,
    "collect-amm-validators": collectAmm,
    "collect-validators": collect,
  };
  if (!mapAction[action]) {
    throw new Error("find correct action bro!");
  }
  await mapAction[action]!();
}

main();
