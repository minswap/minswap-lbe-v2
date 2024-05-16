use aiken/dict.{Dict}
use aiken/hash.{Blake2b_224, Blake2b_256, Hash}
use aiken/transaction/credential.{
  Address, Script, StakeCredential, VerificationKey,
}
use aiken/transaction/value.{AssetName, PolicyId}

pub type ValidatorHash =
  Hash<Blake2b_224, Script>

pub type DatumMap =
  Dict<Hash<Blake2b_256, Data>, Data>

pub type PubKeyHash =
  Hash<Blake2b_224, VerificationKey>

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
  // increase when collect orders, descrease when collect LP or refund
  collected_fund: Int,
  // LBE details
  base_asset: Asset,
  raise_asset: Asset,
  start_time: Int,
  end_time: Int,
  owner: Address,
  minimum_raise: Option<Int>,
  // added when collect seller
  maximum_raise: Option<Int>,
  reserve_base: Int,
  reserve_raise: Int,
  total_liquidity: Int,
  penalty_config: Option<PenaltyConfig>,
  // added when collect seller
  total_penalty: Int,
  // status: just support CancelLBE
  is_cancelled: Bool,
}

pub type CancelLBEReason {
  ExistedPool
  NotReachMinimumRaise
}

pub type TreasuryRedeemer {
  // Normal flow
  InitTreasury
  AddSeller
  CollectSeller { amount: Int }
  CollectOrders
  CreateAmmPool
  RedeemLP
  CloseEvent
  // Cancel flow
  // ... -> CollectOrders -> CancelLBE(less than minimum raise or pool is created) change is_cancelled to True -> Refund -> CloseEvent
  CancelLBE { reason: CancelLBEReason }
  Refund
}

pub type SellerDatum {
  base_asset: Asset,
  raise_asset: Asset,
  amount: Int,
  penalty_amount: Int,
}

pub type SellerRedeemer {
  UsingSeller
  CountingSeller
  CollectOrderToken
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
  UpdateOrder
  WithdrawOrder
  CollectOrder
  RedeemOrder
}

pub type PoolDatum {
  pool_batching_stake_credential: StakeCredential,
  asset_a: Asset,
  asset_b: Asset,
  total_liquidity: Int,
  reserve_a: Int,
  reserve_b: Int,
  base_fee_a_numerator: Int,
  base_fee_b_numerator: Int,
  fee_sharing_numerator_opt: Option<Int>,
  allow_dynamic_fee: Bool,
}
