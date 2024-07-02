import invariant from "@minswap/tiny-invariant";
import {
  WarehouseBuilder,
  type BuildCollectManagerOptions,
  type BuildCollectOrdersOptions,
  type BuildCollectSellersOptions,
  type BuildCreateAmmPoolOptions,
  type BuildRedeemOrdersOptions,
} from "..";
import { MAX_COLLECT_SELLERS } from "../constants";
import { BatchingPhase } from "../helper";
import logger from "../logger";
import type {
  Address,
  BluePrintAsset,
  CTransactionOutput,
  LbeUTxO,
  TxSigned,
  UTxO,
  UnixTime,
} from "../types";
import { computeLPAssetName } from "../utils";
import {
  doChaining,
  identifyCommon,
  type Chaining,
  type InputIdentify,
} from "./chaining";

enum LbeValidator {
  TREASURY,
  MANAGER,
  SELLER,
  ORDER,
}
type LbePairAsset = { baseAsset: BluePrintAsset; raiseAsset: BluePrintAsset };
type LbeId = string;
type BatchUTxO = {
  treasury: LbeUTxO;
  manager?: LbeUTxO;
  sellers: LbeUTxO[];
  orders: LbeUTxO[];
};

interface CollectSellersMapInput extends Record<string, UTxO[]> {
  seeds: UTxO[];
  manager: LbeUTxO[];
}
type CollectSellerInputIds = "seeds" | "manager";

interface OrdersMapInput extends Record<string, UTxO[]> {
  seeds: UTxO[];
  treasury: LbeUTxO[];
}
type OrderInputIds = "seeds" | "treasury";

type BuildOptions =
  | BuildCollectOrdersOptions
  | BuildCollectSellersOptions
  | BuildCollectManagerOptions
  | BuildRedeemOrdersOptions
  | BuildRedeemOrdersOptions
  | BuildCreateAmmPoolOptions;
type CommonBuildOptions = Omit<BuildOptions, "validFrom" | "validTo">;
type CommonBuildFn = (options: BuildOptions) => WarehouseBuilder;

namespace LbeId {
  export function from(options: { tag: LbeValidator; utxo: LbeUTxO }): LbeId {
    let { tag, utxo } = options;

    // return LbeId from LbePairAsset
    let innerFunc = ({ baseAsset, raiseAsset }: LbePairAsset) =>
      computeLPAssetName(
        baseAsset.policyId + baseAsset.assetName,
        raiseAsset.policyId + raiseAsset.assetName,
      );

    let cases: Record<LbeValidator, (u: LbeUTxO) => LbePairAsset> = {
      [LbeValidator.TREASURY]: (u: LbeUTxO) =>
        WarehouseBuilder.fromDatumTreasury(u.datum),
      [LbeValidator.MANAGER]: (u: LbeUTxO) =>
        WarehouseBuilder.fromDatumManager(u.datum),
      [LbeValidator.SELLER]: (u: LbeUTxO) =>
        WarehouseBuilder.fromDatumSeller(u.datum),
      [LbeValidator.ORDER]: (u: LbeUTxO) =>
        WarehouseBuilder.fromDatumOrder(u.datum),
    };
    return innerFunc(cases[tag](utxo));
  }
}

export class WarehouseBatcher {
  builder: WarehouseBuilder;
  mapBatchingUTxO: Record<LbeId, BatchUTxO> = {};

  constructor(builder: WarehouseBuilder) {
    this.builder = builder;
  }

  async getCurrentUnixTime(): Promise<UnixTime> {
    let slot = await this.builder.t.getCurrentSlot();
    return this.builder.t.utils.slotToUnixTime(slot);
  }

  // COMMON
  private async commonComplete(options: {
    buildFn: CommonBuildFn;
    commonOptions: CommonBuildOptions;
    inputsToChoose: UTxO[];
    extraTasks: (() => void)[];
  }): Promise<TxSigned> {
    let { buildFn, commonOptions, inputsToChoose, extraTasks } = options;
    let currentUnixTime = await this.getCurrentUnixTime();
    let buildOptions = {
      ...commonOptions,
      validFrom: currentUnixTime,
      validTo: currentUnixTime + 3 * 60 * 60 * 1000,
    };
    this.builder.clean();
    let mutTxBuilder = buildFn(buildOptions as BuildOptions);
    mutTxBuilder.tasks.push(...extraTasks);
    let tx = await mutTxBuilder.complete().complete({ inputsToChoose });
    let signedTx = tx.sign();
    let txSigned = await signedTx.complete();
    return txSigned;
  }

  private compareAddress(
    address: Address,
  ): (output: CTransactionOutput) => boolean {
    let inner = (output: CTransactionOutput) => {
      return output.address().to_bech32() === address;
    };
    return inner;
  }

  // BUILDING
  async buildCreateAmmPool(options: {
    treasury: LbeUTxO;
    ammFactory: LbeUTxO;
    seeds: UTxO[];
  }): Promise<TxSigned> {
    const { treasury, ammFactory, seeds } = options;
    let txSigned = await this.commonComplete({
      buildFn: this.builder.buildCreateAmmPool as CommonBuildFn,
      commonOptions: {
        treasuryInput: treasury,
        ammFactoryInput: ammFactory,
      },
      inputsToChoose: seeds,
      extraTasks: [],
    });
    return txSigned;
  }

  async buildCollectManager(options: {
    batching: BatchUTxO;
    seeds: UTxO[];
  }): Promise<TxSigned> {
    let { batching, seeds } = options;
    invariant(batching.manager, "Missing Manager");
    let txSigned = await this.commonComplete({
      buildFn: this.builder.buildCollectManager as CommonBuildFn,
      commonOptions: {
        treasuryInput: batching.treasury,
        managerInput: batching.manager,
      },
      inputsToChoose: seeds,
      extraTasks: [],
    });
    return txSigned;
  }

  async buildCollectSellers(
    mapInputs: CollectSellersMapInput,
    extra: { sellers: LbeUTxO[]; treasuryRefInput: LbeUTxO },
  ): Promise<TxSigned> {
    let { sellers, treasuryRefInput } = extra;
    let txSigned = await this.commonComplete({
      buildFn: this.builder.buildCollectSeller as CommonBuildFn,
      commonOptions: {
        treasuryRefInput,
        managerInput: mapInputs.manager[0],
        sellerInputs: sellers,
      },
      inputsToChoose: mapInputs["seeds"],
      extraTasks: [
        () => {
          this.builder.tx.collectFrom(mapInputs["seeds"]);
        },
      ],
    });
    return txSigned;
  }

  async buildHandleOrders(
    mapInputs: OrdersMapInput,
    extra: { orders: LbeUTxO[]; treasury: LbeUTxO },
    handleFn: CommonBuildFn,
  ): Promise<TxSigned> {
    let { orders, treasury } = extra;
    let txSigned = await this.commonComplete({
      buildFn: handleFn,
      commonOptions: {
        treasuryInput: treasury,
        orderInputs: orders,
      },
      inputsToChoose: mapInputs["seeds"],
      extraTasks: [
        () => {
          this.builder.tx.collectFrom(mapInputs["seeds"]);
        },
      ],
    });
    return txSigned;
  }

  collectSellersChaining(batching: BatchUTxO, seeds: UTxO[]): Chaining {
    let seedAddress = seeds[0].address;
    let stopCondition = () => {
      return batching.sellers.length === 0;
    };
    invariant(batching.manager, "Manager Not Found");
    let mapInputs: CollectSellersMapInput = {
      seeds,
      manager: [batching.manager],
    };
    let inputIdentifyFuncs: Record<CollectSellerInputIds, InputIdentify> = {
      seeds: identifyCommon(this.compareAddress(seedAddress)),
      manager: identifyCommon(this.compareAddress(this.builder.managerAddress)),
    };
    let buildTx = async (
      args: Record<string, UTxO[]>,
      extra: { sellers: LbeUTxO[]; treasuryRefInput: LbeUTxO },
    ) => {
      let batchSellers = extra.sellers.splice(0, Number(MAX_COLLECT_SELLERS));
      return this.buildCollectSellers(args as CollectSellersMapInput, {
        ...extra,
        sellers: batchSellers,
      });
    };
    let submit = async (tx: string): Promise<string> => {
      return this.builder.t.wallet.submitTx(tx);
    };
    return {
      mapInputs,
      stopCondition,
      inputIdentifyFuncs,
      extra: {
        sellers: batching.sellers,
        treasuryRefInput: batching.treasury,
      },
      buildTx,
      submit,
    };
  }

  getOrdersChaining(
    batching: BatchUTxO,
    seeds: UTxO[],
    phase: BatchingPhase,
  ): Chaining {
    let seedAddress = seeds[0].address;
    let stopCondition = () => {
      return batching.orders.length === 0;
    };
    let mapInputs: OrdersMapInput = {
      seeds,
      treasury: [batching.treasury],
    };
    let inputIdentifyFuncs: Record<OrderInputIds, InputIdentify> = {
      seeds: identifyCommon(this.compareAddress(seedAddress)),
      treasury: identifyCommon(
        this.compareAddress(this.builder.treasuryAddress),
      ),
    };
    let cases: Record<
      string,
      (options: BuildRedeemOrdersOptions) => WarehouseBuilder
    > = {
      collectOrders: this.builder.buildCollectOrders,
      refundOrders: this.builder.buildRefundOrders,
      redeemOrders: this.builder.buildRedeemOrders,
    };
    let innerFn = cases[phase];
    let buildTx = (
      mapInputs: Record<string, UTxO[]>,
      extra: { orders: LbeUTxO[]; treasury: LbeUTxO },
    ): Promise<TxSigned> => {
      return this.buildHandleOrders(
        mapInputs as OrdersMapInput,
        extra,
        innerFn as CommonBuildFn,
      );
    };
    return {
      mapInputs,
      inputIdentifyFuncs,
      stopCondition,
      extra: {
        orders: batching.orders,
        treasury: batching.treasury,
      },
      buildTx: buildTx.bind(this),
    };
  }

  async batching() {
    await this.buildMapBatchingUTxO();
    for (let batching of Object.values(this.mapBatchingUTxO)) {
      let now = this.builder.t.utils.slotToUnixTime(
        await this.builder.t.getCurrentSlot(),
      );
      let phase = BatchingPhase.from({
        treasury: batching.treasury,
        manager: batching.manager,
        now,
      });
      // Skip if not in counting phase
      if (!phase) continue;
      logger.info(`batching phase: ${phase}`);
      let seeds = await this.builder.t.wallet.getUtxos();
      if (phase === "countingSellers") {
        let options = this.collectSellersChaining(batching, seeds);
        let txHashes = await doChaining(options);
        for (const txHash of txHashes) {
          logger.info(`do ${phase} txHash: ${txHash}`);
        }
      } else if (phase === "collectManager") {
        const signedTx = await this.buildCollectManager({ batching, seeds });
        const txHash = await signedTx.submit();
        logger.info(`do ${phase} txHash: ${txHash}`);
      } else if (
        ["collectOrders", "redeemOrders", "refundOrders"].includes(phase)
      ) {
        let options = this.getOrdersChaining(batching, seeds, phase);
        let txHashes = await doChaining(options);
        for (const txHash of txHashes) {
          logger.info(`do ${phase} txHash: ${txHash}`);
        }
      } else {
        throw Error(`not support this phase ${phase}`);
      }
    }
  }

  /**
   * do 2 things:
   * 1. Auto cancel LBE if pool exist
   * 2. Auto create Pool if need
   */
  async poolBatching() {
    const treasuries: LbeUTxO[] = (await this.builder.t.utxosAtWithUnit(
      this.builder.treasuryAddress,
      this.builder.treasuryToken,
    )) as LbeUTxO[];
    const ammFactories: LbeUTxO[] = (await this.builder.t.utxosAtWithUnit(
      this.builder.ammFactoryAddress,
      this.builder.ammFactoryToken,
    )) as LbeUTxO[];
    // current AMM Pools with LP-Asset-Name
    const pools: Set<string> = new Set([]);
    for (const ammFactory of ammFactories) {
      const datum = WarehouseBuilder.fromDatumAmmFactory(ammFactory.datum);
      pools.add(datum.head);
      pools.add(datum.tail);
    }
    const pendingCancelTreasuries: LbeUTxO[] = [];
    const pendingCreatePoolTreasuries: LbeUTxO[] = [];
    for (const treasury of treasuries) {
      const datum = WarehouseBuilder.fromDatumTreasury(treasury.datum);
      const { baseAsset, raiseAsset } = datum;
      const lpAssetName = computeLPAssetName(
        baseAsset.policyId + baseAsset.assetName,
        raiseAsset.policyId + raiseAsset.assetName,
      );
      if (pools.has(lpAssetName)) {
        pendingCancelTreasuries.push(treasury);
      }
      if (
        // not cancelled
        !datum.isCancelled &&
        // manager collected
        datum.isManagerCollected &&
        // order collected
        datum.collectedFund === datum.reserveRaise + datum.totalPenalty &&
        // reach minimum
        datum.collectedFund >= (datum.minimumRaise ?? 0n) &&
        // not create pool yet
        datum.totalLiquidity === 0n
      ) {
        pendingCreatePoolTreasuries.push(treasury);
      }
      // TODO: Cancel LBE pool exists
    }

    // Auto Create AMM Pool
    for (const treasury of pendingCreatePoolTreasuries) {
      const datum = WarehouseBuilder.fromDatumTreasury(treasury.datum);
      const { baseAsset, raiseAsset } = datum;
      const lpAssetName = computeLPAssetName(
        baseAsset.policyId + baseAsset.assetName,
        raiseAsset.policyId + raiseAsset.assetName,
      );
      const ammFactory = ammFactories.find((f) => {
        const datum = WarehouseBuilder.fromDatumAmmFactory(f.datum);
        return datum.head < lpAssetName && lpAssetName < datum.tail;
      });
      invariant(ammFactory, "Not found Factory");
      const seeds = await this.builder.t.wallet.getUtxos();
      const signedTx = await this.buildCreateAmmPool({
        treasury,
        seeds,
        ammFactory,
      });
      const txHash = await signedTx.submit();
      logger.info(`do create-amm-pool txHash: ${txHash}`);
      await this.builder.t.awaitTx(txHash);
    }
  }

  async buildMapBatchingUTxO() {
    let [treasuries, managers, sellers, orders] = await Promise.all([
      this.builder.t.utxosAtWithUnit(
        this.builder.treasuryAddress,
        this.builder.treasuryToken,
      ),
      this.builder.t.utxosAtWithUnit(
        this.builder.managerAddress,
        this.builder.managerToken,
      ),
      this.builder.t.utxosAtWithUnit(
        this.builder.sellerAddress,
        this.builder.sellerToken,
      ),
      this.builder.t.utxosAtWithUnit(
        this.builder.orderAddress,
        this.builder.orderToken,
      ),
    ]);
    for (let u of treasuries) {
      let lbeId = LbeId.from({
        tag: LbeValidator.TREASURY,
        utxo: u as LbeUTxO,
      });
      this.mapBatchingUTxO[lbeId] = {
        ...(this.mapBatchingUTxO[lbeId] ?? {}),
        treasury: u as LbeUTxO,
      };
    }
    for (let u of managers) {
      let lbeId = LbeId.from({ tag: LbeValidator.MANAGER, utxo: u as LbeUTxO });
      this.mapBatchingUTxO[lbeId] = {
        ...(this.mapBatchingUTxO[lbeId] ?? {}),
        manager: u as LbeUTxO,
      };
    }
    for (let u of sellers) {
      let lbeId = LbeId.from({ tag: LbeValidator.SELLER, utxo: u as LbeUTxO });
      this.mapBatchingUTxO[lbeId] = {
        ...(this.mapBatchingUTxO[lbeId] ?? {}),
        sellers: [
          ...(this.mapBatchingUTxO[lbeId]?.sellers ?? []),
          u as LbeUTxO,
        ],
      };
    }
    for (let u of orders) {
      let lbeId = LbeId.from({ tag: LbeValidator.ORDER, utxo: u as LbeUTxO });
      this.mapBatchingUTxO[lbeId] = {
        ...(this.mapBatchingUTxO[lbeId] ?? {}),
        orders: [...(this.mapBatchingUTxO[lbeId]?.orders ?? []), u as LbeUTxO],
      };
    }
  }
}
