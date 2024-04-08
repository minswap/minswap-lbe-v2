#!/usr/bin/env bash
set -euo pipefail

# IMPORTANT!!!: only support Preprod

echo "Start generate AMM params"

echo "Sync Minswap Dex V2 Contract"
git submodule update --remote

echo "Get AMM V2 Parameters"
if [ -d "monorepo" ]; then
  echo "Monorepo directory exists, updating..."
  cd monorepo
  git fetch origin minswap-v2
  git reset --hard origin/minswap-v2
  git show minswap-v2:packages/sdk/scripts/parameters/dex-v2-parameters-testnet.json > ../dex-v2-parameters-testnet.json
  cd ..
else
  echo "Monorepo directory does not exist, cloning..."
  git clone --no-checkout --depth 1 -b minswap-v2 git@github.com:minswap/monorepo.git
  cd monorepo
  git show minswap-v2:packages/sdk/scripts/parameters/dex-v2-parameters-testnet.json > ../dex-v2-parameters-testnet.json
  cd ..
fi

# network=$1

cd minswap-dex-v2

echo "Install dependency"
bun install --no-save

echo "Write to file gen-lbe-params"
cat >src/gen-lbe-params.ts <<EOF
import fs from "fs";
import { Lucid } from "lucid-cardano";

import { EmulatorProvider } from "./provider";
import { getContractScripts } from "./script";

async function main(): Promise<void> {
  const lucid = await Lucid.new(new EmulatorProvider(), "Preprod");
  let scripts = getContractScripts(lucid);
  const poolAddress = scripts.poolAddress;
  const data = {
    "poolHash": lucid.utils.getAddressDetails(poolAddress).paymentCredential!.hash,
    ...scripts,
  };
  const jsonData = JSON.stringify(data, null, 2);
  fs.writeFile('minswap-amm.json', jsonData, 'utf8', (err) => {
    if (err) {
      console.error('Error writing JSON file:', err);
      return;
    }
    console.log('JSON file has been saved.');
  });
}
void main();
EOF

echo "Gen minswap-amm.json"
bun run src/gen-lbe-params.ts
mv minswap-amm.json ../.
rm src/gen-lbe-params.ts

echo "Gen plutus.ts"
cp ../blueprint.ts .
bun run blueprint.ts
mv plutus.ts ../src/minswap-amm/.
rm blueprint.ts

cd ..
bun run prettier -w src/minswap-amm/plutus.ts

echo "Finish generate AMM params"