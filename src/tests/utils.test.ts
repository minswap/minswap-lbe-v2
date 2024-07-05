import { loadModule, type Assets, filterAssets } from "..";

beforeAll(async () => {
  await loadModule();
});

test("filterAssets", () => {
  const assets: Assets = {
    MIN: 1000n,
    eth: 0n,
    sol: 0n,
  };
  const newAssets = filterAssets(assets);
  expect(newAssets).toEqual({ MIN: 1000n });
});
