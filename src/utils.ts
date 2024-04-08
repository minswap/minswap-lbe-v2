import * as T from "@minswap/translucent";
import { SHA3 } from "sha3";
import {
  AuthenMintingPolicyValidateAuthen,
  TreasuryValidatorValidateTreasury,
  FactoryValidatorValidateFactory,
  OrderValidatorValidateOrder,
  OrderValidatorValidateOrderSpending,
  OrderValidatorFeedType,
} from "../plutus";
import type {
  Translucent,
  OutRef,
  UTxO,
  Script,
  Tx,
  PrivateKey,
  Address,
  Network,
} from "./types";

export function quickSubmit(lucid: Translucent) {
  return async function ({
    txBuilder,
    extraSignatures,
    debug,
  }: {
    txBuilder: Tx;
    extraSignatures?: PrivateKey[];
    debug?: boolean;
  }) {
    const completedTx = await txBuilder.complete();
    if (debug) {
      console.log("debug", completedTx.txComplete.to_json());
    }
    const signedTx = completedTx.sign();
    for (const privateKey of extraSignatures || []) {
      signedTx.signWithPrivateKey(privateKey);
    }
    const txSigned = await signedTx.complete();
    const txHash = await txSigned.submit();
    await lucid.awaitTx(txHash);
    return txHash;
  };
}

type StakeCredential =
  | {
      Inline: [
        | {
            VerificationKeyCredential: [string];
          }
        | {
            ScriptCredential: [string];
          },
      ];
    }
  | {
      Pointer: {
        slotNumber: bigint;
        transactionIndex: bigint;
        certificateIndex: bigint;
      };
    };

export function validatorHash2StakeCredential(
  scriptHash: string,
): StakeCredential {
  return {
    Inline: [
      {
        ScriptCredential: [scriptHash],
      },
    ],
  };
}

export type Validators = {
  authenValidator: Script;
  treasuryValidator: Script;
  orderSpendingValidator: Script;
  orderValidator: Script;
  factoryValidator: Script;
  orderValidatorFeedType: Script;
};

export function collectValidators(
  lucid: Translucent,
  seedTxIn: OutRef,
): Validators {
  const authenValidator = new AuthenMintingPolicyValidateAuthen({
    transactionId: { hash: seedTxIn.txHash },
    outputIndex: BigInt(seedTxIn.outputIndex),
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
  const orderValidatorFeedType = new OrderValidatorFeedType();

  return {
    authenValidator,
    treasuryValidator,
    orderSpendingValidator,
    orderValidator,
    factoryValidator,
    orderValidatorFeedType,
  };
}

// export type Validators = ReturnType<typeof collectValidators>;
// // Maps validator names to the UTxO that contains them as a reference
// export type DeployedValidators = Record<string, UTxO>;
// export interface ValidatorRefs {
//   validators: Validators;
//   deployedValidators: DeployedValidators;
// }

// export function toScriptRef(script: Script): ScriptRef {
//   const C = T.C;
//   switch (script.type) {
//     case "Native":
//       return TC.ScriptRef.new(
//         C.Script.new_native(C.NativeScript.from_bytes(fromHex(script.script))),
//       );
//     case "PlutusV1":
//       return C.ScriptRef.new(
//         C.Script.new_plutus_v1(
//           C.PlutusV1Script.from_bytes(
//             fromHex(applyDoubleCborEncoding(script.script)),
//           ),
//         ),
//       );
//     case "PlutusV2":
//       return C.ScriptRef.new(
//         C.Script.new_plutus_v2(
//           C.PlutusV2Script.from_bytes(
//             fromHex(applyDoubleCborEncoding(script.script)),
//           ),
//         ),
//       );
//     default:
//       throw new Error("No variant matched.");
//   }
// }

// export function fromHex(hex: string): Uint8Array {
//   const matched = hex.match(/.{1,2}/g);
//   return new Uint8Array(
//     matched ? matched.map((byte) => parseInt(byte, 16)) : [],
//   );
// }

// export function toHex(bytes: Uint8Array): string {
//   return Array.from(bytes)
//     .map((byte) => byte.toString(16).padStart(2, "0"))
//     .join("");
// }

// /** Returns double cbor encoded script. If script is already double cbor encoded it's returned as it is. */
// export function applyDoubleCborEncoding(script: string): string {
//   try {
//     C.PlutusV2Script.from_bytes(
//       C.PlutusV2Script.from_bytes(fromHex(script)).bytes(),
//     );
//     return script;
//   } catch (_e) {
//     return toHex(C.PlutusV2Script.new(fromHex(script)).to_bytes());
//   }
// }

export function sha3(hex: string): string {
  const hash = new SHA3(256);
  hash.update(hex, "hex");
  return hash.digest("hex");
}

export function computeLPAssetName(a: string, b: string): string {
  const normalizedPair = [a, b].sort();
  return sha3(sha3(normalizedPair[0]) + sha3(normalizedPair[1]));
}

export type PlutusAddress = {
  paymentCredential:
    | {
        VerificationKeyCredential: [string];
      }
    | {
        ScriptCredential: [string];
      };
  stakeCredential:
    | {
        Inline: [
          | {
              VerificationKeyCredential: [string];
            }
          | {
              ScriptCredential: [string];
            },
        ];
      }
    | {
        Pointer: {
          slotNumber: bigint;
          transactionIndex: bigint;
          certificateIndex: bigint;
        };
      }
    | null;
};

export function address2PlutusAddress(address: Address): PlutusAddress {
  const addressDetail = T.getAddressDetails(address);
  const paymentCredential = addressDetail.paymentCredential!;
  const stakeCredential = addressDetail.stakeCredential;
  return {
    paymentCredential:
      paymentCredential.type === "Key"
        ? {
            VerificationKeyCredential: [paymentCredential.hash],
          }
        : {
            ScriptCredential: [paymentCredential.hash],
          },
    stakeCredential:
      stakeCredential !== undefined
        ? {
            Inline: [
              stakeCredential.type === "Key"
                ? {
                    VerificationKeyCredential: [paymentCredential.hash],
                  }
                : {
                    ScriptCredential: [paymentCredential.hash],
                  },
            ],
          }
        : null,
  };
}

export function plutusAddress2Address(
  network: Network,
  data: PlutusAddress,
): Address {
  const C = T.CModuleLoader.get;
  const networkId = network === "Mainnet" ? 1 : 0;
  let payment;
  if ("VerificationKeyCredential" in data.paymentCredential) {
    const keyHash = data.paymentCredential.VerificationKeyCredential[0];
    payment = C.StakeCredential.from_keyhash(
      C.Ed25519KeyHash.from_hex(keyHash),
    );
  } else if ("ScriptCredential" in data.paymentCredential) {
    const scriptHash = data.paymentCredential.ScriptCredential[0];
    payment = C.StakeCredential.from_scripthash(
      C.Ed25519KeyHash.from_hex(scriptHash),
    );
  }

  let stake = undefined;
  if (data.stakeCredential && "Inline" in data.stakeCredential) {
    if ("VerificationKeyCredential" in data.stakeCredential.Inline[0]) {
      const keyHash =
        data.stakeCredential.Inline[0].VerificationKeyCredential[0];
      stake = C.StakeCredential.from_keyhash(
        C.Ed25519KeyHash.from_hex(keyHash),
      );
    } else if ("ScriptCredential" in data.stakeCredential.Inline[0]) {
      const scriptHash = data.stakeCredential.Inline[0].ScriptCredential[0];
      stake = C.StakeCredential.from_scripthash(
        C.Ed25519KeyHash.from_hex(scriptHash),
      );
    }
  }
  if (stake) {
    const baseAddress = C.BaseAddress.new(networkId, payment!, stake);
    return baseAddress.to_address().to_bech32();
  } else {
    const enterpriseAddress = C.EnterpriseAddress.new(networkId, payment!);
    return enterpriseAddress.to_address().to_bech32();
  }
}

function compareInput(a: UTxO, b: UTxO): number {
  if (a.txHash === b.txHash) {
    if (a.outputIndex > b.outputIndex) {
      return 1;
    } else if (a.outputIndex < b.outputIndex) {
      return -1;
    } else {
      return 0;
    }
  } else if (a.txHash > b.txHash) {
    return 1;
  } else {
    return -1;
  }
}

export function findInputIndex(inputs: UTxO[], val: UTxO): number | undefined {
  return [...inputs]
    .sort(compareInput)
    .findIndex(
      (u) => u.txHash === val.txHash && u.outputIndex === val.outputIndex,
    );
}

export function sortUTxOs(utxos: UTxO[]) {
  const sortedUTxOs = [...utxos];
  sortedUTxOs.sort((a, b) => {
    if (a.txHash < b.txHash) {
      return -1;
    } else if (a.txHash > b.txHash) {
      return 1;
    } else {
      return a.outputIndex - b.outputIndex;
    }
  });
  return sortedUTxOs;
}
