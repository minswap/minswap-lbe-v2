import * as T from "@minswap/translucent";
import {
  computeLPAssetName,
  plutusAddress2Address,
} from "./utils.ts";
import {
  AuthenMintingPolicyValidateAuthen,
  FactoryValidatorValidateFactory,
  OrderValidatorFeedTypeOrder,
  SellerValidatorValidateSellerMintingOrWithdraw,
  SellerValidatorValidateSellerSpending,
  TreasuryValidatorValidateTreasuryMintingOrWithdrawal,
  TreasuryValidatorValidateTreasurySpending,
  FeedTypeAmmPool,
} from "../plutus.ts";
import {
  FactoryValidatorValidateFactory as AmmValidateFactory,
  AuthenMintingPolicyValidateAuthen as AmmValidateAuthen,
} from "../amm-plutus.ts";
import type {
  Address,
  Assets,
  Translucent,
  Tx,
  UTxO,
  UnixTime,
} from "./types.ts";
import {
  DEFAULT_NUMBER_SELLER,
  FACTORY_AUTH_AN,
  LBE_FEE,
  LBE_INIT_FACTORY_HEAD,
  LBE_INIT_FACTORY_TAIL,
  LBE_MIN_OUTPUT_ADA,
  LP_COLATERAL,
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
  treasuryDatum: TreasuryValidatorValidateTreasurySpending["treasuryInDatum"];
};

export type BuildAddSellersOptions = {
  treasuryUtxo: UTxO;
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
  orderOutputDatums: OrderValidatorFeedTypeOrder["_datum"][];
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
}

export class WarehouseBuilder {
  t: Translucent;
  validators: Validators;
  deployedValidators: DeployedValidators;
  tx: Tx;
  tasks: Array<() => void> = [];

  // Validator Hash
  authenHash: string;
  factoryHash: string;
  treasuryHash: string;
  sellerHash: string;
  orderHash: string;

  // Validator Address
  authenAddress: Address;
  factoryAddress: Address;
  treasuryAddress: Address;
  sellerAddress: Address;
  orderAddress: Address;

  // Auth Token
  factoryToken: string;
  treasuryToken: string;
  orderToken: string;
  sellerToken: string;

  // Reference Input
  treasuryRefInput: UTxO | undefined;

  // Inputs
  treasuryInputs: UTxO[] = [];
  factoryInputs: UTxO[] = [];
  orderInputs: UTxO[] = [];
  sellerInputs: UTxO[] = [];

  // Redeemer
  factoryRedeemer: FactoryValidatorValidateFactory["redeemer"] | undefined;
  treasurySpendRedeemer: TreasuryValidatorValidateTreasurySpending["redeemer"] | undefined;
  sellerSpendRedeemer: SellerValidatorValidateSellerSpending["redeemer"] | undefined;
  orderSpendRedeemer: OrderValidatorFeedTypeOrder["_redeemer"] | undefined;

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

    this.authenHash = t.utils.validatorToScriptHash(validators.authenValidator);
    this.factoryHash = t.utils.validatorToScriptHash(validators.factoryValidator);
    this.treasuryHash = t.utils.validatorToScriptHash(validators.treasuryValidator);
    this.sellerHash = t.utils.validatorToScriptHash(validators.sellerValidator);
    this.orderHash = t.utils.validatorToScriptHash(validators.orderValidator);

    this.authenAddress = t.utils.validatorToAddress(validators.authenValidator);
    this.factoryAddress = t.utils.validatorToAddress(validators.factoryValidator);
    this.treasuryAddress = t.utils.validatorToAddress(validators.treasuryValidator);
    this.sellerAddress = t.utils.validatorToAddress(validators.sellerValidator);
    this.orderAddress = t.utils.validatorToAddress(validators.orderValidator);

    this.factoryToken = T.toUnit(this.authenHash, FACTORY_AUTH_AN);
    this.treasuryToken = T.toUnit(this.authenHash, TREASURY_AUTH_AN);
    this.sellerToken = T.toUnit(this.treasuryHash, SELLER_AUTH_AN);
    this.orderToken = T.toUnit(this.sellerHash, ORDER_AUTH_AN);

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
      () => { this.tx.collectFrom([seedUtxo]) },
      () => { this.mintingFactoryToken() },
      () => { this.payingFactoryOutput() },
    );
  }

  public buildCreateTreasury(options: BuildCreateTreasuryOptions) {
    const { factoryUtxo, treasuryDatum } = options;
    this.tasks.push(
      () => {
        this.factoryInputs = [factoryUtxo];
        this.factoryRedeemer = {
          baseAsset: treasuryDatum.baseAsset,
          raiseAsset: treasuryDatum.raiseAsset,
          step: "CreateTreasury",
        };
      },
      () => { this.spendingFactoryInput(); },
      () => { this.mintingFactoryToken(); },
      () => { this.mintingTreasuryToken(); },
      () => { this.mintingSellerToken(); },
      () => { this.payingFactoryOutput(); },
      () => { this.payingTreasuryOutput({treasuryOutDatum: treasuryDatum}); },
      () => { this.payingSellerOutput(); },
    );
  }

  public buildAddSeller(options: BuildAddSellersOptions) {
    const { addSellerCount, validFrom, validTo, treasuryUtxo } = options;
    invariant(treasuryUtxo.datum);
    const treasuryInDatum = this.fromDatumTreasury(treasuryUtxo.datum);
    const treasuryOutDatum = {
      ...treasuryInDatum,
      sellerCount: treasuryInDatum.sellerCount + addSellerCount,
    }

    this.tasks.push(
      () => {
        this.treasuryInputs = [treasuryUtxo];
        this.treasurySpendRedeemer = { wrapper: "AddSeller" };
      },
      () => { this.spendingTreasuryInput(); },
      () => { this.mintingSellerToken(addSellerCount); },
      () => { this.payingTreasuryOutput({treasuryOutDatum}); },
      () => { this.payingSellerOutput({ addSellerCount }); },
      () => {
        this.tx
          .validFrom(validFrom)
          .validTo(validTo);
      },
    );
  }

  public buildUsingSeller(options: BuildUsingSellerOptions) {
    const { treasuryRefInput, sellerUtxo, validFrom, validTo, owners, orderInputs, orderOutputDatums } = options;
    invariant(sellerUtxo.datum);
    const sellerInDatum = this.fromDatumSeller(sellerUtxo.datum);
    let inputAmount = 0n;
    let inputPenaltyAmount = 0n;
    let outputAmount = 0n;
    let outputPenaltyAmount = 0n;
    for (const o of orderInputs) {
      invariant(o.datum);
      const datum = T.Data.from(o.datum, OrderValidatorFeedTypeOrder._datum);
      inputAmount += datum.amount;
      inputPenaltyAmount += datum.penaltyAmount;
    }
    for (const datum of orderOutputDatums) {
      outputAmount += datum.amount;
      outputPenaltyAmount += datum.penaltyAmount;
    }
    const detalAmount = outputAmount - inputAmount;
    const deltaPenaltyAmount = outputPenaltyAmount - inputPenaltyAmount;
    const sellerOutDatum: SellerValidatorValidateSellerSpending["sellerInDatum"] = {
      ...sellerInDatum,
      amount: sellerInDatum.amount + detalAmount,
      penaltyAmount: sellerInDatum.penaltyAmount + deltaPenaltyAmount,
    }
    const mintingSellerCount = BigInt(orderOutputDatums.length - orderInputs.length);

    this.tasks.push(
      () => {
        this.sellerInputs = [sellerUtxo];
        this.sellerSpendRedeemer = { wrapper: "UsingSeller" };
        this.treasuryRefInput = treasuryRefInput;
        this.orderInputs = orderInputs;
        this.orderSpendRedeemer = "UpdateOrder";
        for (const owner of owners) {
          this.tx.addSigner(owner);
        }
      },
      () => { this.spendingSellerInput(); },
      () => { this.spendingOrderInput(); },
      () => { this.mintingOrderToken(mintingSellerCount); },
      () => { this.payingSellerOutput({ outDatum: sellerOutDatum }); },
      () => { this.payingOrderOutput(...orderOutputDatums); },
      () => {
        this.tx
          .validFrom(validFrom)
          .validTo(validTo);
      },
    );
  }

  public buildCancelLBE(options: BuildCancelLBEOptions) {
    const { treasuryInput, validTo, ammFactoryRefInput } = options;
    invariant(treasuryInput.datum);
    const treasuryInDatum = this.fromDatumTreasury(treasuryInput.datum);
    const treasuryOutDatum: TreasuryValidatorValidateTreasurySpending["treasuryInDatum"] = {
      ...treasuryInDatum,
      isCancelled: true,
    };

    this.tasks.push(
      () => {
        this.treasuryInputs = [treasuryInput];
        this.treasurySpendRedeemer = { wrapper: "CancelLBE" };
        if (validTo) {
          this.tx
            .validTo(validTo)
            .addSigner(plutusAddress2Address(this.t.network, treasuryInDatum.owner));
        } else if (ammFactoryRefInput) {
          this.tx.readFrom([ammFactoryRefInput]);
        }
      },
      () => { this.spendingTreasuryInput(); },
      () => { this.payingTreasuryOutput({treasuryOutDatum}); },
    );
  }

  public buildCreateAmmPool(options: BuildCreateAmmPoolOptions) {
    const { treasuryInput, ammFactoryInput, ammPoolDatum } = options;
    let treasuryOutDatum: TreasuryValidatorValidateTreasurySpending["treasuryInDatum"];

    this.tasks.push(
      () => {
        this.treasuryInputs = [treasuryInput];
        this.treasurySpendRedeemer = { wrapper: "CreateAmmPool" };
      },
      () => { this.spendingTreasuryInput(); },
      () => { this._buildCreateAmmPool({ poolDatum: ammPoolDatum, factoryInput: ammFactoryInput }); },
      () => { this.payingTreasuryOutput({treasuryOutDatum}); },
    );
  }

  public buildCloseEvent(options: BuildCloseEventOptions) {
    const { treasuryInput, factoryInputs } = options;
    this.tasks.push(
      () => {
        this.treasuryInputs = [treasuryInput];
        this.treasurySpendRedeemer = { wrapper: "CloseEvent" };
        invariant(treasuryInput.datum);
        const treasuryDatum = this.fromDatumTreasury(treasuryInput.datum);

        this.factoryInputs = factoryInputs;
        this.factoryRedeemer = {
          baseAsset: treasuryDatum.baseAsset,
          raiseAsset: treasuryDatum.raiseAsset,
          step: "RemoveTreasury",
        };
        this.tx.addSigner(plutusAddress2Address(this.t.network, treasuryDatum.owner));
      },
      () => { this.spendingTreasuryInput(); },
      () => { this.spendingFactoryInput(); },
      () => { this.mintingTreasuryToken(); },
      () => { this.mintingFactoryToken(); },
      () => { this.payingFactoryOutput(); },
    );
  }

  public buildCollectOrder(options: BuildCollectOrdersOptions) {
    const { treasuryInput, orderInputs } = options;
    invariant(treasuryInput.datum);
    const treasuryInDatum = this.fromDatumTreasury(treasuryInput.datum);
    const treasuryOutDatum: TreasuryValidatorValidateTreasurySpending["treasuryInDatum"] = {
      ...treasuryInDatum,
    };
    const orderOutDatums: OrderValidatorFeedTypeOrder["_datum"][] = [];
    let deltaCollectedFund = 0n;

    for (const o of orderInputs) {
      invariant(o.datum);
      const datum: OrderValidatorFeedTypeOrder["_datum"] = {
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
        this.treasurySpendRedeemer = { wrapper: "CollectOrders" };
        this.orderInputs = orderInputs;
        this.orderSpendRedeemer = "CollectOrder";

      },
      () => { this.spendingTreasuryInput() },
      () => { this.spendingOrderInput() },
      () => { this.payingTreasuryOutput({treasuryOutDatum, deltaCollectedFund}) },
      () => { this.payingOrderOutput(...orderOutDatums) },
    );
  }

  public buildCollectSeller(options: BuildCollectSellersOptions) {

  }

  /************************* PARSER  *************************/
  private fromDatumTreasury(rawDatum: string): TreasuryValidatorValidateTreasurySpending["treasuryInDatum"] {
    return T.Data.from(rawDatum, TreasuryValidatorValidateTreasurySpending.treasuryInDatum);
  }

  private toDatumTreasury(datum: TreasuryValidatorValidateTreasurySpending["treasuryInDatum"]): string {
    return T.Data.to(datum, TreasuryValidatorValidateTreasurySpending.treasuryInDatum);
  }

  private fromDatumFactory(rawDatum: string): FactoryValidatorValidateFactory["datum"] {
    return T.Data.from(rawDatum, FactoryValidatorValidateFactory.datum);
  }

  private toDatumFactory(datum: FactoryValidatorValidateFactory["datum"]) {
    return T.Data.to(datum, FactoryValidatorValidateFactory.datum);
  }

  private fromDatumSeller(rawDatum: string): SellerValidatorValidateSellerSpending["sellerInDatum"] {
    return T.Data.from(rawDatum, SellerValidatorValidateSellerSpending.sellerInDatum);
  }

  private toDatumSeller(datum: SellerValidatorValidateSellerSpending["sellerInDatum"]): string {
    return T.Data.to(datum, SellerValidatorValidateSellerSpending.sellerInDatum);
  }

  private fromDatumOrder(rawDatum: string): OrderValidatorFeedTypeOrder["_datum"] {
    return T.Data.from(rawDatum, OrderValidatorFeedTypeOrder._datum);
  }

  private toDatumOrder(datum: OrderValidatorFeedTypeOrder["_datum"]): string {
    return T.Data.to(datum, OrderValidatorFeedTypeOrder._datum);
  }

  /************************* SPENDING  *************************/
  private spendingSellerInput() {
    if (this.sellerInputs.length === 0) {
      return;
    }
    if (this.sellerSpendRedeemer && this.sellerSpendRedeemer.wrapper === "UsingSeller") {
      invariant(this.treasuryRefInput);
      this.tx.readFrom([this.treasuryRefInput]);
    }
    invariant(this.sellerSpendRedeemer);
    this.tx
      .readFrom([this.deployedValidators["sellerValidator"]])
      .collectFrom(
        this.sellerInputs,
        T.Data.to(this.sellerSpendRedeemer, SellerValidatorValidateSellerSpending.redeemer),
      );
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
        T.Data.to(this.factoryRedeemer, FactoryValidatorValidateFactory.redeemer),
      );
  }

  private spendingOrderInput() {
    if (this.orderInputs.length === 0) {
      return;
    }
    invariant(this.orderSpendRedeemer);
    this.tx
      .readFrom([this.deployedValidators["orderValidator"]])
      .collectFrom(
        this.orderInputs,
        T.Data.to(this.orderSpendRedeemer, OrderValidatorFeedTypeOrder._redeemer),
      );
  }

  private spendingTreasuryInput() {
    if (this.treasuryInputs.length === 0) {
      return;
    }
    invariant(this.treasurySpendRedeemer);
    this.tx
      .readFrom([this.deployedValidators["treasuryValidator"]])
      .collectFrom(
        this.treasuryInputs,
        T.Data.to(this.treasurySpendRedeemer, TreasuryValidatorValidateTreasurySpending.redeemer),
      );
  }


  /************************* PAYING  *************************/
  private payingTreasuryOutput(
    options: {
      treasuryOutDatum: TreasuryValidatorValidateTreasurySpending["treasuryInDatum"],
      deltaCollectedFund?: bigint
    }) {
    const { treasuryOutDatum, deltaCollectedFund } = options;
    const innerPay = (assets: Assets) => {
      this.tx
        .payToAddressWithData(
          this.treasuryAddress,
          {
            inline: this.toDatumTreasury(treasuryOutDatum),
          },
          assets,
        );
    }

    if (this.treasurySpendRedeemer === undefined) {
      const assets = {
        [this.treasuryToken]: 1n,
        [T.toUnit(
          treasuryOutDatum.baseAsset.policyId,
          treasuryOutDatum.baseAsset.assetName,
        )]: treasuryOutDatum.reserveBase,
      };
      innerPay(assets);
    } else {
      invariant(this.treasuryInputs.length > 0);
      const assets = { ...this.treasuryInputs[0].assets };
      if (this.treasurySpendRedeemer.wrapper === "CollectOrders") {
        invariant(deltaCollectedFund);
        const raiseAsset = T.toUnit(treasuryOutDatum.raiseAsset.policyId, treasuryOutDatum.raiseAsset.assetName);
        assets[raiseAsset] = (assets[raiseAsset] ?? 0n) + deltaCollectedFund;
      }
      innerPay(assets);
    }
  }

  private payingOrderOutput(...orderDatums: OrderValidatorFeedTypeOrder["_datum"][]) {
    const innerPay = (datum: OrderValidatorFeedTypeOrder["_datum"]) => {
      const assets = {
        [this.orderToken]: 1n,
        "lovelace": LBE_MIN_OUTPUT_ADA + (datum.isCollected ? LBE_FEE : LBE_FEE * 2n),
      };
      const raiseAsset = T.toUnit(datum.raiseAsset.policyId, datum.raiseAsset.assetName);
      assets[raiseAsset] = (assets[raiseAsset] ?? 0n) + datum.amount + datum.penaltyAmount;

      this.tx
        .payToAddressWithData(
          this.orderAddress,
          {
            inline: this.toDatumOrder(datum),
          },
          assets,
        );
    }
    for (const datum of orderDatums) {
      innerPay(datum);
    }
  }

  private payingSellerOutput(
    option: {
      addSellerCount?: bigint,
      outDatum?: SellerValidatorValidateSellerSpending["sellerInDatum"]
    } = { addSellerCount: undefined, outDatum: undefined }) {
    const { addSellerCount, outDatum } = option;
    const innerPay = (datum: SellerValidatorValidateSellerSpending["sellerInDatum"]) => {
      this.tx
        .payToAddressWithData(
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
    } else {
      const cases: Record<number, () => void> = {
        // Create Treasury
        0: () => {
          invariant(this.factoryRedeemer);
          const baseAsset = this.factoryRedeemer.baseAsset;
          const raiseAsset = this.factoryRedeemer.raiseAsset;
          const sellerDatum: SellerValidatorValidateSellerSpending["sellerInDatum"] = {
            baseAsset,
            raiseAsset,
            amount: 0n,
            penaltyAmount: 0n,
          };
          for (let i = 0; i < DEFAULT_NUMBER_SELLER; i++) {
            innerPay(sellerDatum);
          }
        },
        // Add Sellers
        1: () => {
          invariant(this.treasuryInputs.length > 0);
          invariant(this.treasuryInputs[0].datum);
          const treasuryDatum = this.fromDatumTreasury(this.treasuryInputs[0].datum);
          const sellerDatum: SellerValidatorValidateSellerSpending["sellerInDatum"] = {
            baseAsset: treasuryDatum.baseAsset,
            raiseAsset: treasuryDatum.raiseAsset,
            amount: 0n,
            penaltyAmount: 0n,
          };
          invariant(addSellerCount);
          for (let i = 0n; i < addSellerCount; i++) {
            innerPay(sellerDatum);
          }
        },
      };
      cases[this.treasuryInputs.length]();
    }
  }

  private payingFactoryOutput() {
    const innerPay = (datum: FactoryValidatorValidateFactory["datum"]) => {
      this.tx
        .payToAddressWithData(
          this.factoryAddress,
          {
            inline: this.toDatumFactory(datum),
          },
          {
            [this.factoryToken]: 1n,
          },
        );
    }

    const cases: Record<number, () => void> = {
      // Init System
      0: () => {
        const factoryDatum: FactoryValidatorValidateFactory["datum"] = {
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
        const baseAsset = this.factoryRedeemer.baseAsset;
        const raiseAsset = this.factoryRedeemer.raiseAsset;
        const lpAssetName = computeLPAssetName(
          baseAsset.policyId + baseAsset.assetName,
          raiseAsset.policyId + raiseAsset.assetName,
        );
        const factoryDatum = this.fromDatumFactory(this.factoryInputs[0].datum);
        const newFactoryHeadDatum: FactoryValidatorValidateFactory["datum"] = {
          head: factoryDatum.head,
          tail: lpAssetName,
        };
        const newFactoryTailDatum: FactoryValidatorValidateFactory["datum"] = {
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

  /************************* MINTING *************************/
  private mintingTreasuryToken() {
    const cases: Record<number, { amount: bigint; redeemer: AuthenMintingPolicyValidateAuthen["redeemer"] }> = {
      1: {
        amount: 1n,
        redeemer: { MintTreasury: { step: "CreateTreasury" } },
      },
      2: {
        amount: -1n,
        redeemer: { MintTreasury: { step: "RemoveTreasury" } },
      },
    };
    const { amount, redeemer } = cases[this.factoryInputs.length];
    this.tx
      .readFrom([this.deployedValidators["authenValidator"]])
      .mintAssets(
        {
          [this.treasuryToken]: amount,
        },
        T.Data.to(redeemer, AuthenMintingPolicyValidateAuthen.redeemer),
      )
  }

  private mintingSellerToken(addSellerCount?: bigint) {
    let mintAmount = 0n;
    let redeemer: TreasuryValidatorValidateTreasuryMintingOrWithdrawal["redeemer"];
    if (this.factoryInputs.length) {
      redeemer = "InitTreasury";
      mintAmount = DEFAULT_NUMBER_SELLER;
    } else {
      invariant(addSellerCount);
      mintAmount = this.sellerInputs.length ? -1n * BigInt(this.sellerInputs.length) : addSellerCount;
      redeemer = this.sellerInputs.length ? "CollectOrders" : "AddSeller";
    }
    if (mintAmount) {
      this.tx
        .readFrom([this.deployedValidators["treasuryValidator"]])
        .mintAssets(
          {
            [this.sellerToken]: mintAmount,
          },
          T.Data.to(redeemer, TreasuryValidatorValidateTreasuryMintingOrWithdrawal.redeemer)
        );
    }
  }

  private mintingOrderToken(count: bigint) {
    const mintAmount = this.treasuryInputs.length ? -1n * BigInt(this.orderInputs.length) : count;
    const redeemer: SellerValidatorValidateSellerMintingOrWithdraw["redeemer"] =
      this.treasuryInputs.length ? "CollectOrderToken" : "UsingSeller";
    this.tx
      .readFrom([this.deployedValidators["sellerValidator"]])
      .mintAssets(
        {
          [this.orderToken]: mintAmount,
        },
        T.Data.to(redeemer, SellerValidatorValidateSellerMintingOrWithdraw.redeemer)
      );
  }

  private mintingFactoryToken() {
    const cases: Record<number, { amount: bigint; redeemer: AuthenMintingPolicyValidateAuthen["redeemer"] }> = {
      0: {
        amount: 1n,
        redeemer: "MintFactory",
      },
      1: {
        amount: 1n,
        redeemer: { MintTreasury: { step: "CreateTreasury" } },
      },
      2: {
        amount: -1n,
        redeemer: { MintTreasury: { step: "RemoveTreasury" } },
      },
    };
    const { amount, redeemer } = cases[this.factoryInputs.length];
    this.tx
      .readFrom([this.deployedValidators["authenValidator"]])
      .mintAssets(
        {
          [this.factoryToken]: amount,
        },
        T.Data.to(redeemer, AuthenMintingPolicyValidateAuthen.redeemer),
      );
  }
  /************************* AMM *************************/
  private _buildCreateAmmPool(options: { poolDatum: FeedTypeAmmPool["_datum"], factoryInput: UTxO }) {
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
    const unitA = T.toUnit(poolDatum.assetA.policyId, poolDatum.assetA.assetName);
    const unitB = T.toUnit(poolDatum.assetB.policyId, poolDatum.assetB.assetName);
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
        }
      )
      .payToAddressWithData(
        this.ammFactoryAddress,
        {
          inline: T.Data.to(tailFactoryDatum, AmmValidateFactory.datum),
        },
        {
          [this.ammFactoryToken]: 1n,
        }
      )
      .payToAddressWithData(
        this.ammPoolAddress,
        {
          inline: T.Data.to(poolDatum, FeedTypeAmmPool._datum),
        },
        poolAssets,
      )
  }
}
