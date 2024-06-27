import * as T from "@minswap/translucent";
import { MAX_COLLECT_ORDERS, MAX_COLLECT_SELLERS } from "..";
import {
  WarehouseBuilder,
  type BuildCollectManagerOptions,
  type BuildCollectSellersOptions,
  type BuildCollectOrdersOptions,
} from "../build-tx";
import { doChaining, type Chaining, type InputIdentify } from "../chaining";
import logger from "../logger";
import type {
  Address,
  BluePrintAsset,
  CTransactionHash,
  CTransactionOutputs,
  Tx,
  TxSigned,
  UTxO,
  Unit,
} from "../types";
import { catchWrapper, computeLPAssetName } from "../utils";

type LbeId = string;
type LbePairAsset = { baseAsset: BluePrintAsset; raiseAsset: BluePrintAsset };
type LbeValidator = "treasury" | "manager" | "seller" | "order";
type LbePhase =
  | "collectOrders"
  | "collectSellers"
  | "collectManager"
  | "refundOrders"
  | "redeemOrders"
  | "createAmmPool";
export type LbeUTxO = {
  treasury: UTxO;
  manager?: UTxO;
  sellers: UTxO[];
  orders: UTxO[];
};

type BatchingTransactionKind =
  | {
      kind: "chaining";
      func: (lbeUTxO: LbeUTxO, seed: UTxO) => Chaining;
    }
  | {
      kind: "single";
      func: (lbeUTxO: LbeUTxO, seed: UTxO) => Tx;
    };

interface CollectSellersMapInput extends Record<string, UTxO[]> {
  seed: UTxO[];
  manager: UTxO[];
}
type CollectSellerInputIds = "seed" | "manager";

export interface CollectOrdersMapInput extends Record<string, UTxO[]> {
  seed: UTxO[];
  treasury: UTxO[];
  collateral: UTxO[];
}
type CollectOrderInputIds = "seed" | "treasury";

namespace LbeId {
  export function fromUtxo(options: { tag: LbeValidator; utxo: UTxO }): LbeId {
    let { tag, utxo } = options;

    // return LbeId from LbePairAsset
    let innerFunc = ({ baseAsset, raiseAsset }: LbePairAsset) =>
      computeLPAssetName(
        baseAsset.policyId + baseAsset.assetName,
        raiseAsset.policyId + raiseAsset.assetName,
      );

    let cases: Record<LbeValidator, (u: UTxO) => LbePairAsset> = {
      treasury: (u: UTxO) => WarehouseBuilder.fromDatumTreasury(u.datum!),
      manager: (u: UTxO) => WarehouseBuilder.fromDatumManager(u.datum!),
      seller: (u: UTxO) => WarehouseBuilder.fromDatumSeller(u.datum!),
      order: (u: UTxO) => WarehouseBuilder.fromDatumOrder(u.datum!),
    };

    return innerFunc(cases[tag](utxo));
  }
}

namespace LbePhase {
  export function fromLbeUtxo(lbeUtxo: LbeUTxO): LbePhase | undefined {
    let things: { checker: (lbeUtxo: LbeUTxO) => boolean; phase: LbePhase }[] =
      [
        { checker: isCollectOrders, phase: "collectOrders" },
        { checker: isCollectSellers, phase: "collectSellers" },
        { checker: isCollectManager, phase: "collectManager" },
        { checker: isRefundOrders, phase: "refundOrders" },
        { checker: isRedeemOrders, phase: "redeemOrders" },
        { checker: isCreateAmmPool, phase: "createAmmPool" },
      ];
    for (let { checker, phase } of things) {
      if (catchWrapper(checker, lbeUtxo, false)) {
        return phase;
      }
    }
    return undefined;
  }

  function isCollectOrders(lbeUtxo: LbeUTxO) {
    let treasuryDatum = WarehouseBuilder.fromDatumTreasury(
      lbeUtxo.treasury.datum!,
    );
    if (treasuryDatum.isCancelled) {
      // collected Manager but not collect all funds yet
      return (
        treasuryDatum.isManagerCollected &&
        treasuryDatum.collectedFund !==
          treasuryDatum.reserveRaise + treasuryDatum.totalPenalty
      );
    } else {
      // collected Manager but not created pool yet.
      return (
        treasuryDatum.isManagerCollected && treasuryDatum.totalLiquidity === 0n
      );
    }
  }

  function isCollectSellers(lbeUtxo: LbeUTxO) {
    let treasuryDatum = WarehouseBuilder.fromDatumTreasury(
      lbeUtxo.treasury.datum!,
    );
    let managerDatum = WarehouseBuilder.fromDatumManager(
      lbeUtxo.manager!.datum!,
    );
    // LBE is cancelled or Discovery phase ended
    // Still have Sellers left
    return (
      (treasuryDatum.isCancelled || treasuryDatum.endTime < Date.now()) &&
      managerDatum.sellerCount > 0n
    );
  }

  function isCollectManager(lbeUtxo: LbeUTxO) {
    let managerDatum = WarehouseBuilder.fromDatumManager(
      lbeUtxo.manager!.datum!,
    );
    // Collected all Sellers
    return managerDatum.sellerCount === 0n;
  }

  function isRefundOrders(lbeUtxo: LbeUTxO) {
    let treasuryDatum = WarehouseBuilder.fromDatumTreasury(
      lbeUtxo.treasury.datum!,
    );
    return (
      treasuryDatum.isCancelled &&
      treasuryDatum.collectedFund ===
        treasuryDatum.reserveRaise + treasuryDatum.totalPenalty
    );
  }

  function isRedeemOrders(lbeUtxo: LbeUTxO) {
    let treasuryDatum = WarehouseBuilder.fromDatumTreasury(
      lbeUtxo.treasury.datum!,
    );
    return treasuryDatum.totalLiquidity > 0n && lbeUtxo.orders.length > 0;
  }

  function isCreateAmmPool(lbeUtxo: LbeUTxO) {
    let treasuryDatum = WarehouseBuilder.fromDatumTreasury(
      lbeUtxo.treasury.datum!,
    );
    return treasuryDatum.totalLiquidity === 0n && !treasuryDatum.isCancelled;
  }
}

export class WarehouseBatcher {
  builder: WarehouseBuilder;
  mapLbeUTxO: Record<LbeId, LbeUTxO> = {};

  constructor(builder: WarehouseBuilder) {
    this.builder = builder;
  }

  async submitTx(tx: string) {
    await this.builder.t.provider.submitTx(tx);
  }

  // IDENTIFY
  identifyCommon(address: Address): InputIdentify {
    let innerFunc = (
      txHash: CTransactionHash,
      finalOutputs: CTransactionOutputs,
    ) => {
      let C = T.CModuleLoader.get;
      let result = C.TransactionUnspentOutputs.new();
      for (let i = 0; i <= finalOutputs.len(); i++) {
        let output = finalOutputs.get(i);
        let curAddress = output.address();
        if (curAddress.to_bech32() === address) {
          let input = C.TransactionInput.new(
            txHash,
            C.BigNum.from_str(i.toString()),
          );
          result.add(C.TransactionUnspentOutput.new(input, output));
          break;
        }
      }
      return result;
    };
    return innerFunc;
  }

  // BUILDING
  async buildCollectSellers(
    mapInputs: CollectSellersMapInput,
    extra: { sellers: UTxO[]; treasuryRefInput: UTxO },
  ): Promise<TxSigned> {
    let { sellers, treasuryRefInput } = extra;
    this.builder.clean();
    let options: BuildCollectSellersOptions = {
      treasuryRefInput,
      managerInput: mapInputs.manager[0],
      sellerInputs: sellers,
      validFrom: Date.now(),
      validTo: Date.now() + 3 * 60 * 60 * 1000,
    };
    this.builder.tasks.push(() => {
      this.builder.tx.collectFrom(mapInputs["seed"]);
    });
    this.builder.buildCollectSeller(options);
    let txBuilder = this.builder.complete();
    let tx = await txBuilder.complete();
    let signedTx = tx.sign();
    let txSigned = await signedTx.complete();
    return txSigned;
  }

  async buildCollectOrders(
    mapInputs: CollectOrdersMapInput,
    extra: { orders: UTxO[] },
  ): Promise<TxSigned> {
    let { orders } = extra;
    this.builder.clean();
    let options: BuildCollectOrdersOptions = {
      treasuryInput: mapInputs.treasury[0],
      orderInputs: orders,
      validFrom: Date.now(),
      validTo: Date.now() + 3 * 60 * 60 * 1000,
    };
    this.builder.buildCollectOrders(options);
    this.builder.tasks.push(() => {
      this.builder.tx
        .collectFrom(mapInputs["seed"])
        .payToAddress(mapInputs["collateral"][0].address, {
          lovelace: 1_000_000n,
        });
      // .payToAddress(mapInputs["seed"][0].address, {
      //   lovelace: mapInputs["seed"][0].assets["lovelace"] - 22_000_000n,
      // });
    });
    let txBuilder = this.builder.complete();
    // let tx = await txBuilder.complete();
    let tx = await txBuilder.complete({
      inputsToChoose: mapInputs["collateral"],
    });
    let signedTx = tx.sign();
    let txSigned = await signedTx.complete();
    console.log(txSigned.txSigned.body().to_json());
    return txSigned;
  }

  buildCollectManager(lbeUtxo: LbeUTxO, seed: UTxO): Tx {
    this.builder.clean();
    let options: BuildCollectManagerOptions = {
      treasuryInput: lbeUtxo.treasury,
      managerInput: lbeUtxo.manager!,
      validFrom: Date.now(),
      validTo: Date.now() + 3 * 60 * 60 * 1000,
    };
    this.builder.buildCollectManager(options);
    this.builder.tasks.push(() => {
      this.builder.tx.collectFrom([seed]);
    });
    let tx = this.builder.complete();
    return tx;
  }

  buildCreateAmmPool(lbeUtxo: LbeUTxO, seed: UTxO): Tx {
    throw Error();
  }

  // CHAINING
  collectSellersChaining(lbeUtxo: LbeUTxO, seed: UTxO): Chaining {
    let stopCondition = () => {
      return lbeUtxo.sellers.length === 0;
    };
    let mapInputs: CollectSellersMapInput = {
      seed: [seed],
      manager: [lbeUtxo.manager!],
    };
    let inputIdentifyFuncs: Record<CollectSellerInputIds, InputIdentify> = {
      seed: this.identifyCommon(seed.address),
      manager: this.identifyCommon(this.builder.managerAddress),
    };
    let buildTx = async (
      args: Record<string, UTxO[]>,
      extra: { sellers: UTxO[]; treasuryRefInput: UTxO },
    ) => {
      let batchSellers = extra.sellers.splice(0, Number(MAX_COLLECT_SELLERS));
      return this.buildCollectSellers(args as CollectSellersMapInput, {
        ...extra,
        sellers: batchSellers,
      });
    };
    return {
      mapInputs,
      stopCondition,
      inputIdentifyFuncs,
      extra: {
        sellers: lbeUtxo.sellers,
        treasuryRefInput: lbeUtxo.treasury,
      },
      buildTx,
      submitTx: async (tx: string) => {
        this.submitTx(tx);
      },
    };
  }

  collectOrdersChaining(lbeUtxo: LbeUTxO, seed: UTxO): Chaining {
    let stopCondition = () => {
      return lbeUtxo.orders.length === 0;
    };
    let mapInputs: CollectOrdersMapInput = {
      seed: [seed],
      treasury: [lbeUtxo.treasury],
      collateral: [],
    };
    let inputIdentifyFuncs: Record<CollectOrderInputIds, InputIdentify> = {
      seed: this.identifyCommon(seed.address),
      treasury: this.identifyCommon(this.builder.treasuryAddress),
    };
    let buildTx = async (
      args: Record<string, UTxO[]>,
      extra: { orders: UTxO[] },
    ) => {
      let batchOrders = extra.orders.splice(0, Number(MAX_COLLECT_ORDERS));
      logger.info(`batch orders length: ${batchOrders.length}`);
      logger.info(
        `wallet utxos length: ${(await this.builder.t.wallet.getUtxos()).length}`,
      );
      console.log("mapInput", mapInputs);
      return this.buildCollectOrders(args as CollectOrdersMapInput, {
        ...extra,
        orders: batchOrders,
      });
    };
    return {
      mapInputs,
      stopCondition,
      inputIdentifyFuncs,
      extra: {
        orders: lbeUtxo.orders,
      },
      buildTx,
      submitTx: async (tx: string) => {
        this.submitTx(tx);
      },
    };
  }

  redeemOrdersChaining(lbeUTxO: LbeUTxO, seed: UTxO): Chaining {
    throw Error();
  }

  refundOrdersChaining(lbeUTxO: LbeUTxO, seed: UTxO): Chaining {
    throw Error();
  }

  async batching() {
    let cases: Record<LbePhase, BatchingTransactionKind> = {
      collectOrders: {
        kind: "chaining",
        func: this.collectOrdersChaining.bind(this),
      },
      collectSellers: {
        kind: "chaining",
        func: this.collectSellersChaining.bind(this),
      },
      collectManager: {
        kind: "single",
        func: this.buildCollectManager.bind(this),
      },
      refundOrders: { kind: "chaining", func: this.refundOrdersChaining },
      redeemOrders: { kind: "chaining", func: this.redeemOrdersChaining },
      createAmmPool: { kind: "single", func: this.buildCreateAmmPool },
    };

    await this.buildMapLbeUTxO();
    for (let lbeUtxo of Object.values(this.mapLbeUTxO)) {
      let phase = LbePhase.fromLbeUtxo(lbeUtxo);
      if (phase === undefined) continue;
      logger.info(`doing phase ${phase}`);
      let seed = await this.findSeed();
      let { kind, func } = cases[phase];

      let handleCases: Record<"chaining" | "single", () => Promise<void>> = {
        chaining: async () => {
          let chaining = func(lbeUtxo, seed) as Chaining;
          await doChaining(chaining);
        },
        single: async () => {
          let tx = func(lbeUtxo, seed) as Tx;
          let completeTx = await tx.complete();
          let signedTx = await completeTx.sign().complete();
          await signedTx.submit();
        },
      };

      await handleCases[kind]();
    }
  }

  /**
   * Looking at wallet, finding coin UTxO contains at least 100 ADA.
   * If seed doesn't exist, then create one.
   * This UTxO will use later for chaining transactions.
   */
  async findSeed(): Promise<UTxO> {
    const SEED_AMOUNT = 100_000_000n;
    let utxos = await this.builder.t.wallet.getUtxos();
    let seed = utxos.find(
      (u) =>
        Object.keys(u.assets).length === 1 &&
        (u.assets["lovelace"] ?? 0n) >= SEED_AMOUNT,
    );
    if (seed === undefined) {
      logger.info("planting seed");
      let walletAddress = await this.builder.t.wallet.address();
      let seedValue = { lovelace: SEED_AMOUNT };
      let seedTx = this.builder.t
        .newTx()
        .payToAddress(walletAddress, seedValue);

      try {
        let completeTx = await seedTx.complete();
        let signTx = completeTx.sign();
        let signedTx = await signTx.complete();
        let txHash = await signedTx.submit();
        await this.builder.t.awaitTx(txHash);
        seed = {
          txHash,
          outputIndex: 0,
          address: walletAddress,
          assets: seedValue,
        };
      } catch (err) {
        logger.error(err);
        throw Error("Cannot create seed");
      }
    }
    return seed;
  }

  /**
   * Findind all Treasury, Manager, Seller, Order UTxOs
   * Put them into collection base on LbeId
   */
  async buildMapLbeUTxO() {
    let things: {
      tag: LbeValidator;
      address: Address;
      token: Unit;
      cb: (lbeId: LbeId, utxo: UTxO) => void; // set mapLbeUTxO
    }[] = [
      {
        tag: "treasury",
        address: this.builder.treasuryAddress,
        token: this.builder.treasuryToken,
        cb: (lbeId, utxo) => {
          this.mapLbeUTxO[lbeId] = {
            ...(this.mapLbeUTxO[lbeId] ?? {}),
            treasury: utxo,
          };
        },
      },
      {
        tag: "manager",
        address: this.builder.managerAddress,
        token: this.builder.managerToken,
        cb: (lbeId, utxo) => {
          this.mapLbeUTxO[lbeId] = {
            ...(this.mapLbeUTxO[lbeId] ?? {}),
            manager: utxo,
          };
        },
      },
      {
        tag: "seller",
        address: this.builder.sellerAddress,
        token: this.builder.sellerToken,
        cb: (lbeId, utxo) => {
          let sellers = this.mapLbeUTxO[lbeId]?.sellers ?? [];
          sellers.push(utxo);
          this.mapLbeUTxO[lbeId] = {
            ...(this.mapLbeUTxO[lbeId] ?? {}),
            sellers,
          };
        },
      },
      {
        tag: "order",
        address: this.builder.orderAddress,
        token: this.builder.orderToken,
        cb: (lbeId, utxo) => {
          let orders = this.mapLbeUTxO[lbeId]?.orders ?? [];
          orders.push(utxo);
          this.mapLbeUTxO[lbeId] = {
            ...(this.mapLbeUTxO[lbeId] ?? {}),
            orders,
          };
        },
      },
    ];
    for (let { address, tag, token, cb } of things) {
      let utxos = await this.builder.t.utxosAtWithUnit(address, token);
      for (let utxo of utxos) {
        let lbeId = LbeId.fromUtxo({ tag, utxo });
        cb(lbeId, utxo);
      }
    }
  }
}

// let main = async () => {
// };

// main();
