import {
  applyParamsToScript,
  fromHex,
  fromText,
  Lucid,
  MintingPolicy,
  ScriptType,
  SpendingValidator,
  toHex,
  Utils,
} from "https://deno.land/x/lucid@0.10.7/mod.ts";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";
import {
  FACTORY_AUTH_ASSET_NAME,
  TREASURY_AUTH_ASSET_NAME,
} from "./constants.ts";
import { outRefToPlutusData } from "./converter.ts";

async function readValidator(
  validatorName: string,
): Promise<SpendingValidator> {
  const validator = JSON
    .parse(await Deno.readTextFile("../plutus.json"))
    .validators
    .find((v: { title: string }) => v.title === validatorName);
  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}

async function build_authen_minting_policy(txInput: string) {
  const lucid = await Lucid.new(undefined, "Preprod");
  const lucidUtils = new Utils(lucid);

  const [txId, txIndex] = txInput.split("#");
  const validator = await readValidator(
    "authen_minting_policy.validate_authen",
  );
  const params = [
    outRefToPlutusData({ txId: txId, index: BigInt(txIndex) }),
    fromText(FACTORY_AUTH_ASSET_NAME),
    fromText(TREASURY_AUTH_ASSET_NAME),
  ];
  const authenValidator: MintingPolicy = {
    type: "PlutusV2" as ScriptType,
    script: applyParamsToScript(validator.script, params),
  };
  console.log(authenValidator);
  console.log();
  const authenMintingPolicyId = lucidUtils.validatorToScriptHash(
    authenValidator,
  );
  console.log(authenMintingPolicyId);
}

async function main() {
  await build_authen_minting_policy(
    "6a629bfb6786e1af8d47259ba933b71641e287ccbbed464ea86f09e1b9c4412a#0",
  );
}

void main();
