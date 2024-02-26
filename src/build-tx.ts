import { Translucent, Tx, Data, toUnit, type UTxO } from "translucent-cardano";
import type { ValidatorRefs } from "./utils";
import {
  AuthenMintingPolicyValidateAuthen,
  FactoryValidatorValidateFactory,
} from "../plutus.ts";

export const LBE_INIT_FACTORY_HEAD = "00";
export const LBE_INIT_FACTORY_TAIL =
  "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00";

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
  const authenRedeemer: AuthenMintingPolicyValidateAuthen["redeemer"] =
    "MintFactoryAuthen";
  const factoryDatum: FactoryValidatorValidateFactory["datum"] = {
    head: LBE_INIT_FACTORY_HEAD,
    tail: LBE_INIT_FACTORY_TAIL,
  };
  const metadata = {
    msg: [`Minswap LBE: Create Factory.`],
  };
  const factoryAddress = lucid.utils.validatorToAddress(
    validators.factoryValidator,
  );
  const authenPolicyId = lucid.utils.validatorToScriptHash(
    validators.authenValidator,
  );
  const factoryAssets = {
    [toUnit(authenPolicyId, "4d53")]: BigInt(1),
  };
  const txBuilder = tx
    .readFrom([deployedValidators["authenValidator"]])
    .collectFrom([seedUtxo])
    .mintAssets(
      factoryAssets,
      Data.to(authenRedeemer, AuthenMintingPolicyValidateAuthen.redeemer),
    )
    .payToAddressWithData(
      factoryAddress,
      { inline: Data.to(factoryDatum, FactoryValidatorValidateFactory.datum) },
      factoryAssets,
    )
    .attachMetadata(674, metadata);

  return { txBuilder };
}

// export function createTreasury({
//   validatorRefs: { validators, deployedValidators },
//   lucid,
//   seedUtxo,
//   tx,
// }: BaseBuildOptions & { seedUtxo: UTxO }) {
