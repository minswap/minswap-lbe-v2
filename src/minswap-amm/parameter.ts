import fs from "fs";
import path from "path";
import * as T from "@minswap/translucent";
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

export type GenerateMinswapAmmParams = ReturnType<
  typeof generateMinswapAmmParams
>;

export function generateMinswapAmmParams(t: Translucent) {
  const fileContent = fs.readFileSync(
    path.resolve("dex-v2-parameters-testnet.json"),
    "utf8",
  );
  const ammParams = JSON.parse(fileContent);
  const validators = collectMinswapValidators();
  const factoryAddress = t.utils.validatorToAddress(
    validators.factoryValidator,
  );
  const authenPolicyId = t.utils.validatorToScriptHash(
    validators.authenValidator,
  );
  const poolBatchingScriptHash = t.utils.validatorToScriptHash(
    validators.poolBatchingValidator,
  );
  const factoryAuthAsset = {
    policyId: authenPolicyId,
    tokenName: T.fromText(ammParams.factoryNFTName),
  };
  const poolAuthAssetName = T.fromText(ammParams.poolNFTName);
  const factoryAuthAssetName = T.fromText(ammParams.factoryNFTName);
  const poolEnterpriseAddress = t.utils.validatorToAddress(
    validators.poolValidator,
  );

  return {
    factoryAddress,
    factoryAuthAsset,
    authenPolicyId,
    validators,
    poolAuthAssetName,
    factoryAuthAssetName,
    poolBatchingScriptHash,
    poolEnterpriseAddress,
  };
}

export function collectMinswapValidators(): MinswapValidators {
  const fileContent = fs.readFileSync(
    path.resolve("amm-validators.json"),
    "utf8",
  );
  const data = JSON.parse(fileContent);
  const authenValidator: Script = data.validators.authenValidator;
  const factoryValidator: Script = data.validators.factoryValidator;
  const poolValidator: Script = data.validators.poolValidator;
  const poolBatchingValidator: Script = data.validators.poolBatchingValidator;

  return {
    authenValidator,
    factoryValidator,
    poolValidator,
    poolBatchingValidator,
  };
}

export type GenerateMinswapValidators = ReturnType<
  typeof generateMinswapValidators
>;
export function generateMinswapValidators({ t, dry }: { t: Translucent, dry: boolean }) {
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
  const authenValidatorHash = t.utils.validatorToScriptHash(authenValidator);
  const poolValidator = new PoolValidatorValidatePool(authenValidatorHash);
  const poolValidatorHash = t.utils.validatorToScriptHash(poolValidator);
  const poolBatchingValidator = new PoolValidatorValidatePoolBatching(
    authenValidatorHash,
    {
      ScriptCredential: [poolValidatorHash],
    },
  );
  const poolBatchingHash = t.utils.validatorToScriptHash(poolBatchingValidator);
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
  if (!dry) {
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
  return data;
}
