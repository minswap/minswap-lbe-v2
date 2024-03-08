import {
  Translucent,
  generatePrivateKey,
  type Assets,
  Emulator,
  Tx,
  type PrivateKey,
} from "translucent-cardano";

export type GeneratedAccount = Awaited<ReturnType<typeof generateAccount>>;

export async function generateAccount(assets: Assets) {
  const privateKey = generatePrivateKey();
  return {
    privateKey,
    address: await (await Translucent.new(undefined, "Custom"))
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
