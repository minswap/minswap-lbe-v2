import invariant from "@minswap/tiny-invariant";
import * as T from "@minswap/translucent";
import {
  AuthenMintingPolicyValidateAuthen as AmmValidateAuthen,
  FactoryValidatorValidateFactory as AmmValidateFactory,
} from "../amm-plutus";
import {
  FactoryValidateFactory,
  FactoryValidateFactoryMinting,
  FeedTypeAmmPool,
  ManagerValidateManagerSpending,
  OrderValidateOrder,
  SellerValidateSellerSpending,
  TreasuryValidateTreasurySpending,
} from "../plutus";
import {
  CREATE_POOL_COMMISSION,
  DUMMY_REDEEMER,
  FACTORY_AUTH_AN,
  ORDER_COMMISSION,
  LBE_INIT_FACTORY_HEAD,
  LBE_INIT_FACTORY_TAIL,
  LP_COLATERAL,
  MANAGER_AUTH_AN,
  MANAGER_MIN_ADA,
  MINIMUM_SELLER_COLLECTED,
  MINSWAP_V2_DEFAULT_POOL_ADA,
  MINSWAP_V2_FACTORY_AUTH_AN,
  MINSWAP_V2_MAX_LIQUIDITY,
  MINSWAP_V2_POOL_AUTH_AN,
  ORDER_AUTH_AN,
  ORDER_MIN_ADA,
  SELLER_AUTH_AN,
  SELLER_MIN_ADA,
  TREASURY_AUTH_AN,
  TREASURY_MIN_ADA,
  SELLER_COMMISSION,
  COLLECT_SELLER_COMMISSION,
  LABEL_MESSAGE_METADATA,
  LBE_MESSAGE_INIT,
  LBE_MESSAGE_CREATE,
  LBE_MESSAGE_ADD_SELLERS,
  LBE_MESSAGE_USING_SELLER,
  LBE_MESSAGE_UPDATE,
  LBE_MESSAGE_CANCEL,
  LBE_MESSAGE_CREATE_AMM_POOL,
  LBE_MESSAGE_CLOSE,
  LBE_MESSAGE_REDEEM_ORDERS,
  LBE_MESSGAE_REFUND_ORDERS,
  LBE_MESSAGE_COLLECT_ORDERS,
  LBE_MESSAGE_COLLECT_MANAGER,
  LBE_MESSAGE_COUNTING_SELLERS,
} from "./constants";
import {
  collectValidators,
  type DeployMinswapValidators,
  type DeployedValidators,
  type MinswapValidators,
  type Validators,
  collectMinswapValidators,
} from "./deploy-validators";
import type {
  Address,
  AmmFactoryDatum,
  AmmPoolDatum,
  Assets,
  BluePrintAsset,
  Credential,
  Datum,
  FactoryDatum,
  FactoryRedeemer,
  LbeUTxO,
  ManagerDatum,
  ManagerRedeemer,
  MintRedeemer,
  OrderDatum,
  OrderRedeemer,
  RewardAddress,
  SellerDatum,
  SellerRedeemer,
  Translucent,
  TreasuryDatum,
  TreasuryRedeemer,
  Tx,
  UTxO,
  UnixTime,
} from "./types";
import {
  address2PlutusAddress,
  calculateInitialLiquidity,
  computeLPAssetName,
  hexToUtxo,
  normalizedPair,
  plutusAddress2Address,
  sortUTxOs,
  toUnit,
} from "./utils";
import lbeV2Script from "./../lbe-v2-script.json";

export type WarehouseBuilderOptions = {
  t: Translucent;
  validators: Validators;
  deployedValidators: DeployedValidators;
  ammValidators: MinswapValidators;
  ammDeployedValidators: DeployMinswapValidators;
};

export type BuildInitFactoryOptions = {
  seedUtxo: UTxO;
  skipCollect?: boolean;
};

export type BuildCreateTreasuryOptions = {
  sellerAmount: bigint;
  factoryUtxo: LbeUTxO;
  treasuryDatum: TreasuryDatum;
  sellerOwner: Address;
  validFrom: UnixTime;
  validTo: UnixTime;
  extraDatum?: Datum; // the datum of treasuryDatum.receiverDatum
};

export type BuildAddSellersOptions = {
  treasuryRefUtxo: LbeUTxO;
  managerUtxo: LbeUTxO;
  addSellerCount: bigint;
  validFrom: UnixTime;
  validTo: UnixTime;
  owner: Address;
};

export type BuildUsingSellerOptions = {
  treasuryRefInput: LbeUTxO;
  sellerUtxo: LbeUTxO;
  validFrom: UnixTime;
  validTo: UnixTime;
  owners: Address[];
  orderInputs: LbeUTxO[];
  orderOutputDatums: OrderDatum[];
};

export type BuildCollectManagerOptions = {
  treasuryInput: LbeUTxO;
  managerInput: LbeUTxO;
  validFrom: UnixTime;
  validTo: UnixTime;
  // allow pass datum as testing purpose
  treasuryOutDatum?: TreasuryDatum;
};

export type BuildCollectSellersOptions = {
  treasuryRefInput: LbeUTxO;
  managerInput: LbeUTxO;
  sellerInputs: LbeUTxO[];
  validFrom: UnixTime;
  validTo: UnixTime;
};

export type BuildCollectOrdersOptions = {
  treasuryInput: LbeUTxO;
  orderInputs: LbeUTxO[];
  validFrom: UnixTime;
  validTo: UnixTime;
};

export type PenaltyConfig = { penaltyStartTime: bigint; percent: bigint };

export type BuildUpdateLBEOptions = {
  treasuryInput: LbeUTxO;
  validFrom: UnixTime;
  validTo: UnixTime;
  // updatable fields
  startTime?: bigint;
  endTime?: bigint;
  owner?: Address;
  minimumOrderRaise?: bigint;
  minimumRaise?: bigint;
  maximumRaise?: bigint;
  reserveBase?: bigint;
  revocable?: boolean;
  penaltyConfig?: PenaltyConfig;
};

export type BuildCancelLBEOptions = {
  treasuryInput: LbeUTxO;
  ammFactoryRefInput?: LbeUTxO;
  validFrom: UnixTime;
  validTo: UnixTime;
  reason: "CreatedPool" | "ByOwner" | "NotReachMinimum";
};

export type BuildCreateAmmPoolOptions = {
  treasuryInput: LbeUTxO;
  ammFactoryInput: LbeUTxO;
  validFrom: UnixTime;
  validTo: UnixTime;
  extraDatum?: Datum; // Datum of TreasuryDatum.receiverDatum
};

export type BuildRedeemOrdersOptions = {
  treasuryInput: LbeUTxO;
  orderInputs: LbeUTxO[];
  validFrom: UnixTime;
  validTo: UnixTime;
};

export type BuildCloseEventOptions = {
  treasuryInput: LbeUTxO;
  factoryInputs: LbeUTxO[]; // [Head Factory Input, Tail Factory Input]
  validFrom: UnixTime;
  validTo: UnixTime;
};

export function genWarehouseBuilderOptions(
  t: Translucent,
): WarehouseBuilderOptions {
  let validators = collectValidators({
    t,
    seedOutRef: lbeV2Script.seedOutRef,
  });
  let deployedValidators = {
    treasuryValidator: hexToUtxo(lbeV2Script.treasuryRefInput),
    managerValidator: hexToUtxo(lbeV2Script.managerRefInput),
    sellerValidator: hexToUtxo(lbeV2Script.sellerRefInput),
    orderValidator: hexToUtxo(lbeV2Script.orderRefInput),
    factoryValidator: hexToUtxo(lbeV2Script.factoryRefInput),
  };
  let ammValidators = collectMinswapValidators({
    t,
    seedOutRef: lbeV2Script.ammSeedOutRef,
    poolStakeCredential: lbeV2Script.ammPoolStakeCredential as Credential,
  });
  let ammDeployedValidators = {
    authenValidator: hexToUtxo(lbeV2Script.ammAuthenRefInput),
    poolValidator: hexToUtxo(lbeV2Script.ammPoolRefInput),
    factoryValidator: hexToUtxo(lbeV2Script.ammFactoryRefInput),
  };
  return {
    t,
    validators,
    deployedValidators,
    ammValidators,
    ammDeployedValidators,
  };
}

export class WarehouseBuilder {
  // immutable
  t: Translucent;
  validators: Validators;
  deployedValidators: DeployedValidators;

  // Validator Hash
  factoryHash: string;
  treasuryHash: string;
  managerHash: string;
  sellerHash: string;
  orderHash: string;

  // Validator Address
  factoryAddress: Address;
  treasuryAddress: Address;
  managerAddress: Address;
  sellerAddress: Address;
  orderAddress: Address;
  sellerRewardAddress: RewardAddress;
  treasuryRewardAddress: RewardAddress;
  factoryRewardAddress: RewardAddress;

  // Auth Token
  factoryToken: string;
  treasuryToken: string;
  managerToken: string;
  orderToken: string;
  sellerToken: string;

  // AMM
  ammValidators: MinswapValidators;
  ammDeployedValidators: DeployMinswapValidators;
  ammFactoryAddress: Address;
  ammPoolAddress: Address;
  ammAuthenHash: string;
  ammPoolHash: string;
  ammFactoryHash: string;
  ammPoolBatchingHash: string;
  ammPoolToken: string;
  ammFactoryToken: string;
  // -----------------------------------

  // mutable
  tx: Tx;
  tasks: Array<() => void> = [];

  // Reference Input
  treasuryRefInput: UTxO | undefined;

  // Inputs
  treasuryInputs: LbeUTxO[] = [];
  managerInputs: LbeUTxO[] = [];
  factoryInputs: LbeUTxO[] = [];
  orderInputs: LbeUTxO[] = [];
  sellerInputs: LbeUTxO[] = [];

  // Redeemer
  factoryRedeemer: FactoryRedeemer | undefined;
  treasuryRedeemer: TreasuryRedeemer | undefined;
  managerRedeemer: ManagerRedeemer | undefined;
  sellerRedeemer: SellerRedeemer | undefined;
  orderRedeemer: OrderRedeemer | undefined;
  mintRedeemer: MintRedeemer | undefined;

  // Internal Asset
  baseAsset: BluePrintAsset | undefined;
  raiseAsset: BluePrintAsset | undefined;
  lpAssetName: string | undefined;
  ammLpToken: string | undefined;
  // -----------------------------------

  constructor(options: WarehouseBuilderOptions) {
    const {
      t,
      validators,
      deployedValidators,
      ammValidators,
      ammDeployedValidators,
    } = options;
    this.t = t;
    this.validators = validators;
    this.deployedValidators = deployedValidators;
    this.tx = t.newTx();

    this.factoryHash = t.utils.validatorToScriptHash(
      validators.factoryValidator,
    );
    this.treasuryHash = t.utils.validatorToScriptHash(
      validators.treasuryValidator,
    );
    this.managerHash = t.utils.validatorToScriptHash(
      validators.managerValidator,
    );
    this.sellerHash = t.utils.validatorToScriptHash(validators.sellerValidator);
    this.orderHash = t.utils.validatorToScriptHash(validators.orderValidator);

    this.factoryAddress = t.utils.validatorToAddress(
      validators.factoryValidator,
    );
    this.treasuryAddress = t.utils.validatorToAddress(
      validators.treasuryValidator,
    );
    this.managerAddress = t.utils.validatorToAddress(
      validators.managerValidator,
    );
    this.sellerAddress = t.utils.validatorToAddress(validators.sellerValidator);
    this.orderAddress = t.utils.validatorToAddress(validators.orderValidator);
    this.sellerRewardAddress = t.utils.validatorToRewardAddress(
      validators.sellerValidator,
    );
    this.treasuryRewardAddress = t.utils.validatorToRewardAddress(
      validators.treasuryValidator,
    );
    this.factoryRewardAddress = t.utils.validatorToRewardAddress(
      validators.factoryValidator,
    );

    this.factoryToken = toUnit(this.factoryHash, FACTORY_AUTH_AN);
    this.treasuryToken = toUnit(this.factoryHash, TREASURY_AUTH_AN);
    this.managerToken = toUnit(this.factoryHash, MANAGER_AUTH_AN);
    this.sellerToken = toUnit(this.factoryHash, SELLER_AUTH_AN);
    this.orderToken = toUnit(this.factoryHash, ORDER_AUTH_AN);

    // AMM
    this.ammValidators = ammValidators;
    this.ammFactoryAddress = ammValidators.factoryAddress;
    this.ammPoolAddress = ammValidators.poolAddress;
    this.ammDeployedValidators = ammDeployedValidators;
    this.ammAuthenHash = t.utils.validatorToScriptHash(
      ammValidators.authenValidator,
    );
    this.ammPoolHash = t.utils.validatorToScriptHash(
      ammValidators.poolValidator,
    );
    this.ammFactoryHash = t.utils.validatorToScriptHash(
      ammValidators.factoryValidator,
    );
    this.ammPoolBatchingHash = t.utils.validatorToScriptHash(
      ammValidators.poolBatchingValidator,
    );
    this.ammPoolToken = toUnit(this.ammAuthenHash, MINSWAP_V2_POOL_AUTH_AN);
    this.ammFactoryToken = toUnit(
      this.ammAuthenHash,
      MINSWAP_V2_FACTORY_AUTH_AN,
    );
  }

  public complete(): Tx {
    this.tx = this.t.newTx();
    for (const task of this.tasks) {
      task();
    }
    return this.tx;
  }

  public clean(): WarehouseBuilder {
    this.tx = this.t.newTx();
    this.tasks = [];
    this.treasuryRefInput = undefined;
    this.treasuryInputs = [];
    this.managerInputs = [];
    this.factoryInputs = [];
    this.orderInputs = [];
    this.sellerInputs = [];

    this.factoryRedeemer = undefined;
    this.treasuryRedeemer = undefined;
    this.managerRedeemer = undefined;
    this.sellerRedeemer = undefined;
    this.orderRedeemer = undefined;
    this.mintRedeemer = undefined;

    this.baseAsset = undefined;
    this.raiseAsset = undefined;
    this.lpAssetName = undefined;
    this.ammLpToken = undefined;

    return this;
  }

  public buildInitFactory(options: BuildInitFactoryOptions): WarehouseBuilder {
    const { seedUtxo, skipCollect } = options;
    this.tasks.push(
      () => {
        this.mintRedeemer = "Initialization";
      },
      () => {
        if (skipCollect) {
        } else {
          this.tx.collectFrom([seedUtxo]);
        }
      },
      () => {
        this.mintingFactoryToken();
      },
      () => {
        this.payingFactoryOutput();
      },
      () => {
        WarehouseBuilder.addMetadataMessage(this.tx, LBE_MESSAGE_INIT);
      },
    );
    return this;
  }

  public buildCreateTreasury(
    options: BuildCreateTreasuryOptions,
  ): WarehouseBuilder {
    const {
      factoryUtxo,
      treasuryDatum,
      sellerOwner,
      validFrom,
      validTo,
      extraDatum,
      sellerAmount,
    } = options;
    const managerDatum: ManagerDatum = {
      factoryPolicyId: this.factoryHash,
      baseAsset: treasuryDatum.baseAsset,
      raiseAsset: treasuryDatum.raiseAsset,
      sellerCount: sellerAmount,
      reserveRaise: 0n,
      totalPenalty: 0n,
    };
    let innerFactoryRedeemer = {
      baseAsset: treasuryDatum.baseAsset,
      raiseAsset: treasuryDatum.raiseAsset,
    };
    this.factoryInputs = [factoryUtxo];
    this.mintRedeemer = { CreateTreasury: { ...innerFactoryRedeemer } };
    this.factoryRedeemer = {
      wrapper: {
        CreateTreasury: { ...innerFactoryRedeemer },
      },
    };
    this.setInnerAssets(treasuryDatum.baseAsset, treasuryDatum.raiseAsset);
    this.tasks.push(
      () => {
        this.spendingFactoryInput();
      },
      () => {
        this.payingFactoryOutput();
      },
      () => {
        this.mintingFactoryToken(innerFactoryRedeemer);
      },
      () => {
        this.mintingTreasuryToken();
      },
      () => {
        this.mintingSellerToken(sellerAmount);
      },
      () => {
        this.payingManagerOutput(managerDatum);
      },
      () => {
        this.payingSellerOutput({
          addSellerCount: sellerAmount,
          owner: sellerOwner,
        });
      },
      () => {
        this.mintingManagerToken();
      },
      () => {
        this.payingTreasuryOutput({ treasuryOutDatum: treasuryDatum });
      },
      () => {
        this.tx.validFrom(validFrom).validTo(validTo);
      },
      () => {
        if (treasuryDatum.receiverDatum !== "RNoDatum") {
          invariant(extraDatum);
          this.tx.payToAddressWithData(
            plutusAddress2Address(this.t.network, treasuryDatum.owner),
            { asHash: extraDatum },
            {},
          );
        }
      },
      () => {
        WarehouseBuilder.addMetadataMessage(this.tx, LBE_MESSAGE_CREATE);
      },
    );
    return this;
  }

  public buildAddSeller(options: BuildAddSellersOptions): WarehouseBuilder {
    const {
      addSellerCount,
      validFrom,
      validTo,
      treasuryRefUtxo,
      managerUtxo,
      owner,
    } = options;
    invariant(managerUtxo.datum);
    const managerInDatum = WarehouseBuilder.fromDatumManager(managerUtxo.datum);
    const managerOutDatum = {
      ...managerInDatum,
      sellerCount: managerInDatum.sellerCount + addSellerCount,
    };
    this.setInnerAssets(managerInDatum.baseAsset, managerInDatum.raiseAsset);

    this.tasks.push(
      () => {
        this.managerInputs = [managerUtxo];
        this.managerRedeemer = "AddSellers";
        this.mintRedeemer = "MintSeller";
      },
      () => {
        this.spendingManagerInput();
      },
      () => {
        this.mintingSellerToken(addSellerCount);
      },
      () => {
        this.payingManagerOutput(managerOutDatum);
      },
      () => {
        this.payingSellerOutput({ addSellerCount, owner });
      },
      () => {
        this.tx
          .readFrom([treasuryRefUtxo])
          .validFrom(validFrom)
          .validTo(validTo);
      },
      () => {
        WarehouseBuilder.addMetadataMessage(this.tx, LBE_MESSAGE_ADD_SELLERS);
      },
    );
    return this;
  }

  public buildUsingSeller(options: BuildUsingSellerOptions): WarehouseBuilder {
    const {
      treasuryRefInput,
      sellerUtxo,
      validFrom,
      validTo,
      owners,
      orderInputs,
      orderOutputDatums,
    } = options;
    invariant(sellerUtxo.datum);
    const sellerInDatum = WarehouseBuilder.fromDatumSeller(sellerUtxo.datum);
    this.setInnerAssets(sellerInDatum.baseAsset, sellerInDatum.raiseAsset);
    let inputAmount = 0n;
    let inputPenaltyAmount = 0n;
    let outputAmount = 0n;
    let outputPenaltyAmount = 0n;
    for (const o of orderInputs) {
      invariant(o.datum);
      const datum = WarehouseBuilder.fromDatumOrder(o.datum);
      inputAmount += datum.amount;
      inputPenaltyAmount += datum.penaltyAmount;
    }
    for (const datum of orderOutputDatums) {
      outputAmount += datum.amount;
      outputPenaltyAmount += datum.penaltyAmount;
    }
    const detalAmount = outputAmount - inputAmount;
    const deltaPenaltyAmount = outputPenaltyAmount - inputPenaltyAmount;
    const sellerOutDatum: SellerDatum = {
      ...sellerInDatum,
      amount: sellerInDatum.amount + detalAmount,
      penaltyAmount: sellerInDatum.penaltyAmount + deltaPenaltyAmount,
    };
    const mintingSellerCount = BigInt(
      orderOutputDatums.length - orderInputs.length,
    );
    const newOrderCount = BigInt(
      Math.max(0, orderOutputDatums.length - orderInputs.length),
    );
    this.tasks.push(
      () => {
        this.sellerInputs = [sellerUtxo];
        this.sellerRedeemer = "UsingSeller";
        this.treasuryRefInput = treasuryRefInput;
        this.orderInputs = orderInputs;
        this.orderRedeemer = "UpdateOrder";
        if (mintingSellerCount !== 0n) {
          this.mintRedeemer = "MintOrder";
        }
        for (const owner of owners) {
          this.tx.addSigner(owner);
        }
      },
      () => {
        this.spendingSellerInput();
      },
      () => {
        this.spendingOrderInput();
      },
      () => {
        this.mintingOrderToken(mintingSellerCount);
      },
      () => {
        this.payingSellerOutput({
          outDatum: sellerOutDatum,
          newOrderCount: newOrderCount,
        });
      },
      () => {
        this.payingOrderOutput(...orderOutputDatums);
      },
      () => {
        this.tx.validFrom(validFrom).validTo(validTo);
      },
      () => {
        WarehouseBuilder.addMetadataMessage(this.tx, LBE_MESSAGE_USING_SELLER);
      },
    );
    return this;
  }

  public buildUpdateLBE(options: BuildUpdateLBEOptions): WarehouseBuilder {
    const {
      treasuryInput,
      validFrom,
      validTo,
      startTime,
      endTime,
      owner,
      minimumOrderRaise,
      minimumRaise,
      maximumRaise,
      reserveBase,
      revocable,
      penaltyConfig,
    } = options;
    invariant(treasuryInput.datum);
    const inDatum = WarehouseBuilder.fromDatumTreasury(treasuryInput.datum);
    const treasuryOutDatum: TreasuryDatum = {
      ...inDatum,
      startTime: startTime ?? inDatum.startTime,
      endTime: endTime ?? inDatum.endTime,
      owner: owner ? address2PlutusAddress(owner) : inDatum.owner,
      minimumOrderRaise: minimumOrderRaise ?? inDatum.minimumOrderRaise,
      minimumRaise: minimumRaise ?? inDatum.minimumRaise,
      maximumRaise: maximumRaise ?? inDatum.maximumRaise,
      reserveBase: reserveBase ?? inDatum.reserveBase,
      revocable: revocable ?? inDatum.revocable,
      penaltyConfig: penaltyConfig ?? inDatum.penaltyConfig,
    };
    this.tasks.push(
      () => {
        this.treasuryInputs = [treasuryInput];
        this.treasuryRedeemer = "UpdateLBE";
      },
      () => {
        this.spendingTreasuryInput();
      },
      () => {
        this.tx.addSigner(plutusAddress2Address(this.t.network, inDatum.owner));
      },
      () => {
        this.payingTreasuryOutput({ treasuryOutDatum });
      },
      () => {
        this.tx.validFrom(validFrom).validTo(validTo);
      },
      () => {
        WarehouseBuilder.addMetadataMessage(this.tx, LBE_MESSAGE_UPDATE);
      },
    );
    return this;
  }

  public buildCancelLBE(options: BuildCancelLBEOptions): WarehouseBuilder {
    const { treasuryInput, validFrom, validTo, ammFactoryRefInput, reason } =
      options;
    invariant(treasuryInput.datum);
    const treasuryInDatum = WarehouseBuilder.fromDatumTreasury(
      treasuryInput.datum,
    );
    const treasuryOutDatum: TreasuryDatum = {
      ...treasuryInDatum,
      isCancelled: true,
    };

    this.tasks.push(
      () => {
        this.treasuryInputs = [treasuryInput];
        this.treasuryRedeemer = { CancelLBE: { reason } };
      },
      () => {
        if (ammFactoryRefInput) {
          this.tx.readFrom([ammFactoryRefInput]);
        } else {
          this.tx.addSigner(
            plutusAddress2Address(this.t.network, treasuryInDatum.owner),
          );
        }
      },
      () => {
        this.spendingTreasuryInput();
      },
      () => {
        this.payingTreasuryOutput({ treasuryOutDatum });
      },
      () => {
        this.tx.validFrom(validFrom).validTo(validTo);
      },
      () => {
        WarehouseBuilder.addMetadataMessage(this.tx, LBE_MESSAGE_CANCEL);
      },
    );
    return this;
  }

  public buildCreateAmmPool(
    options: BuildCreateAmmPoolOptions,
  ): WarehouseBuilder {
    const { treasuryInput, ammFactoryInput, extraDatum, validFrom, validTo } =
      options;
    const treasuryInDatum = WarehouseBuilder.fromDatumTreasury(
      treasuryInput.datum,
    );
    let totalReserveRaise: bigint;
    if (
      treasuryInDatum.maximumRaise &&
      treasuryInDatum.maximumRaise < treasuryInDatum.collectedFund
    ) {
      totalReserveRaise = treasuryInDatum.maximumRaise;
    } else {
      totalReserveRaise = treasuryInDatum.collectedFund;
    }

    const [assetA, assetB] = normalizedPair(
      treasuryInDatum.baseAsset,
      treasuryInDatum.raiseAsset,
    );

    let reserveA: bigint;
    let reserveB: bigint;
    if (
      assetA.policyId === treasuryInDatum.baseAsset.policyId &&
      assetA.assetName === treasuryInDatum.baseAsset.assetName
    ) {
      reserveA = treasuryInDatum.reserveBase;
      reserveB = totalReserveRaise;
    } else {
      reserveA = totalReserveRaise;
      reserveB = treasuryInDatum.reserveBase;
    }
    const poolReserveA = (reserveA * treasuryInDatum.poolAllocation) / 100n;
    const poolReserveB = (reserveB * treasuryInDatum.poolAllocation) / 100n;
    const totalLiquidity = calculateInitialLiquidity(
      poolReserveA,
      poolReserveB,
    );

    const ammPoolDatum: FeedTypeAmmPool["_datum"] = {
      poolBatchingStakeCredential: {
        Inline: [{ ScriptCredential: [this.ammPoolBatchingHash] }],
      },
      assetA,
      assetB,
      totalLiquidity,
      reserveA: poolReserveA,
      reserveB: poolReserveB,
      baseFeeANumerator: treasuryInDatum.poolBaseFee,
      baseFeeBNumerator: treasuryInDatum.poolBaseFee,
      feeSharingNumeratorOpt: null,
      allowDynamicFee: false,
    };

    const totalLbeLPs = totalLiquidity - LP_COLATERAL;
    const receiverLP =
      (totalLbeLPs * (treasuryInDatum.poolAllocation - 50n)) /
      treasuryInDatum.poolAllocation;
    const treasuryOutDatum: TreasuryDatum = {
      ...treasuryInDatum,
      totalLiquidity: totalLbeLPs - receiverLP,
    };

    this.tasks.push(
      () => {
        this.treasuryInputs = [treasuryInput];
        this.treasuryRedeemer = "CreateAmmPool";
        this.setInnerAssets(
          treasuryInDatum.baseAsset,
          treasuryInDatum.raiseAsset,
        );
      },
      () => {
        invariant(this.ammLpToken);
        const receiver = plutusAddress2Address(
          this.t.network,
          treasuryInDatum.receiver,
        );
        const assets: Assets = {
          [this.ammLpToken]: receiverLP,
        };
        const receiverA = reserveA - poolReserveA;
        const receiverB = reserveB - poolReserveB;
        if (receiverA !== 0n) {
          assets[toUnit(assetA.policyId, assetA.assetName)] = receiverA;
        }
        if (receiverB !== 0n) {
          assets[toUnit(assetB.policyId, assetB.assetName)] = receiverB;
        }
        if (treasuryInDatum.receiverDatum !== "RNoDatum") {
          invariant(extraDatum);
          if ("RInlineDatum" in treasuryInDatum.receiverDatum) {
            this.tx.payToAddressWithData(
              receiver,
              { inline: extraDatum },
              assets,
            );
          } else if ("RDatumHash" in treasuryInDatum.receiverDatum) {
            this.tx.payToAddressWithData(
              receiver,
              { asHash: extraDatum },
              assets,
            );
          }
        } else {
          this.tx.payToAddress(receiver, assets);
        }
      },
      () => {
        this.spendingTreasuryInput();
      },
      () => {
        this._buildCreateAmmPool({
          poolDatum: ammPoolDatum,
          factoryInput: ammFactoryInput,
        });
      },
      () => {
        this.payingTreasuryOutput({ treasuryOutDatum });
      },
      () => {
        this.tx.validFrom(validFrom).validTo(validTo);
      },
      () => {
        WarehouseBuilder.addMetadataMessage(
          this.tx,
          LBE_MESSAGE_CREATE_AMM_POOL,
        );
      },
    );
    return this;
  }

  public buildCloseEvent(options: BuildCloseEventOptions): WarehouseBuilder {
    const { treasuryInput, factoryInputs, validFrom, validTo } = options;
    invariant(treasuryInput.datum);
    const treasuryDatum = WarehouseBuilder.fromDatumTreasury(
      treasuryInput.datum,
    );
    const innerFactoryRedeemer = {
      baseAsset: treasuryDatum.baseAsset,
      raiseAsset: treasuryDatum.raiseAsset,
    };
    this.tasks.push(
      () => {
        this.treasuryInputs = [treasuryInput];
        this.treasuryRedeemer = "CloseEvent";
        this.factoryInputs = factoryInputs;
        this.factoryRedeemer = {
          wrapper: { CloseTreasury: innerFactoryRedeemer },
        };
        this.mintRedeemer = { CloseTreasury: innerFactoryRedeemer };
        this.setInnerAssets(treasuryDatum.baseAsset, treasuryDatum.raiseAsset);
      },
      () => {
        this.tx.validFrom(validFrom).validTo(validTo);
      },
      () => {
        this.tx.addSigner(
          plutusAddress2Address(this.t.network, treasuryDatum.owner),
        );
      },
      () => {
        this.spendingTreasuryInput();
      },
      () => {
        this.spendingFactoryInput();
      },
      () => {
        this.mintingTreasuryToken();
      },
      () => {
        this.mintingFactoryToken(innerFactoryRedeemer);
      },
      () => {
        this.payingFactoryOutput();
      },
      () => {
        WarehouseBuilder.addMetadataMessage(this.tx, LBE_MESSAGE_CLOSE);
      },
    );
    return this;
  }

  public buildRedeemOrders(
    options: BuildRedeemOrdersOptions,
  ): WarehouseBuilder {
    const { treasuryInput, orderInputs, validFrom, validTo } = options;
    invariant(treasuryInput.datum);
    const treasuryInDatum = WarehouseBuilder.fromDatumTreasury(
      treasuryInput.datum,
    );
    this.setInnerAssets(treasuryInDatum.baseAsset, treasuryInDatum.raiseAsset);
    invariant(this.ammLpToken);
    const sortedOrders = sortUTxOs(orderInputs);
    let totalFund = 0n;
    let totalLiquidity = 0n;
    let totalBonusRaise = 0n;
    const userOutputs: { address: Address; assets: Assets }[] = [];
    const totalBonusRaiseAsset =
      treasuryInDatum.maximumRaise &&
      treasuryInDatum.reserveRaise + treasuryInDatum.totalPenalty >
        treasuryInDatum.maximumRaise
        ? treasuryInDatum.reserveRaise +
          treasuryInDatum.totalPenalty -
          treasuryInDatum.maximumRaise
        : 0n;
    const raiseAsset = toUnit(
      this.raiseAsset!.policyId,
      this.raiseAsset!.assetName,
    );
    for (const order of sortedOrders) {
      invariant(order.datum);
      const datum = WarehouseBuilder.fromDatumOrder(order.datum);
      const lpAmount =
        (datum.amount * treasuryInDatum.totalLiquidity) /
        treasuryInDatum.reserveRaise;
      const bonusRaise =
        (datum.amount * totalBonusRaiseAsset) / treasuryInDatum.reserveRaise;
      const assets = {
        lovelace: ORDER_MIN_ADA,
        [this.ammLpToken]: lpAmount,
      };
      assets[raiseAsset] = assets[raiseAsset]
        ? assets[raiseAsset] + bonusRaise
        : bonusRaise;
      const output: { address: Address; assets: Assets } = {
        address: plutusAddress2Address(this.t.network, datum.owner),
        assets,
      };
      totalFund += datum.amount + datum.penaltyAmount;
      totalLiquidity += lpAmount;
      totalBonusRaise += bonusRaise;
      userOutputs.push(output);
    }
    const treasuryOutDatum: TreasuryDatum = {
      ...treasuryInDatum,
      collectedFund: treasuryInDatum.collectedFund - totalFund,
    };
    this.tasks.push(
      () => {
        this.treasuryInputs = [treasuryInput];
        this.treasuryRedeemer = "RedeemOrders";
        this.orderInputs = orderInputs;
        this.orderRedeemer = "RedeemOrder";
        this.mintRedeemer = "MintRedeemOrders";
      },
      () => {
        this.payingTreasuryOutput({
          treasuryOutDatum,
          deltaLp: totalLiquidity,
          deltaRaise: totalBonusRaise,
        });
      },
      () => {
        for (const output of userOutputs) {
          this.tx.payToAddress(output.address, output.assets);
        }
      },
      () => {
        this.spendingTreasuryInput();
      },
      () => {
        this.spendingOrderInput();
      },
      () => {
        this.mintingOrderToken(-1n * BigInt(orderInputs.length));
      },
      () => {
        this.tx.validFrom(validFrom).validTo(validTo);
      },
      () => {
        this.withdrawFromFactory();
      },
      () => {
        WarehouseBuilder.addMetadataMessage(this.tx, LBE_MESSAGE_REDEEM_ORDERS);
      },
    );
    return this;
  }

  public buildRefundOrders(
    options: BuildRedeemOrdersOptions,
  ): WarehouseBuilder {
    const { treasuryInput, orderInputs, validFrom, validTo } = options;
    invariant(treasuryInput.datum);
    const treasuryInDatum = WarehouseBuilder.fromDatumTreasury(
      treasuryInput.datum,
    );
    this.setInnerAssets(treasuryInDatum.baseAsset, treasuryInDatum.raiseAsset);
    invariant(this.ammLpToken);
    const sortedOrders = sortUTxOs(orderInputs);
    let totalRaise = 0n;
    let totalPenalty = 0n;
    const userOutputs: { address: Address; assets: Assets }[] = [];
    const raiseAsset = toUnit(
      this.raiseAsset!.policyId,
      this.raiseAsset!.assetName,
    );
    for (const order of sortedOrders) {
      invariant(order.datum);
      const { penaltyAmount, amount, owner } = WarehouseBuilder.fromDatumOrder(
        order.datum,
      );
      const assets: Record<string, bigint> = {
        lovelace: ORDER_MIN_ADA,
      };
      assets[raiseAsset] = assets[raiseAsset]
        ? assets[raiseAsset] + amount + penaltyAmount
        : amount + penaltyAmount;
      const output: { address: Address; assets: Assets } = {
        address: plutusAddress2Address(this.t.network, owner),
        assets,
      };
      totalRaise += amount;
      totalPenalty += penaltyAmount;
      userOutputs.push(output);
    }
    const treasuryOutDatum: TreasuryDatum = {
      ...treasuryInDatum,
      collectedFund: treasuryInDatum.collectedFund - totalRaise - totalPenalty,
      reserveRaise: treasuryInDatum.reserveRaise - totalRaise,
      totalPenalty: treasuryInDatum.totalPenalty - totalPenalty,
    };
    this.tasks.push(
      () => {
        this.treasuryInputs = [treasuryInput];
        this.treasuryRedeemer = "RedeemOrders";
        this.orderInputs = orderInputs;
        this.orderRedeemer = "RedeemOrder";
        this.mintRedeemer = "MintRedeemOrders";
      },
      () => {
        this.payingTreasuryOutput({
          treasuryOutDatum,
          deltaLp: 0n,
          deltaRaise: totalRaise + totalPenalty,
        });
      },
      () => {
        for (const output of userOutputs) {
          this.tx.payToAddress(output.address, output.assets);
        }
      },
      () => {
        this.spendingTreasuryInput();
      },
      () => {
        this.spendingOrderInput();
      },
      () => {
        this.mintingOrderToken(-1n * BigInt(orderInputs.length));
      },
      () => {
        this.tx.validFrom(validFrom).validTo(validTo);
      },
      () => {
        this.withdrawFromFactory();
      },
      () => {
        WarehouseBuilder.addMetadataMessage(this.tx, LBE_MESSGAE_REFUND_ORDERS);
      },
    );
    return this;
  }

  public buildCollectOrders(
    options: BuildCollectOrdersOptions,
  ): WarehouseBuilder {
    const { treasuryInput, orderInputs, validFrom, validTo } = options;
    invariant(treasuryInput.datum);
    const treasuryInDatum = WarehouseBuilder.fromDatumTreasury(
      treasuryInput.datum,
    );
    let treasuryOutDatum: TreasuryDatum = {
      ...treasuryInDatum,
    };
    const orderOutDatums: OrderDatum[] = [];
    let deltaCollectedFund = 0n;

    const sortedOrders = sortUTxOs(orderInputs);
    for (const o of sortedOrders) {
      invariant(o.datum);
      const datum: OrderDatum = {
        ...WarehouseBuilder.fromDatumOrder(o.datum),
        isCollected: true,
      };
      orderOutDatums.push(datum);
      deltaCollectedFund += datum.amount + datum.penaltyAmount;
    }
    treasuryOutDatum = {
      ...treasuryOutDatum,
      collectedFund: treasuryOutDatum.collectedFund + deltaCollectedFund,
    };

    this.tasks.push(
      () => {
        this.treasuryInputs = [treasuryInput];
        this.treasuryRedeemer = "CollectOrders";
        this.orderInputs = orderInputs;
        this.orderRedeemer = "CollectOrder";
      },
      () => {
        this.spendingTreasuryInput();
      },
      () => {
        this.spendingOrderInput();
      },
      () => {
        this.payingTreasuryOutput({ treasuryOutDatum, deltaCollectedFund });
      },
      () => {
        this.payingOrderOutput(...orderOutDatums);
      },
      () => {
        this.tx.validFrom(validFrom).validTo(validTo);
      },
      () => {
        this.withdrawFromFactory();
      },
      () => {
        WarehouseBuilder.addMetadataMessage(
          this.tx,
          LBE_MESSAGE_COLLECT_ORDERS,
        );
      },
    );
    return this;
  }

  public buildCollectManager(
    options: BuildCollectManagerOptions,
  ): WarehouseBuilder {
    const { treasuryInput, managerInput, validFrom, validTo } = options;
    invariant(treasuryInput.datum);
    const treasuryInDatum = WarehouseBuilder.fromDatumTreasury(
      treasuryInput.datum,
    );
    invariant(managerInput.datum);
    const managerInDatum = WarehouseBuilder.fromDatumManager(
      managerInput.datum,
    );
    const treasuryOutDatum = options.treasuryOutDatum ?? {
      ...treasuryInDatum,
      reserveRaise: managerInDatum.reserveRaise,
      totalPenalty: managerInDatum.totalPenalty,
      isManagerCollected: true,
    };
    this.tasks.push(
      () => {
        this.treasuryInputs = [treasuryInput];
        this.treasuryRedeemer = "CollectManager";
        this.managerInputs = [managerInput];
        this.managerRedeemer = "SpendManager";
        this.mintRedeemer = "MintManager";
      },
      () => {
        this.spendingManagerInput();
      },
      () => {
        this.spendingTreasuryInput();
      },
      () => {
        this.mintingManagerToken();
      },
      () => {
        this.payingTreasuryOutput({ treasuryOutDatum });
      },
      () => {
        this.tx.validFrom(validFrom).validTo(validTo);
      },
      () => {
        WarehouseBuilder.addMetadataMessage(
          this.tx,
          LBE_MESSAGE_COLLECT_MANAGER,
        );
      },
    );
    return this;
  }

  public buildCollectSeller(
    options: BuildCollectSellersOptions,
  ): WarehouseBuilder {
    const { treasuryRefInput, managerInput, validFrom, validTo } = options;
    const sellerInputs = sortUTxOs(options.sellerInputs) as LbeUTxO[];
    invariant(managerInput.datum);
    const managerInDatum = WarehouseBuilder.fromDatumManager(
      managerInput.datum,
    );
    invariant(
      sellerInputs.length >= MINIMUM_SELLER_COLLECTED ||
        managerInDatum.sellerCount === BigInt(sellerInputs.length),
      `Collect all sellers or at least ${MINIMUM_SELLER_COLLECTED}`,
    );
    let totalReserveRaise = 0n;
    let totalPenalty = 0n;
    for (const seller of sellerInputs) {
      invariant(seller.datum);
      const datum = WarehouseBuilder.fromDatumSeller(seller.datum);
      totalReserveRaise += datum.amount;
      totalPenalty += datum.penaltyAmount;
    }
    const managerOutDatum: ManagerDatum = {
      ...managerInDatum,
      sellerCount: managerInDatum.sellerCount - BigInt(sellerInputs.length),
      reserveRaise: managerInDatum.reserveRaise + totalReserveRaise,
      totalPenalty: managerInDatum.totalPenalty + totalPenalty,
    };
    const mintSellerCount = -1n * BigInt(sellerInputs.length);
    this.tasks.push(
      () => {
        this.managerRedeemer = "CollectSellers";
        this.managerInputs = [managerInput];
        this.treasuryRefInput = treasuryRefInput;
        this.sellerInputs = sellerInputs;
        this.sellerRedeemer = "CountingSeller";
        this.mintRedeemer = "BurnSeller";
      },
      () => {
        this.spendingManagerInput();
      },
      () => {
        this.spendingSellerInput();
      },
      () => {
        this.mintingSellerToken(mintSellerCount);
      },
      () => {
        this.payingManagerOutput(managerOutDatum);
      },
      () => {
        for (const utxo of sellerInputs) {
          const sellerDatum = WarehouseBuilder.fromDatumSeller(utxo.datum);
          const assets = {
            lovelace: utxo.assets["lovelace"] - COLLECT_SELLER_COMMISSION,
          };
          this.tx.payToAddress(
            plutusAddress2Address(this.t.network, sellerDatum.owner),
            assets,
          );
        }
      },
      () => {
        this.tx.validFrom(validFrom).validTo(validTo);
      },
      () => {
        WarehouseBuilder.addMetadataMessage(
          this.tx,
          LBE_MESSAGE_COUNTING_SELLERS,
        );
      },
    );
    return this;
  }

  /************************* PARSER  *************************/
  static fromDatumTreasury(rawDatum: string): TreasuryDatum {
    return T.Data.from(
      rawDatum,
      TreasuryValidateTreasurySpending.treasuryInDatum,
    );
  }

  static toDatumTreasury(datum: TreasuryDatum): string {
    return T.Data.to(datum, TreasuryValidateTreasurySpending.treasuryInDatum);
  }

  static fromDatumFactory(rawDatum: string): FactoryDatum {
    return T.Data.from(rawDatum, FactoryValidateFactory.datum);
  }

  static toDatumFactory(datum: FactoryDatum) {
    return T.Data.to(datum, FactoryValidateFactory.datum);
  }

  static fromDatumSeller(rawDatum: string): SellerDatum {
    return T.Data.from(rawDatum, SellerValidateSellerSpending.sellerInDatum);
  }

  static toDatumSeller(datum: SellerDatum): string {
    return T.Data.to(datum, SellerValidateSellerSpending.sellerInDatum);
  }

  static fromDatumOrder(rawDatum: string): OrderDatum {
    return T.Data.from(rawDatum, OrderValidateOrder.datum);
  }

  static toDatumOrder(datum: OrderDatum): string {
    return T.Data.to(datum, OrderValidateOrder.datum);
  }

  static fromDatumManager(rawDatum: string): ManagerDatum {
    return T.Data.from(rawDatum, ManagerValidateManagerSpending.managerInDatum);
  }

  static toDatumManager(datum: ManagerDatum): string {
    return T.Data.to(datum, ManagerValidateManagerSpending.managerInDatum);
  }

  static toRedeemerOrder(redeemer: OrderRedeemer): string {
    return T.Data.to(redeemer, OrderValidateOrder.redeemer);
  }

  static toRedeemerTreasury(redeemer: TreasuryRedeemer): string {
    return T.Data.to(redeemer, TreasuryValidateTreasurySpending.redeemer);
  }

  static toRedeemerManager(redeemer: ManagerRedeemer): string {
    return T.Data.to(redeemer, ManagerValidateManagerSpending.redeemer);
  }

  static toRedeemerSellerSpend(redeemer: SellerRedeemer): string {
    return T.Data.to(redeemer, SellerValidateSellerSpending.redeemer);
  }

  static toRedeemerFactory(redeemer: FactoryRedeemer): string {
    return T.Data.to(redeemer, FactoryValidateFactory.redeemer);
  }

  static toRedeemerMinting(redeemer: MintRedeemer): string {
    return T.Data.to(redeemer, FactoryValidateFactoryMinting.redeemer);
  }

  static toDatumAmmPool(datum: AmmPoolDatum): string {
    return T.Data.to(datum, FeedTypeAmmPool._datum);
  }

  static fromDatumAmmFactory(rawDatum: string): AmmFactoryDatum {
    return T.Data.from(rawDatum, AmmValidateFactory.datum);
  }

  calFinalReserveRaise(datum: TreasuryDatum) {
    if (
      datum.maximumRaise &&
      datum.reserveRaise + datum.totalPenalty > datum.maximumRaise
    ) {
      return datum.maximumRaise;
    } else {
      return datum.reserveRaise + datum.totalPenalty;
    }
  }

  setBaseAsset(baseAsset: BluePrintAsset) {
    this.baseAsset = baseAsset;
  }

  setRaiseAsset(raiseAsset: BluePrintAsset) {
    this.raiseAsset = raiseAsset;
  }

  setLpAssetName() {
    invariant(this.baseAsset);
    invariant(this.raiseAsset);
    this.lpAssetName = computeLPAssetName(
      this.baseAsset.policyId + this.baseAsset.assetName,
      this.raiseAsset.policyId + this.raiseAsset.assetName,
    );
  }

  setAmmLpToken() {
    invariant(this.baseAsset);
    const lpToken = toUnit(this.ammAuthenHash, this.lpAssetName);
    this.ammLpToken = lpToken;
  }

  setInnerAssets(baseAsset: BluePrintAsset, raiseAsset: BluePrintAsset) {
    this.setBaseAsset(baseAsset);
    this.setRaiseAsset(raiseAsset);
    this.setLpAssetName();
    this.setAmmLpToken();
  }

  /************************* SPENDING  *************************/
  spendingManagerInput() {
    if (this.managerInputs.length == 0) {
      return;
    }
    invariant(this.managerRedeemer);
    this.tx
      .readFrom([this.deployedValidators["managerValidator"]])
      .collectFrom(
        this.managerInputs,
        WarehouseBuilder.toRedeemerManager(this.managerRedeemer),
      );
  }

  spendingSellerInput() {
    if (this.sellerInputs.length === 0) {
      return;
    }
    invariant(this.sellerRedeemer);
    invariant(this.treasuryRefInput);
    this.tx
      .readFrom([this.treasuryRefInput])
      .readFrom([this.deployedValidators["sellerValidator"]])
      .collectFrom(
        this.sellerInputs,
        WarehouseBuilder.toRedeemerSellerSpend(this.sellerRedeemer),
      );
  }

  spendingFactoryInput() {
    if (this.factoryInputs.length === 0) {
      return;
    }
    invariant(this.factoryRedeemer);
    this.tx
      .readFrom([this.deployedValidators["factoryValidator"]])
      .collectFrom(
        this.factoryInputs,
        WarehouseBuilder.toRedeemerFactory(this.factoryRedeemer),
      );
  }

  spendingOrderInput() {
    if (this.orderInputs.length === 0) {
      return;
    }
    invariant(this.orderRedeemer);
    this.tx
      .readFrom([this.deployedValidators["orderValidator"]])
      .collectFrom(
        this.orderInputs,
        WarehouseBuilder.toRedeemerOrder(this.orderRedeemer),
      );
  }

  spendingTreasuryInput() {
    if (this.treasuryInputs.length === 0) {
      return;
    }
    invariant(this.treasuryRedeemer);
    this.tx
      .readFrom([this.deployedValidators["treasuryValidator"]])
      .collectFrom(
        this.treasuryInputs,
        WarehouseBuilder.toRedeemerTreasury(this.treasuryRedeemer),
      );
  }

  /************************* PAYING  *************************/
  payingTreasuryOutput(options: {
    treasuryOutDatum: TreasuryDatum;
    deltaCollectedFund?: bigint;
    deltaLp?: bigint;
    deltaRaise?: bigint;
  }) {
    const { treasuryOutDatum, deltaCollectedFund, deltaLp, deltaRaise } =
      options;
    const innerPay = (assets: Assets) => {
      this.tx.payToAddressWithData(
        this.treasuryAddress,
        {
          inline: WarehouseBuilder.toDatumTreasury(treasuryOutDatum),
        },
        assets,
      );
    };
    const isCancelLBE = (
      redeemer: TreasuryRedeemer,
    ): redeemer is { CancelLBE: any } => {
      return (
        typeof redeemer === "object" &&
        redeemer !== null &&
        "CancelLBE" in redeemer
      );
    };
    const defaultAssets = () => {
      invariant(this.treasuryInputs.length > 0);
      const assets = { ...this.treasuryInputs[0].assets };
      return assets;
    };
    const createPoolAssets = () => {
      invariant(this.ammLpToken);
      const assets = {
        lovelace: TREASURY_MIN_ADA,
        [this.treasuryToken]: 1n,
        [this.ammLpToken]: treasuryOutDatum.totalLiquidity,
      };
      const raiseAsset = toUnit(
        treasuryOutDatum.raiseAsset.policyId,
        treasuryOutDatum.raiseAsset.assetName,
      );
      assets[raiseAsset] =
        (assets[raiseAsset] ?? 0n) +
        (treasuryOutDatum.collectedFund -
          this.calFinalReserveRaise(treasuryOutDatum));
      return assets;
    };
    const redeemAssets = () => {
      invariant(this.treasuryInputs.length > 0);
      invariant(this.ammLpToken);
      invariant(deltaLp !== undefined);
      invariant(deltaRaise !== undefined);
      const assets = { ...this.treasuryInputs[0].assets };
      assets[this.ammLpToken] = (assets[this.ammLpToken] ?? 0n) - deltaLp;
      const raiseAsset = toUnit(
        treasuryOutDatum.raiseAsset.policyId,
        treasuryOutDatum.raiseAsset.assetName,
      );
      assets[raiseAsset] = (assets[raiseAsset] ?? 0n) - deltaRaise;
      if (assets[this.ammLpToken] === 0n) {
        delete assets[this.ammLpToken];
      }
      return assets;
    };
    const collectOrders = () => {
      invariant(this.treasuryInputs.length > 0);
      const assets = { ...this.treasuryInputs[0].assets };
      invariant(deltaCollectedFund);
      const raiseAsset = toUnit(
        treasuryOutDatum.raiseAsset.policyId,
        treasuryOutDatum.raiseAsset.assetName,
      );
      assets[raiseAsset] = (assets[raiseAsset] ?? 0n) + deltaCollectedFund;
      return assets;
    };
    const createTreasury = () => {
      const baseAsset = toUnit(
        treasuryOutDatum.baseAsset.policyId,
        treasuryOutDatum.baseAsset.assetName,
      );
      const assets = {
        [this.treasuryToken]: 1n,
        [baseAsset]: treasuryOutDatum.reserveBase,
        lovelace: TREASURY_MIN_ADA + CREATE_POOL_COMMISSION,
      };
      return assets;
    };
    const cases: Record<string, () => Assets> = {
      "": createTreasury,
      CollectManager: defaultAssets,
      RedeemOrders: redeemAssets,
      CancelLBE: defaultAssets,
      UpdateLBE: createTreasury,
      CreateAmmPool: createPoolAssets,
      CollectOrders: collectOrders,
    };
    let treasuryCase: string = "";
    if (this.treasuryRedeemer) {
      treasuryCase = isCancelLBE(this.treasuryRedeemer)
        ? "CancelLBE"
        : this.treasuryRedeemer;
    }
    const assets = cases[treasuryCase]();
    innerPay(assets);
  }

  payingManagerOutput(datum: ManagerDatum) {
    this.tx.payToAddressWithData(
      this.managerAddress,
      {
        inline: WarehouseBuilder.toDatumManager(datum),
      },
      {
        [this.managerToken]: 1n,
        lovelace: MANAGER_MIN_ADA,
      },
    );
  }

  payingOrderOutput(...orderDatums: OrderDatum[]) {
    const innerPay = (datum: OrderDatum) => {
      const assets = {
        [this.orderToken]: 1n,
        lovelace:
          ORDER_MIN_ADA +
          (datum.isCollected ? ORDER_COMMISSION : ORDER_COMMISSION * 2n),
      };
      const raiseAsset = toUnit(
        datum.raiseAsset.policyId,
        datum.raiseAsset.assetName,
      );
      if (this.treasuryInputs.length > 0) {
        // collecting orders
      } else {
        assets[raiseAsset] =
          (assets[raiseAsset] ?? 0n) + datum.amount + datum.penaltyAmount;
      }
      this.tx.payToAddressWithData(
        this.orderAddress,
        {
          inline: WarehouseBuilder.toDatumOrder(datum),
        },
        assets,
      );
    };
    for (const datum of orderDatums) {
      innerPay(datum);
    }
  }

  innerPaySeller(datum: SellerDatum, newOrderCount?: bigint) {
    if (newOrderCount === undefined) {
      this.tx.payToAddressWithData(
        this.sellerAddress,
        {
          inline: WarehouseBuilder.toDatumSeller(datum),
        },
        {
          [this.sellerToken]: 1n,
          lovelace: SELLER_MIN_ADA,
        },
      );
    } else {
      const sellerInput = this.sellerInputs[0];
      const assets = { ...sellerInput.assets };
      assets["lovelace"] =
        assets["lovelace"] + (newOrderCount ?? 0n) * SELLER_COMMISSION;
      this.tx.payToAddressWithData(
        this.sellerAddress,
        {
          inline: WarehouseBuilder.toDatumSeller(datum),
        },
        assets,
      );
    }
  }

  payingSellerOutput(
    option: {
      owner?: Address;
      addSellerCount?: bigint;
      outDatum?: SellerDatum;
      newOrderCount?: bigint;
    } = {
      addSellerCount: undefined,
      outDatum: undefined,
      owner: undefined,
      newOrderCount: 0n,
    },
  ) {
    const { addSellerCount, outDatum, owner, newOrderCount } = option;
    if (this.sellerInputs.length) {
      // Using seller
      invariant(outDatum);
      this.innerPaySeller(outDatum, newOrderCount);
    } else {
      // adding sellers
      invariant(owner);
      const sellerDatum: SellerDatum = {
        factoryPolicyId: this.factoryHash,
        baseAsset: this.baseAsset!,
        raiseAsset: this.raiseAsset!,
        amount: 0n,
        penaltyAmount: 0n,
        owner: address2PlutusAddress(owner),
      };
      invariant(addSellerCount);
      for (let i = 0n; i < addSellerCount; i++) {
        this.innerPaySeller(sellerDatum);
      }
    }
  }

  innerPayFactory(datum: FactoryDatum) {
    this.tx.payToAddressWithData(
      this.factoryAddress,
      {
        inline: WarehouseBuilder.toDatumFactory(datum),
      },
      {
        [this.factoryToken]: 1n,
      },
    );
  }

  payingFactoryOutput() {
    const cases: Record<number, () => void> = {
      // Init System
      0: () => {
        const factoryDatum: FactoryDatum = {
          head: LBE_INIT_FACTORY_HEAD,
          tail: LBE_INIT_FACTORY_TAIL,
        };
        this.innerPayFactory(factoryDatum);
      },
      // Create Treasury
      1: () => {
        invariant(this.factoryInputs.length == 1);
        invariant(this.factoryInputs[0].datum);
        invariant(this.lpAssetName);
        const factoryDatum = WarehouseBuilder.fromDatumFactory(
          this.factoryInputs[0].datum,
        );
        const newFactoryHeadDatum: FactoryDatum = {
          head: factoryDatum.head,
          tail: this.lpAssetName,
        };
        const newFactoryTailDatum: FactoryDatum = {
          head: this.lpAssetName,
          tail: factoryDatum.tail,
        };
        this.innerPayFactory(newFactoryHeadDatum);
        this.innerPayFactory(newFactoryTailDatum);
      },
      // Remove Treasury
      2: () => {
        invariant(this.factoryInputs.length == 2);
        const [headInput, tailInput] = this.factoryInputs;
        invariant(headInput.datum);
        invariant(tailInput.datum);
        const headDatum = WarehouseBuilder.fromDatumFactory(headInput.datum);
        const tailDatum = WarehouseBuilder.fromDatumFactory(tailInput.datum);
        const newDatum = {
          head: headDatum.head,
          tail: tailDatum.tail,
        };
        this.innerPayFactory(newDatum);
      },
    };

    cases[this.factoryInputs.length]();
  }

  /************************* WITHDRAW *************************/
  /**
   * @deprecated
   */
  withdrawFromSeller() {
    this.tx
      .readFrom([this.deployedValidators["sellerValidator"]])
      .withdraw(this.sellerRewardAddress, 0n, DUMMY_REDEEMER);
  }

  /**
   * @deprecated
   */
  withdrawFromTreasury() {
    this.tx
      .readFrom([this.deployedValidators["treasuryValidator"]])
      .withdraw(this.treasuryRewardAddress, 0n, DUMMY_REDEEMER);
  }

  withdrawFromFactory() {
    this.tx
      .readFrom([this.deployedValidators["factoryValidator"]])
      .withdraw(
        this.factoryRewardAddress,
        0n,
        WarehouseBuilder.toRedeemerMinting("ManageOrder"),
      );
  }

  /************************* MINTING *************************/
  mintingTreasuryToken() {
    invariant(this.mintRedeemer);
    const cases: Record<number, bigint> = {
      1: 1n,
      2: -1n,
    };
    const amount = cases[this.factoryInputs.length];
    this.tx.readFrom([this.deployedValidators["factoryValidator"]]).mintAssets(
      {
        [this.treasuryToken]: amount,
      },
      WarehouseBuilder.toRedeemerMinting(this.mintRedeemer),
    );
  }

  mintingManagerToken() {
    invariant(this.mintRedeemer);
    let amount = this.treasuryInputs.length > 0 ? -1n : 1n;
    this.tx.readFrom([this.deployedValidators["factoryValidator"]]).mintAssets(
      {
        [this.managerToken]: amount,
      },
      WarehouseBuilder.toRedeemerMinting(this.mintRedeemer),
    );
  }

  mintingSellerToken(mintAmount: bigint) {
    if (!mintAmount) {
      return;
    }
    invariant(this.mintRedeemer);
    this.tx.readFrom([this.deployedValidators["factoryValidator"]]).mintAssets(
      {
        [this.sellerToken]: mintAmount,
      },
      WarehouseBuilder.toRedeemerMinting(this.mintRedeemer),
    );
  }

  mintingOrderToken(mintAmount: bigint) {
    if (mintAmount == 0n) {
      return;
    }
    invariant(this.mintRedeemer);
    this.tx.readFrom([this.deployedValidators["factoryValidator"]]).mintAssets(
      {
        [this.orderToken]: mintAmount,
      },
      WarehouseBuilder.toRedeemerMinting(this.mintRedeemer),
    );
  }

  mintingFactoryToken(options?: {
    baseAsset: BluePrintAsset;
    raiseAsset: BluePrintAsset;
  }) {
    const cases: Record<number, bigint> = {
      0: 1n,
      1: 1n,
      2: -1n,
    };
    const amount = cases[this.factoryInputs.length];
    let redeemer: MintRedeemer;
    if (this.factoryInputs.length > 0) {
      invariant(options);
      const redeemerCases: Record<number, MintRedeemer> = {
        1: { CreateTreasury: options },
        2: { CloseTreasury: options },
      };
      redeemer = redeemerCases[this.factoryInputs.length];
    } else {
      redeemer = "Initialization";
    }
    this.tx.readFrom([this.deployedValidators["factoryValidator"]]).mintAssets(
      {
        [this.factoryToken]: amount,
      },
      WarehouseBuilder.toRedeemerMinting(redeemer),
    );
  }

  /************************* AMM *************************/
  _buildCreateAmmPool(options: {
    poolDatum: FeedTypeAmmPool["_datum"];
    factoryInput: UTxO;
  }) {
    const { poolDatum, factoryInput } = options;
    invariant(factoryInput.datum);
    const factoryDatum = T.Data.from(
      factoryInput.datum,
      AmmValidateFactory.datum,
    );
    const factoryRedeemer: AmmValidateFactory["redeemer"] = {
      assetA: poolDatum.assetA,
      assetB: poolDatum.assetB,
    };
    const lpAssetName = computeLPAssetName(
      poolDatum.assetA.policyId + poolDatum.assetA.assetName,
      poolDatum.assetB.policyId + poolDatum.assetB.assetName,
    );
    const lpToken = toUnit(this.ammAuthenHash, lpAssetName);
    invariant(this.ammLpToken);
    const mintAssets: Assets = {
      [this.ammFactoryToken]: 1n,
      [this.ammPoolToken]: 1n,
      [this.ammLpToken]: MINSWAP_V2_MAX_LIQUIDITY,
    };
    const headFactoryDatum: AmmValidateFactory["datum"] = {
      head: factoryDatum.head,
      tail: lpAssetName,
    };
    const tailFactoryDatum: AmmValidateFactory["datum"] = {
      head: lpAssetName,
      tail: factoryDatum.tail,
    };
    const initialLiquidity = calculateInitialLiquidity(
      poolDatum.reserveA,
      poolDatum.reserveB,
    );
    const remainingLiquidity =
      MINSWAP_V2_MAX_LIQUIDITY - (initialLiquidity - LP_COLATERAL);
    const poolAssets = {
      lovelace: MINSWAP_V2_DEFAULT_POOL_ADA,
      [this.ammPoolToken]: 1n,
      [lpToken]: remainingLiquidity,
    };
    const unitA = toUnit(poolDatum.assetA.policyId, poolDatum.assetA.assetName);
    const unitB = toUnit(poolDatum.assetB.policyId, poolDatum.assetB.assetName);
    poolAssets[unitA] = (poolAssets[unitA] ?? 0n) + poolDatum.reserveA;
    poolAssets[unitB] = (poolAssets[unitB] ?? 0n) + poolDatum.reserveB;
    this.tx
      .readFrom([
        this.ammDeployedValidators["authenValidator"],
        this.ammDeployedValidators["factoryValidator"],
      ])
      .collectFrom(
        [factoryInput],
        T.Data.to(factoryRedeemer, AmmValidateFactory.redeemer),
      )
      .mintAssets(
        mintAssets,
        T.Data.to("CreatePool", AmmValidateAuthen.redeemer),
      )
      .payToAddressWithData(
        this.ammFactoryAddress,
        {
          inline: T.Data.to(headFactoryDatum, AmmValidateFactory.datum),
        },
        {
          [this.ammFactoryToken]: 1n,
        },
      )
      .payToAddressWithData(
        this.ammFactoryAddress,
        {
          inline: T.Data.to(tailFactoryDatum, AmmValidateFactory.datum),
        },
        {
          [this.ammFactoryToken]: 1n,
        },
      )
      .payToAddressWithData(
        this.ammPoolAddress,
        {
          inline: WarehouseBuilder.toDatumAmmPool(poolDatum),
        },
        poolAssets,
      );
  }

  static addMetadataMessage(tx: Tx, msg: string) {
    tx.attachMetadata(LABEL_MESSAGE_METADATA, { msg: [msg] });
  }
}
