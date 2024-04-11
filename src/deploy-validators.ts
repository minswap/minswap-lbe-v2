import * as fs from "fs";
import path from "path";
import * as T from "@minswap/translucent";
import type { MinswapValidators } from "./minswap-amm";
import type { OutRef, Script, Translucent, Tx, UTxO } from "./types";
import { AuthenMintingPolicyValidateAuthen, FactoryValidatorValidateFactory, OrderValidatorFeedType, OrderValidatorValidateOrder, OrderValidatorValidateOrderSpending, TreasuryValidatorValidateTreasury } from "../plutus";
import { validatorHash2StakeCredential } from "./utils";

export type Validators = {
  authenValidator: Script;
  treasuryValidator: Script;
  orderSpendingValidator: Script;
  orderValidator: Script;
  factoryValidator: Script;
  orderValidatorFeedType: Script;
};

export function collectValidators(options: {
  lucid: Translucent,
  seedOutRef?: OutRef,
  dry: boolean,
}): Validators {
  let { lucid, seedOutRef, dry } = options;
  if (!seedOutRef) {
    const fileContent = fs.readFileSync(path.resolve("params.json"), "utf-8");
    seedOutRef = JSON.parse(fileContent).seedOutRef;
  }
  const authenValidator = new AuthenMintingPolicyValidateAuthen({
    transactionId: { hash: seedOutRef!.txHash },
    outputIndex: BigInt(seedOutRef!.outputIndex),
  });
  const authenValidatorHash =
    lucid.utils.validatorToScriptHash(authenValidator);
  const treasuryValidator = new TreasuryValidatorValidateTreasury(
    authenValidatorHash,
  );
  const treasuryValidatorHash =
    lucid.utils.validatorToScriptHash(treasuryValidator);
  const orderSpendingValidator = new OrderValidatorValidateOrderSpending(
    treasuryValidatorHash,
  );
  const orderSpendingValidatorHash = lucid.utils.validatorToScriptHash(
    orderSpendingValidator,
  );
  const stakeCredential = validatorHash2StakeCredential(
    orderSpendingValidatorHash,
  );
  const orderValidator = new OrderValidatorValidateOrder(stakeCredential);
  const orderValidatorHash = lucid.utils.validatorToScriptHash(orderValidator);
  const factoryValidator = new FactoryValidatorValidateFactory(
    authenValidatorHash,
    treasuryValidatorHash,
    orderValidatorHash,
  );
  const orderValidatorFeedType = new OrderValidatorFeedType();
  const validators = {
    authenValidator,
    treasuryValidator,
    orderSpendingValidator,
    orderValidator,
    factoryValidator,
    orderValidatorFeedType,
  };

  if (!dry) {
    const jsonData = JSON.stringify(validators, null, 2);
    fs.writeFile("validators.json", jsonData, "utf8", (err) => {
      if (err) {
        console.error("Error writing JSON file:", err);
        return;
      }
      console.log("validators.json file has been saved.");
    });
  }

  return validators;
}

function buildDeployValidator(lucid: Translucent, validator: Script): Tx {
  const validatorAddress = lucid.utils.validatorToAddress(validator);
  const tx = lucid.newTx().payToContract(
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

async function processElement(
  lucid: Translucent,
  key: string,
  validator: Script,
): Promise<DeployedValidator> {
  const validatorTx = buildDeployValidator(lucid, validator);
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

export type DeployedValidators = Record<string, UTxO>;

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

export async function deployMinswapValidators(
  lucid: Translucent,
  validators: MinswapValidators,
): Promise<DeployedValidators> {
  const deploymentsChain = [
    () => processElement(lucid, "authenValidator", validators!.authenValidator),
    () => processElement(lucid, "poolValidator", validators!.poolValidator),
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
