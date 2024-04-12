import * as T from "@minswap/translucent";
import { generateMinswapAmmParams } from ".";
import { computeLPAssetName } from "../utils";
import {
  AuthenMintingPolicyValidateAuthen,
  FactoryValidatorValidateFactory,
  PoolValidatorValidatePool,
} from "./plutus";
import { calculateInitialLiquidity } from "./utils";
import type { Translucent, Tx, UTxO } from "../types";
import type { DeployedValidators } from "../deploy-validators";
import {
  LP_COLATERAL,
  MINSWAP_V2_DEFAULT_POOL_ADA,
  MINSWAP_V2_MAX_LIQUIDITY,
} from "../constants";

export type BuildCreatePoolOptions = {
  t: Translucent;
  tx: Tx;
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
  const { Data, toUnit } = T;
  const { t, pool, tx, factoryUTxO, minswapDeployedValidators } = options;
  const {
    poolEnterpriseAddress,
    poolBatchingScriptHash,
    authenPolicyId,
    poolAuthAssetName,
    factoryAuthAssetName,
  } = generateMinswapAmmParams(t);

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
  const poolLpAsset = toUnit(authenPolicyId, lpAssetName);
  const poolAuthAsset = toUnit(authenPolicyId, poolAuthAssetName);
  const factoryAuthAsset = toUnit(authenPolicyId, factoryAuthAssetName);
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
    MINSWAP_V2_MAX_LIQUIDITY - (initialLiquidity - LP_COLATERAL);
  const poolAssets = {
    lovelace: MINSWAP_V2_DEFAULT_POOL_ADA,
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
    poolBatchingStakeCredential: {
      Inline: [
        {
          ScriptCredential: [poolBatchingScriptHash],
        },
      ],
    },
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
      poolEnterpriseAddress,
      { inline: Data.to(poolDatum, PoolValidatorValidatePool.datum) },
      poolAssets,
    );
  return {
    txBuilder,
  };
}
