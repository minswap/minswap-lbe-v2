import {
  type Translucent,
  type Script,
  type Tx,
  type UTxO,
} from "translucent-cardano";
import { toScriptRef, type DeployedValidators, type Validators } from "./utils";

function buildDeployValidator(lucid: Translucent, validator: Script): Tx {
  const validatorAddress = lucid.utils.validatorToAddress(validator);
  const tx = lucid.newTx().payToContract(
    validatorAddress,
    {
      inline: "d87980",
      scriptRef: validator,
    },
    {},
  );
  return tx;
}

type PromiseFunction<T> = () => Promise<T>;
type KeyValueTuple<T> = [string, T];
type DeployedValidator = [string, UTxO];

async function processElement(
  lucid: Translucent,
  key: string,
  validator: Script,
): Promise<DeployedValidator> {
  const validatorTx = buildDeployValidator(lucid, validator);
  const completedTx = await validatorTx.complete();
  const finalOutputs = completedTx.txComplete.to_js_value().body.outputs;
  const scriptV2 = (
    toScriptRef(validator).to_js_value() as { PlutusV2?: string }
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
    datum: "d87980",
  };
  const newValidator: DeployedValidator = [key, newUtxo];
  await lucid.awaitTx(txHash);
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

export async function deployValidators(
  lucid: Translucent,
  validators: Validators,
): Promise<DeployedValidators> {
  const deploymentsChain = [
    () => processElement(lucid, "authenValidator", validators!.authenValidator),
    () =>
      processElement(lucid, "treasuryValidator", validators!.treasuryValidator),
    () =>
      processElement(
        lucid,
        "orderSpendingValidator",
        validators!.orderSpendingValidator,
      ),
    () => processElement(lucid, "orderValidator", validators!.orderValidator),
    () =>
      processElement(lucid, "factoryValidator", validators!.factoryValidator),
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
