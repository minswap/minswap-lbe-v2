import * as T from "@minswap/translucent";
import {
  generateMinswapValidators,
} from "./minswap-amm";
import { collectValidators } from "./utils";
import * as fs from "fs";
import type { Network, OutRef, Provider, Translucent, UTxO } from "./types";
import path from "path";

let lucid: Translucent;
let seedUtxo: UTxO;
let provider: Provider;
let network: Network;

type Action = "init-params" | "collect-validators" | "deploy-scripts" | "collect-amm-validators";

const load = async () => {
  await T.loadModule();
  await T.CModuleLoader.load();

  network = "Preprod";
  provider = new T.Maestro({
    network,
    apiKey: "7TEJmbeCv6zlzJhGAdSoDI8xb5Kgk7lg",
  });
  lucid = await T.Translucent.new(provider, network);
  lucid.selectWalletFromSeed(
    "corn hollow run team clip abuse grant trick opinion idle egg federal risk cover giant erase recall rude deal survey moon now exhibit regular",
  );
};

const initParams = async () => {
  const seedAddress = await lucid.wallet.address();
  console.debug({ seedAddress });
  seedUtxo = (await lucid.utxosAt(seedAddress))[0];
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
  const fileContent = fs.readFileSync(path.resolve("params.json"), {
    encoding: "utf-8",
  });
  const { seedOutRef } = JSON.parse(fileContent);
  const validators = collectValidators(lucid, seedOutRef);
  const jsonData = JSON.stringify(validators, null, 2);
  fs.writeFile("validators.json", jsonData, "utf8", (err) => {
    if (err) {
      console.error("Error writing JSON file:", err);
      return;
    }
    console.log("validators.json file has been saved.");
  });
};

const collectAmm = () => {
  generateMinswapValidators(lucid);
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

  // const seedAddress = await lucid.wallet.address();
  // console.log("seed Address: ", seedAddress);
  // seedUtxo = (await lucid.utxosAt(seedAddress))[0];
  // validators = collectValidators(lucid, utxo2ORef(seedUtxo));

  // console.log(
  //   "authenValidator",
  //   lucid.utils.validatorToAddress(validators.authenValidator),
  // );
  // console.log(
  //   "treasuryValidator",
  //   lucid.utils.validatorToAddress(validators.treasuryValidator),
  // );
  // console.log(
  //   "orderValidator",
  //   lucid.utils.validatorToAddress(validators.orderValidator),
  // );
  // console.log(
  //   "orderSpendingValidator",
  //   lucid.utils.validatorToAddress(validators.orderSpendingValidator),
  // );
  // console.log(
  //   "factoryValidator",
  //   lucid.utils.validatorToAddress(validators.factoryValidator),
  // );

  // deployedValidators = await deployValidators(lucid, validators);
  // console.log("deploy validators success");

  // // registerStake
  // await quickSubmit(lucid)({
  //   txBuilder: lucid
  //     .newTx()
  //     .registerStake(
  //       lucid.utils.validatorToRewardAddress(validators.orderSpendingValidator),
  //     ),
  // });
  // console.info("Register Order Order Spending Validator");

  // const initFactoryBuilder = buildInitFactory({
  //   lucid,
  //   tx: lucid.newTx(),
  //   validatorRefs: {
  //     validators,
  //     deployedValidators,
  //   },
  //   seedUtxo,
  // });
  // const initFactoryTxHash = await quickSubmit(lucid)({
  //   txBuilder: initFactoryBuilder.txBuilder,
  // });
  // console.info("Init Factory done");

  // const data = {
  //   authenValidator: validators.authenValidator,
  //   treasuryValidator: validators.treasuryValidator,
  //   orderSpendingValidator: validators.orderSpendingValidator,
  //   orderValidator: validators.orderValidator,
  //   factoryValidator: validators.factoryValidator,
  //   orderValidatorFeedType: validators.orderValidatorFeedType,
  //   initFactoryTxHash,
  // };

  // const jsonData = JSON.stringify(data, null, 2);
  // fs.writeFile("lbe.json", jsonData, "utf8", (err) => {
  //   if (err) {
  //     console.error("Error writing JSON file:", err);
  //     return;
  //   }
  //   console.log("JSON file has been saved.");
  // });
}

main();
