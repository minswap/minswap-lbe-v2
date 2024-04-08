import fs from "fs";
import path from "path";
import type { Script } from "../types";

export type GenerateMinswapParams = ReturnType<typeof generateMinswapParams>;

export function generateMinswapParams() {
  const fileContent = fs.readFileSync(path.resolve("minswap-amm.json"), {
    encoding: "utf-8",
  });
  return JSON.parse(fileContent);
}

export type MinswapValidators = {
  authenValidator: Script;
  factoryValidator: Script;
  poolValidator: Script;
  poolBatchingValidator: Script;
};

export function collectMinswapValidators(): MinswapValidators {
  const fileContent = fs.readFileSync(path.resolve("dex-v2-parameters-testnet.json"), "utf8");
  const params = JSON.parse(fileContent);
  console.log({ params });

  const data = generateMinswapParams();
  const authenValidator: Script = data!.references!.lpRef.scriptRef;
  const factoryValidator: Script = data!.references!.factoryRef.scriptRef;
  const poolValidator: Script = data!.references!.poolRef.scriptRef;
  const poolBatchingValidator: Script =
    data!.references!.poolBatchingRef.scriptRef;

  return {
    authenValidator,
    factoryValidator,
    poolValidator,
    poolBatchingValidator,
  };
}

collectMinswapValidators();