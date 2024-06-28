import * as T from "@minswap/translucent";
import type {
  Address,
  Credential,
  OutRef,
  Script,
  Translucent,
  Tx,
  UTxO,
} from "./types";
import {
  FactoryValidateFactory,
  TreasuryValidateTreasurySpending,
  SellerValidateSellerSpending,
  OrderValidateOrder,
  ManagerValidateManagerSpending,
} from "../plutus";

import {
  AuthenMintingPolicyValidateAuthen as MinswapAuthen,
  PoolValidatorValidatePool as MinswapPool,
  FactoryValidatorValidateFactory as MinswapFactory,
  PoolValidatorValidatePoolBatching as MinswapPoolBatching,
} from "../amm-plutus";
import { address2PlutusAddress } from "./utils";

export type Validators = {
  factoryValidator: Script;
  treasuryValidator: Script;
  sellerValidator: Script;
  orderValidator: Script;
  managerValidator: Script;
};

export type MinswapValidators = {
  authenValidator: Script;
  factoryValidator: Script;
  poolValidator: Script;
  poolBatchingValidator: Script;
  poolAddress: Address;
};

export function collectMinswapValidators(options: {
  t: Translucent;
  seedOutRef: OutRef;
  poolStakeCredential: Credential;
}): MinswapValidators {
  const { t, seedOutRef, poolStakeCredential } = options;

  const authenValidator = new MinswapAuthen({
    transactionId: { hash: seedOutRef.txHash },
    outputIndex: BigInt(seedOutRef.outputIndex),
  });
  const authenValidatorHash = t.utils.validatorToScriptHash(authenValidator);

  const poolValidator = new MinswapPool(authenValidatorHash);
  const poolValidatorHash = t.utils.validatorToScriptHash(poolValidator);
  const poolBatchingValidator = new MinswapPoolBatching(authenValidatorHash, {
    ScriptCredential: [poolValidatorHash],
  });
  const poolBatchingValidatorHash = t.utils.validatorToScriptHash(
    poolBatchingValidator,
  );
  const poolAddress = t.utils.validatorToAddress(
    poolValidator,
    poolStakeCredential,
  );
  const plutusPoolAddress = address2PlutusAddress(poolAddress);
  const factoryValidator = new MinswapFactory(
    authenValidatorHash,
    plutusPoolAddress,
    {
      Inline: [{ ScriptCredential: [poolBatchingValidatorHash] }],
    },
  );
  return {
    authenValidator,
    factoryValidator,
    poolValidator,
    poolBatchingValidator,
    poolAddress,
  };
}

export function collectValidators(options: {
  t: Translucent;
  seedOutRef: OutRef;
}): Validators {
  let { t, seedOutRef } = options;
  const treasuryValidator = new TreasuryValidateTreasurySpending();
  const treasuryValidatorHash =
    t.utils.validatorToScriptHash(treasuryValidator);
  const managerValidator = new ManagerValidateManagerSpending(
    treasuryValidatorHash,
  );
  const managerValidatorHash = t.utils.validatorToScriptHash(managerValidator);
  const sellerValidator = new SellerValidateSellerSpending(
    treasuryValidatorHash,
    managerValidatorHash,
  );
  const sellerValidatorHash = t.utils.validatorToScriptHash(sellerValidator);
  const orderValidator = new OrderValidateOrder(sellerValidatorHash);
  const orderValidatorHash = t.utils.validatorToScriptHash(orderValidator);
  const factoryValidator = new FactoryValidateFactory(
    {
      transactionId: { hash: seedOutRef!.txHash },
      outputIndex: BigInt(seedOutRef!.outputIndex),
    },
    treasuryValidatorHash,
    managerValidatorHash,
    sellerValidatorHash,
    orderValidatorHash,
  );
  const validators = {
    treasuryValidator,
    orderValidator,
    sellerValidator,
    factoryValidator,
    managerValidator,
  };

  return validators;
}

function buildDeployValidator(
  t: Translucent,
  validator: Script,
  deployTo?: Address,
): Tx {
  const deployAddress = deployTo ?? t.utils.validatorToAddress(validator);
  const tx = t.newTx().payToAddressWithData(
    deployAddress,
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
  t: Translucent,
  key: string,
  validator: Script,
  deployTo?: Address,
): Promise<DeployedValidator> {
  const validatorTx = buildDeployValidator(t, validator, deployTo);
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

export type DeployedValidators = Awaited<ReturnType<typeof deployValidators>>;

export async function deployValidators(
  t: Translucent,
  validators: Validators,
  deployTo?: Address,
) {
  const deploymentsChain = [
    () =>
      processElement(
        t,
        "treasuryValidator",
        validators.treasuryValidator,
        deployTo,
      ),
    () =>
      processElement(
        t,
        "managerValidator",
        validators.managerValidator,
        deployTo,
      ),
    () =>
      processElement(
        t,
        "sellerValidator",
        validators.sellerValidator,
        deployTo,
      ),
    () =>
      processElement(t, "orderValidator", validators.orderValidator, deployTo),
    () =>
      processElement(
        t,
        "factoryValidator",
        validators.factoryValidator,
        deployTo,
      ),
  ];
  let res: Record<string, UTxO> = {};

  await executePromiseFunctions(deploymentsChain)
    .then((deployments) => {
      res = deployments;
    })
    .catch((err) => {
      throw new Error(err);
    });

  return res as {
    treasuryValidator: UTxO;
    managerValidator: UTxO;
    sellerValidator: UTxO;
    orderValidator: UTxO;
    factoryValidator: UTxO;
  };
}

export type DeployMinswapValidators = Awaited<
  ReturnType<typeof deployMinswapValidators>
>;

export async function deployMinswapValidators(
  t: Translucent,
  validators: MinswapValidators,
  deployTo?: Address,
) {
  const deploymentsChain = [
    () =>
      processElement(
        t,
        "authenValidator",
        validators.authenValidator,
        deployTo,
      ),
    () =>
      processElement(t, "poolValidator", validators.poolValidator, deployTo),
    () =>
      processElement(
        t,
        "factoryValidator",
        validators.factoryValidator,
        deployTo,
      ),
    () =>
      processElement(
        t,
        "poolBatchingValidator",
        validators.poolBatchingValidator,
      ),
  ];
  let res: Record<string, UTxO> = {};

  await executePromiseFunctions(deploymentsChain)
    .then((deployments) => {
      res = deployments;
    })
    .catch((err) => {
      throw new Error(err);
    });

  return res as {
    authenValidator: UTxO;
    poolValidator: UTxO;
    factoryValidator: UTxO;
  };
}
