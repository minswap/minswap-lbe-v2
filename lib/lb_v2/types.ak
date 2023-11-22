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
  lbe_owner: Address,
  lbe_policy_id: PolicyId,
  lbe_asset_name: AssetName,
  start_time: PosixTime,
  end_time: PosixTime,
  order_hash: ValidatorHash,
}

pub type TreasuryRedeemer {
  CreatePool
  Batching
}

pub type OrderDatum {
  owner: Address,
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
  lbe_asset: Asset,
}
