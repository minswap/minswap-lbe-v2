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

pub const manager_auth_an = #"4d616e61676572"

pub const default_number_seller = 20

/// IMPORTANT: This block is code-gen. Please do not edit!
/// *******************************************
pub const amm_factory_auth_asset_name = #"4d5346"

pub const amm_pool_auth_asset_name = #"4d5350"

pub const amm_authen_policy_id =
  #"4579ebf5c76b30a8b23e9e94790d0d86fe4b693a94669a66ed91cf4e"

pub const amm_pool_validation_hash =
  #"7a277b0dd0cfffdeaee4b58df515cd57f49636750a54773b4f0b2b14"

pub const default_burn_liquidity = 10

/// *******************************************
pub const minimum_ada = 3_000_000

pub const fee_ada = 1_000_000

pub const penalty_fee = 2_000_000

pub const treasury_minimum_ada = 3_000_000

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
  factory_policy_id: PolicyId,
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
    |> value.add(factory_policy_id, order_auth_an, 1)
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

pub fn make_wrapper_redeemer(redeemer: Data) -> Data {
  builtin.constr_data(1, [redeemer])
}

pub fn assert(bool: Bool, str: String) {
  if bool {
    bool
  } else {
    fail str
  }
}
