import type { BuildCancelLBEOptions } from "../build-tx";
import { CREATE_POOL_COMMISSION, TREASURY_MIN_ADA } from "../constants";
import type { BluePrintAsset, TreasuryDatum, UTxO } from "../types";
import { loadModule } from "./utils";
import { genWarehouse, type GenWarehouse } from "./warehouse";

let W: GenWarehouse;

beforeAll(async () => {
  await loadModule();
});

async function genTestWarehouse() {
  W = await genWarehouse();
}

beforeEach(async () => {
  await genTestWarehouse();
});

test("cancel-event | PASS | not enough reserve to create AMM pool", async () => {
  const { emulator, builder } = W;
  const baseAsset = W.minswapToken;
  const baseAssetRaw = W.minswapTokenRaw;
  const raiseAsset: BluePrintAsset = {
    policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
    assetName: "4d494e4e",
  };
  const raiseAssetRaw =
    "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed724d494e4e";
  let treasuryDatum: TreasuryDatum = {
    ...W.defaultTreasuryDatum,
    isCancelled: false,
    isManagerCollected: true,
    collectedFund: 11n,
    reserveRaise: 11n,
    totalLiquidity: 0n,
    baseAsset,
    raiseAsset,
  };

  let treasuryInput: UTxO = {
    address: builder.treasuryAddress,
    datum: builder.toDatumTreasury(treasuryDatum),
    assets: {
      [builder.treasuryToken]: 1n,
      lovelace: TREASURY_MIN_ADA + CREATE_POOL_COMMISSION,
      [baseAssetRaw]: 11n,
      [raiseAssetRaw]: 11n,
    },
    txHash: "00".repeat(32),
    outputIndex: 0,
  };

  emulator.addUTxO(treasuryInput);

  const options: BuildCancelLBEOptions = {
    treasuryInput,
    validFrom: W.t.utils.slotToUnixTime(emulator.slot),
    validTo: W.t.utils.slotToUnixTime(emulator.slot + 100),
    reason: "NotReachMinimum",
  };
  const tx = await W.builder.buildCancelLBE(options).complete().complete();
  const finalTx = await tx.sign().complete();
  const txHash = await emulator.submitTx(finalTx.toString());
  expect(txHash).toBeTruthy();
});
