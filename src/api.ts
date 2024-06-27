import * as T from "@minswap/translucent";

import {
  DISCOVERY_MAX_RANGE,
  PENALTY_MAX_PERCENT,
  PENALTY_MAX_RANGE,
  POOL_BASE_FEE_MAX,
  POOL_BASE_FEE_MIN,
  WarehouseBuilder,
  address2PlutusAddress,
  genWarehouseBuilderOptions,
  toUnit,
  type Address,
  type BluePrintAsset,
  type BuildCreateTreasuryOptions,
  type MaestroSupportedNetworks,
  type TreasuryDatum,
  type UTxO,
  type UnixTime,
  type walletApi,
} from ".";
import invariant from "@minswap/tiny-invariant";

const MAGIC_THINGS = {
  sellerOwner:
    "addr_test1qr03hndgkqdw4jclnvps6ud43xvuhms7rurjq87yfgzc575pm6dyr7fz24xwkh6k0ldufe2rqhgkwcppx5fzjrx5j2rs2rt9qc",
};

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
  revocable?: boolean;
  poolBaseFee: bigint;
}

export class Api {
  builder: WarehouseBuilder;

  constructor(builder: WarehouseBuilder) {
    this.builder = builder;
  }

  async getLbes(): Promise<UTxO[]> {
    return await this.builder.t.utxosAtWithUnit(
      this.builder.treasuryAddress,
      this.builder.treasuryToken,
    );
  }

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
      startTime >= Date.now() + 5 * 60 * 60 * 1000,
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
    } = lbeParameters;
    this.builder.clean();
    this.builder.setInnerAssets(baseAsset, raiseAsset);
    let factories = await this.builder.t.utxosAtWithUnit(
      this.builder.factoryAddress,
      this.builder.factoryToken,
    );
    let factoryUtxo = factories.find((factory) => {
      let factoryDatum = WarehouseBuilder.fromDatumFactory(factory.datum!);
      return (
        factoryDatum.head < this.builder.lpAssetName! &&
        factoryDatum.tail > this.builder.lpAssetName!
      );
    })!;

    let treasuryDatum: TreasuryDatum = {
      // default
      factoryPolicyId: this.builder.factoryHash,
      sellerHash: this.builder.sellerHash,
      orderHash: this.builder.orderHash,
      managerHash: this.builder.managerHash,
      receiverDatum: "RNoDatum",
      collectedFund: 0n,
      isManagerCollected: false,
      // parameters
      baseAsset: baseAsset,
      raiseAsset: raiseAsset,
      startTime: BigInt(startTime),
      endTime: BigInt(endTime),
      owner: address2PlutusAddress(owner),
      receiver: address2PlutusAddress(receiver),
      poolAllocation: 100n,
      minimumRaise: null,
      maximumRaise: null,
      reserveBase,
      reserveRaise: 0n,
      totalLiquidity: 0n,
      penaltyConfig: null,
      poolBaseFee: 30n,
      totalPenalty: 0n,
      isCancelled: false,
      minimumOrderRaise: null,
      revocable: true,
    };

    let createTreasuryOptions: BuildCreateTreasuryOptions = {
      sellerAmount: 25n,
      factoryUtxo,
      treasuryDatum,
      sellerOwner,
      validFrom: Date.now(),
      validTo: Date.now() + 3 * 60 * 60 * 1000,
    };

    let completeTx = await this.builder
      .buildCreateTreasury(createTreasuryOptions)
      .complete()
      .complete();

    return completeTx.toString();
  }

  static async new(walletApi: walletApi) {
    await T.loadModule();
    await T.CModuleLoader.load();
    let network: MaestroSupportedNetworks = "Preprod";
    let maestroApiKey = "E0n5jUy4j40nhKCuB7LrYabTNieG0egu";
    let maestro = new T.Maestro({ network, apiKey: maestroApiKey });
    let t = await T.Translucent.new(maestro, network);
    t.selectWallet(walletApi);
    let warehouseOptions = genWarehouseBuilderOptions(t);
    let builder = new WarehouseBuilder(warehouseOptions);
    return new Api(builder);
  }
}
