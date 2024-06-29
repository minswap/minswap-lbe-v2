import invariant from "@minswap/tiny-invariant";
import {
  WarehouseBuilder,
  type BuildCollectSellersOptions,
  type BuildCollectManagerOptions,
} from "../build-tx";
import { MAX_COLLECT_SELLERS } from "../constants";
import { BatchingPhase } from "../helper";
import logger from "../logger";
import type {
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

  // BUILDING
  async buildCollectManager(options: {
    batching: BatchUTxO;
    seeds: UTxO[];
  }): Promise<string> {
    let { batching, seeds } = options;
    invariant(batching.manager, "Missing Manager");
    this.builder.clean();
    let currentUnixTime = await this.getCurrentUnixTime();
    let collectManagerOptions: BuildCollectManagerOptions = {
      treasuryInput: batching.treasury,
      managerInput: batching.manager,
      validFrom: currentUnixTime,
      validTo: currentUnixTime + 3 * 60 * 60 * 1000,
    };
    let completeTx = await this.builder
      .buildCollectManager(collectManagerOptions)
      .complete()
      .complete({ inputsToChoose: seeds });
    let signedTx = await completeTx.sign().complete();
    return await signedTx.submit();
  }

  async buildCollectSellers(
    mapInputs: CollectSellersMapInput,
    extra: { sellers: LbeUTxO[]; treasuryRefInput: LbeUTxO },
  ): Promise<TxSigned> {
    let { sellers, treasuryRefInput } = extra;
    this.builder.clean();
    let currentUnixTime = await this.getCurrentUnixTime();
    let options: BuildCollectSellersOptions = {
      treasuryRefInput,
      managerInput: mapInputs.manager[0],
      sellerInputs: sellers,
      validFrom: currentUnixTime,
      validTo: currentUnixTime + 3 * 60 * 60 * 1000,
    };
    this.builder.buildCollectSeller(options);
    this.builder.tasks.push(() => {
      this.builder.tx.collectFrom(mapInputs["seeds"]);
    });
    let txBuilder = this.builder.complete();
    let tx = await txBuilder.complete({ inputsToChoose: mapInputs["seeds"] });
    let signedTx = tx.sign();
    let txSigned = await signedTx.complete();
    return txSigned;
  }

  collectSellersChaining(batching: BatchUTxO, seeds: UTxO[]): Chaining {
    let seedAddress = seeds[0].address;
    let stopCondition = () => {
      return batching.sellers.length === 0;
    };
    let mapInputs: CollectSellersMapInput = {
      seeds,
      manager: [batching.manager!],
    };
    let compareManager = (output: CTransactionOutput) => {
      let curAddress = output.address();
      return curAddress.to_bech32() === this.builder.managerAddress;
    };
    let compareSeed = (output: CTransactionOutput) => {
      let curAddress = output.address();
      return curAddress.to_bech32() === seedAddress;
    };
    let inputIdentifyFuncs: Record<CollectSellerInputIds, InputIdentify> = {
      seeds: identifyCommon(compareSeed),
      manager: identifyCommon(compareManager),
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
        let txHash = await this.buildCollectManager({ batching, seeds });
        logger.info(`do ${phase} txHash: ${txHash}`);
      } else {
        throw Error("hihi");
      }
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
