import { Translucent, generatePrivateKey, type Assets, Emulator, Tx } from "translucent-cardano";

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

export function quickSubmitBuilder(emulator: Emulator, debug?: boolean) {
  return async function ({ txBuilder }: { txBuilder: Tx }) {
    const completedTx = await txBuilder.complete();
    if (debug) {
      console.log("debug", completedTx.txComplete.body().to_json());
    }
    const signedTx = await completedTx.sign().complete();
    const txHash = signedTx.submit();
    emulator.awaitBlock(1);
    return txHash;
  };
}
