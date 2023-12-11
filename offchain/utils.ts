import { C, SpendingValidator, fromHex, toHex } from "https://deno.land/x/lucid@0.10.7/mod.ts";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";

async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON
    .parse(await Deno.readTextFile("../plutus.json"))
    .validators[0];

  return {
    type: "PlutusV2",
    script: toHex(cbor.encode(fromHex(validator.compiledCode))),
  };
}

export function applyParamsToScript(params: C.PlutusList, script: string): string {
  const plutusScript = C.apply_params_to_plutus_script(
    params,
    CSL.PlutusScript.from_bytes(applyDoubleCborEncoding(script).bytes),
  );
  return new Bytes(plutusScript.to_bytes());
}
