import {
  Data,
  type Address,
  type Tx,
  type UTxO,
  type Assets,
  toUnit,
} from "translucent-cardano";
import {
  AuthenMintingPolicyValidateAuthen,
  FactoryValidatorValidateFactory,
  PoolValidatorValidatePool,
} from "./plutus";

export type BuildCreatePoolOptions = {
  tx: Tx;
  refUTxO: {
    poolRefUTxO: UTxO;
    lpRefUTxO: UTxO;
    factoryRefUTxO: UTxO;
  };
  factoryUTxO: UTxO;
  pool: {
    address: Address;
    datum: PoolValidatorValidatePool["datum"];
    assets: Assets;
    poolAuthAsset: string,
    factoryAuthAsset: string;
    lpAsset: {
      policyId: string;
      assetName: string;
    };
  };
};

export function buildCreatePool(options: BuildCreatePoolOptions) {
  const {
    pool,
    tx,
    factoryUTxO,
    refUTxO: { poolRefUTxO, lpRefUTxO, factoryRefUTxO },
  } = options;
  const factoryRedeemer: FactoryValidatorValidateFactory["redeemer"] = {
    assetA: pool.datum.assetA,
    assetB: pool.datum.assetB,
  };
  const factoryDatum: FactoryValidatorValidateFactory["datum"] = Data.from(
    factoryUTxO.datum!,
    FactoryValidatorValidateFactory.datum,
  );
  const headFactoryDatum: FactoryValidatorValidateFactory["datum"] = {
    head: factoryDatum.head,
    tail: pool.lpAsset.assetName,
  };
  const tailFactoryDatum: FactoryValidatorValidateFactory["datum"] = {
    head: pool.lpAsset.assetName,
    tail: factoryDatum.tail,
  };
  const mintAssets = {
    [pool.poolAuthAsset]: 1n,
    [pool.factoryAuthAsset]: 1n,
    [toUnit(pool.lpAsset.policyId, pool.lpAsset.assetName)]: 9_223_372_036_854_775_807n,
  };
  const txBuilder = tx
    .readFrom([poolRefUTxO, lpRefUTxO, factoryRefUTxO])
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
      pool.address,
      { inline: Data.to(pool.datum, PoolValidatorValidatePool.datum) },
      pool.assets,
    );
  return {
    txBuilder,
  };
}
