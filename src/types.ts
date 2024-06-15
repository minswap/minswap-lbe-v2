import * as T from "@minswap/translucent";
import type {
  FactoryValidateFactory,
  FactoryValidateFactoryMinting,
  FeedTypeAmmPool,
  ManagerValidateManagerSpending,
  OrderValidateOrder,
  SellerValidateSellerSpending,
  TreasuryValidateTreasurySpending,
} from "../plutus";

export type Address = T.Address;
export type Assets = T.Assets;
export type BluePrintAsset = { policyId: string; assetName: string };
export type Datum = T.Datum;
export type Emulator = T.Emulator;
export type Network = T.Network;
export type OutputData = T.OutputData;
export type OutRef = T.OutRef;
export type PolicyId = T.PolicyId;
export type PrivateKey = T.PrivateKey;
export type ProtocolParameters = T.ProtocolParameters;
export type Provider = T.Provider;
export type RewardAddress = T.RewardAddress;
export type Script = T.Script;
export type ScriptRef = T.ScriptRef;
export type Translucent = T.Translucent;
export type Tx = T.Tx;
export type Unit = T.Unit;
export type UnixTime = T.UnixTime;
export type UTxO = T.UTxO;

export type AmmPoolDatum = FeedTypeAmmPool["_datum"];
export type FactoryDatum = FactoryValidateFactory["datum"];
export type ManagerDatum = ManagerValidateManagerSpending["managerInDatum"];
export type OrderDatum = OrderValidateOrder["datum"];
export type SellerDatum = SellerValidateSellerSpending["sellerInDatum"];
export type TreasuryDatum = TreasuryValidateTreasurySpending["treasuryInDatum"];

export type FactoryRedeemer = FactoryValidateFactory["redeemer"];
export type ManagerRedeemer = ManagerValidateManagerSpending["redeemer"];
export type MintRedeemer = FactoryValidateFactoryMinting["redeemer"];
export type OrderRedeemer = OrderValidateOrder["redeemer"];
export type SellerRedeemer = SellerValidateSellerSpending["redeemer"];
export type TreasuryRedeemer = TreasuryValidateTreasurySpending["redeemer"];
