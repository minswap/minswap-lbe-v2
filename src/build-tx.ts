import * as T from "@minswap/translucent";
import {
  calculateInitialLiquidity,
  computeLPAssetName,
  plutusAddress2Address,
  sortUTxOs,
} from "./utils";
import {
  FactoryValidateFactory,
  FactoryValidateFactoryMinting,
  FeedTypeAmmPool,
  FeedTypeOrder,
  ManagerValidateManagerSpending,
  SellerValidateSellerSpending,
  TreasuryValidateTreasurySpending,
} from "../plutus";
import {
  AuthenMintingPolicyValidateAuthen as AmmValidateAuthen,
  FactoryValidatorValidateFactory as AmmValidateFactory,
} from "../amm-plutus";
import type {
  Address,
  Assets,
  BluePrintAsset,
  RewardAddress,
  Translucent,
  Tx,
  UTxO,
  UnixTime,
} from "./types";
import {
  DEFAULT_NUMBER_SELLER,
  DUMMY_REDEEMER,
  FACTORY_AUTH_AN,
  LBE_FEE,
  LBE_INIT_FACTORY_HEAD,
  LBE_INIT_FACTORY_TAIL,
  LBE_MIN_OUTPUT_ADA,
  LP_COLATERAL,
  MANAGER_AUTH_AN,
  MANAGER_MIN_ADA,
  MINSWAP_V2_DEFAULT_POOL_ADA,
  MINSWAP_V2_FACTORY_AUTH_AN,
  MINSWAP_V2_MAX_LIQUIDITY,
  MINSWAP_V2_POOL_AUTH_AN,
  ORDER_AUTH_AN,
  SELLER_AUTH_AN,
  SELLER_MIN_ADA,
  TREASURY_AUTH_AN,
  TREASURY_MIN_ADA,
} from "./constants";
import type {
  DeployedValidators,
  MinswapValidators,
  Validators,
} from "./deploy-validators";
import invariant from "@minswap/tiny-invariant";

export type WarehouseBuilderOptions = {
  t: Translucent;
  validators: Validators;
  deployedValidators: DeployedValidators;
  ammValidators: MinswapValidators;
  ammDeployedValidators: DeployedValidators;
};

export type BuildInitFactoryOptions = {
  seedUtxo: UTxO;
};

export type BuildCreateTreasuryOptions = {
  factoryUtxo: UTxO;
  treasuryDatum: TreasuryValidateTreasurySpending["treasuryInDatum"];
  validFrom: UnixTime;
  validTo: UnixTime;
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
  orderOutputDatums: FeedTypeOrder["_datum"][];
};

export type BuildCollectManagerOptions = {
  treasuryInput: UTxO;
  managerInput: UTxO;
  validFrom: UnixTime;
  validTo: UnixTime;
  // allow pass datum as testing purpose
  treasuryOutDatum?: TreasuryValidateTreasurySpending["treasuryInDatum"];
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

export type BuildCancelLBEOptions = {
  treasuryInput: UTxO;
  ammFactoryRefInput?: UTxO;
  validTo?: UnixTime;
};

export type BuildCreateAmmPoolOptions = {
  treasuryInput: UTxO;
  ammFactoryInput: UTxO;
  ammPoolDatum: FeedTypeAmmPool["_datum"];
  validFrom: UnixTime;
  validTo: UnixTime;
  totalLiquidity: bigint;
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
  factoryRedeemer: FactoryValidateFactory["redeemer"] | undefined;
  treasuryRedeemer: TreasuryValidateTreasurySpending["redeemer"] | undefined;
  managerRedeemer: ManagerValidateManagerSpending["redeemer"] | undefined;
  sellerRedeemer: SellerValidateSellerSpending["redeemer"] | undefined;
  orderRedeemer: FeedTypeOrder["_redeemer"] | undefined;
  mintRedeemer: FactoryValidateFactoryMinting["redeemer"] | undefined;

  // AMM
  ammValidators: MinswapValidators;
  ammDeployedValidators: DeployedValidators;
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

    this.factoryToken = T.toUnit(this.factoryHash, FACTORY_AUTH_AN);
    this.treasuryToken = T.toUnit(this.factoryHash, TREASURY_AUTH_AN);
    this.managerToken = T.toUnit(this.factoryHash, MANAGER_AUTH_AN);
    this.sellerToken = T.toUnit(this.factoryHash, SELLER_AUTH_AN);
    this.orderToken = T.toUnit(this.factoryHash, ORDER_AUTH_AN);

    // AMM
    this.ammValidators = ammValidators;
    this.ammFactoryAddress = t.utils.validatorToAddress(
      ammValidators.factoryValidator,
    );
    this.ammPoolAddress = t.utils.validatorToAddress(
      ammValidators.poolValidator,
    );
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
    this.ammPoolToken = T.toUnit(this.ammAuthenHash, MINSWAP_V2_POOL_AUTH_AN);
    this.ammFactoryToken = T.toUnit(
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
    const { factoryUtxo, treasuryDatum, validFrom, validTo } = options;
    const managerDatum: ManagerValidateManagerSpending["managerInDatum"] = {
      factoryPolicyId: this.factoryHash,
      orderHash: this.orderHash,
      sellerHash: this.sellerHash,
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
        this.managerRedeemer = "ManageSeller";
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
      const datum = T.Data.from(o.datum, FeedTypeOrder._datum);
      inputAmount += datum.amount;
      inputPenaltyAmount += datum.penaltyAmount;
    }
    for (const datum of orderOutputDatums) {
      outputAmount += datum.amount;
      outputPenaltyAmount += datum.penaltyAmount;
    }
    const detalAmount = outputAmount - inputAmount;
    const deltaPenaltyAmount = outputPenaltyAmount - inputPenaltyAmount;
    const sellerOutDatum: SellerValidateSellerSpending["sellerInDatum"] = {
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

  public buildCancelLBE(options: BuildCancelLBEOptions): WarehouseBuilder {
    const { treasuryInput, validTo, ammFactoryRefInput } = options;
    invariant(treasuryInput.datum);
    const treasuryInDatum = this.fromDatumTreasury(treasuryInput.datum);
    const treasuryOutDatum: TreasuryValidateTreasurySpending["treasuryInDatum"] =
      {
        ...treasuryInDatum,
        isCancelled: true,
      };

    this.tasks.push(
      () => {
        this.treasuryInputs = [treasuryInput];
        this.treasuryRedeemer = { CancelLBE: { reason: "ByOwner" } };
        if (validTo) {
          this.tx
            .validTo(validTo)
            .addSigner(
              plutusAddress2Address(this.t.network, treasuryInDatum.owner),
            );
        } else if (ammFactoryRefInput) {
          this.tx.readFrom([ammFactoryRefInput]);
        }
      },
      () => {
        this.spendingTreasuryInput();
      },
      () => {
        this.payingTreasuryOutput({ treasuryOutDatum });
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
    } = options;
    invariant(treasuryInput.datum);
    const treasuryInDatum = this.fromDatumTreasury(treasuryInput.datum);
    const projectOwnerLp = (totalLiquidity - LP_COLATERAL) / 2n;
    const treasuryOutDatum: TreasuryValidateTreasurySpending["treasuryInDatum"] =
      {
        ...treasuryInDatum,
        totalLiquidity: totalLiquidity - LP_COLATERAL - projectOwnerLp,
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
        invariant(this.ammLpToken);
        const projectOwner = plutusAddress2Address(
          this.t.network,
          treasuryInDatum.owner,
        );
        this.tx.payToAddress(projectOwner, {
          [this.ammLpToken]: projectOwnerLp,
        });
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
    const userOutputs: { address: Address; assets: Assets }[] = [];
    for (const order of sortedOrders) {
      invariant(order.datum);
      const datum = this.fromDatumOrder(order.datum);
      const lpAmount =
        (datum.amount * treasuryInDatum.totalLiquidity) /
        treasuryInDatum.reserveRaise;
      const output: { address: Address; assets: Assets } = {
        address: plutusAddress2Address(this.t.network, datum.owner),
        assets: {
          lovelace: LBE_MIN_OUTPUT_ADA,
          [this.ammLpToken]: lpAmount,
        },
      };
      totalFund += datum.amount + datum.penaltyAmount;
      totalLiquidity += lpAmount;
      userOutputs.push(output);
    }
    const treasuryOutDatum: TreasuryValidateTreasurySpending["treasuryInDatum"] =
      {
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
        });
      },
      () => {
        this.mintingOrderToken(-1n * BigInt(orderInputs.length));
      },
      () => {
        this.tx.validFrom(validFrom).validTo(validTo);
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
    const treasuryOutDatum: TreasuryValidateTreasurySpending["treasuryInDatum"] =
      {
        ...treasuryInDatum,
      };
    const orderOutDatums: FeedTypeOrder["_datum"][] = [];
    let deltaCollectedFund = 0n;

    for (const o of orderInputs) {
      invariant(o.datum);
      const datum: FeedTypeOrder["_datum"] = {
        ...this.fromDatumOrder(o.datum),
        isCollected: true,
      };
      orderOutDatums.push(datum);
      deltaCollectedFund += datum.amount + datum.penaltyAmount;
    }
    treasuryOutDatum.collectedFund += deltaCollectedFund;

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
    const managerInDatum: ManagerValidateManagerSpending["managerInDatum"] =
      this.fromDatumManager(managerInput.datum);
    let totalReserveRaise = 0n;
    let totalPenalty = 0n;
    for (const seller of sellerInputs) {
      invariant(seller.datum);
      const datum = this.fromDatumSeller(seller.datum);
      totalReserveRaise += datum.amount;
      totalPenalty += datum.penaltyAmount;
    }
    const managerOutDatum: ManagerValidateManagerSpending["managerInDatum"] = {
      ...managerInDatum,
      sellerCount: managerInDatum.sellerCount - BigInt(sellerInputs.length),
      reserveRaise: managerInDatum.reserveRaise + totalReserveRaise,
      totalPenalty: managerInDatum.totalPenalty + totalPenalty,
    };
    const mintSellerCount = -1n * BigInt(sellerInputs.length);
    this.tasks.push(
      () => {
        this.managerRedeemer = "ManageSeller";
        this.managerInputs = [managerInput];
        this.treasuryRefInput = treasuryRefInput;
        this.sellerInputs = sellerInputs;
        this.sellerRedeemer = "CountingSeller";
        this.mintRedeemer = "MintSeller";
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
  fromDatumTreasury(
    rawDatum: string,
  ): TreasuryValidateTreasurySpending["treasuryInDatum"] {
    return T.Data.from(
      rawDatum,
      TreasuryValidateTreasurySpending.treasuryInDatum,
    );
  }

  toDatumTreasury(
    datum: TreasuryValidateTreasurySpending["treasuryInDatum"],
  ): string {
    return T.Data.to(datum, TreasuryValidateTreasurySpending.treasuryInDatum);
  }

  fromDatumFactory(rawDatum: string): FactoryValidateFactory["datum"] {
    return T.Data.from(rawDatum, FactoryValidateFactory.datum);
  }

  toDatumFactory(datum: FactoryValidateFactory["datum"]) {
    return T.Data.to(datum, FactoryValidateFactory.datum);
  }

  fromDatumSeller(
    rawDatum: string,
  ): SellerValidateSellerSpending["sellerInDatum"] {
    return T.Data.from(rawDatum, SellerValidateSellerSpending.sellerInDatum);
  }

  toDatumSeller(datum: SellerValidateSellerSpending["sellerInDatum"]): string {
    return T.Data.to(datum, SellerValidateSellerSpending.sellerInDatum);
  }

  fromDatumOrder(rawDatum: string): FeedTypeOrder["_datum"] {
    return T.Data.from(rawDatum, FeedTypeOrder._datum);
  }

  toDatumOrder(datum: FeedTypeOrder["_datum"]): string {
    return T.Data.to(datum, FeedTypeOrder._datum);
  }

  fromDatumManager(
    rawDatum: string,
  ): ManagerValidateManagerSpending["managerInDatum"] {
    return T.Data.from(rawDatum, ManagerValidateManagerSpending.managerInDatum);
  }

  toDatumManager(
    datum: ManagerValidateManagerSpending["managerInDatum"],
  ): string {
    return T.Data.to(datum, ManagerValidateManagerSpending.managerInDatum);
  }

  toRedeemerSellerSpend(
    redeemer: SellerValidateSellerSpending["redeemer"],
  ): string {
    return T.Data.to(redeemer, SellerValidateSellerSpending.redeemer);
  }

  toRedeemerFactory(redeemer: FactoryValidateFactory["redeemer"]): string {
    return T.Data.to(redeemer, FactoryValidateFactory.redeemer);
  }

  calFinalReserveRaise(
    datum: TreasuryValidateTreasurySpending["treasuryInDatum"],
  ) {
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
    const lpToken = T.toUnit(this.ammAuthenHash, this.lpAssetName);
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
        T.Data.to(
          this.managerRedeemer,
          ManagerValidateManagerSpending.redeemer,
        ),
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
    // const cases: Record<FeedTypeOrder["_redeemer"], () => void> = {
    //   UpdateOrder: () => {
    //     this.withdrawFromSeller();
    //   },
    //   CollectOrder: () => {
    //     this.withdrawFromTreasury();
    //   },
    //   RedeemOrder: () => { },
    // };
    // cases[this.orderRedeemer]();
    this.tx
      .readFrom([this.deployedValidators["orderValidator"]])
      .collectFrom(
        this.orderInputs,
        T.Data.to(this.orderRedeemer, FeedTypeOrder._redeemer),
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
        T.Data.to(
          this.treasuryRedeemer,
          TreasuryValidateTreasurySpending.redeemer,
        ),
      );
  }

  /************************* PAYING  *************************/
  payingTreasuryOutput(options: {
    treasuryOutDatum: TreasuryValidateTreasurySpending["treasuryInDatum"];
    deltaCollectedFund?: bigint;
    deltaLp?: bigint;
  }) {
    const { treasuryOutDatum, deltaCollectedFund, deltaLp } = options;
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
      redeemer: TreasuryValidateTreasurySpending["redeemer"],
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
      const raiseAsset = T.toUnit(
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
      invariant(deltaLp);
      const assets = { ...this.treasuryInputs[0].assets };
      assets[this.ammLpToken] -= deltaLp;
      if (assets[this.ammLpToken] === 0n) {
        delete assets[this.ammLpToken];
      }
      return assets;
    };
    const collectOrders = () => {
      invariant(this.treasuryInputs.length > 0);
      const assets = { ...this.treasuryInputs[0].assets };
      invariant(deltaCollectedFund);
      const raiseAsset = T.toUnit(
        treasuryOutDatum.raiseAsset.policyId,
        treasuryOutDatum.raiseAsset.assetName,
      );
      assets[raiseAsset] = (assets[raiseAsset] ?? 0n) + deltaCollectedFund;
      return assets;
    };
    const createTreasury = () => {
      const baseAsset = T.toUnit(
        treasuryOutDatum.baseAsset.policyId,
        treasuryOutDatum.baseAsset.assetName,
      );
      const assets = {
        [this.treasuryToken]: 1n,
        [baseAsset]: treasuryOutDatum.reserveBase,
      };
      assets["lovelace"] = (assets["lovelace"] ?? 0n) + TREASURY_MIN_ADA;
      return assets;
    };
    const cases: Record<string, () => Assets> = {
      "": createTreasury,
      CollectManager: defaultAssets,
      RedeemOrders: redeemAssets,
      RedeemLPByOwner: () => {
        throw Error("not implement!");
      },
      CancelLBE: defaultAssets,
      UpdateLBE: defaultAssets,
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

  payingManagerOutput(datum: ManagerValidateManagerSpending["managerInDatum"]) {
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

  payingOrderOutput(...orderDatums: FeedTypeOrder["_datum"][]) {
    const innerPay = (datum: FeedTypeOrder["_datum"]) => {
      const assets = {
        [this.orderToken]: 1n,
        lovelace:
          LBE_MIN_OUTPUT_ADA + (datum.isCollected ? LBE_FEE : LBE_FEE * 2n),
      };
      const raiseAsset = T.toUnit(
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

  payingSellerOutput(
    option: {
      addSellerCount?: bigint;
      outDatum?: SellerValidateSellerSpending["sellerInDatum"];
    } = { addSellerCount: undefined, outDatum: undefined },
  ) {
    const { addSellerCount, outDatum } = option;
    const innerPay = (datum: SellerValidateSellerSpending["sellerInDatum"]) => {
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
    };
    if (this.sellerInputs.length) {
      // Using seller
      invariant(outDatum);
      innerPay(outDatum);
    } else if (this.managerInputs.length) {
      invariant(this.managerInputs.length == 1);
      invariant(this.managerInputs[0].datum);
      const managerDatum = this.fromDatumManager(this.managerInputs[0].datum);
      const sellerDatum: SellerValidateSellerSpending["sellerInDatum"] = {
        factoryPolicyId: this.factoryHash,
        baseAsset: managerDatum.baseAsset,
        raiseAsset: managerDatum.raiseAsset,
        amount: 0n,
        penaltyAmount: 0n,
      };
      invariant(addSellerCount);
      for (let i = 0n; i < addSellerCount; i++) {
        innerPay(sellerDatum);
      }
    } else {
      invariant(this.treasuryInputs.length === 0);
      invariant(this.factoryRedeemer);
      const baseAsset = (this.factoryRedeemer.wrapper as any)["CreateTreasury"]
        .baseAsset;
      const raiseAsset = (this.factoryRedeemer.wrapper as any)["CreateTreasury"]
        .raiseAsset;
      const sellerDatum: SellerValidateSellerSpending["sellerInDatum"] = {
        factoryPolicyId: this.factoryHash,
        baseAsset,
        raiseAsset,
        amount: 0n,
        penaltyAmount: 0n,
      };
      for (let i = 0; i < DEFAULT_NUMBER_SELLER; i++) {
        innerPay(sellerDatum);
      }
    }
  }

  payingFactoryOutput() {
    const innerPay = (datum: FactoryValidateFactory["datum"]) => {
      this.tx.payToAddressWithData(
        this.factoryAddress,
        {
          inline: this.toDatumFactory(datum),
        },
        {
          [this.factoryToken]: 1n,
        },
      );
    };

    const cases: Record<number, () => void> = {
      // Init System
      0: () => {
        const factoryDatum: FactoryValidateFactory["datum"] = {
          head: LBE_INIT_FACTORY_HEAD,
          tail: LBE_INIT_FACTORY_TAIL,
        };
        innerPay(factoryDatum);
      },
      // Create Treasury
      1: () => {
        invariant(this.factoryRedeemer);
        invariant(this.factoryInputs.length == 1);
        invariant(this.factoryInputs[0].datum);
        invariant(typeof this.factoryRedeemer.wrapper !== "string");
        invariant(this.lpAssetName);
        const factoryDatum = this.fromDatumFactory(this.factoryInputs[0].datum);
        const newFactoryHeadDatum: FactoryValidateFactory["datum"] = {
          head: factoryDatum.head,
          tail: this.lpAssetName,
        };
        const newFactoryTailDatum: FactoryValidateFactory["datum"] = {
          head: this.lpAssetName,
          tail: factoryDatum.tail,
        };
        innerPay(newFactoryHeadDatum);
        innerPay(newFactoryTailDatum);
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
        innerPay(newDatum);
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
      T.Data.to(this.mintRedeemer, FactoryValidateFactoryMinting.redeemer),
    );
  }

  mintingManagerToken() {
    invariant(this.mintRedeemer);
    let amount = this.treasuryInputs.length > 0 ? -1n : 1n;
    this.tx.readFrom([this.deployedValidators["factoryValidator"]]).mintAssets(
      {
        [this.managerToken]: amount,
      },
      T.Data.to(this.mintRedeemer, FactoryValidateFactoryMinting.redeemer),
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
      T.Data.to(this.mintRedeemer, FactoryValidateFactoryMinting.redeemer),
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
      T.Data.to(this.mintRedeemer, FactoryValidateFactoryMinting.redeemer),
    );
    // if (count > 0) {
    //   this.withdrawFromSeller();
    // }
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
    let redeemer: FactoryValidateFactoryMinting["redeemer"];
    if (this.factoryInputs.length > 0) {
      invariant(options);
      const redeemerCases: Record<
        number,
        FactoryValidateFactoryMinting["redeemer"]
      > = {
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
      T.Data.to(redeemer, FactoryValidateFactoryMinting.redeemer),
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
    const lpToken = T.toUnit(this.ammAuthenHash, lpAssetName);
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
    const unitA = T.toUnit(
      poolDatum.assetA.policyId,
      poolDatum.assetA.assetName,
    );
    const unitB = T.toUnit(
      poolDatum.assetB.policyId,
      poolDatum.assetB.assetName,
    );
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
          inline: T.Data.to(poolDatum, FeedTypeAmmPool._datum),
        },
        poolAssets,
      );
  }
}
