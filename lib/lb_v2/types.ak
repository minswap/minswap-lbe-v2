use aiken/dict.{Dict}
use aiken/hash.{Blake2b_224, Blake2b_256, Hash}
use aiken/transaction/credential.{
  Address, Script, StakeCredential, VerificationKey,
}
use aiken/transaction/value.{AssetName, PolicyId}

pub type CustomDatumHash =
  Hash<Blake2b_256, Data>

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

pub type FactoryDatum {
  head: ByteArray,
  tail: ByteArray,
}

pub type FactoryRedeemer {
  Initialization
  CreateTreasury { base_asset: Asset, raise_asset: Asset }
  CloseTreasury { base_asset: Asset, raise_asset: Asset }
  MintManager
  MintSeller
  BurnSeller
  MintOrder
  MintRedeemOrders
  // Withdrawal 
  ManageOrder
}

pub type PenaltyConfig {
  penalty_start_time: Int,
  penalty_numerator: Int,
}

pub type ReceiverDatum {
  RNoDatum
  RDatumHash { hash: CustomDatumHash }
  RInlineDatum { hash: CustomDatumHash }
}

pub type TreasuryDatum {
  // Protocol Info:
  // ValidatorHash of Factory Validator 
  factory_policy_id: PolicyId,
  // ValidatorHash of Manager Validator
  manager_hash: ValidatorHash,
  // ValidatorHash of Seller Validator
  seller_hash: ValidatorHash,
  // ValidatorHash of Order Validator
  order_hash: ValidatorHash,
  // --------------------------------
  // LBE Parameters
  // Asset aims to list
  base_asset: Asset,
  // Asset aims to raise
  raise_asset: Asset,
  // The start time of discovery phase
  start_time: Int,
  // The end time of discovery phase
  end_time: Int,
  // Project Owner Address
  owner: Address,
  // Address for receiving the project's LP tokens.
  receiver: Address,
  // The Datum of the receiver's output
  receiver_datum: ReceiverDatum,
  // The rule defines how many funds will go to pool
  pool_allocation: Int,
  // Minimum amount in a order.
  minimum_order_raise: Option<Int>,
  // The minimum amount expected to raise.
  // If raised amount less than this threshold, the LBE will be cancelled.
  minimum_raise: Option<Int>,
  // The maximum amount expected to raise.
  // If raised amount exceed this threadhold, \
  //   the excess amount should be returned to the users.
  maximum_raise: Option<Int>,
  // Amont of Base Asset use to create Pool.
  reserve_base: Int,
  penalty_config: Option<PenaltyConfig>,
  // POOL DATUM
  // - asset_a, asset_b, reserve_a, reserve_b will be validated by treasury depend \
  //    how much fund it raise and treasury config
  // - pool_batching_stake_credential, total_liquidity, fee_sharing_numerator_opt, allow_dynamic_fee will be validated by AMM Factory. 
  // =>  we just need 1 base_fee for base_fee_a_numerator and base_fee_b_numerator because AMM Factory will validate 2 base fee must be the same.
  pool_base_fee: Int,
  // Indicates whether project's owner can cancel LBE during discovery phase.
  revocable: Bool,
  // --------------------------------
  // Treasury State:
  // Total fund accumulate by collecting orders (amount, penalty).
  // It increases when collect orders, descreases when redeem LP or refund
  collected_fund: Int,
  // Total Order Amount. Increasing when collect orders.
  reserve_raise: Int,
  // Total Order's penalty amount. Increasing when collect orders.
  total_penalty: Int,
  // Amount LP Tokens will distribute to users.
  total_liquidity: Int,
  // Indicates whether the LBE has cancelled.
  is_cancelled: Bool,
  // Indicates whether the manager has collected  
  is_manager_collected: Bool,
}

pub type CancelReason {
  CreatedPool
  ByOwner
  NotReachMinimum
}

pub type TreasuryRedeemer {
  // collect manager to update reserve_raise and total_penalty
  CollectManager
  // collect amount, penalty_amount from orders
  CollectOrders
  // Create AMM Pool
  CreateAmmPool
  // redeem LP Tokens or refund if cancel
  RedeemOrders
  // Close event when LBE is cancelled and finished couting, refund.
  CloseEvent
  // Cancel the LBE base on reason
  CancelLBE { reason: CancelReason }
  // update LBE Parameters before discovery phase
  UpdateLBE
}

pub type ManagerDatum {
  factory_policy_id: PolicyId,
  base_asset: Asset,
  raise_asset: Asset,
  seller_count: Int,
  reserve_raise: Int,
  total_penalty: Int,
}

pub type ManagerRedeemer {
  AddSellers
  CollectSellers
  SpendManager
}

pub type SellerDatum {
  // ValidatorHash of Factory Validator
  factory_policy_id: PolicyId,
  // Fee will be return to seller's owner (PubKey Address)
  owner: Address,
  // Asset aims to list
  base_asset: Asset,
  // Asset aims to raise
  raise_asset: Asset,
  // Total amount this seller manage. It can be negative
  amount: Int,
  // Total penalty amount this seller manage. It can be negative
  penalty_amount: Int,
}

pub type SellerRedeemer {
  // use a seller for create | update orders
  UsingSeller
  // Collect Seller UTxOs
  CountingSeller
}

pub type OrderDatum {
  // ValidatorHash of Factory Validator
  factory_policy_id: PolicyId,
  // Asset aims to list
  base_asset: Asset,
  // Asset aims to raise
  raise_asset: Asset,
  // Update order require owner authorize 
  // System will redeem | refund to owner address (should be Pubkey Address)
  owner: Address,
  // Amount of Raise Asset
  amount: Int,
  // Default is False. Become True after Order is collected by Treasury
  is_collected: Bool,
  // Amout of Raise Asset being penalty.
  // Default is zero.
  penalty_amount: Int,
}

pub type OrderRedeemer {
  // Update Order Amount 
  UpdateOrder
  CollectOrder
  RedeemOrder
}

// AMM TYPE

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

pub type AmmFactoryDatum {
  head: ByteArray,
  tail: ByteArray,
}
