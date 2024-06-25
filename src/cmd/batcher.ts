import { WarehouseBuilder } from "../build-tx";
import type { BluePrintAsset, UTxO } from "../types";
import { computeLPAssetName } from "../utils";

type LbeId = string;
type LbePairAsset = { baseAsset: BluePrintAsset; raiseAsset: BluePrintAsset };

namespace LbeId {
  export function fromUtxo(options: { tag: "string"; utxo: UTxO }): LbeId {
    let { tag, utxo } = options;
    let innerFunc = ({ baseAsset, raiseAsset }: LbePairAsset) =>
      computeLPAssetName(
        baseAsset.policyId + baseAsset.assetName,
        raiseAsset.policyId + raiseAsset.assetName,
      );
    let cases: Record<string, (u: UTxO) => LbePairAsset> = {
      treasury: (u: UTxO) => WarehouseBuilder.fromDatumTreasury(u.datum!),
      manager: (u: UTxO) => WarehouseBuilder.fromDatumManager(u.datum!),
      seller: (u: UTxO) => WarehouseBuilder.fromDatumSeller(u.datum!),
      order: (u: UTxO) => WarehouseBuilder.fromDatumOrder(u.datum!),
    };
    return innerFunc(cases[tag](utxo));
  }
}

type LbeUTxO = {
  treasury: UTxO;
  manager?: UTxO;
  sellers: UTxO[];
  orders: UTxO[];
};

class WarehouseBatcher {
  builder: WarehouseBuilder;
  mapLbeUTxO: Record<string, LbeUTxO> = {};

  constructor(builder: WarehouseBuilder) {
    this.builder = builder;
  }
}

let main = async () => {
  // get Map
  // buildCollect things
};

main();
