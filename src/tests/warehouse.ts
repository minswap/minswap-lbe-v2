import * as T from "@minswap/translucent";
import { WarehouseBuilder } from "../build-tx";
import {
  CREATE_POOL_COMMISSION,
  DEFAULT_NUMBER_SELLER,
  LBE_INIT_FACTORY_HEAD,
  LBE_INIT_FACTORY_TAIL,
  MANAGER_MIN_ADA,
  ORDER_MIN_ADA,
  SELLER_MIN_ADA,
  TREASURY_MIN_ADA,
} from "../constants";
import type {
  AmmPoolDatum,
  BluePrintAsset,
  Emulator,
  FactoryDatum,
  ManagerDatum,
  OrderDatum,
  ProtocolParameters,
  SellerDatum,
  Translucent,
  TreasuryDatum,
  UTxO,
} from "../types";
import { address2PlutusAddress, toUnit } from "../utils";
import {
  genWarehouseOptions,
  generateAccount,
  quickSubmitBuilder,
} from "./utils";

export const skipToCountingPhase = (options: {
  t: Translucent;
  e: Emulator;
  datum: TreasuryDatum;
}) => {
  const { t, e, datum } = options;
  const discoveryEndSlot = t.utils.unixTimeToSlot(Number(datum.endTime));
  if (discoveryEndSlot > e.slot) {
    e.awaitSlot(discoveryEndSlot - e.slot);
  }
  while (e.slot <= discoveryEndSlot) {
    e.awaitSlot(100);
  }
};

export type GenWarehouse = Awaited<ReturnType<typeof genWarehouse>>;
export const genWarehouse = async (maxTxSize?: number) => {
  let outputIndex = 0;
  const minswapToken: BluePrintAsset = {
    policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
    assetName: "4d494e",
  };
  const minswapTokenRaw = toUnit(minswapToken.policyId, minswapToken.assetName);
  const adaToken: BluePrintAsset = {
    policyId: "",
    assetName: "",
  };
  const ACCOUNT_0 = await generateAccount({
    lovelace: 2000000000000000000n,
    [toUnit(minswapToken.policyId, minswapToken.assetName)]:
      69_000_000_000_000n,
  });
  let protocolParameters: ProtocolParameters = {
    ...T.PROTOCOL_PARAMETERS_DEFAULT,
    maxTxSize: maxTxSize ?? 36384,
  };
  const emulator = new T.Emulator([ACCOUNT_0], protocolParameters);
  let t = await T.Translucent.new(emulator);
  emulator.awaitBlock(10_000); // For validity ranges to be valid
  t.selectWalletFromPrivateKey(ACCOUNT_0.privateKey);
  const warehouseOptions = await genWarehouseOptions(t);

  // registerStake
  await quickSubmitBuilder(emulator)({
    txBuilder: t
      .newTx()
      .registerStake(
        t.utils.validatorToRewardAddress(
          warehouseOptions.validators.factoryValidator,
        ),
      ),
  });

  const defaultFactoryDatum: FactoryDatum = {
    head: LBE_INIT_FACTORY_HEAD,
    tail: LBE_INIT_FACTORY_TAIL,
  };
  let builder = new WarehouseBuilder(warehouseOptions);
  const defaultTreasuryDatum: TreasuryDatum = {
    factoryPolicyId: builder.factoryHash,
    sellerHash: builder.sellerHash,
    orderHash: builder.orderHash,
    managerHash: builder.managerHash,
    collectedFund: 0n,
    baseAsset: minswapToken,
    raiseAsset: adaToken,
    startTime: BigInt(t.utils.slotToUnixTime(emulator.slot + 60 * 60)),
    endTime: BigInt(t.utils.slotToUnixTime(emulator.slot + 60 * 60 * 24 * 5)),
    owner: address2PlutusAddress(ACCOUNT_0.address),
    receiver: address2PlutusAddress(ACCOUNT_0.address),
    receiverDatum: "RNoDatum",
    poolAllocation: 100n,
    minimumRaise: null,
    maximumRaise: null,
    reserveBase: 69000000000000n,
    reserveRaise: 0n,
    totalLiquidity: 0n,
    penaltyConfig: null,
    poolBaseFee: 30n,
    totalPenalty: 0n,
    isCancelled: false,
    minimumOrderRaise: null,
    isManagerCollected: false,
    revocable: false,
  };
  const defaultManagerDatum: ManagerDatum = {
    factoryPolicyId: builder.factoryHash,
    baseAsset: minswapToken,
    raiseAsset: adaToken,
    sellerCount: DEFAULT_NUMBER_SELLER,
    reserveRaise: 0n,
    totalPenalty: 0n,
  };
  const defaultSellerDatum: SellerDatum = {
    factoryPolicyId: builder.factoryHash,
    baseAsset: minswapToken,
    raiseAsset: adaToken,
    amount: 0n,
    penaltyAmount: 0n,
  };
  const defaultOrderDatum: OrderDatum = {
    factoryPolicyId: builder.factoryHash,
    baseAsset: minswapToken,
    raiseAsset: adaToken,
    owner: address2PlutusAddress(ACCOUNT_0.address),
    amount: 10_000_000n,
    isCollected: false,
    penaltyAmount: 0n,
  };

  let ammPoolDatum: AmmPoolDatum = {
    poolBatchingStakeCredential: {
      Inline: [
        {
          ScriptCredential: [
            t.utils.validatorToScriptHash(
              builder.ammValidators.poolBatchingValidator,
            ),
          ],
        },
      ],
    },
    assetA: adaToken,
    assetB: minswapToken,
    totalLiquidity: 0n,
    reserveA: 0n,
    reserveB: 0n,
    baseFeeANumerator: 30n,
    baseFeeBNumerator: 30n,
    feeSharingNumeratorOpt: null,
    allowDynamicFee: false,
  };
  let ammPoolInput: UTxO = {
    address: builder.ammPoolAddress,
    assets: {
      [builder.ammPoolToken]: 1n,
    },
    datum: builder.toDatumAmmPool(ammPoolDatum),
    txHash: "01".repeat(32),
    outputIndex: outputIndex++,
  };

  let findTreasuryInput = async (): Promise<UTxO> => {
    return (await emulator.getUtxos(builder.treasuryAddress)).find(
      (u) => !u.scriptRef,
    ) as UTxO;
  };

  let defaultManagerInput: UTxO = {
    txHash: "00".repeat(32),
    outputIndex: outputIndex++,
    assets: {
      [builder.managerToken]: 1n,
      lovelace: MANAGER_MIN_ADA,
    },
    address: builder.managerAddress,
    datum: builder.toDatumManager(defaultManagerDatum),
  };

  let defaultSellerInput: UTxO = {
    txHash: "00".repeat(32),
    outputIndex: outputIndex++,
    assets: {
      [builder.sellerToken]: 1n,
      lovelace: SELLER_MIN_ADA,
    },
    address: builder.sellerAddress,
    datum: builder.toDatumSeller(defaultSellerDatum),
  };

  let defaultOrderInput: UTxO = {
    txHash: "00".repeat(32),
    outputIndex: outputIndex++,
    assets: {
      [builder.orderToken]: 1n,
      lovelace: ORDER_MIN_ADA,
    },
    address: builder.orderAddress,
    datum: builder.toDatumOrder(defaultOrderDatum),
  };

  let defaultTreasuryInput: UTxO = {
    txHash: "00".repeat(32),
    outputIndex: outputIndex++,
    assets: {
      lovelace: TREASURY_MIN_ADA + CREATE_POOL_COMMISSION,
      [builder.treasuryToken]: 1n,
      [toUnit(
        defaultTreasuryDatum.baseAsset.policyId,
        defaultTreasuryDatum.baseAsset.assetName,
      )]: defaultTreasuryDatum.reserveBase,
    },
    address: builder.treasuryAddress,
    datum: builder.toDatumTreasury(defaultTreasuryDatum),
  };

  return {
    adaToken,
    emulator,
    minswapToken,
    minswapTokenRaw,
    t,
    warehouseOptions,
    defaultFactoryDatum,
    defaultTreasuryDatum,
    defaultManagerDatum,
    defaultSellerDatum,
    defaultOrderDatum,
    ammPoolInput,
    findTreasuryInput,
    ammPoolDatum,
    builder,
    outputIndex,
    defaultManagerInput,
    defaultSellerInput,
    defaultOrderInput,
    defaultTreasuryInput,
  };
};
