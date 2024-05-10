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

pub type MintSellerStep {
  InitTreasury
  CreateSeller { amount: Int }
  RemoveSeller { amount: Int }
}

pub type TreasuryRedeemer {
  MintSeller { step: MintSellerStep }
  // Spending Seller for Counting Phase
  SpendSeller
  // Spending Order for Counting | Encounter Phase (after spent all Seller)
  SpendOrder
  // Spending Treasury to create AMM Pool or return values to project's owner
  SpendTreasury
}

pub type SellerTokenMintingRedeemer {
  SellerMintingCreateLBE
  SellerMintingCreateSeller
  SellerMintingCollectSeller
}

pub type SellerDatum {
  base_asset: Asset,
  raise_asset: Asset,
  amount: Int,
  penalty_amount: Int,
}

pub type SellerRedeemer {
  SpendDeposit { amount: Int }
  SpendWithdraw { amount: Int }
  SpendCounting
  MintDeposit
  MintWithdrawAll
  MintCounting
}

pub type OrderTokenMintingRedeemer {
  OrderMintingDepositOrders
  OrderMintingEditOrders
  OrderMintingRedeemLP
}

pub type OrderDatum {
  base_asset: Asset,
  raise_asset: Asset,
  owner: Address,
  amount: Int,
  is_collected: Bool,
  penalty_amount: Int,
}

pub type OrderRedeemer {
  WithdrawOrder
  CollectOrder
  RedeemOrder
}
