import * as T from "@minswap/translucent";

import invariant from "@minswap/tiny-invariant";
import {
  DEFAULT_DENOMINATOR,
  DISCOVERY_MAX_RANGE,
  MAX_COLLECT_ORDERS,
  MAX_COLLECT_SELLERS,
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
  type BuildAddSellersOptions,
  type BuildCancelLBEOptions,
  type BuildCloseEventOptions,
  type BuildCollectManagerOptions,
  type BuildCollectOrdersOptions,
  type BuildCollectSellersOptions,
  type BuildCreateAmmPoolOptions,
  type BuildCreateTreasuryOptions,
  type BuildRedeemOrdersOptions,
  type BuildUsingSellerOptions,
  type LbeId,
  type LbeUTxO,
  type MaestroSupportedNetworks,
  type Network,
  type OrderDatum,
  type PenaltyConfig,
  type TreasuryDatum,
  type UnixTime,
  type WalletApi,
  type UTxO,
} from ".";
import { LbePhaseUtils, type LbePhase } from "./helper";

/**
 * Ask Tony
 */
const MAGIC_THINGS = {
  sellerAmount: 10n,
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
  orderUTxOs: LbeUTxO[];
  amount: bigint;
}

export class Api {
  builder: WarehouseBuilder;

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
    return (await this.builder.t.utxosAtWithUnit(
      this.builder.treasuryAddress,
      this.builder.treasuryToken,
    )) as LbeUTxO[];
  }

  async getManagers(): Promise<LbeUTxO[]> {
    return (await this.builder.t.utxosAtWithUnit(
      this.builder.managerAddress,
      this.builder.managerToken,
    )) as LbeUTxO[];
  }

  async getOrders(lbeId: LbeId, owner?: Address): Promise<LbeUTxO[]> {
    let orders = (await this.builder.t.utxosAtWithUnit(
      this.builder.orderAddress,
      this.builder.orderToken,
    )) as LbeUTxO[];
    return orders.filter((o) => {
      let orderDatum = WarehouseBuilder.fromDatumOrder(o.datum);
      const orderOwner = plutusAddress2Address(
        this.builder.t.network,
        orderDatum.owner,
      );
      const isOwner = owner ? owner === orderOwner : true;
      return Api.compareLbeId(lbeId, orderDatum) && isOwner;
    });
  }

  /** ******************** Validating **************************/
  static validateCloseEvent(options: {
    network: Network;
    datum: TreasuryDatum;
    owner: Address;
  }): boolean {
    let { network, datum, owner } = options;
    invariant(datum.isCancelled, "LBE is not cancelled");
    invariant(datum.isManagerCollected, "Manager has not collected yet");
    invariant(
      datum.totalPenalty === 0n && datum.reserveRaise === 0n,
      "Refund All Orders Please",
    );
    invariant(
      plutusAddress2Address(network, datum.owner) === owner,
      "You are not project owner",
    );
    return true;
  }

  static validateUpdateOrder(options: {
    treasuryDatum: TreasuryDatum;
    validFrom: UnixTime;
    orderDatums: OrderDatum[];
    amount: bigint;
  }): boolean {
    let { treasuryDatum, validFrom, orderDatums, amount } = options;

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
      const inAmount = orderDatums.reduce((acc, d) => acc + d.amount, 0n);
      let newAmount = inAmount + amount;
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
    invariant(startTime >= Date.now(), "LBE must start in future");
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
      let { penaltyStartTime, penaltyNumerator } = penaltyConfig;
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
      invariant(penaltyNumerator > 0, "Penalty Percent > 0");
      invariant(
        penaltyNumerator <= PENALTY_MAX_PERCENT,
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
  async findOrders(lbeId: LbeId, isCollected: boolean): Promise<LbeUTxO[]> {
    const orders = (await this.builder.t.utxosAtWithUnit(
      this.builder.orderAddress,
      this.builder.orderToken,
    )) as LbeUTxO[];
    return orders.filter((o) => {
      const datum = WarehouseBuilder.fromDatumOrder(o.datum);
      return (
        datum.isCollected === isCollected && Api.compareLbeId(lbeId, datum)
      );
    });
  }

  async findManager(lbeId: LbeId): Promise<LbeUTxO> {
    const managers = (await this.builder.t.utxosAtWithUnit(
      this.builder.managerAddress,
      this.builder.managerToken,
    )) as LbeUTxO[];
    const manager = managers.find((m) => {
      const datum = WarehouseBuilder.fromDatumManager(m.datum);
      return Api.compareLbeId(lbeId, datum);
    });
    invariant(manager, "not found Manager");
    return manager;
  }

  /**
   * Finding Sellers
   */
  async findSellers(lbeId: LbeId): Promise<LbeUTxO[]> {
    let allSellers = (await this.builder.t.utxosAtWithUnit(
      this.builder.sellerAddress,
      this.builder.sellerToken,
    )) as LbeUTxO[];
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
    let factories = (await this.builder.t.utxosAtWithUnit(
      this.builder.factoryAddress,
      this.builder.factoryToken,
    )) as LbeUTxO[];
    let factoryUtxo = factories.find((factory) => {
      let factoryDatum = WarehouseBuilder.fromDatumFactory(factory.datum);
      return factoryDatum.head < lpAssetName && factoryDatum.tail > lpAssetName;
    });
    if (factoryUtxo === undefined) {
      throw Error("Cannot find Factory UTxO");
    }
    return factoryUtxo;
  }

  async findCloseFactory({ baseAsset, raiseAsset }: LbeId): Promise<LbeUTxO[]> {
    let lpAssetName = computeLPAssetName(
      baseAsset.policyId + baseAsset.assetName,
      raiseAsset.policyId + raiseAsset.assetName,
    );
    let factories = (await this.builder.t.utxosAtWithUnit(
      this.builder.factoryAddress,
      this.builder.factoryToken,
    )) as LbeUTxO[];
    let head = factories.find((f) => {
      let factoryDatum = WarehouseBuilder.fromDatumFactory(f.datum);
      return factoryDatum.tail === lpAssetName;
    });
    invariant(head, "Cannot find Head Factory");
    let tail = factories.find((f) => {
      let factoryDatum = WarehouseBuilder.fromDatumFactory(f.datum);
      return factoryDatum.head === lpAssetName;
    });
    invariant(tail, "Cannot find Tail Factory");
    return [head, tail];
  }

  async findAmmFactory({ baseAsset, raiseAsset }: LbeId): Promise<LbeUTxO> {
    let lpAssetName = computeLPAssetName(
      baseAsset.policyId + baseAsset.assetName,
      raiseAsset.policyId + raiseAsset.assetName,
    );
    let factories = (await this.builder.t.utxosAtWithUnit(
      this.builder.ammFactoryAddress,
      this.builder.ammFactoryToken,
    )) as LbeUTxO[];
    let factoryUtxo = factories.find((factory) => {
      let factoryDatum = WarehouseBuilder.fromDatumAmmFactory(factory.datum);
      return factoryDatum.head < lpAssetName && factoryDatum.tail > lpAssetName;
    });
    invariant(factoryUtxo, "Cannot find AMM Factory");
    return factoryUtxo;
  }

  async findExistAmmFactory({
    baseAsset,
    raiseAsset,
  }: LbeId): Promise<LbeUTxO> {
    let lpAssetName = computeLPAssetName(
      baseAsset.policyId + baseAsset.assetName,
      raiseAsset.policyId + raiseAsset.assetName,
    );
    let factories = (await this.builder.t.utxosAtWithUnit(
      this.builder.ammFactoryAddress,
      this.builder.ammFactoryToken,
    )) as LbeUTxO[];
    let factoryUtxo = factories.find((factory) => {
      let factoryDatum = WarehouseBuilder.fromDatumAmmFactory(factory.datum);
      return factoryDatum.head === lpAssetName;
    });
    invariant(factoryUtxo, "Not found exist AMM Factory");
    return factoryUtxo;
  }
  /**************************************************************** */
  async createPool(lbeId: LbeId): Promise<string> {
    this.builder.clean();
    const treasuryInput = await this.findTreasury(lbeId);
    const ammFactoryInput = await this.findAmmFactory(lbeId);
    const options: BuildCreateAmmPoolOptions = {
      treasuryInput,
      ammFactoryInput,
      validFrom: await this.genValidFrom(),
      validTo: Date.now() + 3 * 60 * 60 * 1000,
    };
    const completeTx = await this.builder
      .buildCreateAmmPool(options)
      .complete()
      .complete();
    return completeTx.toString();
  }

  async collectManager(lbeId: LbeId): Promise<string> {
    const treasuryInput = await this.findTreasury(lbeId);
    const managerInput = await this.findManager(lbeId);
    const validFrom = await this.genValidFrom();
    const options: BuildCollectManagerOptions = {
      treasuryInput,
      managerInput,
      validFrom,
      validTo: validFrom + 3 * 60 * 60 * 1000,
    };
    this.builder.clean();
    const completeTx = await this.builder
      .buildCollectManager(options)
      .complete()
      .complete();
    return completeTx.toString();
  }

  async countingSellers(lbeId: LbeId): Promise<string> {
    const treasuryRefInput = await this.findTreasury(lbeId);
    const managerInput = await this.findManager(lbeId);
    const validFrom = await this.genValidFrom();
    const sellers = await this.findSellers(lbeId);
    const sellerInputs = sellers.slice(0, MAX_COLLECT_SELLERS);
    const options: BuildCollectSellersOptions = {
      treasuryRefInput,
      managerInput,
      sellerInputs,
      validFrom,
      validTo: validFrom + 3 * 60 * 60 * 1000,
    };
    this.builder.clean();
    const completeTx = await this.builder
      .buildCollectSeller(options)
      .complete()
      .complete();
    return completeTx.toString();
  }

  async handleOrders(
    lbeId: LbeId,
    phase: string,
    seeds: UTxO[],
  ): Promise<string> {
    invariant(
      ["collectOrders", "refundOrders", "redeemOrders"].includes(phase),
      "phase is not correct",
    );
    this.builder.clean();
    const validFrom = await this.genValidFrom();
    const treasuryInput = await this.findTreasury(lbeId);
    const orders = await this.getOrders(lbeId);
    const orderInputs = orders.slice(0, MAX_COLLECT_ORDERS);
    const options: BuildCollectOrdersOptions = {
      validFrom,
      validTo: validFrom + 3 * 60 * 60 * 1000,
      treasuryInput,
      orderInputs,
    };
    const cases: Record<
      string,
      (options: BuildRedeemOrdersOptions) => WarehouseBuilder
    > = {
      collectOrders: (o) => {
        return this.builder.buildCollectOrders(o);
      },
      refundOrders: (o) => {
        return this.builder.buildRefundOrders(o);
      },
      redeemOrders: (o) => {
        return this.builder.buildRedeemOrders(o);
      },
    };
    const buildFn = cases[phase];
    const txBuilder = buildFn(options);
    // trick
    txBuilder.tasks.push(() => {
      txBuilder.tx.collectFrom(seeds);
    });
    const completeTx = await txBuilder
      .complete()
      .complete({ inputsToChoose: seeds, debug: { showDraftTx: false } });
    return completeTx.toString();
  }

  async addSellers(lbeId: LbeId, addSellerCount: bigint): Promise<string> {
    this.builder.clean();
    const validFrom = await this.genValidFrom();
    const treasuryRefUtxo = await this.findTreasury(lbeId);
    const treasuryDatum = WarehouseBuilder.fromDatumTreasury(
      treasuryRefUtxo.datum,
    );
    const managerUtxo = await this.findManager(lbeId);
    let validTo = Math.min(
      Number(treasuryDatum.endTime - 1n),
      validFrom + 3 * 60 * 60 * 1000,
    );
    const options: BuildAddSellersOptions = {
      treasuryRefUtxo,
      managerUtxo,
      addSellerCount,
      validFrom,
      validTo,
      owner: MAGIC_THINGS.sellerOwner,
    };
    const completeTx = await this.builder
      .buildAddSeller(options)
      .complete()
      .complete();
    return completeTx.toString();
  }

  async checkPoolExist(lbeId: LbeId): Promise<void> {
    let poolExist = false;
    try {
      const ammFactory = await this.findExistAmmFactory(lbeId);
      if (ammFactory) {
        poolExist = true;
      }
    } catch {}
    if (poolExist) {
      throw Error("Pool already exist");
    }
  }

  /**
   * Actor: Project Owner
   * @param lbeParameters The LBE Parameters
   * @returns Transaction Cbor Hex of LBE creation
   */
  async createLbe(lbeParameters: LbeParameters): Promise<string> {
    Api.validateLbeParameters(lbeParameters);
    await this.checkPoolExist({
      baseAsset: lbeParameters.baseAsset,
      raiseAsset: lbeParameters.raiseAsset,
    });
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
      validTo: Number(treasuryDatum.startTime - 1n),
    };

    this.builder.clean();
    let completeTx = await this.builder
      .buildCreateTreasury(createTreasuryOptions)
      .complete()
      .complete();

    return completeTx.toString();
  }

  async cancelNotReachMinimum(lbeId: LbeId): Promise<string> {
    const treasuryInput = await this.findTreasury(lbeId);
    let treasuryDatum = WarehouseBuilder.fromDatumTreasury(treasuryInput.datum);
    invariant(
      treasuryDatum.collectedFund ===
        treasuryDatum.reserveRaise + treasuryDatum.totalPenalty &&
        treasuryDatum.isManagerCollected &&
        treasuryDatum.collectedFund < (treasuryDatum.minimumRaise ?? 1n),
      "canot cancel by not reach minimum raise",
    );
    let validFrom = await this.genValidFrom();
    let options: BuildCancelLBEOptions = {
      treasuryInput,
      validFrom,
      validTo: validFrom + 3 * 60 * 60 * 1000,
      reason: "NotReachMinimum",
    };
    this.builder.clean();
    let completeTx = await this.builder
      .buildCancelLBE(options)
      .complete()
      .complete();
    return completeTx.toString();
  }

  async cancelByPoolExist(lbeId: LbeId): Promise<string> {
    const treasuryInput = await this.findTreasury(lbeId);
    const ammFactoryRefInput = await this.findExistAmmFactory(lbeId);
    let validFrom = await this.genValidFrom();
    let options: BuildCancelLBEOptions = {
      treasuryInput,
      ammFactoryRefInput,
      validFrom,
      validTo: validFrom + 3 * 60 * 60 * 1000,
      reason: "CreatedPool",
    };
    this.builder.clean();
    let completeTx = await this.builder
      .buildCancelLBE(options)
      .complete()
      .complete();
    return completeTx.toString();
  }

  /**
   * * Actor: Project Owner
   */
  async cancelLbe(lbeId: LbeId): Promise<string> {
    let treasuryInput = await this.findTreasury(lbeId);
    let treasuryDatum = WarehouseBuilder.fromDatumTreasury(treasuryInput.datum);
    let validFrom = await this.genValidFrom();
    Api.validateCancelLbeByOwner(validFrom, treasuryDatum);

    let validTo: number =
      validFrom < Number(treasuryDatum.startTime)
        ? Number(treasuryDatum.startTime) - 1
        : Number(treasuryDatum.endTime) - 1;
    validTo = Math.min(validTo, validFrom + 3 * 60 * 60 * 1000);
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
   * * Actor: Project Owner
   */
  async closeLBE(lbeId: LbeId, owner: Address): Promise<string> {
    let treasuryInput = await this.findTreasury(lbeId);
    let treasuryDatum = WarehouseBuilder.fromDatumTreasury(treasuryInput.datum);
    Api.validateCloseEvent({
      network: this.builder.t.network,
      datum: treasuryDatum,
      owner,
    });
    let factoryInputs = await this.findCloseFactory(lbeId);
    let validFrom = await this.genValidFrom();
    let options: BuildCloseEventOptions = {
      treasuryInput,
      factoryInputs,
      validFrom,
      validTo: validFrom + 3 * 60 * 60 * 1000,
    };
    this.builder.clean();
    let completeTx = await this.builder
      .buildCloseEvent(options)
      .complete()
      .complete();

    return completeTx.toString();
  }

  /**
   * Actor: User
   */
  async updateOrder(options: UpdateOrderOptions): Promise<string> {
    let { baseAsset, raiseAsset, amount, orderUTxOs } = options;
    invariant(orderUTxOs.length > 0, "Order Inputs is empty");
    let orderDatums = orderUTxOs.map((o) =>
      WarehouseBuilder.fromDatumOrder(o.datum),
    );
    const owner = plutusAddress2Address(
      this.builder.t.network,
      orderDatums[0].owner,
    );
    const inAmount = orderDatums.reduce((acc, d) => acc + d.amount, 0n);
    const inPenaltyAmount = orderDatums.reduce(
      (acc, d) => acc + d.penaltyAmount,
      0n,
    );
    const outAmount = inAmount + amount;
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
          inAmount,
          outAmount,
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
      ...orderDatums[0],
      amount: outAmount,
      penaltyAmount: inPenaltyAmount + penaltyAmount,
    };

    Api.validateUpdateOrder({ treasuryDatum, amount, validFrom, orderDatums });

    let sellers = await this.findSellers({ baseAsset, raiseAsset });
    let sellerUtxo = sellers[Math.floor(Math.random() * sellers.length)];

    let usingSellerOptions: BuildUsingSellerOptions = {
      treasuryRefInput: treasuryRefInput,
      sellerUtxo: sellerUtxo,
      validFrom,
      validTo,
      owners: [owner],
      orderInputs: orderUTxOs,
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

  selectWallet(walletApi: WalletApi): Api {
    this.builder.t.selectWallet(walletApi);
    return this;
  }

  /**
   *
   * @param walletApi CIP-30 Wallet
   * @returns Api instance
   */
  static async new() {
    let network: MaestroSupportedNetworks = "Preprod";
    let maestroApiKey = "E0n5jUy4j40nhKCuB7LrYabTNieG0egu";
    let maestro = new T.Maestro({ network, apiKey: maestroApiKey });
    let t = await T.Translucent.new(maestro, network);
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
      return (
        (withdrawalAmount * penaltyConfig.penaltyNumerator) /
        DEFAULT_DENOMINATOR
      );
    }
    return 0n;
  }

  static getLbePhase(options: {
    datum: TreasuryDatum;
    currentTime: UnixTime;
  }): LbePhase {
    return LbePhaseUtils.from(options);
  }
}
