import {
  Data,
  Translucent,
  toUnit,
  type Tx,
  type UTxO,
} from "translucent-cardano";
import type { MinswapValidators } from ".";
import {
  computeLPAssetName,
  validatorHash2StakeCredential,
  type DeployedValidators,
} from "../utils";
import {
  AuthenMintingPolicyValidateAuthen,
  FactoryValidatorValidateFactory,
  PoolValidatorValidatePool,
} from "./plutus";
import { calculateInitialLiquidity } from "./utils";

// The amount of liquidity that will be locked in pool when creating pools
export const DEX_V2_DEFAULT_POOL_ADA = 3_000_000n;
export const DEX_V2_MAX_LIQUIDITY = 9_223_372_036_854_775_807n;
export const MINIMUM_LIQUIDITY = 10n;

export type BuildCreatePoolOptions = {
  lucid: Translucent;
  tx: Tx;
  minswapValidators: MinswapValidators;
  minswapDeployedValidators: DeployedValidators;
  factoryUTxO: UTxO;
  pool: {
    assetA: { policyId: string; assetName: string };
    assetB: { policyId: string; assetName: string };
    amountA: bigint;
    amountB: bigint;
    tradingFeeNumerator: bigint;
    // TODO: admin?: DexV2Admin;
  };
};

export function buildCreatePool(options: BuildCreatePoolOptions) {
  const {
    lucid,
    pool,
    tx,
    factoryUTxO,
    minswapValidators,
    minswapDeployedValidators,
  } = options;
  const factoryRedeemer: FactoryValidatorValidateFactory["redeemer"] = {
    assetA: pool.assetA,
    assetB: pool.assetB,
  };
  const factoryDatum: FactoryValidatorValidateFactory["datum"] = Data.from(
    factoryUTxO.datum!,
    FactoryValidatorValidateFactory.datum,
  );
  const lpAssetName = computeLPAssetName(
    pool.assetA.policyId + pool.assetA.assetName,
    pool.assetB.policyId + pool.assetB.assetName,
  );
  const headFactoryDatum: FactoryValidatorValidateFactory["datum"] = {
    head: factoryDatum.head,
    tail: lpAssetName,
  };
  const tailFactoryDatum: FactoryValidatorValidateFactory["datum"] = {
    head: lpAssetName,
    tail: factoryDatum.tail,
  };
  const poolLpAsset = toUnit(
    lucid.utils.validatorToScriptHash(minswapValidators.authenValidator),
    lpAssetName,
  );
  const poolAuthAsset = toUnit(
    lucid.utils.validatorToScriptHash(minswapValidators.authenValidator),
    "4d5350",
  );
  const factoryAuthAsset = toUnit(
    lucid.utils.validatorToScriptHash(minswapValidators.authenValidator),
    "4d53",
  );
  const mintAssets = {
    [poolAuthAsset]: 1n,
    [factoryAuthAsset]: 1n,
    [poolLpAsset]: 9_223_372_036_854_775_807n,
  };
  const initialLiquidity = calculateInitialLiquidity(
    pool.amountA,
    pool.amountB,
  );
  const remainingLiquidity =
    DEX_V2_MAX_LIQUIDITY - (initialLiquidity - MINIMUM_LIQUIDITY);
  const poolAssets = {
    lovelace: DEX_V2_DEFAULT_POOL_ADA,
    [toUnit(pool.assetB.policyId, pool.assetB.assetName)]: pool.amountB,
    [poolAuthAsset]: 1n,
    [poolLpAsset]: remainingLiquidity,
  };
  if (pool.assetA.policyId === "" && pool.assetA.assetName === "") {
    poolAssets["lovelace"] += pool.amountA;
  } else {
    poolAssets[toUnit(pool.assetA.policyId, pool.assetA.assetName)] =
      pool.amountA;
  }
  const poolDatum: PoolValidatorValidatePool["datum"] = {
    poolBatchingStakeCredential: validatorHash2StakeCredential(
      lucid.utils.validatorToScriptHash(
        minswapValidators!.poolBatchingValidator,
      ),
    ),
    assetA: pool.assetA,
    assetB: pool.assetB,
    totalLiquidity: initialLiquidity,
    reserveA: pool.amountA,
    reserveB: pool.amountB,
    baseFeeANumerator: pool.tradingFeeNumerator,
    baseFeeBNumerator: pool.tradingFeeNumerator,
    allowDynamicFee: false,
    feeSharingNumeratorOpt: null,
  };
  const txBuilder = tx
    .readFrom([
      minswapDeployedValidators["authenValidator"],
      minswapDeployedValidators["poolValidator"],
      minswapDeployedValidators["factoryValidator"],
    ])
    .collectFrom(
      [factoryUTxO],
      Data.to(factoryRedeemer, FactoryValidatorValidateFactory.redeemer),
    )
    .mintAssets(
      mintAssets,
      Data.to("CreatePool", AuthenMintingPolicyValidateAuthen.redeemer),
    )
    .payToAddressWithData(
      factoryUTxO.address,
      {
        inline: Data.to(
          headFactoryDatum,
          FactoryValidatorValidateFactory.datum,
        ),
      },
      { ...factoryUTxO.assets },
    )
    .payToAddressWithData(
      factoryUTxO.address,
      {
        inline: Data.to(
          tailFactoryDatum,
          FactoryValidatorValidateFactory.datum,
        ),
      },
      { ...factoryUTxO.assets },
    )
    .payToAddressWithData(
      lucid.utils.validatorToAddress(minswapValidators!.poolValidator),
      { inline: Data.to(poolDatum, PoolValidatorValidatePool.datum) },
      poolAssets,
    );
  return {
    txBuilder,
  };
}
