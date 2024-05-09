use aiken/dict.{Dict}
use aiken/hash.{Blake2b_224, Blake2b_256, Hash}
use aiken/transaction/credential.{Address, Script}
use aiken/transaction/value.{AssetName, PolicyId}

pub type ValidatorHash =
  Hash<Blake2b_224, Script>

pub type DatumMap =
  Dict<Hash<Blake2b_256, Data>, Data>

pub type Asset {
  policy_id: PolicyId,
  asset_name: AssetName,
}

pub type FactoryStep {
  CreateTreasury
  RemoveTreasury
}

pub type AuthenRedeemer {
  MintFactory
  MintTreasury { step: FactoryStep }
}

pub type FactoryDatum {
  head: ByteArray,
  tail: ByteArray,
}

pub type FactoryRedeemer {
  base_asset: Asset,
  raise_asset: Asset,
  step: FactoryStep,
}

pub type TreasuryStatus {
  Living
  Counting
  Redeeming
  Canceled
}

pub type PenaltyConfig {
  penalty_start_time: Int,
  penalty_end_time: Int,
  percent: Int,
}

pub type TreasuryDatum {
  // Protocol Info
  seller_hash: ValidatorHash,
  order_hash: ValidatorHash,
  seller_count: Int,
  status: TreasuryStatus,
  // LBE details
  base_asset: Asset,
  raise_asset: Asset,
  discovery_start_time: Int,
  discovery_end_time: Int,
  owner: Address,
  minimum_raise: Option<Int>,
  maximum_raise: Option<Int>,
  reserve_base: Int,
  reserve_raise: Int,
  total_liquidity: Int,
  penalty_config: Option<PenaltyConfig>,
  total_penalty: Int,
}

pub type TreasurySpendingRedeemer {
  CreateSeller
  CollectSeller
  CollectOrder
  CreateAMMPool
  RedeemLP
}

pub type SellerTokenMintingRedeemer {
  SellerMintingCreateLBE
  SellerMintingCreateSeller
  SellerMintingCollectSeller
}

pub type SellerDatum {
  lbe_id: ByteArray,
  total_fund: Int,
  total_penalty: Int,
}

pub type SellerRedeemer {
  DepositOrders
  EditOrders
  ApplySeller
}

pub type OrderTokenMintingRedeemer {
  OrderMintingDepositOrders
  OrderMintingEditOrders
  OrderMintingRedeemLP
}

pub type OrderDatum {
  owner: Address,
  amount: Int,
  lbe_id: ByteArray,
  is_collected: Bool,
  penalty_amount: Int,
}

pub type OrderRedeemer {
  CancelOrder
  OrderCollectADA
  OrderRedeemLP
}
