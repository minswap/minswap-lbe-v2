use aiken/dict.{Dict}
use aiken/hash.{Blake2b_224, Blake2b_256, Hash}
use aiken/transaction/credential.{Address, Script, VerificationKey}
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

pub type AuthenRedeemer {
  Initialization
  // check factory exist in inputs
  UsingFactory
}

pub type FactoryDatum {
  head: ByteArray,
  tail: ByteArray,
}

pub type FactoryRedeemer {
  base_asset: Asset,
  raise_asset: Asset,
}

pub type PenaltyConfig {
  penalty_start_time: Int,
  penalty_end_time: Int,
  percent: Int,
}

pub type TreasuryDatum {
  // Protocol Info
  manager_hash: ValidatorHash,
  seller_hash: ValidatorHash,
  order_hash: ValidatorHash,
  // increase when collect orders, descrease when collect LP or refund
  collected_fund: Int,
  // LBE details
  base_asset: Asset,
  raise_asset: Asset,
  start_time: Int,
  end_time: Int,
  owner: Address,
  minimum_order_raise: Option<Int>,
  minimum_raise: Option<Int>,
  // added when collect manager once, descrease when refund
  maximum_raise: Option<Int>,
  reserve_base: Int,
  reserve_raise: Int,
  total_liquidity: Int,
  penalty_config: Option<PenaltyConfig>,
  // added when collect manager once, descrease when refund
  total_penalty: Int,
  is_cancelled: Bool,
  is_manager_collected: Bool,
}

pub type TreasuryRedeemer {
  // collect manager to update reserve_raise and total_penalty
  // or collect when cancelled
  CollectManager
  // collect fund from orders
  CollectOrders
  // create pool
  CreateAmmPool
  // redeem LP or refund if cancel
  RedeemOrders
  // Close event after refund by cancel or close LBE before discovery phase
  CloseEvent
  // change status to cancel 
  // If Not enough fund 
  //    or pool created 
  // =>next step: CollectManager -> RedeemOrders(refund)
  CancelLBE
  // update LBE before discovery phase
  UpdateLBE
}

pub type ManagerDatum {
  order_hash: ValidatorHash,
  seller_hash: ValidatorHash,
  base_asset: Asset,
  raise_asset: Asset,
  seller_count: Int,
  reserve_raise: Int,
  total_penalty: Int,
}

pub type ManagerRedeemer {
  // ManageSeller = AddSeller | CollectSeller 
  // depend the time range
  //    - AddSeller before end discovery
  //    - CollectSeller after end discovery
  ManageSeller
  SpendManager
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
  CollectOrder
  RedeemOrder
}

// AMM TYPE
// Profit Sharing Numerator & Denominator
pub type ProfitSharing =
  (Int, Int)

pub type PoolDatum {
  asset_a: Asset,
  asset_b: Asset,
  total_liquidity: Int,
  reserve_a: Int,
  reserve_b: Int,
  trading_fee_numerator: Int,
  trading_fee_denominator: Int,
  profit_sharing_opt: Option<ProfitSharing>,
}
