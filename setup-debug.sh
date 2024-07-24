#!/usr/bin/env sh

set -eu

echo "build validator -t verbose"
aiken build -t verbose

echo "re-run gen plutus"
bun gen-plutus

echo "clean script file"
echo "{}" > lbe-v2-script.json

echo "run run-debug-set-up.ts"
bun run src/cmd/run-debug-set-up.ts

echo "copy to monorepo"
cp lbe-v2-script.json /home/tintin/minswap/monorepo/packages/sdk/src/lbe-v2/scripts/testnet/.
