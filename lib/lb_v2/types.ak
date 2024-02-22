use aiken/dict.{Dict}
use aiken/hash.{Blake2b_224, Blake2b_256, Hash}
use aiken/transaction/credential.{Address, Script}
use aiken/transaction/value.{AssetName, PolicyId, Value}

pub type ValidatorHash =
  Hash<Blake2b_224, Script>

pub type DatumMap =
  Dict<Hash<Blake2b_256, Data>, Data>

pub type Asset {
  policy_id: PolicyId,
  asset_name: AssetName,
}

pub type TreasuryDatum {
  base_asset: Asset,
  raise_asset: Asset,
  discovery_start_time: Int,
  discovery_end_time: Int,
  encounter_start_time: Int,
  owner: Address,
  minimum_raise: Option<Int>,
  maximum_raise: Option<Int>,
  order_hash: ValidatorHash,
  reserve_base: Int,
  reserve_raise: Int,
  total_liquidity: Int,
  is_cancel: Int,
  is_created_pool: Int,
}

pub type TreasuryRedeemer {
  UpdateLBE
  CreatePool
  Batching
  CancelLBE
}

pub type OrderStep {
  Deposit
  RedeemRaiseAsset
  RedeemLP
}

pub type OrderDatum {
  owner: Address,
  lp_asset_name: AssetName,
  expect_output_asset: Asset,
  minimum_receive: Int,
  step: OrderStep,
}

pub type OrderRedeemer {
  ApplyOrder
  CancelOrder
}

pub type OrderBatchingRedeemer {
  // it's used for finding Pool Input faster
  treasury_input_index: Int,
}

pub type AuthenRedeemer {
  MintFactoryAuthen
  CreateTreasury
}

pub type FactoryDatum {
  head: ByteArray,
  tail: ByteArray,
}

pub type FactoryRedeemer {
  base_asset: Asset,
  raise_asset: Asset,
}

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
  order_hash: ValidatorHash,
  profit_sharing_opt: Option<ProfitSharing>,
}

// Datum Reserve Raise Asset
// Value Reserve Raise Asset
// Datum Total Liquidity
// Value Total Liquidity
pub type TreasuryState =
  (Int, Int, Int, Int)

pub type ApplyOrderData {
  raise_asset_policy_id: PolicyId,
  raise_asset_name: AssetName,
  authen_policy_id: PolicyId,
  lp_asset_name: AssetName,
  amm_authen_policy_id: PolicyId,
}

pub type ApplyOrderParams {
  in_value: Value,
  out_value: Value,
  expect_output_asset: Asset,
  minimum_receive: Int,
  treasury_state: TreasuryState,
  data: ApplyOrderData,
}
