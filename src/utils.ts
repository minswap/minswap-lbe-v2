import { C, Translucent, type Script, type UTxO } from "translucent-cardano";
import { SHA3 } from "sha3";
import {
  AuthenMintingPolicyValidateAuthen,
  TreasuryValidatorValidateTreasury,
  FactoryValidatorValidateFactory,
  OrderValidatorValidateOrder,
  OrderValidatorValidateOrderSpending,
} from "../plutus";

type OutputReference = {
  transactionId: { hash: string };
  outputIndex: bigint;
};

type StakeCredential =
  | {
    Inline: [
      | { VerificationKeyCredential: [string] }
      | { ScriptCredential: [string] },
    ];
  }
  | {
    Pointer: {
      slotNumber: bigint;
      transactionIndex: bigint;
      certificateIndex: bigint;
    };
  };

export function utxo2ORef(utxo: UTxO): OutputReference {
  return {
    transactionId: { hash: utxo.txHash },
    outputIndex: BigInt(utxo.outputIndex),
  };
}

function validatorHash2StakeCredential(scriptHash: string): StakeCredential {
  return { Inline: [{ ScriptCredential: [scriptHash] }] };
}

export function collectValidators(
  lucid: Translucent,
  seedTxIn: OutputReference,
) {
  const authenValidator = new AuthenMintingPolicyValidateAuthen(seedTxIn);
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
  const stakeCredential: StakeCredential = validatorHash2StakeCredential(
    orderSpendingValidatorHash,
  );
  const orderValidator = new OrderValidatorValidateOrder(stakeCredential);
  const orderValidatorHash = lucid.utils.validatorToScriptHash(orderValidator);
  const factoryValidator = new FactoryValidatorValidateFactory(
    authenValidatorHash,
    treasuryValidatorHash,
    orderValidatorHash,
  );

  return {
    authenValidator,
    treasuryValidator,
    orderSpendingValidator,
    orderValidator,
    factoryValidator,
  };
}

export type Validators = ReturnType<typeof collectValidators>;
// Maps validator names to the UTxO that contains them as a reference
export type DeployedValidators = Record<string, UTxO>;
export interface ValidatorRefs {
  validators: Validators;
  deployedValidators: DeployedValidators;
}

export function toScriptRef(script: Script): C.ScriptRef {
  switch (script.type) {
    case "Native":
      return C.ScriptRef.new(
        C.Script.new_native(C.NativeScript.from_bytes(fromHex(script.script))),
      );
    case "PlutusV1":
      return C.ScriptRef.new(
        C.Script.new_plutus_v1(
          C.PlutusV1Script.from_bytes(
            fromHex(applyDoubleCborEncoding(script.script)),
          ),
        ),
      );
    case "PlutusV2":
      return C.ScriptRef.new(
        C.Script.new_plutus_v2(
          C.PlutusV2Script.from_bytes(
            fromHex(applyDoubleCborEncoding(script.script)),
          ),
        ),
      );
    default:
      throw new Error("No variant matched.");
  }
}

export function fromHex(hex: string): Uint8Array {
  const matched = hex.match(/.{1,2}/g);
  return new Uint8Array(
    matched ? matched.map((byte) => parseInt(byte, 16)) : [],
  );
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Returns double cbor encoded script. If script is already double cbor encoded it's returned as it is. */
export function applyDoubleCborEncoding(script: string): string {
  try {
    C.PlutusV2Script.from_bytes(
      C.PlutusV2Script.from_bytes(fromHex(script)).bytes(),
    );
    return script;
  } catch (_e) {
    return toHex(C.PlutusV2Script.new(fromHex(script)).to_bytes());
  }
}

export function sha3(hex: string): string {
  const hash = new SHA3(256);
  hash.update(hex, "hex");
  return hash.digest("hex");
}

export function computeLPAssetName(a: string, b: string): string {
  const normalizedPair = [a, b].sort();
  return sha3(sha3(normalizedPair[0]) + sha3(normalizedPair[1]));
}
