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
  asset_a: Asset,
  asset_b: Asset,
  reserve_a: Int,
  reserve_b: Int,
  lbe_owner: Address,
  start_time: PosixTime,
  end_time: PosixTime,
  create_pool_time: PosixTime,
  order_hash: ValidatorHash,
  total_liquidity: Int,
  lp_asset: Asset,
}

pub type TreasuryRedeemer {
  CreatePool
  Batching
}

pub type OrderDatum {
  sender: Address,
  receiver: Address,
  output_asset: Asset,
  minimum_receive: Int,
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
