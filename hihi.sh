#!/usr/bin/env bash
set -euo pipefail
aiken build
cp ./plutus.json /home/tintin/minswap/monorepo/packages/sdk/scripts/plutus-scripts/lbe-v2-plutus-script.json
cd /home/tintin/minswap/monorepo
ts-node packages/sdk/scripts/build-lbe-v2-scripts.ts
cd /home/tintin/minswap/monorepo/packages/sdk
npx jest src/test/lbe.test.ts
echo "done! Good Job!"
