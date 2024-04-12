#!/usr/bin/env bash
set -euo pipefail

# IMPORTANT!!!: only support Preprod

echo "Start generate AMM params"
if [ -d "minswap-dex-v2" ]; then
  echo "minswap-dex-v2 directory exists, updating..."
  cd minswap-dex-v2
  git fetch origin develop
  git reset --hard origin/develop
  git show develop:plutus.json > ../amm-plutus.json
  cd ..
else
  echo "minswap-dex-v2 directory does not exist, cloning..."
  git clone --no-checkout --depth 1 -b develop git@github.com:minswap/minswap-dex-v2.git
  cd minswap-dex-v2
  git show develop:plutus.json > ../amm-plutus.json
  cd ..
fi

# echo "Get AMM V2 Parameters"
# if [ -d "monorepo" ]; then
#   echo "Monorepo directory exists, updating..."
#   cd monorepo
#   git fetch origin minswap-v2
#   git reset --hard origin/minswap-v2
#   git show minswap-v2:packages/sdk/scripts/parameters/dex-v2-parameters-testnet.json > ../dex-v2-parameters-testnet.json
#   cd ..
# else
#   echo "Monorepo directory does not exist, cloning..."
#   git clone --no-checkout --depth 1 -b minswap-v2 git@github.com:minswap/monorepo.git
#   cd monorepo
#   git show minswap-v2:packages/sdk/scripts/parameters/dex-v2-parameters-testnet.json > ../dex-v2-parameters-testnet.json
#   cd ..
# fi

bun gen-amm-plutus
bun collect-amm-validators

amm_authen_policy_id=$(jq '.authenValidatorHash' amm-validators.json)
amm_pool_validation_hash=$(jq '.poolValidatorHash' amm-validators.json)
echo $amm_authen_policy_id
echo $amm_pool_validation_hash

# Replace placeholders in utils.ak using sed
sed -i "s/amm_authen_policy_id.*\"/amm_authen_policy_id = #$amm_authen_policy_id/g" lib/lb_v2/utils.ak
sed -i "s/amm_pool_validation_hash.*\"/amm_pool_validation_hash = #$amm_pool_validation_hash/g" lib/lb_v2/utils.ak

# Rebuild Aiken
aiken build

bun gen-plutus
bun init-params
bun collect-validators
