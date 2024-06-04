import * as T from "@minswap/translucent";
import {
  DEFAULT_NUMBER_SELLER,
  LBE_INIT_FACTORY_HEAD,
  LBE_INIT_FACTORY_TAIL,
} from "../constants";
import type {
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
import { genWarehouseOptions, generateAccount } from "./utils";

export const skipToCountingPhase = (options: {
  t: Translucent;
  e: Emulator;
  datum: TreasuryDatum;
}) => {
  const { t, e, datum } = options;
  const discoveryEndSlot = t.utils.unixTimeToSlot(Number(datum.endTime));
  while (e.slot <= discoveryEndSlot) {
    e.awaitBlock(100);
  }
};

export const genWarehouse = async () => {
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
    maxTxSize: 36384,
  };
  const emulator = new T.Emulator([ACCOUNT_0], protocolParameters);
  let t = await T.Translucent.new(emulator);
  emulator.awaitBlock(10_000); // For validity ranges to be valid
  t.selectWalletFromPrivateKey(ACCOUNT_0.privateKey);
  const warehouseOptions = await genWarehouseOptions(t);

  const defaultFactoryDatum: FactoryDatum = {
    head: LBE_INIT_FACTORY_HEAD,
    tail: LBE_INIT_FACTORY_TAIL,
  };
  let validators = warehouseOptions.validators;
  const defaultTreasuryDatum: TreasuryDatum = {
    factoryPolicyId: t.utils.validatorToScriptHash(validators.factoryValidator),
    sellerHash: t.utils.validatorToScriptHash(validators.sellerValidator),
    orderHash: t.utils.validatorToScriptHash(validators.orderValidator),
    managerHash: t.utils.validatorToScriptHash(validators.managerValidator),
    collectedFund: 0n,
    baseAsset: minswapToken,
    raiseAsset: adaToken,
    startTime: BigInt(t.utils.slotToUnixTime(emulator.slot + 60 * 60)),
    endTime: BigInt(t.utils.slotToUnixTime(emulator.slot + 60 * 60 * 24 * 5)),
    owner: address2PlutusAddress(ACCOUNT_0.address),
    minimumRaise: null,
    maximumRaise: null,
    reserveBase: 69000000000000n,
    reserveRaise: 0n,
    totalLiquidity: 0n,
    penaltyConfig: null,
    totalPenalty: 0n,
    isCancelled: false,
    minimumOrderRaise: null,
    isManagerCollected: false,
    isCancelable: false,
  };
  const defaultManagerDatum: ManagerDatum = {
    factoryPolicyId: t.utils.validatorToScriptHash(validators.factoryValidator),
    orderHash: t.utils.validatorToScriptHash(validators.orderValidator),
    sellerHash: t.utils.validatorToScriptHash(validators.sellerValidator),
    baseAsset: minswapToken,
    raiseAsset: adaToken,
    sellerCount: DEFAULT_NUMBER_SELLER,
    reserveRaise: 0n,
    totalPenalty: 0n,
  };
  const defaultSellerDatum: SellerDatum = {
    factoryPolicyId: t.utils.validatorToScriptHash(validators.factoryValidator),
    baseAsset: minswapToken,
    raiseAsset: adaToken,
    amount: 0n,
    penaltyAmount: 0n,
  };
  const defaultOrderDatum: OrderDatum = {
    factoryPolicyId: t.utils.validatorToScriptHash(validators.factoryValidator),
    baseAsset: minswapToken,
    raiseAsset: adaToken,
    owner: address2PlutusAddress(ACCOUNT_0.address),
    amount: 10_000_000n,
    isCollected: false,
    penaltyAmount: 0n,
  };

  let findTreasuryInput = async (): Promise<UTxO> => {
    return (
      await emulator.getUtxos(
        t.utils.validatorToAddress(validators.treasuryValidator),
      )
    ).find((u) => !u.scriptRef) as UTxO;
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
    findTreasuryInput,
  };
};
