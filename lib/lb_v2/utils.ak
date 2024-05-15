use aiken/builtin
use aiken/bytearray
use aiken/hash
use aiken/transaction/value.{
  AssetName, PolicyId, Value, ada_asset_name, ada_policy_id,
}
use lb_v2/types.{Asset, PenaltyConfig}

pub const factory_auth_an = #"666163746f7279"

pub const treasury_auth_an = #"7472656173757279"

pub const seller_auth_an = #"73656c6c6572"

pub const order_auth_an = #"6f72646572"

pub const default_number_seller = 20

/// IMPORTANT: This block is code-gen. Please do not edit!
/// *******************************************
pub const amm_pool_auth_asset_name = #"4d5350"

pub const amm_authen_policy_id =
  #"4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70"

pub const amm_pool_validation_hash =
  #"295cd9f0691f9a09c13e38b475142042edbd78680af336a5c3e4afcb"

pub const default_burn_liquidity = 10

/// *******************************************
pub const minimum_ada = 3_000_000

pub const fee_ada = 1_000_000

pub const penalty_fee = 2_000_000

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

pub fn get_order_value(
  amount: Int,
  penalty_amount: Int,
  seller_policy_id: PolicyId,
  raise_asset: Asset,
) -> Value {
  let base_ada = minimum_ada + fee_ada * 2
  value.zero()
    |> value.add(ada_policy_id, ada_asset_name, base_ada)
    |> value.add(
        raise_asset.policy_id,
        raise_asset.asset_name,
        amount + penalty_amount,
      )
    |> value.add(seller_policy_id, order_auth_an, 1)
}

pub fn calculate_penalty(
  penalty_config: Option<PenaltyConfig>,
  start_valid_time_range: Int,
  end_valid_time_range: Int,
  total_input_amount: Int,
  total_output_amount: Int,
) -> Int {
  when penalty_config is {
    None -> 0
    Some(PenaltyConfig { penalty_start_time, penalty_end_time, percent }) ->
      if
      end_valid_time_range < penalty_start_time || start_valid_time_range > penalty_end_time{
      
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
