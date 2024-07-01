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
  submit?: (tx: string) => Promise<string>;
};

export async function doChaining(options: Chaining): Promise<string[]> {
  const {
    mapInputs,
    inputIdentifyFuncs,
    extra,
    buildTx,
    stopCondition,
    submit,
  } = options;
  const C = T.CModuleLoader.get;
  const txHashes: string[] = [];
  while (true) {
    if (stopCondition()) {
      return txHashes;
    }
    const tx = await buildTx(mapInputs, extra);
    (submit ? submit(tx.toString()) : submitTx(tx.toString())).catch((err) => {
      console.error("submit Tx Fail", err);
      throw err;
    });
    const transactionHash = tx.toHash();
    txHashes.push(transactionHash);
    const txHash = C.TransactionHash.from_hex(transactionHash);
    const finalOutputs = tx.txSigned.body().outputs();
    for (const [k, v] of Object.entries(inputIdentifyFuncs)) {
      const coreUtxos = v(txHash, finalOutputs);
      const utxos: UTxO[] = [];
      for (let i = 0; i < coreUtxos.len(); i++) {
        const coreUtxo = coreUtxos.get(i);
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
  const innerFunc = (
    txHash: CTransactionHash,
    finalOutputs: CTransactionOutputs,
  ) => {
    const C = T.CModuleLoader.get;
    const result = C.TransactionUnspentOutputs.new();
    for (let i = 0; i < finalOutputs.len(); i++) {
      const output = finalOutputs.get(i);
      if (compare(output)) {
        const input = C.TransactionInput.new(
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
