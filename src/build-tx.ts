import * as T from "@minswap/translucent";
import {
  address2PlutusAddress,
  computeLPAssetName,
  findInputIndex,
  plutusAddress2Address,
  sortUTxOs,
} from "./utils";
import {
  AuthenMintingPolicyValidateAuthen,
  FactoryValidatorValidateFactory,
  OrderValidatorFeedType,
  TreasuryValidatorValidateTreasury,
  OrderValidatorValidateOrderSpending,
} from "../plutus.ts";
import { calculateInitialLiquidity } from "./minswap-amm/utils.ts";
import type {
  Address,
  Assets,
  Translucent,
  Tx,
  UnixTime,
  UTxO,
} from "./types.ts";
import {
  LBE_INIT_FACTORY_HEAD,
  LBE_INIT_FACTORY_TAIL,
  LBE_MAX_PURR_ASSET,
} from "./constants.ts";

export type BaseBuildOptions = {
  lucid: Translucent;
  tx: Tx;
  validatorRefs: any;
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
  const { toUnit, Data } = T;
  const authenRedeemer: AuthenMintingPolicyValidateAuthen["redeemer"] =
    "MintFactoryAuthen";
  const factoryDatum: FactoryValidatorValidateFactory["datum"] = {
    head: LBE_INIT_FACTORY_HEAD,
    tail: LBE_INIT_FACTORY_TAIL,
  };
  const metadata = {
    msg: [`Minswap V2: LBE Init Factory.`],
  };
  const factoryAddress = lucid.utils.validatorToAddress(
    validators.factoryValidator,
  );
  const authenPolicyId = lucid.utils.validatorToScriptHash(
    validators.authenValidator,
  );
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
      {
        inline: Data.to(factoryDatum, FactoryValidatorValidateFactory.datum),
      },
      factoryAuthAssets,
    )
    .attachMetadata(674, metadata);

  return {
    txBuilder,
  };
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
  const { Data, toUnit } = T;
  const authenRedeemer: AuthenMintingPolicyValidateAuthen["redeemer"] =
    "CreateTreasury";
  const authenPolicyId = lucid.utils.validatorToScriptHash(
    validators.authenValidator,
  );
  const treasuryAddress = lucid.utils.validatorToAddress(
    validators!.treasuryValidator,
  );
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
    .readFrom([
      deployedValidators["authenValidator"],
      deployedValidators["factoryValidator"],
    ])
    .collectFrom(
      [factoryUtxo],
      Data.to(factoryRedeemer, FactoryValidatorValidateFactory.redeemer),
    )
    .mintAssets(
      {
        ...treasuryAuthAssets,
        ...factoryAuthAssets,
        ...treasuryLpAssets,
      },
      Data.to(authenRedeemer, AuthenMintingPolicyValidateAuthen.redeemer),
    )
    .payToAddressWithData(
      factoryUtxo.address,
      {
        inline: Data.to(
          newFactoryHeadDatum,
          FactoryValidatorValidateFactory.datum,
        ),
      },
      factoryAuthAssets,
    )
    .payToAddressWithData(
      factoryUtxo.address,
      {
        inline: Data.to(
          newFactoryTailDatum,
          FactoryValidatorValidateFactory.datum,
        ),
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
        [toUnit(
          treasuryDatum.baseAsset.policyId,
          treasuryDatum.baseAsset.assetName,
        )]: treasuryDatum.reserveBase,
      },
    )
    .attachMetadata(674, metadata);
  return {
    txBuilder: txBuilder,
  };
}

export type BuildDepositOptions = {
  owner: Address;
  baseAsset: {
    policyId: string;
    assetName: string;
  };
  raiseAsset: {
    policyId: string;
    assetName: string;
  };
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
  const { toUnit, Data } = T;
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
      ? {
          lovelace: amount + 2000000n,
        }
      : {
          lovelace: 2000000n,
          [toUnit(raiseAsset.policyId, raiseAsset.assetName)]: amount,
        };
  const metadata = {
    msg: [`Minswap V2: LBE Deposit.`],
  };
  const orderAddress = lucid.utils.validatorToAddress(
    validators!.orderValidator,
  );
  const txBuilder = tx
    .payToAddressWithData(
      orderAddress,
      {
        inline: Data.to(datum, OrderValidatorFeedType._datum),
      },
      orderValue,
    )
    .attachMetadata(674, metadata);
  return {
    txBuilder: txBuilder,
  };
}

export type BuildCancelOrderOptions = {
  owner: Address;
  utxo: UTxO;
};

export function buildCancelOrder(
  options: BaseBuildOptions & BuildCancelOrderOptions,
) {
  const { Data } = T;
  const {
    validatorRefs: { deployedValidators },
    tx,
    utxo,
    owner,
  } = options;
  const metadata = {
    msg: [`Minswap V2: LBE Cancel Order.`],
  };
  const redeemer: OrderValidatorFeedType["_redeemer"] = "CancelOrder";

  const txBuilder = tx
    .readFrom([deployedValidators["orderValidator"]])
    .collectFrom([utxo], Data.to(redeemer, OrderValidatorFeedType._redeemer))
    .addSigner(owner)
    .attachMetadata(674, metadata);
  return {
    txBuilder: txBuilder,
  };
}

export type BuildApplyOrdersOptions = {
  orderUTxOs: UTxO[];
  treasuryUTxO: UTxO;
  validFrom: UnixTime;
  validTo: UnixTime;
};

function getPurrAssetName(datum: TreasuryValidatorValidateTreasury["datum"]) {
  const baseAsset = datum.baseAsset;
  const raiseAsset = datum.raiseAsset;
  const lpAssetName = computeLPAssetName(
    baseAsset.policyId + baseAsset.assetName,
    raiseAsset.policyId + raiseAsset.assetName,
  );
  return lpAssetName;
}

export function buildApplyOrders(
  options: BaseBuildOptions & BuildApplyOrdersOptions,
) {
  const { Data, toUnit } = T;
  const {
    lucid,
    tx,
    validatorRefs: { deployedValidators, validators },
    treasuryUTxO,
    orderUTxOs,
    validFrom,
    validTo,
  } = options;
  const treasuryRedeemer: TreasuryValidatorValidateTreasury["redeemer"] =
    "Batching";
  const orderRedeemer: OrderValidatorFeedType["_redeemer"] = "ApplyOrder";
  const orderRewardAddress = lucid.utils.validatorToRewardAddress(
    validators!.orderSpendingValidator,
  );
  const orderBatchingRedeemer: OrderValidatorValidateOrderSpending["redeemer"] =
    {
      treasuryInputIndex: BigInt(
        findInputIndex([...orderUTxOs, treasuryUTxO], treasuryUTxO)!,
      ),
    };
  const applyTreasury = (): {
    newTreasuryDatum: string;
    newTreasuryAssets: Assets;
  } => {
    const treasuryDatum = Data.from(
      treasuryUTxO.datum!,
      TreasuryValidatorValidateTreasury.datum,
    );
    const treasuryValue = {
      ...treasuryUTxO.assets,
    };
    let raiseAsset = `${treasuryDatum.raiseAsset.policyId}${treasuryDatum.raiseAsset.assetName}`;
    if (raiseAsset === "") {
      raiseAsset = "lovelace";
    }
    const purrAsset = toUnit(
      lucid.utils.validatorToScriptHash(validators!.authenValidator),
      getPurrAssetName(treasuryDatum),
    );
    for (const order of orderUTxOs) {
      const orderDatum = Data.from(order.datum!, OrderValidatorFeedType._datum);
      if (orderDatum.step === "Deposit") {
        let estimateIn = order.assets[raiseAsset];
        if (raiseAsset === "lovelace") {
          estimateIn -= 2_000_000n;
        }
        treasuryDatum.reserveRaise += estimateIn;
        treasuryValue[raiseAsset] += estimateIn;
        treasuryValue[purrAsset] -= estimateIn;
      } else {
        throw Error("Not support yet");
      }
    }
    return {
      newTreasuryDatum: Data.to(
        treasuryDatum,
        TreasuryValidatorValidateTreasury.datum,
      ),
      newTreasuryAssets: treasuryValue,
    };
  };
  const { newTreasuryDatum, newTreasuryAssets } = applyTreasury();
  const metadata = {
    msg: [`Minswap V2: LBE Order Executed.`],
  };
  const txBuilder = tx
    .readFrom([
      deployedValidators["orderValidator"],
      deployedValidators["orderSpendingValidator"],
      deployedValidators["treasuryValidator"],
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
      Data.to(
        orderBatchingRedeemer,
        OrderValidatorValidateOrderSpending.redeemer,
      ),
    )
    .validFrom(validFrom)
    .validTo(validTo)
    .attachMetadata(674, metadata);

  const sortedOrderUTxos = sortUTxOs(orderUTxOs);
  for (const order of sortedOrderUTxos) {
    const orderDatum = Data.from(order.datum!, OrderValidatorFeedType._datum);
    const owner = plutusAddress2Address(lucid.network, orderDatum.owner);
    const assets = {
      lovelace: 1_500_000n,
      [toUnit(
        orderDatum.expectOutputAsset.policyId,
        orderDatum.expectOutputAsset.assetName,
      )]: orderDatum.minimumReceive,
    };
    txBuilder.payToAddress(owner, assets);
  }
  txBuilder.payToAddressWithData(
    treasuryUTxO.address,
    {
      inline: newTreasuryDatum,
    },
    newTreasuryAssets,
  );
  return {
    txBuilder: txBuilder,
  };
}

export type BuildCreateAmmPoolOptions = {
  treasuryUTxO: UTxO;
  ammAuthenPolicyId: string;
  validFrom: UnixTime;
};

export function buildCreateAmmPool(
  options: BaseBuildOptions & BuildCreateAmmPoolOptions,
) {
  const { toUnit, Data } = T;
  const {
    lucid,
    tx,
    validatorRefs: { deployedValidators },
    treasuryUTxO,
    ammAuthenPolicyId,
    validFrom,
  } = options;
  const treasuryRedeemer: TreasuryValidatorValidateTreasury["redeemer"] =
    "CreatePool";
  const metadata = {
    msg: [`Minswap V2: LBE Create AMM Pool.`],
  };
  const treasuryDatum: TreasuryValidatorValidateTreasury["datum"] = Data.from(
    treasuryUTxO.datum!,
    TreasuryValidatorValidateTreasury.datum,
  );
  const owner = plutusAddress2Address(lucid.network, treasuryDatum.owner);
  const totalLiquidity = calculateInitialLiquidity(
    treasuryDatum.reserveBase,
    treasuryDatum.reserveRaise,
  );
  const ownerLiquidity = (totalLiquidity - 10n) / 2n;
  const treasuryTotalLiquidity = totalLiquidity - 10n - ownerLiquidity;
  const newTreasuryDatum: TreasuryValidatorValidateTreasury["datum"] = {
    ...treasuryDatum,
    isCreatedPool: 1n,
    totalLiquidity: treasuryTotalLiquidity,
  };
  const lpAssetName = computeLPAssetName(
    treasuryDatum.baseAsset.policyId + treasuryDatum.baseAsset.assetName,
    treasuryDatum.raiseAsset.policyId + treasuryDatum.raiseAsset.assetName,
  );
  const lpAssetUnit = toUnit(ammAuthenPolicyId, lpAssetName);

  let assetA = treasuryDatum.baseAsset;
  let assetB = treasuryDatum.raiseAsset;
  let amountA = treasuryDatum.reserveBase;
  let amountB = treasuryDatum.reserveRaise;
  if (
    assetA.policyId > assetB.policyId ||
    (assetA.policyId === assetB.policyId && assetA.assetName > assetB.assetName)
  ) {
    [assetA, assetB] = [assetB, assetA];
    [amountA, amountB] = [amountB, amountA];
  }
  const baseAssetUnit = toUnit(
    treasuryDatum.baseAsset.policyId,
    treasuryDatum.baseAsset.assetName,
  );
  let raiseAssetUnit = `${treasuryDatum.raiseAsset.policyId}${treasuryDatum.raiseAsset.assetName}`;
  if (raiseAssetUnit === "") {
    raiseAssetUnit = "lovelace";
  }
  const newTreasuryAssets = {
    ...treasuryUTxO.assets,
    [lpAssetUnit]: newTreasuryDatum.totalLiquidity,
    [baseAssetUnit]: 0n,
    [raiseAssetUnit]:
      treasuryUTxO.assets[raiseAssetUnit] - treasuryDatum.reserveRaise,
  };
  const txBuilder = tx
    .readFrom([deployedValidators["treasuryValidator"]])
    .collectFrom(
      [treasuryUTxO],
      Data.to(treasuryRedeemer, TreasuryValidatorValidateTreasury.redeemer),
    )
    .payToAddress(owner, {
      [lpAssetUnit]: newTreasuryDatum.totalLiquidity / 2n,
    })
    .payToAddressWithData(
      treasuryUTxO.address,
      {
        inline: Data.to(
          newTreasuryDatum,
          TreasuryValidatorValidateTreasury.datum,
        ),
      },
      newTreasuryAssets,
    )
    .validFrom(validFrom)
    .attachMetadata(674, metadata);

  return {
    txBuilder,
    assetA,
    assetB,
    amountA,
    amountB,
  };
}
