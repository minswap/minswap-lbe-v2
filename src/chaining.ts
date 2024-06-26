import * as T from "@minswap/translucent";

import type {
  CTransactionHash,
  CTransactionOutputs,
  CTransactionUnspentOutputs,
  MaestroSupportedNetworks,
  TxSigned,
  UTxO,
} from "./types";

export type InputId = string;
export type InputIdentify = (
  txHash: CTransactionHash,
  finalOutputs: CTransactionOutputs,
) => CTransactionUnspentOutputs;

export type Chaining = {
  mapInputs: Record<InputId, UTxO[]>;
  inputIdentifyFuncs: Record<InputId, InputIdentify>;
  buildTx: (
    mapInputs: Record<InputId, UTxO[]>,
    extra: any,
  ) => Promise<TxSigned>;
  stopCondition: () => boolean;
  submitTx: (tx: string) => Promise<void>;
};

export async function doChaining(options: Chaining, mutate?: any) {
  let { mapInputs, inputIdentifyFuncs, buildTx, stopCondition, submitTx } =
    options;
  let C = T.CModuleLoader.get;
  while (true) {
    if (stopCondition()) {
      return;
    }
    let tx = await buildTx(mapInputs, mutate);
    await submitTx(tx.toString());
    let transactionHash = tx.toHash();
    let txHash = C.TransactionHash.from_hex(transactionHash);
    let finalOutputs = tx.txSigned.body().outputs();
    for (let [k, v] of Object.entries(inputIdentifyFuncs)) {
      let coreUtxos = v(txHash, finalOutputs);
      let utxos: UTxO[] = [];
      for (let i = 0; i < coreUtxos.len(); i++) {
        let coreUtxo = coreUtxos.get(i);
        utxos.push(T.coreToUtxo(coreUtxo));
      }
      mapInputs[k] = utxos;
    }
  }
}

let submitTx = async (tx: string): Promise<string> => {
  console.log({ tx });
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

let main = async () => {
  await T.loadModule();
  await T.CModuleLoader.load();
  let network: MaestroSupportedNetworks = "Preprod";
  let maestroApiKey = "E0n5jUy4j40nhKCuB7LrYabTNieG0egu" ?? process.argv[2];
  let seedPhase =
    "muffin spell cement resemble frame pupil grow gloom hawk wild item hungry polar ice maximum sport economy drop sun timber stone circle army jazz" ??
    process.argv[3];

  const maestro = new T.Maestro({ network, apiKey: maestroApiKey });
  const t = await T.Translucent.new(maestro, network);
  t.selectWalletFromSeed(seedPhase);

  let address = await t.wallet.address();
  let C = T.CModuleLoader.get;

  let inputIdentifyFuncs = {
    root: (txHash: CTransactionHash, finalOutputs: CTransactionOutputs) => {
      console.log("finalOutputs", finalOutputs.to_js_value());
      let result = C.TransactionUnspentOutputs.new();
      for (let i = 0; i <= finalOutputs.len(); i++) {
        let output = finalOutputs.get(i);
        console.log("output", output.to_js_value());
        let curAddress = output.address();
        if (
          curAddress.to_bech32() === address &&
          BigInt(output.amount().coin().to_str()) >= 500_000_000n
        ) {
          let input = C.TransactionInput.new(
            txHash,
            C.BigNum.from_str(i.toString()),
          );
          result.add(C.TransactionUnspentOutput.new(input, output));
          break;
        }
      }
      return result;
    },
  };

  let count = 0;
  let stopCondition = () => {
    console.log({ count });
    return count++ >= 4;
  };

  let mapInputs = {
    root: (await t.utxosAt(address)).filter(
      (u) => u.assets["lovelace"] >= 500_000_000n,
    ),
  };
  let buildTx = async (
    mapInputs: Record<InputId, UTxO[]>,
  ): Promise<TxSigned> => {
    let txBuilder = t.newTx();
    txBuilder
      .collectFrom(mapInputs["root"])
      .payToAddress(address, { lovelace: 3_000_000n });
    let tx = await txBuilder.complete();
    let signedTx = tx.sign();
    let txSigned = await signedTx.complete();
    console.log("txSigned", txSigned.txSigned.to_js_value());
    return txSigned;
  };

  let options: Chaining = {
    mapInputs,
    inputIdentifyFuncs,
    buildTx,
    stopCondition,
    submitTx: async (tx: string) => {
      submitTx(tx);
    },
  };
  await doChaining(options);
};

// main();
