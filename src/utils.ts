import * as T from "@minswap/translucent";
import { SHA3 } from "sha3";
import { sqrt } from "./sqrt";
import type {
  Address,
  Network,
  PolicyId,
  PrivateKey,
  Translucent,
  Tx,
  UTxO,
  Unit,
  LbeScript,
} from "./types";
import lbeV2Script from "./../lbe-v2-script.json";

export function getLbeScript(): LbeScript {
  return lbeV2Script as LbeScript;
}

export function toUnit(
  policyId: PolicyId,
  name?: string | null,
  label?: number | null,
): Unit | "lovelace" {
  if (policyId === "" && (name ?? "") === "") {
    return "lovelace";
  }
  return T.toUnit(policyId, name, label);
}

export function quickSubmit(t: Translucent) {
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
    await t.awaitTx(txHash);
    return txHash;
  };
}

export function sha3(hex: string): string {
  const hash = new SHA3(256);
  hash.update(hex, "hex");
  return hash.digest("hex");
}

export function normalizedPair(
  asset1: { policyId: string; assetName: string },
  asset2: { policyId: string; assetName: string },
) {
  let [assetA, assetB] = [asset1, asset2];
  if (
    asset2.policyId < asset1.policyId ||
    (asset2.policyId == asset1.policyId && asset2.assetName < asset1.assetName)
  ) {
    assetA = asset2;
    assetB = asset1;
  }
  return [assetA, assetB];
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
                    VerificationKeyCredential: [stakeCredential.hash],
                  }
                : {
                    ScriptCredential: [stakeCredential.hash],
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

export function calculateInitialLiquidity(
  amountA: bigint,
  amountB: bigint,
): bigint {
  let x = sqrt(amountA * amountB);
  if (x * x < amountA * amountB) {
    x += 1n;
  }
  return x;
}

export function genDummyUTxO(): UTxO {
  return {
    txHash: "",
    outputIndex: 0,
    address: "",
    assets: {},
  };
}

export function catchWrapper<T, R>(
  func: (t: T) => R,
  arg0: T,
  defaultValue: R,
): R {
  try {
    return func(arg0);
  } catch {
    return defaultValue;
  }
}

export function hexToUtxo(hexUtxo: string): UTxO {
  let C = T.CModuleLoader.get;
  let cUtxo = C.TransactionUnspentOutput.from_bytes(T.fromHex(hexUtxo));
  let utxo = T.coreToUtxo(cUtxo);
  cUtxo.free();
  return utxo;
}
