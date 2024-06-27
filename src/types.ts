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
import type { FactoryValidatorValidateFactory } from "../amm-plutus";

export type Address = T.Address;
export type Assets = T.Assets;
export type BluePrintAsset = { policyId: string; assetName: string };
export type Credential = T.Credential;
export type CTransactionHash = T.CTransactionHash;
export type CTransactionOutput = T.CTransactionOutput;
export type CTransactionOutputs = T.CTransactionOutputs;
export type CTransactionUnspentOutputs = T.CTransactionUnspentOutputs;
export type Datum = T.Datum;
export type Emulator = T.Emulator;
export type Maestro = T.Maestro;
export type MaestroSupportedNetworks = T.MaestroSupportedNetworks;
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
export type TxSigned = T.TxSigned;
export type Unit = T.Unit;
export type UnixTime = T.UnixTime;
export type UTxO = T.UTxO;
export type walletApi = T.WalletApi;

export type AmmPoolDatum = FeedTypeAmmPool["_datum"];
export type AmmFactoryDatum = FactoryValidatorValidateFactory["datum"];
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

export type LbeScript = {
  factoryRefInput: string;
  treasuryRefInput: string;
  managerRefInput: string;
  sellerRefInput: string;
  orderRefInput: string;

  factoryAddress: string;
  treasuryAddress: string;
  managerAddress: string;
  sellerAddress: string;
  orderAddress: string;

  factoryHash: string;
  treasuryHash: string;
  managerHash: string;
  sellerHash: string;
  orderHash: string;

  seedOutRef: OutRef;
  factoryOutRef: OutRef;
  treasuryOutRef: OutRef;
  managerOutRef: OutRef;
  sellerOutRef: OutRef;
  orderOutRef: OutRef;

  // Minswap AMM
  ammAuthenRefInput: string;
  ammFactoryRefInput: string;
  ammPoolRefInput: string;

  ammAuthenHash: string;
  ammFactoryHash: string;
  ammPoolHash: string;
  ammPoolBatchingHash: string;
  ammSeedOutRef: OutRef;
  ammPoolStakeCredential: Credential;
};

export type LbeId = {
  baseAsset: BluePrintAsset;
  raiseAsset: BluePrintAsset;
};
