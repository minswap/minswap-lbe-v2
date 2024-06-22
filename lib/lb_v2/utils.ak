use aiken/builtin
use aiken/bytearray
use aiken/hash
use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/transaction.{ValidityRange}
use aiken/transaction/value.{AssetName, PolicyId}
use lb_v2/types.{Asset, PenaltyConfig}

// The Asset Name of Factory Authen Token
pub const factory_auth_an = #"666163746f7279"

// The Asset Name of Treasury Authen Token
pub const treasury_auth_an = #"7472656173757279"

// The Asset Name of Seller Authen Token
pub const seller_auth_an = #"73656c6c6572"

// The Asset Name of Order Authen Token
pub const order_auth_an = #"6f72646572"

// The Asset Name of Manager Authen Token
pub const manager_auth_an = #"4d616e61676572"

// The minimum number of Sellers to set up when starting a new LBE
pub const minimum_number_seller = 10

pub const minimum_seller_collected = 20

pub const minimum_order_collected = 30

pub const minimum_order_redeemed = 30

pub const collect_seller_commision = 2_000_000

pub const collect_order_commision = 2_000_000

pub const redeem_order_commision = 2_000_000

// The minimum percentage of total funds will go to pool
pub const min_pool_allocation = 70

// 2 days in milliseconds = 2 * 24 * 60 * 60 * 1000
// The business requires a maximum penalty period of two final days.
pub const two_day_ms = 172800000

// Maximum penalty rate based on business
pub const max_penalty = 25

// The ADA amount to reward the Operator
pub const fee_ada = 1_000_000

pub const utxo_minimum_ada = 1_000_000

// the ADA amount store in Treasury UTxO
pub const treasury_minimum_ada = 3_000_000

// the ADA amount store in Manager UTxO
pub const manager_minimum_ada = 2_000_000

// the ADA amount store in Seller UTxO
pub const seller_minimum_ada = 2_000_000

// the ADA amount store in Order UTxO
pub const order_minimum_ada = 2_000_000

// The ADA amount to reward the pool creator
pub const create_pool_comission = 10_000_000

// The AMM configs based on https://github.com/minswap/minswap-dex-v2
// The Asset Name of AMM Factory Authen Token
pub const amm_factory_auth_asset_name = #"4d5346"

// The Asset Name of AMM Pool Authen Token 
pub const amm_pool_auth_asset_name = #"4d5350"

// The PolicyID of AMM Authen Minting Policy  
pub const amm_authen_policy_id =
  #"d6aae2059baee188f74917493cf7637e679cd219bdfbbf4dcbeb1d0b"

// The ValidatorHash of AMM Pool Validator
pub const amm_pool_validation_hash =
  #"d6ba9b7509eac866288ff5072d2a18205ac56f744bc82dcd808cb8fe"

// Some LP Tokens will be burned during Pool Creation.
pub const default_burn_liquidity = 10

// The base fee must be between 5 and 2000
// Minimum Base Fee
pub const min_base_fee_numerator = 5

// Maximum Base Fee
pub const max_base_fee_numerator = 2000

// sort 2 assets in bytearray ascending
pub fn sort_two_assets(asset_a: Asset, asset_b: Asset) -> (Asset, Asset) {
  let Asset { policy_id: asset_a_policy_id, asset_name: asset_a_asset_name } =
    asset_a
  let Asset { policy_id: asset_b_policy_id, asset_name: asset_b_asset_name } =
    asset_b
  if asset_a_policy_id == asset_b_policy_id {
    if builtin.less_than_bytearray(asset_a_asset_name, asset_b_asset_name) {
      (asset_a, asset_b)
    } else {
      (asset_b, asset_a)
    }
  } else {
    if builtin.less_than_bytearray(asset_a_policy_id, asset_b_policy_id) {
      (asset_a, asset_b)
    } else {
      (asset_b, asset_a)
    }
  }
}

// compute from asset_a, asset_b to get AMM LP Asset Name
pub fn compute_lp_asset_name(
  asset_a_policy_id: PolicyId,
  asset_a_asset_name: AssetName,
  asset_b_policy_id: PolicyId,
  asset_b_asset_name: AssetName,
) -> AssetName {
  let asset_a_ident =
    hash.sha3_256(bytearray.concat(asset_a_policy_id, asset_a_asset_name))
  let asset_b_ident =
    hash.sha3_256(bytearray.concat(asset_b_policy_id, asset_b_asset_name))
  let pair_ident = bytearray.concat(asset_a_ident, asset_b_ident)
  hash.sha3_256(pair_ident)
}

pub fn calculate_penalty(
  penalty_config: Option<PenaltyConfig>,
  end_valid_time_range: Int,
  total_input_amount: Int,
  total_output_amount: Int,
) -> Int {
  when penalty_config is {
    None -> 0
    Some(PenaltyConfig { penalty_start_time, percent }) ->
      if end_valid_time_range < penalty_start_time {
        // not in penalty time
        0
      } else {
        if total_input_amount > total_output_amount {
          // withdrawal amount of this Tx
          let withdrawal_amount = total_input_amount - total_output_amount
          // calculate penalty
          withdrawal_amount * percent / 100
        } else {
          0
        }
      }
  }
}

// Return LP Asset Name from `base_asset`, `raise_asset`
pub fn compute_asset_name_from_base_and_raise(
  base_asset: Asset,
  raise_asset: Asset,
) -> AssetName {
  let (asset_a, asset_b) = sort_two_assets(base_asset, raise_asset)
  let Asset { policy_id: asset_a_policy_id, asset_name: asset_a_asset_name } =
    asset_a
  let Asset { policy_id: asset_b_policy_id, asset_name: asset_b_asset_name } =
    asset_b
  compute_lp_asset_name(
    asset_a_policy_id,
    asset_a_asset_name,
    asset_b_policy_id,
    asset_b_asset_name,
  )
}

// Input: 2 consecutive Factory Linked List Node
// Output: return sorted [Previous, Next] Node of Linked List
// Example:
// datum_a (Previous Node): FactoryDatum { head: #"0000", tail: #"00ff" }
// datum_b (Next Node)    : FactoryDatum { head: #"00ff", tail: #"ffff" }
// => datum_a equivalent 121([h'0000', h'00FF']) or #"d8799f4200004200ffff"
// => datum_b equivalent 121([h'00FF', h'FFFF']) or #"d8799f4200ff42ffffff"
pub fn sort_two_consecutive_factory_datum(
  datum_a: Data,
  datum_b: Data,
) -> (Data, Data) {
  let data_a = builtin.serialise_data(datum_a)
  let data_b = builtin.serialise_data(datum_b)
  if builtin.less_than_bytearray(data_a, data_b) {
    (datum_a, datum_b)
  } else {
    (datum_b, datum_a)
  }
}

// If Validator support 2 purposes: Spend, Mint
//  Then redeemer of spend-validate is wrapper-type data.
// This function return Wrapper type of redeemer
pub fn make_wrapper_redeemer(redeemer: Data) -> Data {
  builtin.constr_data(1, [redeemer])
}

// If `bool` is False then throw error `str`
pub fn assert(bool: Bool, str: String) {
  when bool is {
    True -> True
    False -> fail str
  }
}

pub fn must_get_start_end_validity(validity_range: ValidityRange) -> (Int, Int) {
  expect Interval {
    lower_bound: IntervalBound { bound_type: Finite(start), .. },
    upper_bound: IntervalBound { bound_type: Finite(end), .. },
  } = validity_range
  (start, end)
}

pub fn must_get_end_validity(validity_range: ValidityRange) -> Int {
  expect Interval {
    upper_bound: IntervalBound { bound_type: Finite(end), .. },
    ..
  } = validity_range
  end
}
