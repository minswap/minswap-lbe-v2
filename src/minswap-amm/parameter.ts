import fs from "fs";
import path from "path";
import { type Script } from "translucent-cardano";

export type GenerateMinswapParams = ReturnType<typeof generateMinswapParams>;

export function generateMinswapParams() {
  const fileContent = fs.readFileSync(path.resolve("minswap-amm.json"), {
    encoding: "utf-8",
  });
  return JSON.parse(fileContent);
}

export type MinswapValidators = ReturnType<typeof collectMinswapValidators>;

export function collectMinswapValidators() {
  const data = generateMinswapParams();
  const authenValidator: Script = data!.references!.lpRef.scriptRef;
  const factoryValidator: Script = data!.references!.factoryRef.scriptRef;
  const poolValidator: Script = data!.references!.poolRef.scriptRef;

  return {
    authenValidator,
    factoryValidator,
    poolValidator,
  }
}
