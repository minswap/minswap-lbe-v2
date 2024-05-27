import * as T from "@minswap/translucent";
import { computeLPAssetName, plutusAddress2Address } from "./utils.ts";
import {
  FactoryValidateFactory,
  FactoryValidateFactoryMinting,
  FeedTypeAmmPool,
  FeedTypeOrder,
  ManagerValidateManagerSpending,
  SellerValidateSellerSpending,
  TreasuryValidateTreasurySpending,
} from "../plutus.ts";
import {
  AuthenMintingPolicyValidateAuthen as AmmValidateAuthen,
  FactoryValidatorValidateFactory as AmmValidateFactory,
} from "../amm-plutus.ts";
import type { Address, Assets, BluePrintAsset, RewardAddress, Translucent, Tx, UTxO, UnixTime } from "./types.ts";
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
  MINSWAP_V2_DEFAULT_POOL_ADA,
  MINSWAP_V2_FACTORY_AUTH_AN,
  MINSWAP_V2_MAX_LIQUIDITY,
  MINSWAP_V2_POOL_AUTH_AN,
  ORDER_AUTH_AN,
  SELLER_AUTH_AN,
  TREASURY_AUTH_AN,
} from "./constants.ts";
import type { DeployedValidators, MinswapValidators, Validators } from "./deploy-validators.ts";
import { calculateInitialLiquidity } from "./minswap-amm/utils.ts";
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

export type BuildCollectSellersOptions = {
  treasuryInput: UTxO;
  sellerInputs: UTxO[];
  validFrom: UnixTime;
  validTo: UnixTime;
};

export type BuildCollectOrdersOptions = {
  treasuryInput: UTxO;
  orderInputs: UTxO[];
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
};

export type BuildCloseEventOptions = {
  treasuryInput: UTxO;
  factoryInputs: UTxO[];
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

  constructor(options: WarehouseBuilderOptions) {
    const { t, validators, deployedValidators, ammValidators, ammDeployedValidators } = options;
    this.t = t;
    this.validators = validators;
    this.deployedValidators = deployedValidators;
    this.tx = t.newTx();

    this.factoryHash = t.utils.validatorToScriptHash(validators.factoryValidator);
    this.treasuryHash = t.utils.validatorToScriptHash(validators.treasuryValidator);
    this.managerHash = t.utils.validatorToScriptHash(validators.managerValidator);
    this.sellerHash = t.utils.validatorToScriptHash(validators.sellerValidator);
    this.orderHash = t.utils.validatorToScriptHash(validators.orderValidator);

    this.factoryAddress = t.utils.validatorToAddress(validators.factoryValidator);
    this.treasuryAddress = t.utils.validatorToAddress(validators.treasuryValidator);
    this.managerAddress = t.utils.validatorToAddress(validators.managerValidator);
    this.sellerAddress = t.utils.validatorToAddress(validators.sellerValidator);
    this.orderAddress = t.utils.validatorToAddress(validators.orderValidator);
    this.sellerRewardAddress = t.utils.validatorToRewardAddress(validators.sellerValidator);
    this.treasuryRewardAddress = t.utils.validatorToRewardAddress(validators.treasuryValidator);

    this.factoryToken = T.toUnit(this.factoryHash, FACTORY_AUTH_AN);
    this.treasuryToken = T.toUnit(this.factoryHash, TREASURY_AUTH_AN);
    this.managerToken = T.toUnit(this.factoryHash, MANAGER_AUTH_AN);
    this.sellerToken = T.toUnit(this.factoryHash, SELLER_AUTH_AN);
    this.orderToken = T.toUnit(this.factoryHash, ORDER_AUTH_AN);

    // AMM
    this.ammValidators = ammValidators;
    this.ammFactoryAddress = t.utils.validatorToAddress(ammValidators.authenValidator);
    this.ammPoolAddress = t.utils.validatorToAddress(ammValidators.poolValidator);
    this.ammDeployedValidators = ammDeployedValidators;
    this.ammAuthenHash = t.utils.validatorToScriptHash(ammValidators.authenValidator);
    this.ammPoolHash = t.utils.validatorToScriptHash(ammValidators.poolValidator);
    this.ammFactoryHash = t.utils.validatorToScriptHash(ammValidators.factoryValidator);
    this.ammPoolToken = T.toUnit(this.ammPoolHash, MINSWAP_V2_POOL_AUTH_AN);
    this.ammFactoryToken = T.toUnit(this.ammPoolHash, MINSWAP_V2_FACTORY_AUTH_AN);
  }

  public complete(): Tx {
    this.tx = this.t.newTx();
    for (const task of this.tasks) {
      task();
    }
    return this.tx;
  }

  public buildInitFactory(options: BuildInitFactoryOptions) {
    const { seedUtxo } = options;
    this.tasks.push(
      () => {
        this.mintRedeemer = "Initialization";
        this.tx.collectFrom([seedUtxo]);
      },
      () => {
        this.mintingFactoryToken();
      },
      () => {
        this.payingFactoryOutput();
      },
    );
  }

  public buildCreateTreasury(options: BuildCreateTreasuryOptions) {
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
    this.tasks.push(
      () => {
        this.factoryInputs = [factoryUtxo];
        this.factoryRedeemer = {
          wrapper: {
            CreateTreasury: { ...innerFactoryRedeemer }
          }
        };
        this.mintRedeemer = { CreateTreasury: { ...innerFactoryRedeemer } };
      },
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
        this.mintingSellerToken();
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
  }

  public buildAddSeller(options: BuildAddSellersOptions) {
    const { addSellerCount, validFrom, validTo, treasuryRefUtxo, managerUtxo } = options;
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
  }

  public buildUsingSeller(options: BuildUsingSellerOptions) {
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
    const mintingSellerCount = BigInt(orderOutputDatums.length - orderInputs.length);

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
  }

  public buildCancelLBE(options: BuildCancelLBEOptions) {
    const { treasuryInput, validTo, ammFactoryRefInput } = options;
    invariant(treasuryInput.datum);
    const treasuryInDatum = this.fromDatumTreasury(treasuryInput.datum);
    const treasuryOutDatum: TreasuryValidateTreasurySpending["treasuryInDatum"] = {
      ...treasuryInDatum,
      isCancelled: true,
    };

    this.tasks.push(
      () => {
        this.treasuryInputs = [treasuryInput];
        this.treasuryRedeemer = "CancelLBE";
        if (validTo) {
          this.tx
            .validTo(validTo)
            .addSigner(plutusAddress2Address(this.t.network, treasuryInDatum.owner));
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
  }

  public buildCreateAmmPool(options: BuildCreateAmmPoolOptions) {
    const { treasuryInput, ammFactoryInput, ammPoolDatum } = options;
    let treasuryOutDatum: TreasuryValidateTreasurySpending["treasuryInDatum"];

    this.tasks.push(
      () => {
        this.treasuryInputs = [treasuryInput];
        this.treasuryRedeemer = "CreateAmmPool";
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
    );
  }

  public buildCloseEvent(options: BuildCloseEventOptions) {
    const { treasuryInput, factoryInputs } = options;
    invariant(treasuryInput.datum);
    const treasuryDatum = this.fromDatumTreasury(treasuryInput.datum);
    const innerFactoryRedeemer = {
      baseAsset: treasuryDatum.baseAsset,
      raiseAsset: treasuryDatum.raiseAsset,
    }
    this.tasks.push(
      () => {
        this.treasuryInputs = [treasuryInput];
        this.treasuryRedeemer = "CloseEvent"
        this.factoryInputs = factoryInputs;
        this.factoryRedeemer = { wrapper: { CloseTreasury: innerFactoryRedeemer } };
        this.tx.addSigner(plutusAddress2Address(this.t.network, treasuryDatum.owner));
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
        this.mintingFactoryToken();
      },
      () => {
        this.payingFactoryOutput();
      },
    );
  }

  public buildCollectOrder(options: BuildCollectOrdersOptions) {
    const { treasuryInput, orderInputs } = options;
    invariant(treasuryInput.datum);
    const treasuryInDatum = this.fromDatumTreasury(treasuryInput.datum);
    const treasuryOutDatum: TreasuryValidateTreasurySpending["treasuryInDatum"] = {
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
    );
  }

  public buildCollectSeller(options: BuildCollectSellersOptions) { }

  /************************* PARSER  *************************/
  private fromDatumTreasury(rawDatum: string): TreasuryValidateTreasurySpending["treasuryInDatum"] {
    return T.Data.from(rawDatum, TreasuryValidateTreasurySpending.treasuryInDatum);
  }

  private toDatumTreasury(datum: TreasuryValidateTreasurySpending["treasuryInDatum"]): string {
    return T.Data.to(datum, TreasuryValidateTreasurySpending.treasuryInDatum);
  }

  private fromDatumFactory(rawDatum: string): FactoryValidateFactory["datum"] {
    return T.Data.from(rawDatum, FactoryValidateFactory.datum);
  }

  private toDatumFactory(datum: FactoryValidateFactory["datum"]) {
    return T.Data.to(datum, FactoryValidateFactory.datum);
  }

  private fromDatumSeller(rawDatum: string): SellerValidateSellerSpending["sellerInDatum"] {
    return T.Data.from(rawDatum, SellerValidateSellerSpending.sellerInDatum);
  }

  private toDatumSeller(datum: SellerValidateSellerSpending["sellerInDatum"]): string {
    return T.Data.to(datum, SellerValidateSellerSpending.sellerInDatum);
  }

  private fromDatumOrder(rawDatum: string): FeedTypeOrder["_datum"] {
    return T.Data.from(rawDatum, FeedTypeOrder._datum);
  }

  private toDatumOrder(datum: FeedTypeOrder["_datum"]): string {
    return T.Data.to(datum, FeedTypeOrder._datum);
  }

  private fromDatumManager(rawDatum: string): ManagerValidateManagerSpending["managerInDatum"] {
    return T.Data.from(rawDatum, ManagerValidateManagerSpending.managerInDatum);
  }

  private toDatumManager(datum: ManagerValidateManagerSpending["managerInDatum"]): string {
    return T.Data.to(datum, ManagerValidateManagerSpending.managerInDatum);
  }

  private toRedeemerSellerSpend(redeemer: SellerValidateSellerSpending["redeemer"]): string {
    return T.Data.to(redeemer, SellerValidateSellerSpending.redeemer);
  }

  /************************* SPENDING  *************************/
  private spendingManagerInput() {
    if (this.managerInputs.length == 0) {
      return;
    }
    invariant(this.managerRedeemer);
    this.tx
      .readFrom([this.deployedValidators["managerValidator"]])
      .collectFrom(
        this.managerInputs,
        T.Data.to(this.managerRedeemer, ManagerValidateManagerSpending.redeemer),
      );
  }

  private spendingSellerInput() {
    if (this.sellerInputs.length === 0) {
      return;
    }
    invariant(this.sellerRedeemer);
    if (this.sellerRedeemer === "UsingSeller") {
      invariant(this.treasuryRefInput);
      this.tx.readFrom([this.treasuryRefInput]);
    }
    this.tx
      .readFrom([this.deployedValidators["sellerValidator"]])
      .collectFrom(this.sellerInputs, this.toRedeemerSellerSpend(this.sellerRedeemer));
  }

  private spendingFactoryInput() {
    if (this.factoryInputs.length === 0) {
      return;
    }
    invariant(this.factoryRedeemer);
    this.tx
      .readFrom([this.deployedValidators["factoryValidator"]])
      .collectFrom(
        this.factoryInputs,
        T.Data.to(this.factoryRedeemer, FactoryValidateFactory.redeemer),
      );
  }

  private spendingOrderInput() {
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
      .collectFrom(this.orderInputs, T.Data.to(this.orderRedeemer, FeedTypeOrder._redeemer));
  }

  private spendingTreasuryInput() {
    if (this.treasuryInputs.length === 0) {
      return;
    }
    invariant(this.treasuryRedeemer);
    this.tx
      .readFrom([this.deployedValidators["treasuryValidator"]])
      .collectFrom(
        this.treasuryInputs,
        T.Data.to(this.treasuryRedeemer, TreasuryValidateTreasurySpending.redeemer),
      );
  }

  /************************* PAYING  *************************/
  private payingTreasuryOutput(options: {
    treasuryOutDatum: TreasuryValidateTreasurySpending["treasuryInDatum"];
    deltaCollectedFund?: bigint;
  }) {
    const { treasuryOutDatum, deltaCollectedFund } = options;
    const innerPay = (assets: Assets) => {
      this.tx.payToAddressWithData(
        this.treasuryAddress,
        {
          inline: this.toDatumTreasury(treasuryOutDatum),
        },
        assets,
      );
    };

    if (this.treasuryRedeemer === undefined) {
      const assets = {
        [this.treasuryToken]: 1n,
        [T.toUnit(treasuryOutDatum.baseAsset.policyId, treasuryOutDatum.baseAsset.assetName)]:
          treasuryOutDatum.reserveBase,
      };
      innerPay(assets);
    } else {
      invariant(this.treasuryInputs.length > 0);
      const assets = { ...this.treasuryInputs[0].assets };
      if (this.treasuryRedeemer === "CollectOrders") {
        invariant(deltaCollectedFund);
        const raiseAsset = T.toUnit(
          treasuryOutDatum.raiseAsset.policyId,
          treasuryOutDatum.raiseAsset.assetName,
        );
        assets[raiseAsset] = (assets[raiseAsset] ?? 0n) + deltaCollectedFund;
      }
      innerPay(assets);
    }
  }

  private payingManagerOutput(datum: ManagerValidateManagerSpending["managerInDatum"]) {
    this.tx.payToAddressWithData(
      this.managerAddress,
      {
        inline: this.toDatumManager(datum),
      },
      {
        [this.managerToken]: 1n,
      },
    );
  }

  private payingOrderOutput(...orderDatums: FeedTypeOrder["_datum"][]) {
    const innerPay = (datum: FeedTypeOrder["_datum"]) => {
      const assets = {
        [this.orderToken]: 1n,
        lovelace: LBE_MIN_OUTPUT_ADA + (datum.isCollected ? LBE_FEE : LBE_FEE * 2n),
      };
      const raiseAsset = T.toUnit(datum.raiseAsset.policyId, datum.raiseAsset.assetName);
      assets[raiseAsset] = (assets[raiseAsset] ?? 0n) + datum.amount + datum.penaltyAmount;

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

  private payingSellerOutput(
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
      const baseAsset = (this.factoryRedeemer.wrapper as any)["CreateTreasury"].baseAsset;
      const raiseAsset = (this.factoryRedeemer.wrapper as any)["CreateTreasury"].raiseAsset;
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

  private payingFactoryOutput() {
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
        const baseAsset = (this.factoryRedeemer.wrapper as any)["CreateTreasury"].baseAsset;
        const raiseAsset = (this.factoryRedeemer.wrapper as any)["CreateTreasury"].raiseAsset;
        const lpAssetName = computeLPAssetName(
          baseAsset.policyId + baseAsset.assetName,
          raiseAsset.policyId + raiseAsset.assetName,
        );
        const factoryDatum = this.fromDatumFactory(this.factoryInputs[0].datum);
        const newFactoryHeadDatum: FactoryValidateFactory["datum"] = {
          head: factoryDatum.head,
          tail: lpAssetName,
        };
        const newFactoryTailDatum: FactoryValidateFactory["datum"] = {
          head: lpAssetName,
          tail: factoryDatum.tail,
        };
        innerPay(newFactoryHeadDatum);
        innerPay(newFactoryTailDatum);
      },
      // Remove Treasury
      2: () => {
        invariant(this.factoryInputs.length == 2);
        const [factory1, factory2] = this.factoryInputs;
        invariant(factory1.datum);
        invariant(factory2.datum);
        const factoryDatum1 = this.fromDatumFactory(factory1.datum);
        const factoryDatum2 = this.fromDatumFactory(factory2.datum);
        const newFactoryDatum = { ...factoryDatum1 };
        if (factoryDatum1.head == factoryDatum2.tail) {
          newFactoryDatum.head = factoryDatum1.head;
          newFactoryDatum.tail = factoryDatum2.tail;
        } else {
          newFactoryDatum.head = factoryDatum2.head;
          newFactoryDatum.tail = factoryDatum1.tail;
        }
        innerPay(newFactoryDatum);
      },
    };

    cases[this.factoryInputs.length]();
  }

  /************************* WITHDRAW *************************/
  /**
   * @deprecated
   */
  private withdrawFromSeller() {
    this.tx
      .readFrom([this.deployedValidators["sellerValidator"]])
      .withdraw(
        this.sellerRewardAddress,
        0n,
        DUMMY_REDEEMER,
      );
  }

  /**
 * @deprecated
 */
  private withdrawFromTreasury() {
    this.tx
      .readFrom([this.deployedValidators["treasuryValidator"]])
      .withdraw(
        this.treasuryRewardAddress,
        0n,
        DUMMY_REDEEMER,
      );
  }

  /************************* MINTING *************************/
  private mintingTreasuryToken() {
    invariant(this.mintRedeemer);
    const cases: Record<number, bigint> = {
      1: 1n,
      2: -1n,
    };
    const amount = cases[this.factoryInputs.length];
    this.tx
      .readFrom([this.deployedValidators["factoryValidator"]])
      .mintAssets(
        {
          [this.treasuryToken]: amount,
        },
        T.Data.to(this.mintRedeemer, FactoryValidateFactoryMinting.redeemer),
      );
  }

  private mintingManagerToken() {
    invariant(this.mintRedeemer);
    let amount = this.treasuryInputs.length > 0 ? -1n : 1n;
    this.tx
      .readFrom([this.deployedValidators["factoryValidator"]])
      .mintAssets(
        {
          [this.managerToken]: amount,
        },
        T.Data.to(this.mintRedeemer, FactoryValidateFactoryMinting.redeemer),
      );
  }

  private mintingSellerToken(addSellerCount?: bigint) {
    let mintAmount = 0n;
    if (this.factoryInputs.length) {
      mintAmount = DEFAULT_NUMBER_SELLER;
    } else {
      invariant(addSellerCount);
      mintAmount = this.sellerInputs.length
        ? -1n * BigInt(this.sellerInputs.length)
        : addSellerCount;
    }
    if (mintAmount) {
      invariant(this.mintRedeemer);
      this.tx
        .readFrom([this.deployedValidators["factoryValidator"]])
        .mintAssets(
          {
            [this.sellerToken]: mintAmount,
          },
          T.Data.to(this.mintRedeemer, FactoryValidateFactoryMinting.redeemer),
        );
    }
  }

  private mintingOrderToken(count: bigint) {
    const mintAmount = this.treasuryInputs.length ? -1n * BigInt(this.orderInputs.length) : count;
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

  private mintingFactoryToken(options?: { baseAsset: BluePrintAsset, raiseAsset: BluePrintAsset }) {
    const cases: Record<number, bigint> = {
      0: 1n,
      1: 1n,
      2: -1n,
    };
    const amount = cases[this.factoryInputs.length];
    let redeemer: FactoryValidateFactoryMinting["redeemer"];
    if (this.factoryInputs.length > 0) {
      invariant(options);
      const redeemerCases: Record<number, FactoryValidateFactoryMinting["redeemer"]> = {
        1: { CreateTreasury: options },
        2: { CloseTreasury: options },
      }
      redeemer = redeemerCases[this.factoryInputs.length];
    } else {
      redeemer = "Initialization";
    }
    this.tx
      .readFrom([this.deployedValidators["factoryValidator"]])
      .mintAssets(
        {
          [this.factoryToken]: amount,
        },
        T.Data.to(redeemer, FactoryValidateFactoryMinting.redeemer),
      );
  }

  /************************* AMM *************************/
  private _buildCreateAmmPool(options: {
    poolDatum: FeedTypeAmmPool["_datum"];
    factoryInput: UTxO;
  }) {
    const { poolDatum, factoryInput } = options;
    invariant(factoryInput.datum);
    const factoryDatum = T.Data.from(factoryInput.datum, AmmValidateFactory.datum);
    const factoryRedeemer: AmmValidateFactory["redeemer"] = {
      assetA: poolDatum.assetA,
      assetB: poolDatum.assetB,
    };
    const lpAssetName = computeLPAssetName(
      poolDatum.assetA.policyId + poolDatum.assetA.assetName,
      poolDatum.assetB.policyId + poolDatum.assetB.assetName,
    );
    const lpToken = T.toUnit(this.ammPoolHash, lpAssetName);
    const mintAssets: Assets = {
      [this.ammFactoryToken]: 1n,
      [this.ammPoolToken]: 1n,
      [lpToken]: MINSWAP_V2_MAX_LIQUIDITY,
    };
    const headFactoryDatum: AmmValidateFactory["datum"] = {
      head: factoryDatum.head,
      tail: lpAssetName,
    };
    const tailFactoryDatum: AmmValidateFactory["datum"] = {
      head: lpAssetName,
      tail: factoryDatum.tail,
    };
    const initialLiquidity = calculateInitialLiquidity(poolDatum.reserveA, poolDatum.reserveB);
    const remainingLiquidity = MINSWAP_V2_MAX_LIQUIDITY - (initialLiquidity - LP_COLATERAL);
    const poolAssets = {
      lovelace: MINSWAP_V2_DEFAULT_POOL_ADA,
      [this.ammPoolToken]: 1n,
      [lpToken]: remainingLiquidity,
    };
    const unitA = T.toUnit(poolDatum.assetA.policyId, poolDatum.assetA.assetName);
    const unitB = T.toUnit(poolDatum.assetB.policyId, poolDatum.assetB.assetName);
    poolAssets[unitA] = (poolAssets[unitA] ?? 0n) + poolDatum.reserveA;
    poolAssets[unitB] = (poolAssets[unitB] ?? 0n) + poolDatum.reserveB;

    this.tx
      .readFrom([
        this.ammDeployedValidators["authenValidator"],
        this.ammDeployedValidators["factoryValidator"],
      ])
      .collectFrom([factoryInput], T.Data.to(factoryRedeemer, AmmValidateFactory.redeemer))
      .mintAssets(mintAssets, T.Data.to("CreatePool", AmmValidateAuthen.redeemer))
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
