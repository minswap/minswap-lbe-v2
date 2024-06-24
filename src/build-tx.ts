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
  DEFAULT_NUMBER_SELLER,
  DUMMY_REDEEMER,
  FACTORY_AUTH_AN,
  LBE_FEE,
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
} from "./constants";
import type {
  DeployMinswapValidators,
  DeployedValidators,
  MinswapValidators,
  Validators,
} from "./deploy-validators";
import type {
  Address,
  AmmPoolDatum,
  Assets,
  BluePrintAsset,
  Datum,
  FactoryDatum,
  FactoryRedeemer,
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
  plutusAddress2Address,
  sortUTxOs,
  toUnit,
} from "./utils";

export type WarehouseBuilderOptions = {
  t: Translucent;
  validators: Validators;
  deployedValidators: DeployedValidators;
  ammValidators: MinswapValidators;
  ammDeployedValidators: DeployMinswapValidators;
};

export type BuildInitFactoryOptions = {
  seedUtxo: UTxO;
};

export type BuildCreateTreasuryOptions = {
  factoryUtxo: UTxO;
  treasuryDatum: TreasuryDatum;
  validFrom: UnixTime;
  validTo: UnixTime;
  extraDatum?: Datum; // the datum of treasuryDatum.receiverDatum
};

export type BuildAddSellersOptions = {
  treasuryRefUtxo: UTxO;
  managerUtxo: UTxO;
  addSellerCount: bigint;
  validFrom: UnixTime;
  validTo: UnixTime;
};

export type BuildUsingSellerOptions = {
  treasuryRefInput: UTxO;
  sellerUtxo: UTxO;
  validFrom: UnixTime;
  validTo: UnixTime;
  owners: Address[];
  orderInputs: UTxO[];
  orderOutputDatums: OrderDatum[];
};

export type BuildCollectManagerOptions = {
  treasuryInput: UTxO;
  managerInput: UTxO;
  validFrom: UnixTime;
  validTo: UnixTime;
  // allow pass datum as testing purpose
  treasuryOutDatum?: TreasuryDatum;
};

export type BuildCollectSellersOptions = {
  treasuryRefInput: UTxO;
  managerInput: UTxO;
  sellerInputs: UTxO[];
  validFrom: UnixTime;
  validTo: UnixTime;
};

export type BuildCollectOrdersOptions = {
  treasuryInput: UTxO;
  orderInputs: UTxO[];
  validFrom: UnixTime;
  validTo: UnixTime;
};

export type BuildUpdateLBEOptions = {
  treasuryInput: UTxO;
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
  penaltyConfig?: { penaltyStartTime: bigint; percent: bigint };
};

export type BuildCancelLBEOptions = {
  treasuryInput: UTxO;
  ammFactoryRefInput?: UTxO;
  validFrom: UnixTime;
  validTo: UnixTime;
  reason: "CreatedPool" | "ByOwner" | "NotReachMinimum";
};

export type BuildCreateAmmPoolOptions = {
  treasuryInput: UTxO;
  ammFactoryInput: UTxO;
  ammPoolDatum: FeedTypeAmmPool["_datum"];
  validFrom: UnixTime;
  validTo: UnixTime;
  totalLiquidity: bigint;
  receiverA: bigint;
  receiverB: bigint;
  extraDatum?: Datum; // Datum of TreasuryDatum.receiverDatum
};

export type BuildRedeemOrdersOptions = {
  treasuryInput: UTxO;
  orderInputs: UTxO[];
  validFrom: UnixTime;
  validTo: UnixTime;
};

export type BuildCloseEventOptions = {
  treasuryInput: UTxO;
  factoryInputs: UTxO[]; // [Head Factory Input, Tail Factory Input]
  validFrom: UnixTime;
  validTo: UnixTime;
};

export class WarehouseBuilder {
  t: Translucent;
  validators: Validators;
  deployedValidators: DeployedValidators;
  tx: Tx;
  tasks: Array<() => void> = [];

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

  // Reference Input
  treasuryRefInput: UTxO | undefined;

  // Inputs
  treasuryInputs: UTxO[] = [];
  managerInputs: UTxO[] = [];
  factoryInputs: UTxO[] = [];
  orderInputs: UTxO[] = [];
  sellerInputs: UTxO[] = [];

  // Redeemer
  factoryRedeemer: FactoryRedeemer | undefined;
  treasuryRedeemer: TreasuryRedeemer | undefined;
  managerRedeemer: ManagerRedeemer | undefined;
  sellerRedeemer: SellerRedeemer | undefined;
  orderRedeemer: OrderRedeemer | undefined;
  mintRedeemer: MintRedeemer | undefined;

  // AMM
  ammValidators: MinswapValidators;
  ammDeployedValidators: DeployMinswapValidators;
  ammFactoryAddress: Address;
  ammPoolAddress: Address;
  ammAuthenHash: string;
  ammPoolHash: string;
  ammFactoryHash: string;
  ammPoolToken: string;
  ammFactoryToken: string;

  // Internal Asset
  baseAsset: BluePrintAsset | undefined;
  raiseAsset: BluePrintAsset | undefined;
  lpAssetName: string | undefined;
  ammLpToken: string | undefined;

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
    this.ammFactoryAddress = t.utils.validatorToAddress(
      ammValidators.factoryValidator,
    );
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

  public buildInitFactory(options: BuildInitFactoryOptions): WarehouseBuilder {
    const { seedUtxo } = options;
    this.tasks.push(
      () => {
        this.mintRedeemer = "Initialization";
      },
      () => {
        this.tx.collectFrom([seedUtxo]);
      },
      () => {
        this.mintingFactoryToken();
      },
      () => {
        this.payingFactoryOutput();
      },
    );
    return this;
  }

  public buildCreateTreasury(
    options: BuildCreateTreasuryOptions,
  ): WarehouseBuilder {
    const { factoryUtxo, treasuryDatum, validFrom, validTo, extraDatum } =
      options;
    const managerDatum: ManagerDatum = {
      factoryPolicyId: this.factoryHash,
      baseAsset: treasuryDatum.baseAsset,
      raiseAsset: treasuryDatum.raiseAsset,
      sellerCount: DEFAULT_NUMBER_SELLER,
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
        this.mintingSellerToken(DEFAULT_NUMBER_SELLER);
      },
      () => {
        this.payingManagerOutput(managerDatum);
      },
      () => {
        this.payingSellerOutput();
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
    );
    return this;
  }

  public buildAddSeller(options: BuildAddSellersOptions): WarehouseBuilder {
    const { addSellerCount, validFrom, validTo, treasuryRefUtxo, managerUtxo } =
      options;
    invariant(managerUtxo.datum);
    const managerInDatum = this.fromDatumManager(managerUtxo.datum);
    const managerOutDatum = {
      ...managerInDatum,
      sellerCount: managerInDatum.sellerCount + addSellerCount,
    };

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
        this.payingSellerOutput({ addSellerCount });
      },
      () => {
        this.tx
          .readFrom([treasuryRefUtxo])
          .validFrom(validFrom)
          .validTo(validTo);
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
    const sellerInDatum = this.fromDatumSeller(sellerUtxo.datum);
    let inputAmount = 0n;
    let inputPenaltyAmount = 0n;
    let outputAmount = 0n;
    let outputPenaltyAmount = 0n;
    for (const o of orderInputs) {
      invariant(o.datum);
      const datum = this.fromDatumOrder(o.datum);
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
        this.payingSellerOutput({ outDatum: sellerOutDatum });
      },
      () => {
        this.payingOrderOutput(...orderOutputDatums);
      },
      () => {
        this.tx.validFrom(validFrom).validTo(validTo);
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
    const inDatum = this.fromDatumTreasury(treasuryInput.datum);
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
    );
    return this;
  }

  public buildCancelLBE(options: BuildCancelLBEOptions): WarehouseBuilder {
    const { treasuryInput, validFrom, validTo, ammFactoryRefInput, reason } =
      options;
    invariant(treasuryInput.datum);
    const treasuryInDatum = this.fromDatumTreasury(treasuryInput.datum);
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
    );
    return this;
  }

  public buildCreateAmmPool(
    options: BuildCreateAmmPoolOptions,
  ): WarehouseBuilder {
    const {
      treasuryInput,
      ammFactoryInput,
      ammPoolDatum,
      validFrom,
      validTo,
      totalLiquidity,
      receiverA,
      receiverB,
      extraDatum,
    } = options;
    invariant(treasuryInput.datum);
    const treasuryInDatum = this.fromDatumTreasury(treasuryInput.datum);
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
        if (receiverA !== 0n) {
          assets[
            toUnit(ammPoolDatum.assetA.policyId, ammPoolDatum.assetA.assetName)
          ] = receiverA;
        }
        if (receiverB !== 0n) {
          assets[
            toUnit(ammPoolDatum.assetB.policyId, ammPoolDatum.assetB.assetName)
          ] = receiverB;
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
    );
    return this;
  }

  public buildCloseEvent(options: BuildCloseEventOptions): WarehouseBuilder {
    const { treasuryInput, factoryInputs, validFrom, validTo } = options;
    invariant(treasuryInput.datum);
    const treasuryDatum = this.fromDatumTreasury(treasuryInput.datum);
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
    );
    return this;
  }

  public buildRedeemOrders(
    options: BuildRedeemOrdersOptions,
  ): WarehouseBuilder {
    const { treasuryInput, orderInputs, validFrom, validTo } = options;
    invariant(treasuryInput.datum);
    const treasuryInDatum = this.fromDatumTreasury(treasuryInput.datum);
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
      const datum = this.fromDatumOrder(order.datum);
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
        this.payingTreasuryOutput({
          treasuryOutDatum,
          deltaLp: totalLiquidity,
          deltaRaise: totalBonusRaise,
        });
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
    );
    return this;
  }
  public buildRefundOrders(
    options: BuildRedeemOrdersOptions,
  ): WarehouseBuilder {
    const { treasuryInput, orderInputs, validFrom, validTo } = options;
    invariant(treasuryInput.datum);
    const treasuryInDatum = this.fromDatumTreasury(treasuryInput.datum);
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
      const { penaltyAmount, amount, owner } = this.fromDatumOrder(order.datum);
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
        this.payingTreasuryOutput({
          treasuryOutDatum,
          deltaLp: 0n,
          deltaRaise: totalRaise + totalPenalty,
        });
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
    );
    return this;
  }

  public buildCollectOrders(
    options: BuildCollectOrdersOptions,
  ): WarehouseBuilder {
    const { treasuryInput, orderInputs, validFrom, validTo } = options;
    invariant(treasuryInput.datum);
    const treasuryInDatum = this.fromDatumTreasury(treasuryInput.datum);
    let treasuryOutDatum: TreasuryDatum = {
      ...treasuryInDatum,
    };
    const orderOutDatums: OrderDatum[] = [];
    let deltaCollectedFund = 0n;

    const sortedOrders = sortUTxOs(orderInputs);
    for (const o of sortedOrders) {
      invariant(o.datum);
      const datum: OrderDatum = {
        ...this.fromDatumOrder(o.datum),
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
    );
    return this;
  }

  public buildCollectManager(
    options: BuildCollectManagerOptions,
  ): WarehouseBuilder {
    const { treasuryInput, managerInput, validFrom, validTo } = options;
    invariant(treasuryInput.datum);
    const treasuryInDatum = this.fromDatumTreasury(treasuryInput.datum);
    invariant(managerInput.datum);
    const managerInDatum = this.fromDatumManager(managerInput.datum);
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
    );
    return this;
  }

  public buildCollectSeller(
    options: BuildCollectSellersOptions,
  ): WarehouseBuilder {
    const { treasuryRefInput, managerInput, sellerInputs, validFrom, validTo } =
      options;
    invariant(managerInput.datum);
    const managerInDatum: ManagerDatum = this.fromDatumManager(
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
      const datum = this.fromDatumSeller(seller.datum);
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
        this.tx.validFrom(validFrom).validTo(validTo);
      },
    );
    return this;
  }

  /************************* PARSER  *************************/
  fromDatumTreasury(rawDatum: string): TreasuryDatum {
    return T.Data.from(
      rawDatum,
      TreasuryValidateTreasurySpending.treasuryInDatum,
    );
  }

  toDatumTreasury(datum: TreasuryDatum): string {
    return T.Data.to(datum, TreasuryValidateTreasurySpending.treasuryInDatum);
  }

  fromDatumFactory(rawDatum: string): FactoryDatum {
    return T.Data.from(rawDatum, FactoryValidateFactory.datum);
  }

  toDatumFactory(datum: FactoryDatum) {
    return T.Data.to(datum, FactoryValidateFactory.datum);
  }

  fromDatumSeller(rawDatum: string): SellerDatum {
    return T.Data.from(rawDatum, SellerValidateSellerSpending.sellerInDatum);
  }

  toDatumSeller(datum: SellerDatum): string {
    return T.Data.to(datum, SellerValidateSellerSpending.sellerInDatum);
  }

  fromDatumOrder(rawDatum: string): OrderDatum {
    return T.Data.from(rawDatum, OrderValidateOrder.datum);
  }

  toDatumOrder(datum: OrderDatum): string {
    return T.Data.to(datum, OrderValidateOrder.datum);
  }

  fromDatumManager(rawDatum: string): ManagerDatum {
    return T.Data.from(rawDatum, ManagerValidateManagerSpending.managerInDatum);
  }

  toDatumManager(datum: ManagerDatum): string {
    return T.Data.to(datum, ManagerValidateManagerSpending.managerInDatum);
  }

  toRedeemerOrder(redeemer: OrderRedeemer): string {
    return T.Data.to(redeemer, OrderValidateOrder.redeemer);
  }

  toRedeemerTreasury(redeemer: TreasuryRedeemer): string {
    return T.Data.to(redeemer, TreasuryValidateTreasurySpending.redeemer);
  }

  toRedeemerManager(redeemer: ManagerRedeemer): string {
    return T.Data.to(redeemer, ManagerValidateManagerSpending.redeemer);
  }

  toRedeemerSellerSpend(redeemer: SellerRedeemer): string {
    return T.Data.to(redeemer, SellerValidateSellerSpending.redeemer);
  }

  toRedeemerFactory(redeemer: FactoryRedeemer): string {
    return T.Data.to(redeemer, FactoryValidateFactory.redeemer);
  }

  toRedeemerMinting(redeemer: MintRedeemer): string {
    return T.Data.to(redeemer, FactoryValidateFactoryMinting.redeemer);
  }

  toDatumAmmPool(datum: AmmPoolDatum): string {
    return T.Data.to(datum, FeedTypeAmmPool._datum);
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
        this.toRedeemerManager(this.managerRedeemer),
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
        this.toRedeemerSellerSpend(this.sellerRedeemer),
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
        this.toRedeemerFactory(this.factoryRedeemer),
      );
  }

  spendingOrderInput() {
    if (this.orderInputs.length === 0) {
      return;
    }
    invariant(this.orderRedeemer);
    this.tx
      .readFrom([this.deployedValidators["orderValidator"]])
      .collectFrom(this.orderInputs, this.toRedeemerOrder(this.orderRedeemer));
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
        this.toRedeemerTreasury(this.treasuryRedeemer),
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
          inline: this.toDatumTreasury(treasuryOutDatum),
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
      assets[raiseAsset] -= deltaRaise;
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
        inline: this.toDatumManager(datum),
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
        lovelace: ORDER_MIN_ADA + (datum.isCollected ? LBE_FEE : LBE_FEE * 2n),
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
          inline: this.toDatumOrder(datum),
        },
        assets,
      );
    };
    for (const datum of orderDatums) {
      innerPay(datum);
    }
  }

  innerPaySeller(datum: SellerDatum) {
    this.tx.payToAddressWithData(
      this.sellerAddress,
      {
        inline: this.toDatumSeller(datum),
      },
      {
        [this.sellerToken]: 1n,
        lovelace: SELLER_MIN_ADA,
      },
    );
  }

  payingSellerOutput(
    option: {
      addSellerCount?: bigint;
      outDatum?: SellerDatum;
    } = { addSellerCount: undefined, outDatum: undefined },
  ) {
    const { addSellerCount, outDatum } = option;
    if (this.sellerInputs.length) {
      // Using seller
      invariant(outDatum);
      this.innerPaySeller(outDatum);
    } else if (this.managerInputs.length) {
      // collecting sellers
      invariant(this.managerInputs.length == 1);
      invariant(this.managerInputs[0].datum);
      const managerDatum = this.fromDatumManager(this.managerInputs[0].datum);
      const sellerDatum: SellerDatum = {
        factoryPolicyId: this.factoryHash,
        baseAsset: managerDatum.baseAsset,
        raiseAsset: managerDatum.raiseAsset,
        amount: 0n,
        penaltyAmount: 0n,
      };
      invariant(addSellerCount);
      for (let i = 0n; i < addSellerCount; i++) {
        this.innerPaySeller(sellerDatum);
      }
    } else {
      // create new treasury
      invariant(this.treasuryInputs.length === 0);
      invariant(this.factoryRedeemer);
      const baseAsset = (this.factoryRedeemer.wrapper as any)["CreateTreasury"]
        .baseAsset;
      const raiseAsset = (this.factoryRedeemer.wrapper as any)["CreateTreasury"]
        .raiseAsset;
      const sellerDatum: SellerDatum = {
        factoryPolicyId: this.factoryHash,
        baseAsset,
        raiseAsset,
        amount: 0n,
        penaltyAmount: 0n,
      };
      for (let i = 0; i < DEFAULT_NUMBER_SELLER; i++) {
        this.innerPaySeller(sellerDatum);
      }
    }
  }

  innerPayFactory(datum: FactoryDatum) {
    this.tx.payToAddressWithData(
      this.factoryAddress,
      {
        inline: this.toDatumFactory(datum),
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
        const factoryDatum = this.fromDatumFactory(this.factoryInputs[0].datum);
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
        const headDatum = this.fromDatumFactory(headInput.datum);
        const tailDatum = this.fromDatumFactory(tailInput.datum);
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
        this.toRedeemerMinting("ManageOrder"),
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
      this.toRedeemerMinting(this.mintRedeemer),
    );
  }

  mintingManagerToken() {
    invariant(this.mintRedeemer);
    let amount = this.treasuryInputs.length > 0 ? -1n : 1n;
    this.tx.readFrom([this.deployedValidators["factoryValidator"]]).mintAssets(
      {
        [this.managerToken]: amount,
      },
      this.toRedeemerMinting(this.mintRedeemer),
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
      this.toRedeemerMinting(this.mintRedeemer),
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
      this.toRedeemerMinting(this.mintRedeemer),
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
      this.toRedeemerMinting(redeemer),
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
          inline: this.toDatumAmmPool(poolDatum),
        },
        poolAssets,
      );
  }
}
