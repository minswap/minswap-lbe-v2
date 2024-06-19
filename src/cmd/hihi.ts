import * as T from "@minswap/translucent";

import type { CTransactionOutputs, CTransactionUnspentOutputs, MaestroSupportedNetworks, Translucent, TxSigned, UTxO } from "../types";

type InputId = string;
type InputIdentify = (outputs: CTransactionOutputs) => CTransactionUnspentOutputs;

type Chaining = {
  t: Translucent;
  mapInputs: Record<InputId, UTxO[]>,
  inputIdentifyFuncs: Record<InputId, InputIdentify>;
  buildTx: (mapInputs: Record<InputId, UTxO[]>) => Promise<TxSigned>;
  stopCondition: () => boolean;
};

let doChaining = async (options: Chaining) => {
  let { t, mapInputs, inputIdentifyFuncs, buildTx, stopCondition } = options;
  while (true) {
    if (stopCondition()) {
      return;
    }
    let tx = await buildTx(mapInputs);
    tx.submit();
    let txHash = tx.toHash();
    let finalOutputs = tx.txSigned.body().outputs();

    tx.txSigned.body();
    for (let [k, v] of Object.entries(inputIdentifyFuncs)) {
      let { outputs, outputIndexes } = v(finalOutputs);
      mapInputs[k] = [{
        txHash,
        outputIndex: outputIndexes[0],
        assets: t,
        address: outputs.get(0).address().to_bech32(),
      }]
    }
  }
}

let main = async () => {
  await T.loadModule();
  await T.CModuleLoader.load();
  let network: MaestroSupportedNetworks = "Preprod";
  let maestroApiKey = process.argv[2];
  let seedPhase = process.argv[3];

  const maestro = new T.Maestro({ network, apiKey: maestroApiKey });
  const t = await T.Translucent.new(maestro, network);
  t.selectWalletFromSeed(seedPhase);


  let address = await t.wallet.address();

  let inputIdentifyFuncs: Record<InputId, InputIdentify> = {
    "root": (finalOutputs: CTransactionOutputs) => {
      let C = T.CModuleLoader.get;
      let result: CTransactionOutputs = C.TransactionOutputs.new();
      let outputIndexes: number[] = [];
      for (let i = 0; i <= finalOutputs.len(); i++) {
        let output = finalOutputs.get(i);
        let curAddress = output.address();
        if (curAddress.to_bech32() === address) {
          result.add(output);
          outputIndexes.push(i);
          break;
        }
      }
      return { outputs: result, outputIndexes };
    }
  }

  let count = 0;
  let stopCondition = () => {
    return count++ >= 5;
  }

  let mapInputs = {
    "root": await t.utxosAt(address),
  }
  let buildTx = async (mapInputs: Record<InputId, UTxO[]>): Promise<TxSigned> => {
    let txBuilder = t.newTx();
    txBuilder
      .readFrom(mapInputs["root"])
      .payToAddress(address, { "lovelace": 3_000_000n });
    let tx = await txBuilder.complete();
    let signedTx = tx.sign();
    let txSigned = await signedTx.complete();
    return txSigned;
  }

  let options: Chaining = {
    mapInputs,
    t,
    inputIdentifyFuncs,
    buildTx,
    stopCondition,
  }
  await doChaining(options);
}
main();
