import {
  Translucent,
  Tx,
  Data,
  toUnit,
  type UTxO,
  type Address,
  type Assets,
} from "translucent-cardano";
import { address2PlutusAddress, computeLPAssetName, findInputIndex, plutusAddress2Address, type ValidatorRefs } from "./utils";
import {
  AuthenMintingPolicyValidateAuthen,
  FactoryValidatorValidateFactory,
  OrderValidatorFeedType,
  TreasuryValidatorValidateTreasury,
  OrderValidatorValidateOrderSpending,
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

export function buildInitFactory({
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
    msg: [`Minswap V2: LBE Init Factory.`],
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

export function buildCreateTreasury({
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
    msg: [`Minswap V2: LBE Create Treasury.`],
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

export type BuildDepositOptions = {
  owner: Address;
  baseAsset: { policyId: string; assetName: string };
  raiseAsset: { policyId: string; assetName: string };
  amount: bigint;
};

export function buildDeposit({
  validatorRefs: { validators },
  lucid,
  tx,
  owner,
  baseAsset,
  raiseAsset,
  amount,
}: BaseBuildOptions & BuildDepositOptions) {
  const lpAssetName = computeLPAssetName(
    baseAsset.policyId + baseAsset.assetName,
    raiseAsset.policyId + raiseAsset.assetName,
  );
  const datum: OrderValidatorFeedType["_datum"] = {
    owner: address2PlutusAddress(owner),
    lpAssetName,
    expectOutputAsset: {
      policyId: lucid.utils.validatorToScriptHash(validators!.authenValidator),
      assetName: lpAssetName,
    },
    minimumReceive: amount,
    step: "Deposit",
  };
  const orderValue: Assets =
    raiseAsset.policyId === "" && raiseAsset.assetName === ""
      ? { lovelace: amount + 2000000n }
      : { lovelace: 2000000n, [toUnit(raiseAsset.policyId, raiseAsset.assetName)]: amount };
  const metadata = {
    msg: [`Minswap V2: LBE Deposit.`],
  };
  const orderAddress = lucid.utils.validatorToAddress(validators!.orderValidator);
  const txBuilder = tx
    .payToAddressWithData(
      orderAddress,
      {
        inline: Data.to(datum, OrderValidatorFeedType._datum),
      },
      orderValue,
    )
    .attachMetadata(674, metadata);
  return { txBuilder: txBuilder };
}

export type BuildCancelOrderOptions = {
  owner: Address;
  utxo: UTxO;
}

export function buildCancelOrder(options: BaseBuildOptions & BuildCancelOrderOptions) {
  const { validatorRefs: { deployedValidators }, tx, utxo, owner } = options;
  const metadata = {
    msg: [`Minswap V2: LBE Cancel Order.`],
  };
  const redeemer: OrderValidatorFeedType["_redeemer"] = "CancelOrder";

  const txBuilder = tx
    .readFrom([deployedValidators['orderValidator']])
    .collectFrom(
      [utxo],
      Data.to(redeemer, OrderValidatorFeedType._redeemer),
    )
    .addSigner(owner)
    .attachMetadata(674, metadata);
  return { txBuilder: txBuilder };
}

export type BuildApplyOrdersOptions = {
  orderUTxOs: UTxO[];
  treasuryUTxO: UTxO;
}

export function buildApplyOrders(options: BaseBuildOptions & BuildApplyOrdersOptions) {
  const { lucid, tx, validatorRefs: { deployedValidators, validators }, treasuryUTxO, orderUTxOs } = options;
  const treasuryRedeemer: TreasuryValidatorValidateTreasury['redeemer'] = "Batching";
  const orderRedeemer: OrderValidatorFeedType['_redeemer'] = "ApplyOrder";
  const orderRewardAddress = lucid.utils.validatorToRewardAddress(validators!.orderSpendingValidator);
  const orderBatchingRedeemer: OrderValidatorValidateOrderSpending['redeemer'] = {
    treasuryInputIndex: BigInt(findInputIndex([...orderUTxOs, treasuryUTxO], treasuryUTxO)!),
  };
  const validFrom = new Date().getTime();
  const validTo = validFrom + 10 * 60 * 1000;
  const metadata = {
    msg: [`Minswap V2: LBE Order Executed.`],
  };
  const txBuilder = tx
    .readFrom([
      deployedValidators['orderValidator'],
      deployedValidators['orderSpendingValidator'],
      deployedValidators['treasuryValidator'],
    ])
    .collectFrom(
      [treasuryUTxO],
      Data.to(treasuryRedeemer, TreasuryValidatorValidateTreasury.redeemer),
    )
    .collectFrom(
      orderUTxOs,
      Data.to(orderRedeemer, OrderValidatorFeedType._redeemer),
    )
    .withdraw(
      orderRewardAddress,
      0n,
      Data.to(orderBatchingRedeemer, OrderValidatorValidateOrderSpending.redeemer),
    )
    .validFrom(validFrom)
    .validTo(validTo)
    .attachMetadata(674, metadata);

  for (const order of orderUTxOs) {
    const orderDatum = Data.from(order.datum!, OrderValidatorFeedType._datum);
    const owner = plutusAddress2Address(lucid.network, orderDatum.owner);
    const assets = {
      'lovelace': 1_500_000n,
      [toUnit(
        orderDatum.expectOutputAsset.policyId,
        orderDatum.expectOutputAsset.assetName
      )]: orderDatum.minimumReceive,
    }
    txBuilder.payToAddress(
      owner,
      assets,
    );
  }
  // TODO: pays to treasury Output
  return { txBuilder: txBuilder };
}
