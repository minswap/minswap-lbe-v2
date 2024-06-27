import * as T from "@minswap/translucent";
import lbeV2Script from ".././../lbe-v2-script.json";
import {
  WarehouseBuilder,
  genWarehouseBuilderOptions,
  type BuildInitFactoryOptions,
  type BuildCreateTreasuryOptions,
} from "../build-tx";
import logger from "../logger";
import type { MaestroSupportedNetworks, TreasuryDatum } from "../types";
import { address2PlutusAddress } from "../utils";

let submitTx = async (tx: string): Promise<string> => {
  const response = await fetch("https://dev-3.minswap.org/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: `{"query":"mutation SubmitTx($tx: String!) {submitTx(tx: $tx)}","variables":{"tx":"${tx}"}}`,
  });
  const result = await response.text();
  return result;
};

async function createTreasury(
  builder: WarehouseBuilder,
  treasuryDatum: TreasuryDatum,
) {
  builder.clean();
  builder.setInnerAssets(treasuryDatum.baseAsset, treasuryDatum.raiseAsset);
  let factories = await builder.t.utxosAtWithUnit(
    builder.factoryAddress,
    builder.factoryToken,
  );
  let factoryUtxo = factories.find((factory) => {
    let factoryDatum = WarehouseBuilder.fromDatumFactory(factory.datum!);
    return (
      factoryDatum.head < builder.lpAssetName! &&
      factoryDatum.tail > builder.lpAssetName!
    );
  })!;

  console.log(factoryUtxo);

  let sellerOwner = await builder.t.wallet.address();
  let options: BuildCreateTreasuryOptions = {
    sellerAmount: 25n,
    factoryUtxo,
    treasuryDatum,
    sellerOwner,
    validFrom: Date.now(),
    validTo: Date.now() + 3 * 60 * 60 * 1000,
  };

  let completeTx = await builder
    .buildCreateTreasury(options)
    .complete()
    .complete();

  let signedTx = await completeTx.sign().complete();
  let txHash = await signedTx.submit();
  logger.info(`Create Treasury success at ${txHash}`);
}

async function initFactory(builder: WarehouseBuilder) {
  builder.clean();
  let seed = await builder.t.utxosByOutRef([lbeV2Script.seedOutRef]);
  const options: BuildInitFactoryOptions = {
    seedUtxo: seed[0],
  };
  let completeTx = await builder
    .buildInitFactory(options)
    .complete()
    .complete();
  let signedTx = await completeTx.sign().signWithPrivateKey("").complete();
  let txHash = await signedTx.submit();
  logger.info(`Init Factory success at ${txHash}`);
}

let main = async () => {
  await T.loadModule();
  await T.CModuleLoader.load();
  let network: MaestroSupportedNetworks = "Preprod";
  let maestroApiKey = "E0n5jUy4j40nhKCuB7LrYabTNieG0egu" ?? process.argv[2];
  let seedPhase = "" ?? process.argv[3];

  // let seedPhase =
  //   "move choose dish rhythm always stable eagle flush kitten inside reason acquire label treat float art faculty mixed try gold dress ill sport erase";

  const maestro = new T.Maestro({ network, apiKey: maestroApiKey });
  const t = await T.Translucent.new(maestro, network);
  t.selectWalletFromSeed(seedPhase);
  let walletAddress = await t.wallet.address();
  logger.info(`wallet address: ${walletAddress}`);
  let plutusAddress = address2PlutusAddress(walletAddress);
  console.log(JSON.stringify(plutusAddress));
  // console.log(await t.wallet.getUtxos());

  // let wallet = new T.SeedWallet(t, seedPhase);
  // wallet.address().then(console.log);
  // let prvKey = wallet.getPaymentKey();
  // console.log(prvKey);

  // let deployAddress = await t.wallet.address();
  // let seedAddress =
  //   "addr_test1qr03hndgkqdw4jclnvps6ud43xvuhms7rurjq87yfgzc575pm6dyr7fz24xwkh6k0ldufe2rqhgkwcppx5fzjrx5j2rs2rt9qc";
  // console.log({ deployAddress, seedAddress });

  // let tx = await t
  //   .newTx()
  //   .payToAddress(seedAddress, { lovelace: 280_000_000n })
  //   .complete();
  // let signed = await tx.sign().complete();
  // let txHash = await signed.submit();
  // console.log(txHash);

  let warehouseOptions = genWarehouseBuilderOptions(t);
  const builder = new WarehouseBuilder(warehouseOptions);

  // await initFactory(builder);

  let treasuryDatum: TreasuryDatum = {
    factoryPolicyId: builder.factoryHash,
    sellerHash: builder.sellerHash,
    orderHash: builder.orderHash,
    managerHash: builder.managerHash,
    collectedFund: 0n,
    baseAsset: {
      policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
      assetName: "0014df104b494e474d41",
    },
    raiseAsset: {
      policyId: "",
      assetName: "",
    },
    startTime: BigInt(Date.now() + 3 * 60 * 60 * 1000),
    endTime: BigInt(Date.now() + 14 * 24 * 60 * 60 * 1000),
    owner: address2PlutusAddress(walletAddress),
    receiver: address2PlutusAddress(walletAddress),
    receiverDatum: "RNoDatum",
    poolAllocation: 100n,
    minimumRaise: null,
    maximumRaise: null,
    reserveBase: 50_000_000_000_000n,
    reserveRaise: 0n,
    totalLiquidity: 0n,
    penaltyConfig: null,
    poolBaseFee: 30n,
    totalPenalty: 0n,
    isCancelled: false,
    minimumOrderRaise: null,
    isManagerCollected: false,
    revocable: true,
  };
  console.log(treasuryDatum);
  await createTreasury(builder, treasuryDatum);
};

main();
