import { WarehouseBuilder, type WarehouseBuilderOptions } from "./build-tx";
import { genWarehouseOptions, hexToUtxo } from "./tests/utils";
import type {
  AmmPoolDatum,
  BluePrintAsset,
  MaestroSupportedNetworks,
  ManagerDatum,
  Translucent,
  TreasuryDatum,
  UTxO,
  UnixTime,
} from "./types";
import * as T from "@minswap/translucent";
import { calculateInitialLiquidity, computeLPAssetName } from "./utils";
import {
  MINIMUM_ORDER_COLLECTED,
  MINIMUM_ORDER_REDEEMED,
  MINIMUM_SELLER_COLLECTED,
} from "./constants";
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

let warehouse: {
  treasuryUTxO: UTxO;
  treasuryDatum: TreasuryDatum;
  managerUTxO?: UTxO;
  managerDatum?: ManagerDatum;
  sellerUTxOs: UTxO[];
  uncollectedOrderUTxOs: UTxO[];
  collectedOrderUTxOs: UTxO[];
  warehouseOptions: WarehouseBuilderOptions;
  t: Translucent;
  lbeId: string;
};
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

async function getLBEUTxO({
  t,
  txHash,
  builder,
}: {
  t: Translucent;
  txHash: string;
  builder: WarehouseBuilder;
}) {
  let index = 0;
  const outputs: {
    treasuryUTxO?: UTxO;
    managerUTxO?: UTxO;
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

async function buildCollectSellerTx({ sellerUTxOs }: { sellerUTxOs: UTxO[] }) {
  const { treasuryUTxO, managerUTxO, warehouseOptions, t } = warehouse;
  const builder = new WarehouseBuilder(warehouseOptions);
  builder.buildCollectSeller({
    treasuryRefInput: treasuryUTxO,
    managerInput: managerUTxO!,
    sellerInputs: sellerUTxOs,
    validFrom: Date.now() / 1000,
    validTo: Date.now() / 1000 + 60 * 3,
  });
  const tx = await builder.complete().complete();
  const signedTx = await tx.sign().complete();
  const txHash = await signedTx.submit();
  await t.awaitTx(txHash, 1000);
  const output = await getLBEUTxO({ t, txHash, builder });
  warehouse.managerUTxO = output.managerUTxO!;
  warehouse.managerDatum = builder.fromDatumManager(output.managerUTxO!.datum!);
}

async function buildCollectManagerTx() {
  const { treasuryUTxO, managerUTxO, warehouseOptions, t } = warehouse;
  const builder = new WarehouseBuilder(warehouseOptions);
  builder.buildCollectManager({
    treasuryInput: treasuryUTxO,
    managerInput: managerUTxO!,
    validFrom: Date.now() / 1000,
    validTo: Date.now() / 1000 + 60 * 3,
  });
  const tx = await builder.complete().complete();
  const signedTx = await tx.sign().complete();
  const txHash = await signedTx.submit();
  await t.awaitTx(txHash, 1000);
  const output = await getLBEUTxO({ t, txHash, builder });
  warehouse = {
    ...warehouse,
    treasuryUTxO: output.treasuryUTxO!,
    treasuryDatum: builder.fromDatumTreasury(output.treasuryUTxO!.datum!),
  };
}

async function buildCollectOrdersTx({
  uncollectedOrderUTxOs,
}: {
  uncollectedOrderUTxOs: UTxO[];
}) {
  const { warehouseOptions, treasuryUTxO, t } = warehouse;
  const builder = new WarehouseBuilder(warehouseOptions);
  builder.buildCollectOrders({
    treasuryInput: treasuryUTxO,
    orderInputs: uncollectedOrderUTxOs,
    validFrom: Date.now() / 1000,
    validTo: Date.now() / 1000 + 60 * 3,
  });
  const tx = await builder.complete().complete();
  const signedTx = await tx.sign().complete();
  const txHash = await signedTx.submit();
  await t.awaitTx(txHash, 1000);
  const output = await getLBEUTxO({ t, txHash, builder });
  warehouse.treasuryUTxO = output.treasuryUTxO!;
  warehouse.treasuryDatum = builder.fromDatumTreasury(
    output.treasuryUTxO!.datum!,
  );
  warehouse.collectedOrderUTxOs = output.orderUTxOs;
}

async function findFactoryUTxO(
  t: Translucent,
  builder: WarehouseBuilder,
  lpAssetName: string,
): Promise<UTxO> {
  const utxos = await t.utxosAtWithUnit(
    { type: "Script", hash: builder.ammFactoryHash },
    builder.ammFactoryToken,
  );
  for (const utxo of utxos) {
    const { head, tail } = builder.fromDatumAmmFactory(utxo.datum!);
    if (lpAssetName > head && lpAssetName < tail) {
      return utxo;
    }
  }
  throw Error(`Can not find factory for lpAssetName: ${lpAssetName}`);
}

function sortPairAsset(
  baseAsset: BluePrintAsset,
  raiseAsset: BluePrintAsset,
): [BluePrintAsset, BluePrintAsset] {
  if (baseAsset.policyId !== raiseAsset.policyId) {
    if (baseAsset.policyId !== raiseAsset.policyId) {
      return [baseAsset, raiseAsset];
    }
    return [raiseAsset, baseAsset];
  }
  if (baseAsset.assetName < raiseAsset.assetName) {
    return [baseAsset, raiseAsset];
  }
  return [raiseAsset, baseAsset];
}
async function createAmmPool() {
  const { treasuryUTxO, treasuryDatum, warehouseOptions, t } = warehouse;
  const builder = new WarehouseBuilder(warehouseOptions);
  const {
    baseAsset,
    raiseAsset,
    poolAllocation,
    maximumRaise,
    minimumRaise,
    reserveBase,
    reserveRaise,
    totalPenalty,
    poolBaseFee,
  } = treasuryDatum;
  let finalReserveRaise = reserveRaise + totalPenalty;
  if (maximumRaise && reserveRaise + totalPenalty > maximumRaise) {
    finalReserveRaise = maximumRaise;
  }
  if (minimumRaise) {
    invariant(
      finalReserveRaise > minimumRaise,
      "not raise enough to create pool and this LBE will be cancelled next round",
    );
  }
  const [assetA, assetB] = sortPairAsset(baseAsset, raiseAsset);
  const [lbeReserveA, lbeReserveB] =
    baseAsset.policyId === assetA.policyId &&
    baseAsset.assetName === assetA.assetName
      ? [reserveBase, finalReserveRaise]
      : [reserveBase, finalReserveRaise];
  const poolReserveA = (lbeReserveA * poolAllocation) / 100n;
  const poolReserveB = (lbeReserveB * poolAllocation) / 100n;
  const lpAssetName = computeLPAssetName(
    assetA.policyId + assetA.assetName,
    assetB.policyId + assetB.assetName,
  );

  const totalLpToken = calculateInitialLiquidity(poolReserveA, poolReserveB);
  const ammPoolDatum: AmmPoolDatum = {
    poolBatchingStakeCredential: {
      Inline: [
        {
          ScriptCredential: [
            t.utils.validatorToScriptHash(
              builder.ammValidators.poolBatchingValidator,
            ),
          ],
        },
      ],
    },
    assetA: assetA,
    assetB: assetB,
    totalLiquidity: totalLpToken,
    reserveA: poolReserveA,
    reserveB: poolReserveB,
    baseFeeANumerator: poolBaseFee,
    baseFeeBNumerator: poolBaseFee,
    feeSharingNumeratorOpt: null,
    allowDynamicFee: false,
  };
  const factoryUTxO = await findFactoryUTxO(t, builder, lpAssetName);
  builder.buildCreateAmmPool({
    treasuryInput: treasuryUTxO,
    ammFactoryInput: factoryUTxO,
    ammPoolDatum: ammPoolDatum,
    totalLiquidity: totalLpToken,
    receiverA: lbeReserveA - poolReserveA,
    receiverB: lbeReserveB - poolReserveB,
    validFrom: Date.now() / 1000,
    validTo: Date.now() / 1000 + 60 * 3,
  });
  const tx = await builder.complete().complete();
  const signedTx = await tx.sign().complete();
  const txHash = await signedTx.submit();
  await t.awaitTx(txHash, 1000);
  const output = await getLBEUTxO({ t, txHash, builder });
  warehouse.treasuryUTxO = output.treasuryUTxO!;
  warehouse.treasuryDatum = builder.fromDatumTreasury(
    output.treasuryUTxO!.datum!,
  );
}

async function buildRedeemOrdersTx({ orderUTxOs }: { orderUTxOs: UTxO[] }) {
  const { treasuryUTxO, warehouseOptions, t } = warehouse;
  const builder = new WarehouseBuilder(warehouseOptions);
  builder.buildRedeemOrders({
    treasuryInput: treasuryUTxO,
    orderInputs: orderUTxOs,
    validFrom: Date.now() / 1000,
    validTo: Date.now() / 1000 + 60 * 3,
  });
  const tx = await builder.complete().complete();
  const signedTx = await tx.sign().complete();
  const txHash = await signedTx.submit();
  await t.awaitTx(txHash, 1000);
  const output = await getLBEUTxO({ t, txHash, builder });
  warehouse.treasuryUTxO = output.treasuryUTxO!;
  warehouse.treasuryDatum = builder.fromDatumTreasury(
    output.treasuryUTxO!.datum!,
  );
}

async function coutingPhase() {
  if (warehouse.treasuryDatum.isManagerCollected === false) {
    invariant(warehouse.managerUTxO);
    while (warehouse.sellerUTxOs.length > 0) {
      const collectAmount = Math.min(
        Number(MINIMUM_SELLER_COLLECTED),
        warehouse.sellerUTxOs.length,
      );
      if (
        collectAmount < MINIMUM_SELLER_COLLECTED &&
        BigInt(collectAmount) !== warehouse.managerDatum?.sellerCount
      ) {
        throw Error(
          `Can not find remaining sellers to collect in LBE ${warehouse.lbeId}`,
        );
      }
      await buildCollectSellerTx({
        sellerUTxOs: warehouse.sellerUTxOs.splice(0, collectAmount),
      });
    }
    await buildCollectManagerTx();
  }
  while (warehouse.uncollectedOrderUTxOs.length > 0) {
    // TODO: invariant if batcher miss some uncollected orders
    await buildCollectOrdersTx({
      uncollectedOrderUTxOs: warehouse.uncollectedOrderUTxOs.splice(
        0,
        Math.min(
          warehouse.uncollectedOrderUTxOs.length,
          Number(MINIMUM_ORDER_COLLECTED),
        ),
      ),
    });
  }
}

async function redeemLpTokenPhase() {
  while (warehouse.collectedOrderUTxOs.length !== 0) {
    // TODO: invariant if batcher miss some collected orders
    await buildRedeemOrdersTx({
      orderUTxOs: warehouse.collectedOrderUTxOs.splice(
        0,
        Math.min(
          warehouse.collectedOrderUTxOs.length,
          Number(MINIMUM_ORDER_REDEEMED),
        ),
      ),
    });
  }
}

async function refundPhase() {
  // TODO:
}

async function batchLBE(): Promise<void> {
  await coutingPhase();
  if (warehouse.treasuryDatum.isCancelled) {
    //
    await refundPhase();
  } else {
    if (warehouse.treasuryDatum.totalLiquidity === 0n) {
      await createAmmPool();
    }
    await redeemLpTokenPhase();
  }
}

async function cancelLBE() {
  // TODO
}

async function handleLBE(options: {
  t: Translucent;
  treasuryUTxO: UTxO;
  managerUTxO?: UTxO;
  sellerUTxOs: UTxO[];
  orderUTxOs: UTxO[];
  current: UnixTime;
}) {
  const { t, treasuryUTxO, managerUTxO, sellerUTxOs, orderUTxOs, current } =
    options;
  const warehouseOptions = await genWarehouseOptions(t);
  const builder = new WarehouseBuilder(warehouseOptions);
  const { datum } = treasuryUTxO;
  const treasuryDatum = builder.fromDatumTreasury(datum!);
  const { endTime, isCancelled, baseAsset, raiseAsset } = treasuryDatum;

  const lbeId = computeLPAssetName(
    baseAsset.policyId + baseAsset.assetName,
    raiseAsset.policyId + raiseAsset.assetName,
  );
  warehouse = {
    treasuryUTxO,
    treasuryDatum: treasuryDatum,
    managerUTxO,
    managerDatum: managerUTxO
      ? builder.fromDatumManager(managerUTxO!.datum!)
      : undefined,
    sellerUTxOs,
    uncollectedOrderUTxOs: [],
    collectedOrderUTxOs: [],
    t,
    warehouseOptions,
    lbeId,
  };
  for (const utxo of orderUTxOs) {
    const orderDatum = builder.fromDatumOrder(utxo.datum!);
    if (orderDatum.isCollected) {
      warehouse.collectedOrderUTxOs.push(utxo);
    } else {
      warehouse.uncollectedOrderUTxOs.push(utxo);
    }
  }
  if (current < endTime) {
    // check pool is exist
    // => cancel LBE
    await cancelLBE();
  }
  if (endTime < current || isCancelled === true) {
    await batchLBE();
  }
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
  for (const utxo of treasuryUTxOs) {
    const { datum } = utxo;
    const treasuryDatum = builder.fromDatumTreasury(datum!);
    const { baseAsset, raiseAsset, collectedFund, totalLiquidity } =
      treasuryDatum;
    if (totalLiquidity !== 0n && collectedFund === 0n) {
      // finished LBE
      continue;
    }
    const lbeId = computeLPAssetName(
      baseAsset.policyId + baseAsset.assetName,
      raiseAsset.policyId + raiseAsset.assetName,
    );
    try {
      await handleLBE({
        t,
        treasuryUTxO: utxo,
        managerUTxO: mapManager[lbeId][0] ?? undefined,
        sellerUTxOs: mapSeller[lbeId] ?? [],
        orderUTxOs: mapOrder[lbeId] ?? [],
        current: currentDate,
      });
    } catch (err) {
      console.error(err);
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
