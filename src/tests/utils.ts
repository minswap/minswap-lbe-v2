import * as T from "@minswap/translucent";
import type { Assets, PrivateKey, Emulator, Tx } from "../types";

export type GeneratedAccount = {
  privateKey: string;
  address: string;
  assets: Assets;
};

export async function generateAccount(assets: Assets): Promise<GeneratedAccount> {
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
      const body = completedTx.txComplete.body();
      const txFee = body.fee().to_str();
      let totalCoin = 0n;
      for (let i = 0; i < body.outputs().len(); i++) {
        const output = body.outputs().get(i);
        const addressDetails = T.getAddressDetails(output.address().to_bech32());
        if (addressDetails.paymentCredential?.type == "Script") {
          const coin = BigInt(output.amount().coin().to_str());
          totalCoin += coin;
        }
      }
      totalCoin /= 1_000_000n;
      console.log("stats", { txFee, totalCoin });
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
