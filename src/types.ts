import * as T from "@minswap/translucent";
import type {
  FactoryValidateFactory,
  FactoryValidateFactoryMinting,
  FeedTypeOrder,
  ManagerValidateManagerSpending,
  SellerValidateSellerSpending,
  TreasuryValidateTreasurySpending,
} from "../plutus";

export type Assets = T.Assets;
export type PrivateKey = T.PrivateKey;
export type Emulator = T.Emulator;
export type Tx = T.Tx;
export type Translucent = T.Translucent;
export type OutRef = T.OutRef;
export type UTxO = T.UTxO;
export type ScriptRef = T.ScriptRef;
export type Script = T.Script;
export type Address = T.Address;
export type RewardAddress = T.RewardAddress;
export type OutputData = T.OutputData;
export type UnixTime = T.UnixTime;
export type Network = T.Network;
export type Provider = T.Provider;
export type BluePrintAsset = { policyId: string; assetName: string };

export type FactoryDatum = FactoryValidateFactory["datum"];
export type ManagerDatum = ManagerValidateManagerSpending["managerInDatum"];
export type OrderDatum = FeedTypeOrder["_datum"];
export type SellerDatum = SellerValidateSellerSpending["sellerInDatum"];
export type TreasuryDatum = TreasuryValidateTreasurySpending["treasuryInDatum"];

export type FactoryRedeemer = FactoryValidateFactory["redeemer"];
export type ManagerRedeemer = ManagerValidateManagerSpending["redeemer"];
export type MintRedeemer = FactoryValidateFactoryMinting["redeemer"];
export type OrderRedeemer = FeedTypeOrder["_redeemer"];
export type SellerRedeemer = SellerValidateSellerSpending["redeemer"];
export type TreasuryRedeemer = TreasuryValidateTreasurySpending["redeemer"];
