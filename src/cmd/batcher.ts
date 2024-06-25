import * as T from "@minswap/translucent";
import {
  WarehouseBuilder,
  type BuildCollectManagerOptions,
  type BuildCollectSellersOptions,
} from "../build-tx";
import {
  doChaining,
  type Chaining,
  type InputId,
  type InputIdentify,
} from "../chaining";
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
import { MINIMUM_SELLER_COLLECTED } from "..";

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
type LbeUTxO = {
  treasury: UTxO;
  manager?: UTxO;
  sellers: UTxO[];
  orders: UTxO[];
};

interface CollectSellersMapInput extends Record<string, UTxO[]> {
  seed: UTxO[];
  manager: UTxO[];
}

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

  collectSellersChaining(lbeUtxo: LbeUTxO, seed: UTxO): Chaining {
    let stopCondition = () => {
      return lbeUtxo.sellers.length === 0;
    };
    let mapInputs: CollectSellersMapInput = {
      seed: [seed],
      treasury: [lbeUtxo.treasury],
      manager: [lbeUtxo.manager!],
      sellers: lbeUtxo.sellers,
    };
    let inputIdentifyFuncs: Record<InputId, InputIdentify> = {
      seed: this.identifyCommon(seed.address),
      manager: this.identifyCommon(this.builder.managerAddress),
    };
    let buildTx = async (
      args: Record<string, UTxO[]>,
      extra: { sellers: UTxO[]; treasuryRefInput: UTxO },
    ) => {
      let batchSellers = extra.sellers.splice(
        0,
        Number(MINIMUM_SELLER_COLLECTED),
      );
      return this.buildCollectSellers(args as CollectSellersMapInput, {
        ...extra,
        sellers: batchSellers,
      });
    };
    return {
      mapInputs,
      stopCondition,
      inputIdentifyFuncs,
      buildTx,
      submitTx: async (tx: string) => {
        this.submitTx(tx);
      },
    };
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

  async batching() {
    await this.buildMapLbeUTxO();
    for (let lbeUtxo of Object.values(this.mapLbeUTxO)) {
      let phase = LbePhase.fromLbeUtxo(lbeUtxo);
      if (phase) {
        console.log(`doing phase ${phase}`);
        let seed = (
          await this.builder.t.utxosAt(await this.builder.t.wallet.address())
        )[0];
        let chaining = this.collectSellersChaining(lbeUtxo, seed);
        await doChaining(chaining, {
          sellers: lbeUtxo.sellers,
          treasuryRefInput: lbeUtxo.treasury,
        });
      }
    }
  }

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
