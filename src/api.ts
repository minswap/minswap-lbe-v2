import * as T from "@minswap/translucent";

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
  toUnit,
  type Address,
  type BluePrintAsset,
  type BuildCancelLBEOptions,
  type BuildCreateTreasuryOptions,
  type LbeId,
  type MaestroSupportedNetworks,
  type TreasuryDatum,
  type UTxO,
  type UnixTime,
  type walletApi,
} from ".";
import invariant from "@minswap/tiny-invariant";

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
  penaltyConfig?: { penaltyStartTime: bigint; percent: bigint };
  revocable: boolean;
  poolBaseFee: bigint;
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
  async getLbes(): Promise<UTxO[]> {
    return await this.builder.t.utxosAtWithUnit(
      this.builder.treasuryAddress,
      this.builder.treasuryToken,
    );
  }

  /** ******************** Validating **************************/

  /**
   * Validate Cancel LBE By Project Owner
   */
  static validateCancelLbeByOwner(treasuryDatum: TreasuryDatum): Boolean {
    if (treasuryDatum.revocable) {
      invariant(
        BigInt(Date.now()) < treasuryDatum.endTime,
        "Cancel before discovery phase end",
      );
    } else {
      invariant(
        BigInt(Date.now()) < treasuryDatum.startTime,
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

  /** Find UTxO ********************************************/
  /**
   *
   * @param param0 LBE ID
   * @returns Treasury UTxO base on LBE ID
   */
  async findTreasury({ baseAsset, raiseAsset }: LbeId): Promise<UTxO> {
    let treasuries = await this.getLbes();
    let treasuryUTxO = treasuries.find((treasury) => {
      let treasuryDatum = WarehouseBuilder.fromDatumTreasury(treasury.datum!);
      return (
        treasuryDatum.baseAsset === baseAsset &&
        treasuryDatum.raiseAsset === raiseAsset
      );
    });
    if (treasuryUTxO === undefined) {
      throw Error("Cannot find Treasury");
    }
    return treasuryUTxO;
  }

  /**
   * @returns Factory UTxO base on baseAsset, raiseAsset
   */
  async findFactory({ baseAsset, raiseAsset }: LbeId): Promise<UTxO> {
    let lpAssetName = computeLPAssetName(
      baseAsset.policyId + baseAsset.assetName,
      raiseAsset.policyId + raiseAsset.assetName,
    );
    let factories = await this.builder.t.utxosAtWithUnit(
      this.builder.factoryAddress,
      this.builder.factoryToken,
    );
    let factoryUtxo = factories.find((factory) => {
      let factoryDatum = WarehouseBuilder.fromDatumFactory(factory.datum!);
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
      validFrom: genValidFrom,
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
      treasuryInput.datum!,
    );
    let lastValidTo = treasuryDatum.revocable
      ? treasuryDatum.endTime
      : treasuryDatum.startTime;

    Api.validateCancelLbeByOwner(treasuryDatum);

    let options: BuildCancelLBEOptions = {
      treasuryInput,
      validFrom: Date.now(),
      validTo: Number(lastValidTo),
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
    this.builder.t.currentSlot();
    let cTransaction = C.Transaction.from_bytes(T.fromHex(txRaw));
    let txComplete = new T.TxComplete(this.builder.t, cTransaction);
    let signedTx = await txComplete.sign().complete();
    let txHash = await signedTx.submit();
    return txHash;
  }
}
