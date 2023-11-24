use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/transaction.{ValidityRange}
use aiken/transaction/value.{AssetName, PolicyId, Value}

pub fn validate_discovery_pharse_ended(
  end_time: Int,
  validity_range: ValidityRange,
) -> Bool {
  let Interval {
    lower_bound: IntervalBound { bound_type: lower_bound_type, .. },
    ..
  } = validity_range
  expect Finite(start_valid_time_range) = lower_bound_type
  start_valid_time_range > end_time
}

pub fn get_treasury_creation_expected_mint(
  authen_policy_id: PolicyId,
  factory_auth_asset_name: AssetName,
  treasury_auth_asset_name: AssetName,
  lp_asset_name: AssetName,
) -> Value {
  value.zero()
    |> value.add(authen_policy_id, factory_auth_asset_name, 1)
    |> value.add(authen_policy_id, treasury_auth_asset_name, 1)
    |> value.add(authen_policy_id, lp_asset_name, 9223372036854775807)
}
