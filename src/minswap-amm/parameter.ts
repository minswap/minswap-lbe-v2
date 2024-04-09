import fs from "fs";
import path from "path";
import type { Script, Translucent } from "../types";
import {
  AuthenMintingPolicyValidateAuthen,
  FactoryValidatorValidateFactory,
  PoolValidatorValidatePool,
  PoolValidatorValidatePoolBatching,
} from "./plutus";

export type MinswapValidators = {
  authenValidator: Script;
  factoryValidator: Script;
  poolValidator: Script;
  poolBatchingValidator: Script;
};

export function collectMinswapValidators(): MinswapValidators {
  const fileContent = fs.readFileSync(
    path.resolve("amm-validators.json"),
    "utf8",
  );
  const data = JSON.parse(fileContent);
  const authenValidator: Script = data.validators.authenValidator;
  const factoryValidator: Script = data.validators.factoryValidator;
  const poolValidator: Script = data.validator.poolValidator;
  const poolBatchingValidator: Script = data.validator.poolBatchingValidator;

  return {
    authenValidator,
    factoryValidator,
    poolValidator,
    poolBatchingValidator,
  };
}

export function generateMinswapValidators(lucid: Translucent) {
  const fileContent = fs.readFileSync(
    path.resolve("dex-v2-parameters-testnet.json"),
    "utf8",
  );
  const params = JSON.parse(fileContent);
  const [txHash, outputIndex] = params.seedTxIn.split("#");

  const authenValidator = new AuthenMintingPolicyValidateAuthen({
    transactionId: { hash: txHash },
    outputIndex: BigInt(outputIndex),
  });
  const authenValidatorHash =
    lucid.utils.validatorToScriptHash(authenValidator);
  const poolValidator = new PoolValidatorValidatePool(authenValidatorHash);
  const poolValidatorHash = lucid.utils.validatorToScriptHash(poolValidator);
  const poolBatchingValidator = new PoolValidatorValidatePoolBatching(
    authenValidatorHash,
    { ScriptCredential: [poolValidatorHash] },
  );
  const poolBatchingHash = lucid.utils.validatorToScriptHash(
    poolBatchingValidator,
  );
  const factoryValidator = new FactoryValidatorValidateFactory(
    authenValidatorHash,
    poolValidatorHash,
    {
      Inline: [{ ScriptCredential: [poolBatchingHash] }],
    },
  );

  const data = {
    authenValidatorHash,
    poolValidatorHash,
    validators: {
      authenValidator,
      factoryValidator,
      poolValidator,
      poolBatchingValidator,
    },
  };
  fs.writeFile(
    path.resolve("amm-validators.json"),
    JSON.stringify(data, null, 2),
    "utf8",
    (err) => {
      if (err) {
        console.error("Error writing JSON file:", err);
        return;
      }
      console.log("amm-validators.json file has been saved.");
    },
  );
}

// const fn = async () => {
//   await T.loadModule();
//   const emulator = new T.Emulator([]);
//   const lucid = await T.Translucent.new(emulator);
//   collectMinswapValidators(lucid);
// }
// fn();
