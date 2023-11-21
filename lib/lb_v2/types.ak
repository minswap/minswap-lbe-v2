use aiken/hash.{Blake2b_224, Hash}
use aiken/time.{PosixTime}
use aiken/transaction/credential.{Address, Script}
use aiken/transaction/value.{AssetName, PolicyId}

pub type ValidatorHash =
  Hash<Blake2b_224, Script>

pub type DepositRedeemer {
  Deposit
  Cancel
  Redeem
}

pub type TreasuryDatum {
  lbe_owner: Address,
  lbe_policy_id: PolicyId,
  lbe_asset_name: AssetName,
  start_time: PosixTime,
  end_time: PosixTime,
}

pub type TreasuryRedeemer {
  CreatePool
  RedeemADA
  RedeemLP
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
  MintAuthen
  MintRedeem
}
