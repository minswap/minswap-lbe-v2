import type { Provider } from "./provider";

async function main(): Promise<void> {
  let provider: Provider;
  const countingTreasuries = await provider.getTreasuries({
    phase: "Counting",
  });
}

main();
