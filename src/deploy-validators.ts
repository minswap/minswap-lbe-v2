import * as T from "@minswap/translucent";
import type { Script, Translucent, Tx, UTxO } from "./types";
import { ExampleValidateMinting, ExampleValidateSpending } from "../plutus";

export type Validators = {
  exampleSpendValidator: Script;
  exampleMintValidator: Script;
};

export function collectValidators(): Validators {
  const exampleSpendValidator = new ExampleValidateSpending();
  const exampleMintValidator = new ExampleValidateMinting();
  return {
    exampleSpendValidator,
    exampleMintValidator,
  }
}

function buildDeployValidator(t: Translucent, validator: Script): Tx {
  const validatorAddress = t.utils.validatorToAddress(validator);
  const tx = t.newTx().payToContract(
    validatorAddress,
    {
      inline: "d87980", // 121([])
      scriptRef: validator,
    },
    {},
  );
  return tx;
}

type PromiseFunction<T> = () => Promise<T>;
type KeyValueTuple<T> = [string, T];
type DeployedValidator = [string, UTxO];

export async function processElement(
  t: Translucent,
  key: string,
  validator: Script,
): Promise<DeployedValidator> {
  const validatorTx = buildDeployValidator(t, validator);
  const completedTx = await validatorTx.complete();
  const finalOutputs = completedTx.txComplete.to_js_value().body.outputs;
  const scriptV2 = (
    T.toScriptRef(validator).to_js_value() as {
      PlutusV2?: string;
    }
  ).PlutusV2;
  const newTxOutputIdx = finalOutputs.findIndex((o: any) => {
    if (!o.script_ref) return false;
    return o.script_ref?.PlutusV2 === scriptV2;
  });
  const newTxOutput = finalOutputs[newTxOutputIdx];
  const signedTx = await completedTx.sign().complete();
  const txHash = await signedTx.submit();
  const newUtxo: UTxO = {
    address: newTxOutput.address,
    txHash,
    outputIndex: newTxOutputIdx,
    scriptRef: validator,
    assets: {
      lovelace: BigInt(newTxOutput.amount.coin),
    },
    datum: "d87980", // 121([])
  };
  const newValidator: DeployedValidator = [key, newUtxo];
  await t.awaitTx(txHash);
  return newValidator;
}

async function executePromiseFunctions<T>(
  promiseArray: PromiseFunction<KeyValueTuple<T>>[],
): Promise<Record<string, T>> {
  const resultsObject: Record<string, T> = {};

  for (const promiseFn of promiseArray) {
    const result = await promiseFn();
    resultsObject[result[0]] = result[1];
  }

  return resultsObject;
}

export type DeployedValidators = Record<string, UTxO>;

export async function deployValidators(
  t: Translucent,
  validators: Validators,
): Promise<DeployedValidators> {
  const deploymentsChain = [
    () => processElement(t, "exampleSpendValidator", validators.exampleSpendValidator),
    () => processElement(t, "exampleMintValidator", validators.exampleMintValidator),
  ];
  let res: DeployedValidators = {};

  await executePromiseFunctions(deploymentsChain)
    .then((deployments) => {
      res = deployments;
    })
    .catch((err) => {
      throw new Error(err);
    });

  return res;
}
