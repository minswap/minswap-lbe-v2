use aiken/dict.{Dict}
use aiken/hash.{Blake2b_224, Blake2b_256, Hash}
use aiken/time.{PosixTime}
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

pub type TreasuryDatum {
  raise_asset: Asset,
  asset_a: Asset,
  asset_b: Asset,
  lbe_owner: Address,
  start_time: PosixTime,
  end_time: PosixTime,
  create_pool_time: PosixTime,
  order_hash: ValidatorHash,
  lp_asset_name: AssetName,
  reserve_a: Int,
  reserve_b: Int,
  total_liquidity: Int,
}

pub type TreasuryRedeemer {
  CreatePool
  Batching
}

pub type OrderStep {
  Deposit
  RedeemRaiseAsset
  RedeemLP
}

pub type OrderDatum {
  owner: Address,
  expect_output_asset: Asset,
  minimum_receive: Int,
  step: OrderStep,
}

pub type OrderRedeemer {
  ApplyOrder
  CancelOrder
}

pub type OrderBatchingRedeemer {
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
  asset_a: Asset,
  asset_b: Asset,
}

pub type AmmPoolDatum {
  asset_a: Asset,
  asset_b: Asset,
  reserve_a: Int,
  reserve_b: Int,
  total_liquidity: Int,
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
