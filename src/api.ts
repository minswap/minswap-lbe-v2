import * as T from "@minswap/translucent";

import invariant from "@minswap/tiny-invariant";
import {
  DISCOVERY_MAX_RANGE,
  PENALTY_MAX_PERCENT,
  PENALTY_MAX_RANGE,
  POOL_BASE_FEE_MAX,
  POOL_BASE_FEE_MIN,
  WarehouseBuilder,
  address2PlutusAddress,
  computeLPAssetName,
  genWarehouseBuilderOptions,
  plutusAddress2Address,
  toUnit,
  type Address,
  type BluePrintAsset,
  type BuildCancelLBEOptions,
  type BuildCreateTreasuryOptions,
  type BuildUsingSellerOptions,
  type LbeId,
  type LbeUTxO,
  type MaestroSupportedNetworks,
  type OrderDatum,
  type PenaltyConfig,
  type TreasuryDatum,
  type UnixTime,
  type walletApi,
} from ".";

/**
 * Ask Tony
 */
const MAGIC_THINGS = {
  sellerAmount: 25n,
  sellerOwner:
    "addr_test1qr03hndgkqdw4jclnvps6ud43xvuhms7rurjq87yfgzc575pm6dyr7fz24xwkh6k0ldufe2rqhgkwcppx5fzjrx5j2rs2rt9qc",
};

/**
- **baseAsset:** `(require)` Asset project aims to list. Example: MIN, FLDT, …
- **reserveBase**: `(require)` The amount of *Base Asset* that project provided. The main goal of this Reserve Base is to create an AMM Pool.
- **raiseAsset:** `(require)` Asset project aims to raise. Example: ADA, USDC, …
- **startTime**: `(require)` The start time of the discovery phase.
- **endTime**: `(require)` The end time of the discovery phase.
- **owner**: `(require)` The address of project’s owner.
- **receiver**:  `(require)` Address for receiving the project's LP tokens.
- **poolAllocation**: `(require)` The rule defines how many funds will go to pool.
- **minimumOrderRaise**: `(optional)` Minimum amount in a single order.
- **minimumRaise**: `(optional)` The minimum amount expected to raise. If the amount of *Raise Asset* is lower than this threshold, the LBE will be canceled*.*
- **maximumRaise**: `(optional)` The maximum amount of raise asset expected to raise. If the amount of *Raise Asset* exceed this threshold, the excess amount should be returned to the users.
- **penaltyConfig**: `(optional)` Penalty on participants for early withdrawal.
- **revocable**: `(require)` The project owner has the ability to cancel the LBE during the discovery phase.
- **poolBaseFee**: `(require)` The Numerator of Trading Fee on AMM Pool.
 */
export interface LbeParameters {
  baseAsset: BluePrintAsset;
  reserveBase: bigint;
  raiseAsset: BluePrintAsset;
  startTime: UnixTime;
  endTime: UnixTime;
  owner: Address;
  receiver: Address;
  poolAllocation: bigint;
  minimumOrderRaise?: bigint;
  minimumRaise?: bigint;
  maximumRaise?: bigint;
  penaltyConfig?: PenaltyConfig;
  revocable: boolean;
  poolBaseFee: bigint;
}

export interface CreateOrderOptions {
  baseAsset: BluePrintAsset;
  raiseAsset: BluePrintAsset;
  owner: Address;
  amount: bigint;
}

/**
 * TopUp: Amount > 0
 * Withdraw: Amount < 0
 * Cancel | WithdrawAll : Amount == Order.amount
 */
export interface UpdateOrderOptions {
  baseAsset: BluePrintAsset;
  raiseAsset: BluePrintAsset;
  orderUTxO: LbeUTxO;
  amount: bigint;
}

export class Api {
  private builder: WarehouseBuilder;

  constructor(builder: WarehouseBuilder) {
    this.builder = builder;
  }

  async getCurrentSlot(): Promise<number> {
    let slot = await this.builder.t.getCurrentSlot();
    return slot;
  }

  async genValidFrom(): Promise<UnixTime> {
    let slot = await this.getCurrentSlot();
    return this.builder.t.utils.slotToUnixTime(slot);
  }

  /**
   * TODO: ask requirements
   * @returns Treasury UTxOs
   */
  async getLbes(): Promise<LbeUTxO[]> {
    return await this.builder.t.utxosAtWithUnit(
      this.builder.treasuryAddress,
      this.builder.treasuryToken,
    ) as LbeUTxO[];
  }

  async getOrders(lbeId: LbeId, owner?: Address): Promise<LbeUTxO[]> {
    let orders = await this.builder.t.utxosAtWithUnit(
      this.builder.orderAddress,
      this.builder.orderToken,
    ) as LbeUTxO[];
    return orders.filter((o) => {
      let orderDatum = WarehouseBuilder.fromDatumOrder(o.datum);
      return (
        Api.compareLbeId(lbeId, orderDatum) &&
        (owner
          ? owner ===
          plutusAddress2Address(this.builder.t.network, orderDatum.owner)
          : true)
      );
    });
  }

  /** ******************** Validating **************************/
  static validateUpdateOrder(options: {
    treasuryDatum: TreasuryDatum;
    validFrom: UnixTime;
    orderDatum: OrderDatum;
    amount: bigint;
  }): boolean {
    let { treasuryDatum, validFrom, orderDatum, amount } = options;

    invariant(treasuryDatum.isCancelled === false, "LBE is cancelled");
    invariant(
      treasuryDatum.startTime < BigInt(validFrom),
      "Discovery Phase not start",
    );
    invariant(
      treasuryDatum.endTime > BigInt(validFrom),
      "Discovery Phase ended",
    );

    if (amount < 0n) {
      let newAmount = orderDatum.amount + amount;
      invariant(
        newAmount > (treasuryDatum.minimumOrderRaise ?? 0n),
        "Order Amount must greater than minimum order raise",
      );
    }

    return true;
  }

  static validateCreateOrder(options: {
    treasuryDatum: TreasuryDatum;
    amount: bigint;
    validFrom: UnixTime;
  }): boolean {
    let { treasuryDatum, amount, validFrom } = options;

    invariant(treasuryDatum.isCancelled === false, "LBE is cancelled");
    invariant(
      treasuryDatum.startTime < BigInt(validFrom),
      "Discovery Phase not start",
    );
    invariant(
      treasuryDatum.endTime > BigInt(validFrom),
      "Discovery Phase ended",
    );
    invariant(
      amount > (treasuryDatum.minimumOrderRaise ?? 0n),
      "Order Amount must greater than minimum order raise",
    );
    return true;
  }

  /**
   * Validate Cancel LBE By Project Owner
   */
  static validateCancelLbeByOwner(
    validFrom: UnixTime,
    treasuryDatum: TreasuryDatum,
  ): Boolean {
    if (treasuryDatum.revocable) {
      invariant(
        BigInt(validFrom) < treasuryDatum.endTime,
        "Cancel before discovery phase end",
      );
    } else {
      invariant(
        BigInt(validFrom) < treasuryDatum.startTime,
        "Cancel before discovery phase start",
      );
    }
    return true;
  }

  /**
   * Validate LBE Parameters
   */
  static validateLbeParameters(lbeParameters: LbeParameters) {
    let {
      poolBaseFee,
      penaltyConfig,
      reserveBase,
      minimumRaise,
      maximumRaise,
      minimumOrderRaise,
      poolAllocation,
      startTime,
      endTime,
      baseAsset,
      raiseAsset,
    } = lbeParameters;
    let baseAssetUnit = toUnit(baseAsset.policyId, baseAsset.assetName);
    let raiseAssetUnit = toUnit(raiseAsset.policyId, raiseAsset.assetName);

    invariant(
      baseAssetUnit !== raiseAssetUnit,
      "Base Asset, Raise Asset must be different",
    );
    invariant(baseAssetUnit !== "lovelace", "Base Asset must not equal ADA");
    invariant(
      startTime >= Date.now() + 5 * 60 * 1000,
      "LBE must start in future",
    );
    invariant(startTime < endTime, "StartTime < EndTime");
    invariant(
      endTime - startTime <= DISCOVERY_MAX_RANGE,
      "Discovery Phase must in a month",
    );
    invariant(
      poolAllocation >= 70 && poolAllocation <= 100,
      "Pool Allocation in range 70 - 100 percentage",
    );
    if (minimumOrderRaise) {
      invariant(minimumOrderRaise > 0n, "Minimum Order > 0");
    }
    if (maximumRaise) {
      invariant(maximumRaise > 0n, "Maximum Raise > 0");
    }
    if (minimumRaise) {
      invariant(minimumRaise > 0, "Minimum Raise > 0");
      if (maximumRaise) {
        invariant(minimumRaise < maximumRaise, "Minimum Raise < Maximum Raise");
      }
    }
    invariant(reserveBase > 0, "Reserve Base > 0");
    if (penaltyConfig) {
      let { penaltyStartTime, percent } = penaltyConfig;
      invariant(
        penaltyStartTime > BigInt(startTime),
        "Penalty Start Time > Start Time",
      );
      invariant(
        penaltyStartTime < BigInt(endTime),
        "Penalty Start Time < End Time",
      );
      invariant(
        penaltyStartTime >= BigInt(endTime - PENALTY_MAX_RANGE),
        "Maximum penalty period of 2 final days",
      );
      invariant(percent > 0, "Penalty Percent > 0");
      invariant(
        percent <= PENALTY_MAX_PERCENT,
        `Penalty Percent <= ${PENALTY_MAX_PERCENT}`,
      );
    }
    invariant(
      poolBaseFee >= POOL_BASE_FEE_MIN && poolBaseFee <= POOL_BASE_FEE_MAX,
      `Pool Base Fee must in range ${POOL_BASE_FEE_MIN} - ${POOL_BASE_FEE_MAX}`,
    );
    return true;
  }
  /** **********************************************/

  /***************** Find UTxO *********************/
  /**
   * Finding Sellers
   */
  async findSellers(lbeId: LbeId): Promise<LbeUTxO[]> {
    let allSellers = await this.builder.t.utxosAtWithUnit(
      this.builder.sellerAddress,
      this.builder.sellerToken,
    ) as LbeUTxO[];
    return allSellers.filter((seller) => {
      let sellerDatum = WarehouseBuilder.fromDatumSeller(seller.datum);
      return Api.compareLbeId(sellerDatum, lbeId);
    });
  }

  /**
   *
   * @param param0 LBE ID
   * @returns Treasury UTxO base on LBE ID
   */
  async findTreasury(lbeId: LbeId): Promise<LbeUTxO> {
    let treasuries = await this.getLbes();
    let treasuryUTxO = treasuries.find((treasury) => {
      let treasuryDatum = WarehouseBuilder.fromDatumTreasury(treasury.datum);
      return Api.compareLbeId(treasuryDatum, lbeId);
    });
    if (treasuryUTxO === undefined) {
      throw Error("Cannot find Treasury");
    }
    return treasuryUTxO;
  }

  /**
   * @returns Factory UTxO base on baseAsset, raiseAsset
   */
  async findFactory({ baseAsset, raiseAsset }: LbeId): Promise<LbeUTxO> {
    let lpAssetName = computeLPAssetName(
      baseAsset.policyId + baseAsset.assetName,
      raiseAsset.policyId + raiseAsset.assetName,
    );
    let factories = await this.builder.t.utxosAtWithUnit(
      this.builder.factoryAddress,
      this.builder.factoryToken,
    ) as LbeUTxO[];
    let factoryUtxo = factories.find((factory) => {
      let factoryDatum = WarehouseBuilder.fromDatumFactory(factory.datum);
      return factoryDatum.head < lpAssetName && factoryDatum.tail > lpAssetName;
    });
    if (factoryUtxo === undefined) {
      throw Error("Cannot find Factory UTxO");
    }
    return factoryUtxo;
  }

  /**************************************************************** */

  /**
   * Actor: Project Owner
   * @param lbeParameters The LBE Parameters
   * @returns Transaction Cbor Hex of LBE creation
   */
  async createLbe(lbeParameters: LbeParameters): Promise<string> {
    Api.validateLbeParameters(lbeParameters);
    let {
      baseAsset,
      raiseAsset,
      owner,
      reserveBase,
      receiver,
      startTime,
      endTime,
      poolAllocation,
      minimumRaise,
      maximumRaise,
      penaltyConfig,
      poolBaseFee,
      minimumOrderRaise,
      revocable,
    } = lbeParameters;

    let factoryUtxo = await this.findFactory({ baseAsset, raiseAsset });
    let treasuryDatum: TreasuryDatum = {
      // default
      factoryPolicyId: this.builder.factoryHash,
      sellerHash: this.builder.sellerHash,
      orderHash: this.builder.orderHash,
      managerHash: this.builder.managerHash,
      receiverDatum: "RNoDatum",
      collectedFund: 0n,
      isManagerCollected: false,
      reserveRaise: 0n,
      totalLiquidity: 0n,
      totalPenalty: 0n,
      isCancelled: false,
      // parameters
      baseAsset,
      raiseAsset,
      startTime: BigInt(startTime),
      endTime: BigInt(endTime),
      owner: address2PlutusAddress(owner),
      receiver: address2PlutusAddress(receiver),
      poolAllocation,
      minimumRaise: minimumRaise ?? null,
      maximumRaise: maximumRaise ?? null,
      reserveBase,
      penaltyConfig: penaltyConfig ?? null,
      poolBaseFee,
      minimumOrderRaise: minimumOrderRaise ?? null,
      revocable,
    };

    let createTreasuryOptions: BuildCreateTreasuryOptions = {
      sellerAmount: MAGIC_THINGS.sellerAmount,
      factoryUtxo,
      treasuryDatum,
      sellerOwner: MAGIC_THINGS.sellerOwner,
      validFrom: await this.genValidFrom(),
      validTo: Date.now() + 3 * 60 * 60 * 1000,
    };

    this.builder.clean();
    let completeTx = await this.builder
      .buildCreateTreasury(createTreasuryOptions)
      .complete()
      .complete();

    return completeTx.toString();
  }

  /**
   * * Actor: Project Owner
   */
  async cancelLbe(lbeId: LbeId): Promise<string> {
    let treasuryInput = await this.findTreasury(lbeId);
    let treasuryDatum = WarehouseBuilder.fromDatumTreasury(
      treasuryInput.datum,
    );
    let validFrom = await this.genValidFrom();
    Api.validateCancelLbeByOwner(validFrom, treasuryDatum);

    let validTo: number =
      validFrom < Number(treasuryDatum.startTime)
        ? Number(treasuryDatum.startTime) - 1
        : Number(treasuryDatum.endTime) - 1;

    let options: BuildCancelLBEOptions = {
      treasuryInput,
      validFrom,
      validTo,
      reason: "ByOwner",
    };

    this.builder.clean();
    let completeTx = await this.builder
      .buildCancelLBE(options)
      .complete()
      .complete();

    return completeTx.toString();
  }

  /**
   * Actor: User
   */
  async updateOrder(options: UpdateOrderOptions): Promise<string> {
    let { baseAsset, raiseAsset, amount, orderUTxO } = options;
    let orderDatum = WarehouseBuilder.fromDatumOrder(orderUTxO.datum);
    let treasuryRefInput = await this.findTreasury({ baseAsset, raiseAsset });
    let treasuryDatum: TreasuryDatum = WarehouseBuilder.fromDatumTreasury(
      treasuryRefInput.datum,
    );
    let validFrom = await this.genValidFrom();
    let validTo = Math.min(
      validFrom + 3 * 60 * 60 * 1000,
      Number(treasuryDatum.endTime - 1n),
    );
    let penaltyAmount = 0n;

    // Withdraw in Penalty Time => be penalied
    if (amount < 0 && treasuryDatum.penaltyConfig) {
      // Already in Penalty Time
      if (BigInt(validFrom) >= treasuryDatum.penaltyConfig.penaltyStartTime) {
        penaltyAmount = Api.calculatePenalty({
          validTo,
          inAmount: orderDatum.amount,
          outAmount: orderDatum.amount + amount,
          penaltyConfig: treasuryDatum.penaltyConfig,
        });
      } else {
        // While there's life, there's hope, avoid the user getting penalty as much as possible.
        validTo = Math.min(
          Number(treasuryDatum.penaltyConfig.penaltyStartTime - 1n),
          validFrom + 3 * 60 * 60 * 1000,
        );
      }
    }

    let newOrderDatum: OrderDatum = {
      ...orderDatum,
      amount: orderDatum.amount + amount,
      penaltyAmount: orderDatum.penaltyAmount + penaltyAmount,
    };

    Api.validateUpdateOrder({ treasuryDatum, amount, validFrom, orderDatum });

    let sellers = await this.findSellers({ baseAsset, raiseAsset });
    let sellerUtxo = sellers[Math.floor(Math.random() * sellers.length)];

    let usingSellerOptions: BuildUsingSellerOptions = {
      treasuryRefInput: treasuryRefInput,
      sellerUtxo: sellerUtxo,
      validFrom,
      validTo,
      owners: [plutusAddress2Address(this.builder.t.network, orderDatum.owner)],
      orderInputs: [],
      orderOutputDatums: [newOrderDatum],
    };

    this.builder.clean();
    let completeTx = await this.builder
      .buildUsingSeller(usingSellerOptions)
      .complete()
      .complete();

    return completeTx.toString();
  }

  /**
   * Actor: User
   */
  async createOrder(options: CreateOrderOptions): Promise<string> {
    let { baseAsset, raiseAsset, owner, amount } = options;
    let treasuryRefInput = await this.findTreasury({ baseAsset, raiseAsset });
    let treasuryDatum: TreasuryDatum = WarehouseBuilder.fromDatumTreasury(
      treasuryRefInput.datum,
    );
    let orderDatum: OrderDatum = {
      factoryPolicyId: this.builder.factoryHash,
      baseAsset,
      raiseAsset,
      owner: address2PlutusAddress(owner),
      amount: amount,
      isCollected: false,
      penaltyAmount: 0n,
    };
    let validFrom = await this.genValidFrom();
    let validTo = Math.min(
      validFrom + 3 * 60 * 60 * 1000,
      Number(treasuryDatum.endTime - 1n),
    );
    Api.validateCreateOrder({ treasuryDatum, amount, validFrom });

    let sellers = await this.findSellers({ baseAsset, raiseAsset });
    let sellerUtxo = sellers[Math.floor(Math.random() * sellers.length)];

    let usingSellerOptions: BuildUsingSellerOptions = {
      treasuryRefInput: treasuryRefInput,
      sellerUtxo: sellerUtxo,
      validFrom,
      validTo,
      owners: [owner],
      orderInputs: [],
      orderOutputDatums: [orderDatum],
    };

    this.builder.clean();
    let completeTx = await this.builder
      .buildUsingSeller(usingSellerOptions)
      .complete()
      .complete();

    return completeTx.toString();
  }

  /**
   *
   * @param walletApi CIP-30 Wallet
   * @returns Api instance
   */
  static async new(walletApi: walletApi) {
    let network: MaestroSupportedNetworks = "Preprod";
    let maestroApiKey = "E0n5jUy4j40nhKCuB7LrYabTNieG0egu";
    let maestro = new T.Maestro({ network, apiKey: maestroApiKey });
    let t = await T.Translucent.new(maestro, network);
    t.selectWallet(walletApi);
    let warehouseOptions = genWarehouseBuilderOptions(t);
    let builder = new WarehouseBuilder(warehouseOptions);
    return new Api(builder);
  }

  /***
   * Only for testing purpose
   */
  static async newBySeed(seed: string) {
    let network: MaestroSupportedNetworks = "Preprod";
    let maestroApiKey = "E0n5jUy4j40nhKCuB7LrYabTNieG0egu";
    let maestro = new T.Maestro({ network, apiKey: maestroApiKey });
    let t = await T.Translucent.new(maestro, network);
    t.selectWalletFromSeed(seed);
    let warehouseOptions = genWarehouseBuilderOptions(t);
    let builder = new WarehouseBuilder(warehouseOptions);
    return new Api(builder);
  }

  /**
   * Only for testing purpose
   */
  async signAndSubmit(txRaw: string): Promise<string> {
    let C = T.CModuleLoader.get;
    let cTransaction = C.Transaction.from_bytes(T.fromHex(txRaw));
    let txComplete = new T.TxComplete(this.builder.t, cTransaction);
    let signedTx = await txComplete.sign().complete();
    let txHash = await signedTx.submit();
    return txHash;
  }

  static compareLbeId(from: LbeId, to: LbeId): boolean {
    return (
      from.baseAsset.policyId === to.baseAsset.policyId &&
      from.baseAsset.assetName === to.baseAsset.assetName &&
      from.raiseAsset.policyId === to.raiseAsset.policyId &&
      from.raiseAsset.assetName === to.raiseAsset.assetName
    );
  }

  static calculatePenalty(options: {
    validTo: UnixTime;
    penaltyConfig?: PenaltyConfig;
    inAmount: bigint;
    outAmount: bigint;
  }): bigint {
    let { validTo, penaltyConfig, inAmount, outAmount } = options;
    if (!penaltyConfig || validTo < penaltyConfig.penaltyStartTime) {
      // No penalty configuration provided or not in penalty time
      return 0n;
    }
    if (inAmount > outAmount) {
      // Calculate withdrawal amount and penalty
      const withdrawalAmount = inAmount - outAmount;
      return (withdrawalAmount * penaltyConfig.percent) / 100n;
    }
    return 0n;
  }
}
