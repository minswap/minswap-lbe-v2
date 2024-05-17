import * as T from "@minswap/translucent";
import {
  address2PlutusAddress,
  computeLPAssetName,
} from "./utils.ts";
import {
  AuthenMintingPolicyValidateAuthen,
  FactoryValidatorValidateFactory,
  OrderValidatorFeedTypeOrder,
  SellerValidatorValidateSellerMintingOrWithdraw,
  SellerValidatorValidateSellerSpending,
  TreasuryValidatorValidateTreasuryMintingOrWithdrawal,
  TreasuryValidatorValidateTreasurySpending,
} from "../plutus.ts";
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
  ORDER_AUTH_AN,
  SELLER_AUTH_AN,
  TREASURY_AUTH_AN,
} from "./constants.ts";
import type { DeployedValidators, Validators } from "./deploy-validators.ts";

export type WarehouseBuilderOptions = {
  t: Translucent;
  validators: Validators;
  deployedValidators: DeployedValidators;
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

};

export class WarehouseBuilder {
  t: Translucent;
  validators: Validators;
  deployedValidators: DeployedValidators;
  tx: Tx | undefined = undefined;
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
  treasuryMintRedeemer: TreasuryValidatorValidateTreasuryMintingOrWithdrawal["redeemer"] | undefined;
  sellerSpendRedeemer: SellerValidatorValidateSellerSpending["redeemer"] | undefined;
  orderSpendRedeemer: OrderValidatorFeedTypeOrder["_redeemer"] | undefined;


  constructor(options: WarehouseBuilderOptions) {
    const { t, validators, deployedValidators } = options;
    this.t = t;
    this.validators = validators;
    this.deployedValidators = deployedValidators;

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
  }

  public complete(): Tx {
    this.tx = this.t.newTx();
    for (const task of this.tasks) {
      task();
    }
    return this.tx!;
  }

  public buildInitFactory(options: BuildInitFactoryOptions) {
    const { seedUtxo } = options;
    this.tasks.push(
      () => { this.tx!.collectFrom([seedUtxo]) },
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
        this.treasuryMintRedeemer = "InitTreasury";
      },
      () => { this.spendingFactoryInput(); },
      () => { this.mintingFactoryToken(); },
      () => { this.mintingTreasuryToken(); },
      () => { this.mintingSellerToken(); },
      () => { this.payingFactoryOutput(); },
      () => { this.payingTreasuryOutput(treasuryDatum); },
      () => { this.payingSellerOutput(); },
    );
  }

  public buildAddSeller(options: BuildAddSellersOptions) {
    const { addSellerCount, validFrom, validTo, treasuryUtxo } = options;
    const treasuryInDatum = T.Data.from(
      treasuryUtxo.datum!,
      TreasuryValidatorValidateTreasurySpending.treasuryInDatum
    );
    const treasuryOutDatum = {
      ...treasuryInDatum,
      sellerCount: treasuryInDatum.sellerCount + addSellerCount,
    }

    this.tasks.push(
      () => {
        this.treasuryInputs = [treasuryUtxo];
        this.treasurySpendRedeemer = { wrapper: "AddSeller" };
        this.treasuryMintRedeemer = "AddSeller";
      },
      () => { this.spendingTreasuryInput(); },
      () => { this.mintingSellerToken(addSellerCount); },
      () => { this.payingTreasuryOutput(treasuryOutDatum); },
      () => { this.payingSellerOutput({ addSellerCount }); },
      () => {
        this.tx!
          .validFrom(validFrom)
          .validTo(validTo);
      },
    );
  }

  public buildUsingSeller(options: BuildUsingSellerOptions) {
    const { treasuryRefInput, sellerUtxo, validFrom, validTo, owners, orderInputs, orderOutputDatums } = options;
    const sellerInDatum = T.Data.from(
      sellerUtxo.datum!,
      SellerValidatorValidateSellerSpending.sellerInDatum,
    );
    let inputAmount = 0n;
    let inputPenaltyAmount = 0n;
    let outputAmount = 0n;
    let outputPenaltyAmount = 0n;
    for (const o of orderInputs) {
      const datum = T.Data.from(o.datum!, OrderValidatorFeedTypeOrder._datum);
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
          this.tx!.addSigner(owner);
        }
      },
      () => { this.spendingSellerInput(); },
      () => { this.spendingOrderInput(); },
      () => { this.mintingOrderToken(mintingSellerCount); },
      () => { this.payingSellerOutput({ outDatum: sellerOutDatum }); },
      () => { this.payingOrderOutput(...orderOutputDatums); },
      () => {
        this.tx!
          .validFrom(validFrom)
          .validTo(validTo);
      },
    );
  }

  /************************* PARSER  *************************/
  private fromDatumTreasury(rawDatum: string): TreasuryValidatorValidateTreasurySpending["treasuryInDatum"] {
    return T.Data.from(rawDatum, TreasuryValidatorValidateTreasurySpending.treasuryInDatum);
  }

  private fromDatumFactory(rawDatum: string): FactoryValidatorValidateFactory["datum"] {
    return T.Data.from(rawDatum, FactoryValidatorValidateFactory.datum);
  }

  /************************* SPENDING  *************************/
  private spendingSellerInput() {
    if (!this.sellerInputs.length) {
      return;
    }
    if (this.sellerSpendRedeemer && this.sellerSpendRedeemer.wrapper === "UsingSeller") {
      this.tx!.readFrom([this.treasuryRefInput!]);
    }
    this.tx!
      .readFrom([this.deployedValidators["sellerValidator"]])
      .collectFrom(
        this.sellerInputs,
        T.Data.to(this.sellerSpendRedeemer!, SellerValidatorValidateSellerSpending.redeemer),
      );
  }

  private spendingFactoryInput() {
    if (!this.factoryInputs) {
      return;
    }
    this.tx!
      .readFrom([this.deployedValidators["factoryValidator"]])
      .collectFrom(
        this.factoryInputs,
        T.Data.to(this.factoryRedeemer!, FactoryValidatorValidateFactory.redeemer),
      );
  }

  private spendingOrderInput() {
    if (!this.orderInputs.length) {
      return;
    }
    this.tx!
      .readFrom([this.deployedValidators["orderValidator"]])
      .collectFrom(
        this.orderInputs,
        T.Data.to(this.orderSpendRedeemer!, OrderValidatorFeedTypeOrder._redeemer),
      );
  }

  private spendingTreasuryInput() {
    if (!this.treasuryInputs) {
      return;
    }
    this.tx!
      .readFrom([this.deployedValidators["treasuryValidator"]])
      .collectFrom(
        this.treasuryInputs,
        T.Data.to(this.treasurySpendRedeemer!, TreasuryValidatorValidateTreasurySpending.redeemer),
      );
  }


  /************************* PAYING  *************************/
  private payingTreasuryOutput(treasuryDatum: TreasuryValidatorValidateTreasurySpending["treasuryInDatum"]) {
    const innerPay = (assets: Assets) => {
      this.tx!
        .payToAddressWithData(
          this.treasuryAddress,
          {
            inline: T.Data.to(treasuryDatum, TreasuryValidatorValidateTreasurySpending.treasuryInDatum),
          },
          assets,
        );
    };
    const cases: Record<string, () => void> = {
      // Create Treasury
      "None": () => {
        const assets = {
          [this.treasuryToken]: 1n,
          [T.toUnit(
            treasuryDatum.baseAsset.policyId,
            treasuryDatum.baseAsset.assetName,
          )]: treasuryDatum.reserveBase,
        };
        innerPay(assets);
      },
      "AddSeller": () => {
        const assets = { ...this.treasuryInputs[0]!.assets };
        innerPay(assets);
      },
    }
    const key = this.treasurySpendRedeemer ? this.treasurySpendRedeemer.wrapper : "None";
    cases[key]();
  }

  private payingOrderOutput(...orderDatums: OrderValidatorFeedTypeOrder["_datum"][]) {
    const innerPay = (datum: OrderValidatorFeedTypeOrder["_datum"]) => {
      const assets = {
        [this.orderToken]: 1n,
        "lovelace": LBE_MIN_OUTPUT_ADA + (datum.isCollected ? LBE_FEE : LBE_FEE * 2n),
      };
      const raiseAsset = T.toUnit(datum.raiseAsset.policyId, datum.raiseAsset.assetName);
      assets[raiseAsset] = (assets[raiseAsset] ?? 0n) + datum.amount + datum.penaltyAmount;

      this.tx!
        .payToAddressWithData(
          this.orderAddress,
          {
            inline: T.Data.to(datum, OrderValidatorFeedTypeOrder._datum),
          },
          assets,
        );
    }
    for (const datum of orderDatums) {
      innerPay(datum);
    }
  }

  private payingSellerOutput(
    option?: {
      addSellerCount?: bigint,
      outDatum?: SellerValidatorValidateSellerSpending["sellerInDatum"]
    }) {
    const innerPay = (datum: SellerValidatorValidateSellerSpending["sellerInDatum"]) => {
      this.tx!
        .payToAddressWithData(
          this.sellerAddress,
          {
            inline: T.Data.to(datum, SellerValidatorValidateSellerSpending.sellerInDatum),
          },
          {
            [this.sellerToken]: 1n,
          },
        );
    };
    if (this.sellerInputs.length) {
      innerPay(option!.outDatum!);
    } else {
      const cases: Record<number, () => void> = {
        // Create Treasury
        0: () => {
          const baseAsset = this.factoryRedeemer!.baseAsset;
          const raiseAsset = this.factoryRedeemer!.raiseAsset;
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
          const treasuryDatum = this.fromDatumTreasury(this.treasuryInputs[0]!.datum!);
          const sellerDatum: SellerValidatorValidateSellerSpending["sellerInDatum"] = {
            baseAsset: treasuryDatum.baseAsset,
            raiseAsset: treasuryDatum.raiseAsset,
            amount: 0n,
            penaltyAmount: 0n,
          };
          for (let i = 0n; i < option!.addSellerCount!; i++) {
            innerPay(sellerDatum);
          }
        },
      };
      cases[this.treasuryInputs.length]();
    }
  }

  private payingFactoryOutput() {
    const innerPay = (datum: FactoryValidatorValidateFactory["datum"]) => {
      this.tx!
        .payToAddressWithData(
          this.factoryAddress,
          {
            inline: T.Data.to(datum, FactoryValidatorValidateFactory.datum),
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
        const baseAsset = this.factoryRedeemer!.baseAsset;
        const raiseAsset = this.factoryRedeemer!.raiseAsset;
        const lpAssetName = computeLPAssetName(
          baseAsset.policyId + baseAsset.assetName,
          raiseAsset.policyId + raiseAsset.assetName,
        );
        const factoryDatum = this.fromDatumFactory(this.factoryInputs[0]!.datum!);
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
        const factoryDatum1 = this.fromDatumFactory(this.factoryInputs[0]!.datum!);
        const factoryDatum2 = this.fromDatumFactory(this.factoryInputs[1]!.datum!);
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
    this.tx!
      .readFrom([this.deployedValidators["authenValidator"]])
      .mintAssets(
        {
          [this.treasuryToken]: amount,
        },
        T.Data.to(redeemer, AuthenMintingPolicyValidateAuthen.redeemer),
      )
  }

  private mintingSellerToken(addSellerCount?: bigint) {
    const cases: Record<string, bigint> = {
      "InitTreasury": DEFAULT_NUMBER_SELLER,
      "CollectSeller": -1n * BigInt(this.sellerInputs.length),
      "AddSeller": addSellerCount!,
    };
    const amount = cases[this.treasuryMintRedeemer!];
    this.tx!
      .readFrom([this.deployedValidators["treasuryValidator"]])
      .mintAssets(
        {
          [this.sellerToken]: amount,
        },
        T.Data.to(this.treasuryMintRedeemer!, TreasuryValidatorValidateTreasuryMintingOrWithdrawal.redeemer)
      );
  }

  private mintingOrderToken(count?: bigint) {
    const cases: Record<string, { amount: bigint, redeemer: SellerValidatorValidateSellerMintingOrWithdraw["redeemer"] }> = {
      "UsingSeller": { amount: count!, redeemer: "UsingSeller", },
      "CollectOrderToken": { amount: -1n * BigInt(this.orderInputs.length), redeemer: "CollectOrderToken" },
    };
    const { amount, redeemer } = cases[this.treasuryMintRedeemer!];
    this.tx!
      .readFrom([this.deployedValidators["sellerValidator"]])
      .mintAssets(
        {
          [this.orderToken]: amount,
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
    this.tx!
      .readFrom([this.deployedValidators["authenValidator"]])
      .mintAssets(
        {
          [this.factoryToken]: amount,
        },
        T.Data.to(redeemer, AuthenMintingPolicyValidateAuthen.redeemer),
      );
  }
}

// export function buildDeposit({
//   validatorRefs: { validators, deployedValidators },
//   t,
//   tx,
//   owner,
//   baseAsset,
//   raiseAsset,
//   amount,
//   sellerUtxo,
//   validFrom,
//   validTo,
//   treasuryRefInput,
// }: BaseBuildOptions & BuildDepositOptions) {
//   const { toUnit, Data } = T;
//   const orderDatum: OrderValidatorFeedTypeOrder["_datum"] = {
//     baseAsset,
//     raiseAsset,
//     amount: amount,
//     penaltyAmount: 0n,
//     isCollected: false,
//     owner: address2PlutusAddress(owner),
//   };
//   const orderValue: Assets =
//     raiseAsset.policyId === "" && raiseAsset.assetName === ""
//       ? {
//         lovelace: amount + 5000000n,
//       }
//       : {
//         lovelace: 5000000n,
//         [toUnit(raiseAsset.policyId, raiseAsset.assetName)]: amount,
//       };
//   const metadata = {
//     msg: [`Minswap V2: LBE Deposit.`],
//   };
//   const orderAddress = t.utils.validatorToAddress(validators.orderValidator);
//   const sellerAddress = t.utils.validatorToAddress(validators.sellerValidator);
//   const sellerDatumIn = Data.from(sellerUtxo.datum!, SellerValidatorValidateSellerSpending.sellerInDatum);
//   const sellerDatumOut = {
//     ...sellerDatumIn,
//     amount: sellerDatumIn.amount + amount,
//   }
//   const sellerMintingRedeemer: SellerValidatorValidateSellerMintingOrWithdraw["redeemer"] = "UsingSeller";

//   const txBuilder = tx
//     .readFrom([
//       treasuryRefInput,
//       deployedValidators["sellerValidator"],
//     ])
//     .mintAssets(
//       {},
//       Data.to(sellerMintingRedeemer, SellerValidatorValidateSellerMintingOrWithdraw.redeemer),
//     )
//     .payToAddressWithData(
//       orderAddress,
//       {
//         inline: Data.to(orderDatum, OrderValidatorFeedTypeOrder._datum),
//       },
//       orderValue,
//     )
//     .payToAddressWithData(
//       sellerAddress,
//       {
//         inline: Data.to(sellerDatumOut, SellerValidatorValidateSellerSpending.sellerInDatum),
//       },
//       sellerUtxo.assets,
//     )
//     .validFrom(validFrom)
//     .validTo(validTo)
//     .attachMetadata(674, metadata);

//   return {
//     txBuilder: txBuilder,
//   };
// }

// export type BuildCancelOrderOptions = {
//   owner: Address;
//   utxo: UTxO;
// };

// export function buildCancelOrder(
//   options: BaseBuildOptions & BuildCancelOrderOptions,
// ) {
//   const { Data } = T;
//   const {
//     validatorRefs: { deployedValidators },
//     tx,
//     utxo,
//     owner,
//   } = options;
//   const metadata = {
//     msg: [`Minswap V2: LBE Cancel Order.`],
//   };
//   const redeemer: OrderValidatorFeedType["_redeemer"] = "CancelOrder";

//   const txBuilder = tx
//     .readFrom([deployedValidators["orderValidator"]])
//     .collectFrom([utxo], Data.to(redeemer, OrderValidatorFeedType._redeemer))
//     .addSigner(owner)
//     .attachMetadata(674, metadata);
//   return {
//     txBuilder: txBuilder,
//   };
// }

// export type BuildApplyOrdersOptions = {
//   orderUTxOs: UTxO[];
//   treasuryUTxO: UTxO;
//   validFrom: UnixTime;
//   validTo: UnixTime;
// };

// function getPurrAssetName(datum: TreasuryValidatorValidateTreasury["datum"]) {
//   const baseAsset = datum.baseAsset;
//   const raiseAsset = datum.raiseAsset;
//   const lpAssetName = computeLPAssetName(
//     baseAsset.policyId + baseAsset.assetName,
//     raiseAsset.policyId + raiseAsset.assetName,
//   );
//   return lpAssetName;
// }

// export function buildApplyOrders(
//   options: BaseBuildOptions & BuildApplyOrdersOptions,
// ) {
//   const { Data, toUnit } = T;
//   const {
//     t,
//     tx,
//     validatorRefs: { deployedValidators, validators },
//     treasuryUTxO,
//     orderUTxOs,
//     validFrom,
//     validTo,
//   } = options;
//   const treasuryRedeemer: TreasuryValidatorValidateTreasury["redeemer"] =
//     "Batching";
//   const orderRedeemer: OrderValidatorFeedType["_redeemer"] = "ApplyOrder";
//   const orderRewardAddress = t.utils.validatorToRewardAddress(
//     validators!.orderSpendingValidator,
//   );
//   const orderBatchingRedeemer: OrderValidatorValidateOrderSpending["redeemer"] =
//   {
//     treasuryInputIndex: BigInt(
//       findInputIndex([...orderUTxOs, treasuryUTxO], treasuryUTxO)!,
//     ),
//   };
//   const applyTreasury = (): {
//     newTreasuryDatum: string;
//     newTreasuryAssets: Assets;
//   } => {
//     const treasuryDatum = Data.from(
//       treasuryUTxO.datum!,
//       TreasuryValidatorValidateTreasury.datum,
//     );
//     const treasuryValue = {
//       ...treasuryUTxO.assets,
//     };
//     let raiseAsset = `${treasuryDatum.raiseAsset.policyId}${treasuryDatum.raiseAsset.assetName}`;
//     if (raiseAsset === "") {
//       raiseAsset = "lovelace";
//     }
//     const purrAsset = toUnit(
//       t.utils.validatorToScriptHash(validators!.authenValidator),
//       getPurrAssetName(treasuryDatum),
//     );
//     for (const order of orderUTxOs) {
//       const orderDatum = Data.from(order.datum!, OrderValidatorFeedType._datum);
//       if (orderDatum.step === "Deposit") {
//         let estimateIn = order.assets[raiseAsset];
//         if (raiseAsset === "lovelace") {
//           estimateIn -= 2_000_000n;
//         }
//         treasuryDatum.reserveRaise += estimateIn;
//         treasuryValue[raiseAsset] += estimateIn;
//         treasuryValue[purrAsset] -= estimateIn;
//       } else {
//         throw Error("Not support yet");
//       }
//     }
//     return {
//       newTreasuryDatum: Data.to(
//         treasuryDatum,
//         TreasuryValidatorValidateTreasury.datum,
//       ),
//       newTreasuryAssets: treasuryValue,
//     };
//   };
//   const { newTreasuryDatum, newTreasuryAssets } = applyTreasury();
//   const metadata = {
//     msg: [`Minswap V2: LBE Order Executed.`],
//   };
//   const txBuilder = tx
//     .readFrom([
//       deployedValidators["orderValidator"],
//       deployedValidators["orderSpendingValidator"],
//       deployedValidators["treasuryValidator"],
//     ])
//     .collectFrom(
//       [treasuryUTxO],
//       Data.to(treasuryRedeemer, TreasuryValidatorValidateTreasury.redeemer),
//     )
//     .collectFrom(
//       orderUTxOs,
//       Data.to(orderRedeemer, OrderValidatorFeedType._redeemer),
//     )
//     .withdraw(
//       orderRewardAddress,
//       0n,
//       Data.to(
//         orderBatchingRedeemer,
//         OrderValidatorValidateOrderSpending.redeemer,
//       ),
//     )
//     .validFrom(validFrom)
//     .validTo(validTo)
//     .attachMetadata(674, metadata);

//   const sortedOrderUTxos = sortUTxOs(orderUTxOs);
//   for (const order of sortedOrderUTxos) {
//     const orderDatum = Data.from(order.datum!, OrderValidatorFeedType._datum);
//     const owner = plutusAddress2Address(t.network, orderDatum.owner);
//     const assets = {
//       lovelace: 1_500_000n,
//       [toUnit(
//         orderDatum.expectOutputAsset.policyId,
//         orderDatum.expectOutputAsset.assetName,
//       )]: orderDatum.minimumReceive,
//     };
//     txBuilder.payToAddress(owner, assets);
//   }
//   txBuilder.payToAddressWithData(
//     treasuryUTxO.address,
//     {
//       inline: newTreasuryDatum,
//     },
//     newTreasuryAssets,
//   );
//   return {
//     txBuilder: txBuilder,
//   };
// }

// export type BuildCreateAmmPoolOptions = {
//   treasuryUTxO: UTxO;
//   ammAuthenPolicyId: string;
//   validFrom: UnixTime;
// };

// export function buildCreateAmmPool(
//   options: BaseBuildOptions & BuildCreateAmmPoolOptions,
// ) {
//   const { toUnit, Data } = T;
//   const {
//     t,
//     tx,
//     validatorRefs: { deployedValidators },
//     treasuryUTxO,
//     ammAuthenPolicyId,
//     validFrom,
//   } = options;
//   const treasuryRedeemer: TreasuryValidatorValidateTreasury["redeemer"] =
//     "CreatePool";
//   const metadata = {
//     msg: [`Minswap V2: LBE Create AMM Pool.`],
//   };
//   const treasuryDatum: TreasuryValidatorValidateTreasury["datum"] = Data.from(
//     treasuryUTxO.datum!,
//     TreasuryValidatorValidateTreasury.datum,
//   );
//   const owner = plutusAddress2Address(t.network, treasuryDatum.owner);
//   const totalLiquidity = calculateInitialLiquidity(
//     treasuryDatum.reserveBase,
//     treasuryDatum.reserveRaise,
//   );
//   const ownerLiquidity = (totalLiquidity - LP_COLATERAL) / 2n;
//   const treasuryTotalLiquidity = totalLiquidity - LP_COLATERAL - ownerLiquidity;
//   const newTreasuryDatum: TreasuryValidatorValidateTreasury["datum"] = {
//     ...treasuryDatum,
//     isCreatedPool: 1n,
//     totalLiquidity: treasuryTotalLiquidity,
//   };
//   const lpAssetName = computeLPAssetName(
//     treasuryDatum.baseAsset.policyId + treasuryDatum.baseAsset.assetName,
//     treasuryDatum.raiseAsset.policyId + treasuryDatum.raiseAsset.assetName,
//   );
//   const lpAssetUnit = toUnit(ammAuthenPolicyId, lpAssetName);

//   let assetA = treasuryDatum.baseAsset;
//   let assetB = treasuryDatum.raiseAsset;
//   let amountA = treasuryDatum.reserveBase;
//   let amountB = treasuryDatum.reserveRaise;
//   if (
//     assetA.policyId > assetB.policyId ||
//     (assetA.policyId === assetB.policyId && assetA.assetName > assetB.assetName)
//   ) {
//     [assetA, assetB] = [assetB, assetA];
//     [amountA, amountB] = [amountB, amountA];
//   }
//   const baseAssetUnit = toUnit(
//     treasuryDatum.baseAsset.policyId,
//     treasuryDatum.baseAsset.assetName,
//   );
//   let raiseAssetUnit = `${treasuryDatum.raiseAsset.policyId}${treasuryDatum.raiseAsset.assetName}`;
//   if (raiseAssetUnit === "") {
//     raiseAssetUnit = "lovelace";
//   }
//   const newTreasuryAssets = {
//     ...treasuryUTxO.assets,
//     [lpAssetUnit]: newTreasuryDatum.totalLiquidity,
//     [baseAssetUnit]: 0n,
//     [raiseAssetUnit]:
//       treasuryUTxO.assets[raiseAssetUnit] - treasuryDatum.reserveRaise,
//   };
//   const txBuilder = tx
//     .readFrom([deployedValidators["treasuryValidator"]])
//     .collectFrom(
//       [treasuryUTxO],
//       Data.to(treasuryRedeemer, TreasuryValidatorValidateTreasury.redeemer),
//     )
//     .payToAddress(owner, {
//       [lpAssetUnit]: newTreasuryDatum.totalLiquidity / 2n,
//     })
//     .payToAddressWithData(
//       treasuryUTxO.address,
//       {
//         inline: Data.to(
//           newTreasuryDatum,
//           TreasuryValidatorValidateTreasury.datum,
//         ),
//       },
//       newTreasuryAssets,
//     )
//     .validFrom(validFrom)
//     .attachMetadata(674, metadata);

//   return {
//     txBuilder,
//     assetA,
//     assetB,
//     amountA,
//     amountB,
//   };
// }
