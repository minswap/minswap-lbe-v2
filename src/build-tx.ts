import { Translucent, Tx, Data, toUnit, type UTxO } from "translucent-cardano";
import { computeLPAssetName, type ValidatorRefs } from "./utils";
import {
  AuthenMintingPolicyValidateAuthen,
  FactoryValidatorValidateFactory,
  TreasuryValidatorValidateTreasury,
} from "../plutus.ts";

export const LBE_INIT_FACTORY_HEAD = "00";
export const LBE_INIT_FACTORY_TAIL =
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00";
export const LBE_MAX_PURR_ASSET = 9_223_372_036_854_775_807n;

export type BaseBuildOptions = {
  lucid: Translucent;
  tx: Tx;
  validatorRefs: ValidatorRefs;
};

export type BuildInitFactoryOptions = {
  seedUtxo: UTxO;
};

export function initFactory({
  validatorRefs: { validators, deployedValidators },
  lucid,
  seedUtxo,
  tx,
}: BaseBuildOptions & BuildInitFactoryOptions) {
  const authenRedeemer: AuthenMintingPolicyValidateAuthen["redeemer"] = "MintFactoryAuthen";
  const factoryDatum: FactoryValidatorValidateFactory["datum"] = {
    head: LBE_INIT_FACTORY_HEAD,
    tail: LBE_INIT_FACTORY_TAIL,
  };
  const metadata = {
    msg: [`Minswap LBE: Init Factory.`],
  };
  const factoryAddress = lucid.utils.validatorToAddress(validators.factoryValidator);
  const authenPolicyId = lucid.utils.validatorToScriptHash(validators.authenValidator);
  const factoryAuthAssets = {
    [toUnit(authenPolicyId, "4d53")]: 1n,
  };
  const txBuilder = tx
    .readFrom([deployedValidators["authenValidator"]])
    .collectFrom([seedUtxo])
    .mintAssets(
      factoryAuthAssets,
      Data.to(authenRedeemer, AuthenMintingPolicyValidateAuthen.redeemer),
    )
    .payToAddressWithData(
      factoryAddress,
      { inline: Data.to(factoryDatum, FactoryValidatorValidateFactory.datum) },
      factoryAuthAssets,
    )
    .attachMetadata(674, metadata);

  return { txBuilder };
}

export type BuildCreateTreasury = {
  factoryUtxo: UTxO;
  treasuryDatum: TreasuryValidatorValidateTreasury["datum"];
};

export function createTreasury({
  validatorRefs: { validators, deployedValidators },
  lucid,
  tx,
  factoryUtxo,
  treasuryDatum,
}: BaseBuildOptions & BuildCreateTreasury) {
  const authenRedeemer: AuthenMintingPolicyValidateAuthen["redeemer"] = "CreateTreasury";
  const authenPolicyId = lucid.utils.validatorToScriptHash(validators.authenValidator);
  const treasuryAddress = lucid.utils.validatorToAddress(validators!.treasuryValidator);
  const factoryRedeemer: FactoryValidatorValidateFactory["redeemer"] = {
    baseAsset: treasuryDatum.baseAsset,
    raiseAsset: treasuryDatum.raiseAsset,
  };
  const lpAssetName = computeLPAssetName(
    factoryRedeemer.baseAsset.policyId + factoryRedeemer.baseAsset.assetName,
    factoryRedeemer.raiseAsset.policyId + factoryRedeemer.raiseAsset.assetName,
  );
  const factoryDatum = Data.from(
    factoryUtxo.datum as string,
    FactoryValidatorValidateFactory.datum,
  );
  const newFactoryHeadDatum: FactoryValidatorValidateFactory["datum"] = {
    head: factoryDatum.head,
    tail: lpAssetName,
  };
  const newFactoryTailDatum: FactoryValidatorValidateFactory["datum"] = {
    head: lpAssetName,
    tail: factoryDatum.tail,
  };
  const treasuryAuthAssets = {
    [toUnit(authenPolicyId, "4d5350")]: 1n,
  };
  const factoryAuthAssets = {
    [toUnit(authenPolicyId, "4d53")]: 1n,
  };
  const treasuryLpAssets = {
    [toUnit(authenPolicyId, lpAssetName)]: LBE_MAX_PURR_ASSET,
  };
  const metadata = {
    msg: [`Minswap LBE: Create Treasury.`],
  };
  const txBuilder = tx
    .readFrom([deployedValidators["authenValidator"], deployedValidators["factoryValidator"]])
    .collectFrom([factoryUtxo], Data.to(factoryRedeemer, FactoryValidatorValidateFactory.redeemer))
    .mintAssets(
      { ...treasuryAuthAssets, ...factoryAuthAssets, ...treasuryLpAssets },
      Data.to(authenRedeemer, AuthenMintingPolicyValidateAuthen.redeemer),
    )
    .payToAddressWithData(
      factoryUtxo.address,
      {
        inline: Data.to(newFactoryHeadDatum, FactoryValidatorValidateFactory.datum),
      },
      factoryAuthAssets,
    )
    .payToAddressWithData(
      factoryUtxo.address,
      {
        inline: Data.to(newFactoryTailDatum, FactoryValidatorValidateFactory.datum),
      },
      factoryAuthAssets,
    )
    .payToAddressWithData(
      treasuryAddress,
      {
        inline: Data.to(treasuryDatum, TreasuryValidatorValidateTreasury.datum),
      },
      {
        ...treasuryAuthAssets,
        ...treasuryLpAssets,
        [toUnit(treasuryDatum.baseAsset.policyId, treasuryDatum.baseAsset.assetName)]:
          treasuryDatum.reserveBase,
      },
    )
    .attachMetadata(674, metadata);
  return { txBuilder: txBuilder };
}
