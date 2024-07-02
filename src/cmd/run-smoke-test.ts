import * as T from "@minswap/translucent";
import {
  Api,
  address2PlutusAddress,
  computeLPAssetName,
  genDummyUTxO,
  mintNativeToken,
  toUnit,
  type Address,
  type CTransactionOutput,
  type LbeId,
  type LbeParameters,
  type LbeUTxO,
  type MaestroSupportedNetworks,
  type OrderDatum,
  type PlutusAddress,
  type UTxO,
} from "..";
import { doChaining, identifyCommon, type Chaining } from "../batching";
import { WarehouseBatcher } from "../batching/warehouse-batcher";
import {
  WarehouseBuilder,
  genWarehouseBuilderOptions,
  type BuildCreateAmmPoolOptions,
  type BuildUsingSellerOptions,
} from "../build-tx";
import logger from "../logger";

const seed =
  "vocal shock limit you spell damp buzz jazz magnet poet toe lunar crater reject elite alien tornado noodle control race proof pull favorite brief";

type CompareFn = (output: CTransactionOutput) => boolean;
function compareAddress(address: Address): CompareFn {
  let inner = (output: CTransactionOutput) => {
    return output.address().to_bech32() === address;
  };
  return inner;
}

const waitUntilEndTime = async (endTime: number): Promise<void> => {
  while (Date.now() < endTime) {
    // Sleep for 100 milliseconds before checking again
    logger.info("Wait ser");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  logger.info("Done Waiting | HAPPY :)");
};

/**
 * 1. Mint Token
 * 2. Create LBE
 * 2.1 Add more Sellers
 * 3. Deposit some orders
 * 4. Do Counting
 * 5. Create Pool
 * 6. Redeems
 */
const happyCase = async (options: { batcher: WarehouseBatcher; api: Api }) => {
  const { batcher, api } = options;
  const trans = batcher.builder.t;
  const builder = batcher.builder;

  interface IThings {
    address: Address;
    addSellerCount: bigint;
    endTime: number;
    lbeId: LbeId;
    lpAssetName: string;
    manager: LbeUTxO;
    orderAmount: bigint;
    orderCount: number;
    orders: LbeUTxO[];
    plutusAddress: PlutusAddress;
    reserveBase: bigint;
    seeds: UTxO[];
    sellers: LbeUTxO[];
    startTime: number;
    treasury: LbeUTxO;
    ammFactory: LbeUTxO;
    mapInputs: Record<string, UTxO[]>;
  }

  const refreshThings = async (
    things: IThings,
    isCollected: boolean = false,
  ) => {
    const [treasury, manager, sellers, orders, seeds] = await Promise.all([
      api.findTreasury(things.lbeId),
      api.findManager(things.lbeId),
      api.findSellers(things.lbeId),
      api.findOrders(things.lbeId, isCollected),
      trans.wallet.getUtxos(),
    ]);
    things.treasury = treasury;
    things.manager = manager;
    things.sellers = sellers;
    things.orders = orders;
    things.seeds = seeds;
  };

  const things: IThings = {
    address: await trans.wallet.address(),
    plutusAddress: address2PlutusAddress(await trans.wallet.address()),
    reserveBase: 1000000000000n,
    lbeId: {
      baseAsset: {
        policyId: "",
        assetName: "",
      },
      raiseAsset: {
        policyId: "",
        assetName: "",
      },
    },
    lpAssetName: "",
    startTime: 0,
    endTime: 0,
    addSellerCount: 40n,
    orderAmount: 1000000n,
    orderCount: 100,
    treasury: genDummyUTxO() as LbeUTxO,
    manager: genDummyUTxO() as LbeUTxO,
    sellers: [],
    orders: [],
    seeds: [],
    ammFactory: genDummyUTxO() as LbeUTxO,
    mapInputs: {},
  };

  // 1. Mint Asset
  logger.warn("Start | Mint Assets");
  const { txHash: mintTxHash, asset: baseAsset } = await mintNativeToken({
    trans,
    assetName: T.fromText(`TONY-${Date.now()}`),
    amount: things.reserveBase,
  });
  logger.info(`mint native asset | txHash ${mintTxHash}`);
  await trans.awaitTx(mintTxHash);

  // 2. Create LBE
  logger.warn("Start | Create LBE");
  things.lbeId.baseAsset = baseAsset;
  things.lpAssetName = computeLPAssetName(
    toUnit(things.lbeId.baseAsset.policyId, things.lbeId.baseAsset.assetName),
    toUnit(things.lbeId.raiseAsset.policyId, things.lbeId.raiseAsset.assetName),
  );
  things.startTime = Date.now() + 3 * 60 * 1000;
  things.endTime = things.startTime + 60 * 60 * 1000;
  const lbeParameters: LbeParameters = {
    ...things.lbeId,
    reserveBase: things.reserveBase,
    startTime: things.startTime,
    endTime: things.endTime,
    owner: things.address,
    receiver: things.address,
    poolAllocation: 100n,
    revocable: true,
    poolBaseFee: 30n,
  };
  console.log(lbeParameters);
  const createTx = await api.createLbe(lbeParameters);
  const createTxHash = await api.signAndSubmit(createTx);
  logger.info(`create LBE | txHash ${createTxHash}`);
  await trans.awaitTx(createTxHash);

  // // 2.1 Add Sellers
  // logger.warn("Start | Add Sellers");
  // const addSellerTxHash = await api.addSellers(
  //   things.lbeId,
  //   things.addSellerCount,
  // );
  // logger.info(`add more sellers | txHash ${addSellerTxHash}`);
  // await trans.awaitTx(addSellerTxHash);

  // 3. Deposit some orders
  logger.warn("Start | Deposit Orders");
  await waitUntilEndTime(things.startTime);
  const orderDatums: OrderDatum[] = [];
  for (let i = 0; i < things.orderCount; i++) {
    const datum: OrderDatum = {
      ...things.lbeId,
      factoryPolicyId: builder.factoryHash,
      owner: things.plutusAddress,
      amount: things.orderAmount,
      isCollected: false,
      penaltyAmount: 0n,
    };
    orderDatums.push(datum);
  }
  await refreshThings(things);
  things.startTime = Number(
    WarehouseBuilder.fromDatumTreasury(things.treasury.datum).startTime,
  );
  things.endTime = Number(
    WarehouseBuilder.fromDatumTreasury(things.treasury.datum).endTime,
  );

  builder.clean();
  things.mapInputs = { seeds: things.seeds, seller: [things.sellers[0]] };
  const depositChaining: Chaining = {
    mapInputs: things.mapInputs,
    inputIdentifyFuncs: {
      seeds: identifyCommon(compareAddress(things.address)),
      seller: identifyCommon(compareAddress(builder.sellerAddress)),
    },
    buildTx: async function (
      mapInputs: Record<string, UTxO[]>,
      extra: { treasuryRefInput: LbeUTxO; orderDatums: OrderDatum[] },
    ): Promise<T.TxSigned> {
      const { treasuryRefInput, orderDatums } = extra;
      builder.clean();
      let batchOrderDatums = orderDatums.splice(0, Number(50));
      const options: BuildUsingSellerOptions = {
        treasuryRefInput,
        sellerUtxo: mapInputs["seller"][0] as LbeUTxO,
        validFrom: things.startTime,
        validTo: things.endTime,
        owners: [things.address],
        orderInputs: [],
        orderOutputDatums: batchOrderDatums,
      };
      builder.buildUsingSeller(options);
      builder.tasks.push(() => {
        builder.tx.collectFrom(mapInputs["seeds"]);
      });
      const completeTx = await builder
        .complete()
        .complete({ inputsToChoose: mapInputs["seeds"] });
      const signedTx = await completeTx.sign().complete();
      return signedTx;
    },
    stopCondition: function (): boolean {
      return !orderDatums.length;
    },
    extra: {
      treasuryRefInput: things.treasury,
      orderDatums: orderDatums,
    },
  };
  const depositTxHashes = await doChaining(depositChaining);
  for (const depositTx of depositTxHashes) {
    logger.info(`deposit tx: ${depositTx}`);
  }
  await Promise.all(depositTxHashes.map(trans.awaitTx));
  return;

  // Collect Sellers
  logger.warn("Start | Collect Sellers");
  await refreshThings(things);
  await waitUntilEndTime(things.endTime);
  builder.clean();
  let batching: {
    treasury: LbeUTxO;
    manager?: LbeUTxO;
    orders: LbeUTxO[];
    sellers: LbeUTxO[];
  } = {
    orders: [],
    sellers: things.sellers,
    treasury: things.treasury,
    manager: things.manager,
  };
  const collectSellerOptions = batcher.collectSellersChaining(
    batching,
    things.seeds,
  );
  let collectSellerTxHashes = await doChaining(collectSellerOptions);
  for (const txHash of collectSellerTxHashes) {
    logger.info(`do Collect Sellers txHash: ${txHash}`);
  }
  await Promise.all(collectSellerTxHashes.map(trans.awaitTx));

  // Collect Manager
  logger.warn("Start | Collect Manager");
  await refreshThings(things);
  builder.clean();
  batching = {
    orders: [],
    sellers: [],
    treasury: things.treasury,
    manager: things.manager,
  };
  const collectManagerSignedTx = await batcher.buildCollectManager({
    batching,
    seeds: things.seeds,
  });
  const collectManagerTxHash = await collectManagerSignedTx.submit();
  logger.info(`do Collect Manager txHash: ${collectManagerTxHash}`);
  await trans.awaitTx(collectManagerTxHash);

  // Collect Orders
  logger.warn("Start | Collect Orders");
  builder.clean();
  await refreshThings(things);
  batching = {
    orders: things.orders,
    sellers: [],
    treasury: things.treasury,
    manager: things.manager,
  };
  const collectOrdersOptions = batcher.getOrdersChaining(
    batching,
    things.seeds,
    "collectOrders",
  );
  let collectOrderTxHashes = await doChaining(collectOrdersOptions);
  for (const txHash of collectOrderTxHashes) {
    logger.info(`do Collect Orders txHash: ${txHash}`);
  }
  await Promise.all(collectOrderTxHashes.map(trans.awaitTx));

  // Create Pool
  logger.warn("Start | Create Pool");
  builder.clean();
  await refreshThings(things);
  things.ammFactory = await api.findAmmFactory(things.lbeId);
  const createPoolOptions: BuildCreateAmmPoolOptions = {
    treasuryInput: things.treasury,
    ammFactoryInput: things.ammFactory,
    validFrom: things.endTime,
    validTo: Date.now() + 3 * 60 * 60 * 1000,
  };
  const createPoolTx = await builder
    .buildCreateAmmPool(createPoolOptions)
    .complete()
    .complete({ inputsToChoose: things.seeds });
  const createPoolSignedTx = await createPoolTx.sign().complete();
  const createPoolTxHash = await createPoolSignedTx.submit();
  logger.info(`create pool | txHash: ${createTxHash}`);
  await trans.awaitTx(createPoolTxHash);

  // Redeem Orders
  logger.warn("Start | Redeems Orders");
  builder.clean();
  await refreshThings(things);
  batching = {
    orders: things.orders,
    sellers: [],
    treasury: things.treasury,
  };
  const redeemOrdersOptions = batcher.getOrdersChaining(
    batching,
    things.seeds,
    "redeemOrders",
  );
  let redeemOrderTxHashes = await doChaining(redeemOrdersOptions);
  for (const txHash of redeemOrderTxHashes) {
    logger.info(`do Redeem Orders txHash: ${txHash}`);
  }
  await Promise.all(redeemOrderTxHashes.map(trans.awaitTx));
};

const main = async () => {
  logger.info("run-smoke-test | start");
  await T.loadModule();
  const network: MaestroSupportedNetworks = "Preprod";
  await T.CModuleLoader.load();
  const maestroApiKey = "E0n5jUy4j40nhKCuB7LrYabTNieG0egu";
  const maestro = new T.Maestro({ network, apiKey: maestroApiKey });
  const t = await T.Translucent.new(maestro, network);
  t.selectWalletFromSeed(seed);
  const warehouseOptions = genWarehouseBuilderOptions(t);
  const builder = new WarehouseBuilder(warehouseOptions);
  const batcher = new WarehouseBatcher(builder);
  const api = new Api(builder);

  await happyCase({ api, batcher });
  logger.info("run-smoke-test | end");
};

main();
