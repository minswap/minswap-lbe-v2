import { WarehouseBuilder, type WarehouseBuilderOptions } from "./build-tx";
import { genWarehouseOptions, hexToUtxo } from "./tests/utils";
import type {
  Address,
  BluePrintAsset,
  MaestroSupportedNetworks,
  Translucent,
  UTxO,
  UnixTime,
} from "./types";
import * as T from "@minswap/translucent";
import { computeLPAssetName } from "./utils";
import { MINIMUM_ORDER_COLLECTED, MINIMUM_SELLER_COLLECTED } from "./constants";
import invariant from "@minswap/tiny-invariant";
import lbeV2Script from "./../lbe-v2-script.json";

function getParams() {
  const network: MaestroSupportedNetworks = "Preprod";
  const maestroApiKey = process.argv[3];
  const seedPhase = process.argv[4];
  return {
    network,
    maestroApiKey,
    seedPhase,
  };
}

function getMapLbeIdUtxO<
  T extends { baseAsset: BluePrintAsset; raiseAsset: BluePrintAsset },
>(utxos: UTxO[], toDatum: (arg0: string) => T): Record<string, UTxO[]> {
  const mapLbeIdUTxO: Record<string, UTxO[]> = {};
  for (const utxo of utxos) {
    const { datum } = utxo;
    const { baseAsset, raiseAsset } = toDatum(datum!);
    const lbeId = computeLPAssetName(
      baseAsset.policyId + baseAsset.assetName,
      raiseAsset.policyId + raiseAsset.assetName,
    );
    if (mapLbeIdUTxO[lbeId]) {
      mapLbeIdUTxO[lbeId] = [utxo];
    } else {
      mapLbeIdUTxO[lbeId].push(utxo);
    }
  }
  return mapLbeIdUTxO;
}

type BatchLBEOptions = {
  t: Translucent;
  treasuryUTxO: UTxO;
  managerUTxO?: UTxO;
  sellerUTxOs: UTxO[];
  batcherUTxO: UTxO;
  orderUTxOs: UTxO[];
  batcherAddress: Address;
  current: UnixTime;
};

async function getLBEUTxO({
  batcherAddress,
  t,
  txHash,
  builder,
}: {
  batcherAddress: Address;
  t: Translucent;
  txHash: string;
  builder: WarehouseBuilder;
}) {
  let index = 0;
  const outputs: {
    treasuryUTxO?: UTxO;
    managerUTxO?: UTxO;
    batcherUTxO?: UTxO;
    orderUTxOs: UTxO[];
  } = {
    orderUTxOs: [],
  };
  while (true) {
    const utxo = (await t.utxosByOutRef([{ txHash, outputIndex: index }]))[0];
    if (utxo === undefined) {
      return outputs;
    }

    // handle
    const { address, assets } = utxo;
    if (address === batcherAddress) {
      outputs.batcherUTxO = utxo;
    }
    const hash = T.paymentCredentialOf(address).hash;
    if (hash === builder.orderHash && assets[builder.orderToken] === 1n) {
      outputs.orderUTxOs.push(utxo);
    }
    if (hash === builder.managerHash && assets[builder.managerToken] === 1n) {
      outputs.managerUTxO = utxo;
    }
    if (hash === builder.treasuryHash && assets[builder.treasuryToken] === 1n) {
      outputs.treasuryUTxO = utxo;
    }
    ++index;
  }
}

async function buildCollectSellerTx({
  managerUTxO,
  treasuryUTxO,
  sellerUTxOs,
  warehouseOptions,
  batcherUTxO,
  batcherAddress,
  t,
}: {
  managerUTxO: T.UTxO;
  treasuryUTxO: T.UTxO;
  sellerUTxOs: UTxO[];
  batcherUTxO: UTxO;
  batcherAddress: Address;
  warehouseOptions: WarehouseBuilderOptions;
  t: Translucent;
}) {
  const builder = new WarehouseBuilder(warehouseOptions);
  builder.buildCollectSeller({
    treasuryRefInput: treasuryUTxO,
    managerInput: managerUTxO,
    sellerInputs: sellerUTxOs,
    validFrom: Date.now() / 1000,
    validTo: Date.now() / 1000 + 60 * 3,
  });
  const tx = await builder.complete().collectFrom([batcherUTxO]).complete();
  const signedTx = await tx.sign().complete();
  const txHash = await signedTx.submit();
  await t.awaitTx(txHash, 1000);
  const output = await getLBEUTxO({ t, batcherAddress, txHash, builder });
  return {
    managerUTxO: output.managerUTxO!,
    managerDatum: builder.fromDatumManager(output.managerUTxO!.datum!),
    batcherUTxO: output.batcherUTxO!,
  };
}

async function buildCollectManagerTx({
  managerUTxO,
  treasuryUTxO,
  warehouseOptions,
  batcherUTxO,
  batcherAddress,
  t,
}: {
  managerUTxO: T.UTxO;
  treasuryUTxO: T.UTxO;
  batcherUTxO: UTxO;
  batcherAddress: Address;
  warehouseOptions: WarehouseBuilderOptions;
  t: Translucent;
}) {
  const builder = new WarehouseBuilder(warehouseOptions);
  builder.buildCollectManager({
    treasuryInput: treasuryUTxO,
    managerInput: managerUTxO,
    validFrom: Date.now() / 1000,
    validTo: Date.now() / 1000 + 60 * 3,
  });
  const tx = await builder.complete().collectFrom([batcherUTxO]).complete();
  const signedTx = await tx.sign().complete();
  const txHash = await signedTx.submit();
  await t.awaitTx(txHash, 1000);
  const output = await getLBEUTxO({ t, batcherAddress, txHash, builder });
  return {
    batcherUTxO: output.batcherUTxO!,
    treasuryUTxO: output.treasuryUTxO!,
    treasuryDatum: builder.fromDatumTreasury(output.treasuryUTxO!.datum!),
  };
}

async function buildCollectOrdersTx({
  treasuryUTxO,
  uncollectedOrderUTxOs,
  warehouseOptions,
  batcherUTxO,
  batcherAddress,
  t,
}: {
  treasuryUTxO: T.UTxO;
  uncollectedOrderUTxOs: UTxO[];
  batcherUTxO: UTxO;
  batcherAddress: Address;
  warehouseOptions: WarehouseBuilderOptions;
  t: Translucent;
}) {
  const builder = new WarehouseBuilder(warehouseOptions);
  builder.buildCollectOrders({
    treasuryInput: treasuryUTxO,
    orderInputs: uncollectedOrderUTxOs,
    validFrom: Date.now() / 1000,
    validTo: Date.now() / 1000 + 60 * 3,
  });
  const tx = await builder.complete().collectFrom([batcherUTxO]).complete();
  const signedTx = await tx.sign().complete();
  const txHash = await signedTx.submit();
  await t.awaitTx(txHash, 1000);
  const output = await getLBEUTxO({ t, batcherAddress, txHash, builder });
  return {
    batcherUTxO: output.batcherUTxO!,
    treasuryUTxO: output.treasuryUTxO!,
    treasuryDatum: builder.fromDatumTreasury(output.treasuryUTxO!.datum!),
    collectedOrderUTxOs: output.orderUTxOs,
  };
}

// async function buildCreateAmmPoolTx({
//   treasuryUTxO,
//   treasuryDatum,
//   warehouseOptions,
//   batcherUTxO,
//   batcherAddress,
//   t,
// }: {
//   t: Translucent;
//   treasuryUTxO: UTxO;
//   treasuryDatum: TreasuryDatum;
//   batcherUTxO: UTxO;
//   batcherAddress: Address;
//   warehouseOptions: WarehouseBuilderOptions;
// }) {
//   const { baseAsset, raiseAsset } = treasuryDatum;
//   const lpAssetName = computeLPAssetName(
//     baseAsset.policyId + baseAsset.assetName,
//     raiseAsset.policyId + raiseAsset.assetName
//   );
//   const

// }
async function batchLBE(options: BatchLBEOptions): Promise<void> {
  const { t, sellerUTxOs, orderUTxOs, batcherAddress } = options;
  let treasuryUTxO = options.treasuryUTxO;
  let managerUTxO = options.managerUTxO;
  let batcherUTxO = options.batcherUTxO;
  const warehouseOptions = await genWarehouseOptions(t);

  const builder = new WarehouseBuilder(warehouseOptions);

  let treasuryDatum = builder.fromDatumTreasury(treasuryUTxO.datum!);
  if (treasuryDatum.isManagerCollected === false) {
    invariant(managerUTxO);
    let managerDatum = builder.fromDatumManager(managerUTxO.datum!);
    while (managerDatum.sellerCount > 0) {
      const outputs = await buildCollectSellerTx({
        managerUTxO,
        treasuryUTxO,
        sellerUTxOs: sellerUTxOs.splice(
          0,
          Math.min(
            Number(MINIMUM_SELLER_COLLECTED),
            Number(managerDatum.sellerCount),
          ),
        ),
        warehouseOptions,
        batcherUTxO,
        batcherAddress,
        t,
      });
      managerUTxO = outputs.managerUTxO;
      managerDatum = outputs.managerDatum;
      batcherUTxO = outputs.batcherUTxO;
    }
    const outputs = await buildCollectManagerTx({
      managerUTxO,
      treasuryUTxO,
      warehouseOptions,
      batcherUTxO,
      batcherAddress,
      t,
    });
    batcherUTxO = outputs.batcherUTxO;
    treasuryUTxO = outputs.treasuryUTxO;
    treasuryDatum = outputs.treasuryDatum;
  }

  if (treasuryDatum.totalLiquidity === 0n) {
    const uncollectedOrderUTxOs: UTxO[] = [];
    const collectedOrderUTxOs: UTxO[] = [];
    // collect order
    for (const utxo of orderUTxOs) {
      const orderDatum = builder.fromDatumOrder(utxo.datum!);
      if (orderDatum.isCollected) {
        collectedOrderUTxOs.push(utxo);
      } else {
        uncollectedOrderUTxOs.push(utxo);
      }
    }
    while (
      treasuryDatum.collectedFund ===
      treasuryDatum.reserveRaise + treasuryDatum.totalPenalty
    ) {
      const outputs = await buildCollectOrdersTx({
        treasuryUTxO,
        uncollectedOrderUTxOs: uncollectedOrderUTxOs.splice(
          0,
          Math.min(
            uncollectedOrderUTxOs.length,
            Number(MINIMUM_ORDER_COLLECTED),
          ),
        ),
        warehouseOptions,
        batcherUTxO,
        batcherAddress,
        t,
      });
      batcherUTxO = outputs.batcherUTxO;
      treasuryUTxO = outputs.treasuryUTxO;
      treasuryDatum = outputs.treasuryDatum;
      collectedOrderUTxOs.push(...outputs.collectedOrderUTxOs);
    }
    // TODO: create pool
  }
  // TODO: redeem LP
}

async function runBatcher(t: Translucent): Promise<void> {
  const warehouseOptions = await genWarehouseOptions(t);
  warehouseOptions.deployedValidators = {
    treasuryValidator: hexToUtxo(lbeV2Script.treasuryRefInput),
    managerValidator: hexToUtxo(lbeV2Script.managerRefInput),
    sellerValidator: hexToUtxo(lbeV2Script.sellerRefInput),
    orderValidator: hexToUtxo(lbeV2Script.orderRefInput),
    factoryValidator: hexToUtxo(lbeV2Script.factoryRefInput),
  };
  warehouseOptions.ammDeployedValidators = {
    authenValidator: hexToUtxo(lbeV2Script.ammAuthenRefInput),
    poolValidator: hexToUtxo(lbeV2Script.ammPoolRefInput),
    factoryValidator: hexToUtxo(lbeV2Script.factoryRefInput),
  };
  const builder = new WarehouseBuilder(warehouseOptions);
  const treasuryUTxOs = await t.utxosAtWithUnit(
    {
      type: "Script",
      hash: builder.treasuryHash,
    },
    builder.treasuryToken,
  );
  const managerUTxOs = await t.utxosAtWithUnit(
    {
      type: "Script",
      hash: builder.managerHash,
    },
    builder.managerToken,
  );
  const sellerUTxOs = await t.utxosAtWithUnit(
    {
      type: "Script",
      hash: builder.sellerHash,
    },
    builder.sellerToken,
  );
  const orderUTxOs = await t.utxosAtWithUnit(
    {
      type: "Script",
      hash: builder.orderHash,
    },
    builder.orderToken,
  );

  const mapOrder: Record<string, UTxO[]> = getMapLbeIdUtxO(
    orderUTxOs,
    builder.fromDatumOrder,
  );
  const mapSeller: Record<string, UTxO[]> = getMapLbeIdUtxO(
    sellerUTxOs,
    builder.fromDatumSeller,
  );
  const mapManager: Record<string, UTxO[]> = getMapLbeIdUtxO(
    managerUTxOs,
    builder.fromDatumManager,
  );
  const currentDate = Date.now() / 1000;
  const batcherAddress = await t.wallet.address();
  const batcherUTxO = (await t.wallet.getUtxos())[0];
  for (const utxo of treasuryUTxOs) {
    const { datum } = utxo;
    const treasuryDatum = builder.fromDatumTreasury(datum!);
    const {
      baseAsset,
      raiseAsset,
      collectedFund,
      totalLiquidity,
      endTime,
      isCancelled,
    } = treasuryDatum;
    if (totalLiquidity !== 0n && collectedFund === 0n) {
      // finished LBE
      continue;
    }
    const lbeId = computeLPAssetName(
      baseAsset.policyId + baseAsset.assetName,
      raiseAsset.policyId + raiseAsset.assetName,
    );
    if (endTime < currentDate || isCancelled === true) {
      await batchLBE({
        t,
        treasuryUTxO: utxo,
        managerUTxO: mapManager[lbeId][0] ?? undefined,
        sellerUTxOs: mapSeller[lbeId] ?? [],
        orderUTxOs: mapOrder[lbeId] ?? [],
        batcherAddress,
        batcherUTxO,
        current: currentDate,
      });
    }
  }
}

async function main(): Promise<void> {
  const { network, seedPhase, maestroApiKey } = getParams();
  const maestro = new T.Maestro({ network, apiKey: maestroApiKey });
  const t = await T.Translucent.new(maestro, network);
  t.selectWalletFromSeed(seedPhase);
  while (true) {
    await runBatcher(t);
  }
}

void main();
