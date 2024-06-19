import * as T from "@minswap/translucent";
import { expect } from "bun:test";
import type { WarehouseBuilder, WarehouseBuilderOptions } from "../build-tx";
import {
  collectMinswapValidators,
  collectValidators,
  deployMinswapValidators,
  deployValidators,
  type MinswapValidators,
  type Validators,
} from "../deploy-validators";
import type {
  Assets,
  Credential,
  Emulator,
  PrivateKey,
  Translucent,
  Tx,
  UTxO,
} from "../types";
import params from "./../../params.json";

export type GeneratedAccount = {
  privateKey: string;
  address: string;
  assets: Assets;
};

export async function generateAccount(
  assets: Assets,
): Promise<GeneratedAccount> {
  const privateKey = T.generatePrivateKey();
  return {
    privateKey,
    address: await (await T.Translucent.new(undefined, "Custom"))
      .selectWalletFromPrivateKey(privateKey)
      .wallet.address(),
    assets,
  };
}

export function quickSubmitBuilder(emulator: Emulator) {
  return async function ({
    txBuilder,
    extraSignatures,
    debug,
    stats,
    awaitBlock,
  }: {
    txBuilder: Tx;
    extraSignatures?: PrivateKey[];
    debug?: boolean;
    stats?: boolean;
    awaitBlock?: number;
  }) {
    const completedTx = await txBuilder.complete();
    if (debug) {
      console.log("debug", completedTx.txComplete.to_json());
    }
    if (stats) {
      let maxTxMem = T.PROTOCOL_PARAMETERS_DEFAULT.maxTxExMem;
      let maxTxCpu = T.PROTOCOL_PARAMETERS_DEFAULT.maxTxExSteps;
      let maxTxSize = T.PROTOCOL_PARAMETERS_DEFAULT.maxTxSize;
      let totalMem = completedTx.exUnits?.mem ?? 0;
      let totalCpu = completedTx.exUnits?.cpu ?? 0;
      let txSize = completedTx.txComplete.to_bytes().length;
      let remainMem = (BigInt(100) * (maxTxMem - BigInt(totalMem))) / maxTxMem;
      let remainCpu = (BigInt(100) * (maxTxCpu - BigInt(totalCpu))) / maxTxCpu;
      let remainSize = (100 * (maxTxSize - txSize)) / maxTxSize;

      const body = completedTx.txComplete.body();
      let totalCoin = 0n; // total ADA in outputs validator
      for (let i = 0; i < body.outputs().len(); i++) {
        const output = body.outputs().get(i);
        const addressDetails = T.getAddressDetails(
          output.address().to_bech32(),
        );
        if (addressDetails.paymentCredential?.type == "Script") {
          const coin = BigInt(output.amount().coin().to_str());
          totalCoin += coin;
        }
      }
      totalCoin /= 1_000_000n;
      let stats = {
        totalCoin,
        txFee: completedTx.fee,
        totalMem,
        totalCpu,
        txSize,
        // percent
        remainMem,
        remainCpu,
        remainSize,
      };
      console.log("stats", stats);
    }
    const signedTx = completedTx.sign();
    for (const privateKey of extraSignatures || []) {
      signedTx.signWithPrivateKey(privateKey);
    }
    const txSigned = await signedTx.complete();
    const txHash = txSigned.submit();
    emulator.awaitBlock(awaitBlock ?? 1);
    return txHash;
  };
}

export const loadModule = async () => {
  await T.loadModule();
  await T.CModuleLoader.load();
};

export const DUMMY_SEED_UTXO: UTxO = {
  txHash: "5428517bd92102ce1af705f8b66560d445e620aead488b47fb824426484912f8",
  outputIndex: 0,
  assets: { lovelace: 5_000_000n },
  address: "addr_test1vqtx6ahdpzm0nm9qa4wh4avhze8gv3j6jv6v3gmrukdxfrqm6m8d3",
};

export const DUMMY_SEED_AMM_UTXO: UTxO = {
  txHash: params.minswap.seedOutRef.txHash,
  outputIndex: params.minswap.seedOutRef.outputIndex,
  assets: { lovelace: 5_000_000n },
  address: "addr_test1vqtx6ahdpzm0nm9qa4wh4avhze8gv3j6jv6v3gmrukdxfrqm6m8d3",
};

const genAmmValidators = async (t: Translucent) => {
  (t.provider as Emulator).addUTxO(DUMMY_SEED_AMM_UTXO);
  const ammValidators = collectMinswapValidators({
    t,
    seedOutRef: {
      txHash: DUMMY_SEED_AMM_UTXO.txHash,
      outputIndex: DUMMY_SEED_AMM_UTXO.outputIndex,
    },
    poolStakeCredential: params.minswap.poolStakeCredential as Credential,
  });
  return ammValidators;
};

const genValidators = async (t: Translucent) => {
  (t.provider as Emulator).addUTxO(DUMMY_SEED_UTXO);
  let validators = collectValidators({
    t,
    seedOutRef: {
      txHash: DUMMY_SEED_UTXO.txHash,
      outputIndex: DUMMY_SEED_UTXO.outputIndex,
    },
  });
  return validators;
};

const genDeployMinswapValidators = async (
  t: Translucent,
  ammValidators: MinswapValidators,
) => {
  const ammDeployedValidators = await deployMinswapValidators(t, ammValidators);
  return ammDeployedValidators;
};

const genDeployValidators = async (t: Translucent, validators: Validators) => {
  const deployedValidators = await deployValidators(t, validators);
  return deployedValidators;
};

export type GenWarehouseOptions = ReturnType<typeof genWarehouseOptions>;

export const genWarehouseOptions = async (t: Translucent) => {
  let validators = await genValidators(t);
  let ammValidators: MinswapValidators = await genAmmValidators(t);
  let deployedValidators = await genDeployValidators(t, validators);
  let ammDeployedValidators = await genDeployMinswapValidators(
    t,
    ammValidators,
  );
  const options: WarehouseBuilderOptions = {
    t,
    validators,
    deployedValidators,
    ammValidators,
    ammDeployedValidators,
  };
  return options;
};

export const assertValidator = async (
  builder: WarehouseBuilder,
  msg: string,
) => {
  const tx = builder.complete();
  // If msg is empty, then it mean validator should be PASS
  if (msg === "") {
    await tx.complete();
    return;
  }
  let errMessage = "";
  try {
    await tx.complete();
  } catch (err) {
    if (typeof err == "string") errMessage = err;
  }
  expect(errMessage).toContain(msg);
};

export const assertValidatorFail = async (builder: WarehouseBuilder) => {
  const tx = builder.complete();
  expect(async () => {
    await tx.complete();
  }).toThrowError();
};
