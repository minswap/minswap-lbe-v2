import * as T from "@minswap/translucent";
import type { Assets, PrivateKey, Emulator, Tx } from "../types";

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
    const txHash = txSigned.submit();
    emulator.awaitBlock(1);
    return txHash;
  };
}
