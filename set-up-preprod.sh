#!/usr/bin/env sh

set -eu

echo "clean script file"
echo "{}" > lbe-v2-script.json

echo "link preprod-env file"
ln -sf preprod.env .env

echo "run setup testnet"
bun run src/cmd/set-up.ts

echo "run init factory"
bun run src/cmd/init-lbe.ts
