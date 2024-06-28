import * as T from "@minswap/translucent";

import type {
  CTransactionHash,
  CTransactionOutput,
  CTransactionOutputs,
  CTransactionUnspentOutputs,
  TxSigned,
  UTxO,
} from "../types";

export type InputId = string;
export type InputIdentify = (
  txHash: CTransactionHash,
  finalOutputs: CTransactionOutputs,
) => CTransactionUnspentOutputs;

export type Chaining = {
  mapInputs: Record<InputId, UTxO[]>;
  inputIdentifyFuncs: Record<InputId, InputIdentify>;
  extra?: any; // this should be mutate object
  buildTx: (
    mapInputs: Record<InputId, UTxO[]>,
    extra: any,
  ) => Promise<TxSigned>;
  stopCondition: () => boolean;
  submit?: (tx: string) => Promise<void>;
};

export async function doChaining(options: Chaining) {
  let { mapInputs, inputIdentifyFuncs, extra, buildTx, stopCondition, submit } =
    options;
  let C = T.CModuleLoader.get;
  while (true) {
    if (stopCondition()) {
      return;
    }
    let tx = await buildTx(mapInputs, extra);
    // await (submit ? submit(tx.toString()) : submitTx(tx.toString()));
    let transactionHash = tx.toHash();
    console.log("transactionHash ", transactionHash);
    console.log(
      "full Tx: ",
      C.Transaction.from_bytes(T.fromHex(tx.toString())).body().to_json(),
    );
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

export async function submitTx(tx: string): Promise<string> {
  const response = await fetch("https://dev-3.minswap.org/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: `{"query":"mutation SubmitTx($tx: String!) {submitTx(tx: $tx)}","variables":{"tx":"${tx}"}}`,
  });
  const result = await response.text();
  return result;
}

export function identifyCommon(
  compare: (output: CTransactionOutput) => boolean,
): InputIdentify {
  let innerFunc = (
    txHash: CTransactionHash,
    finalOutputs: CTransactionOutputs,
  ) => {
    let C = T.CModuleLoader.get;
    let result = C.TransactionUnspentOutputs.new();
    for (let i = 0; i < finalOutputs.len(); i++) {
      let output = finalOutputs.get(i);
      if (compare(output)) {
        let input = C.TransactionInput.new(
          txHash,
          C.BigNum.from_str(i.toString()),
        );
        result.add(C.TransactionUnspentOutput.new(input, output));
      }
    }
    return result;
  };
  return innerFunc;
}
