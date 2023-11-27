use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/list
use aiken/math
use aiken/transaction.{
  Input, Output, ScriptContext, Spend, Transaction, ValidityRange,
}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value.{AssetName, PolicyId, Value, quantity_of}
use lb_v2/types.{Asset, DatumMap, PoolDatum, TreasuryDatum, ValidatorHash}
use lb_v2/utils

pub fn validate_create_dex_pool_time(
  start_time: Int,
  validity_range: ValidityRange,
) -> Bool {
  let Interval { lower_bound: IntervalBound { bound_type, .. }, .. } =
    validity_range
  expect Finite(start_valid_time) = bound_type
  start_valid_time > start_time
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

pub fn get_treasury_input(
  context: ScriptContext,
  authen_policy_id: PolicyId,
  treasury_auth_asset_name: AssetName,
) -> Input {
  expect ScriptContext {
    transaction: Transaction { inputs, .. },
    purpose: Spend(self_out_ref),
  } = context
  // for sure Authen Token appear
  expect Some(treasury_input) =
    list.find(
      inputs,
      fn(input) {
        let Input { output_reference: out_ref, output: Output { value, .. } } =
          input
        and {
          out_ref == self_out_ref,
          quantity_of(value, authen_policy_id, treasury_auth_asset_name) == 1,
        }
      },
    )
  let Input {
    output: Output {
      address: Address { payment_credential: treasury_payment_credential, .. },
      ..
    },
    ..
  } = treasury_input
  // For sure spend only 1 Treasury Input
  expect [_] =
    list.filter(
      inputs,
      fn(input) {
        let Input {
          output: Output {
            address: Address { payment_credential: payment_cred, .. },
            ..
          },
          ..
        } = input
        treasury_payment_credential == payment_cred
      },
    )
  treasury_input
}

pub fn get_treasury_output(
  outputs: List<Output>,
  treasury_address: Address,
  authen_policy_id: PolicyId,
  treasury_auth_asset_name: AssetName,
) -> Output {
  expect [treasury_output] =
    list.filter(
      outputs,
      fn(output) {
        let Output { address, value, .. } = output
        expect
          quantity_of(value, authen_policy_id, treasury_auth_asset_name) == 1
        address == treasury_address
      },
    )
  treasury_output
}

pub fn get_amm_pool_raw_datum(
  outputs: List<Output>,
  datums: DatumMap,
  amm_authen_policy_id: PolicyId,
  amm_pool_auth_asset_name: AssetName,
  amm_pool_validation_hash: ValidatorHash,
) -> Data {
  expect [amm_pool_output] =
    list.filter(
      outputs,
      fn(output) {
        let Output { address: Address { payment_credential, .. }, value, .. } =
          output
        expect
          quantity_of(value, amm_authen_policy_id, amm_pool_auth_asset_name) == 1
        when payment_credential is {
          ScriptCredential(hash) -> hash == amm_pool_validation_hash
          _ -> False
        }
      },
    )
  let Output { datum, .. } = amm_pool_output
  utils.must_find_script_datum(datums, datum)
}

pub fn validate_create_dex_pool(
  treasury_in_raw_datum: Data,
  treasury_out_value: Value,
  treasury_out_raw_datum: Data,
  amm_pool_raw_datum: Data,
  mint_value: Value,
  amm_authen_policy_id: PolicyId,
  amm_pool_auth_asset_name: AssetName,
  validity_range: ValidityRange,
  all_outputs: List<Output>,
) -> Bool {
  expect treasury_in_datum: TreasuryDatum = treasury_in_raw_datum
  let TreasuryDatum {
    asset_a: treasury_in_asset_a,
    asset_b: treasury_in_asset_b,
    reserve_a: treasury_in_reserve_a,
    reserve_b: treasury_in_reserve_b,
    create_pool_time,
    lp_asset,
    lbe_owner,
    ..
  } = treasury_in_datum
  expect treasury_out_datum: TreasuryDatum = treasury_out_raw_datum
  let TreasuryDatum { total_liquidity: treasury_out_total_liquidity, .. } =
    treasury_out_datum
  expect amm_pool_datum: PoolDatum = amm_pool_raw_datum
  let PoolDatum {
    asset_a: pool_asset_a,
    asset_b: pool_asset_b,
    reserve_a: pool_reserve_a,
    reserve_b: pool_reserve_b,
    total_liquidity: pool_total_liquidity,
    ..
  } = amm_pool_datum
  let Asset { asset_name: lp_asset_name, .. } = lp_asset
  expect [Output { value: lbe_owner_value, .. }] =
    list.filter(
      all_outputs,
      fn(output) {
        let Output { address, .. } = output
        address == lbe_owner
      },
    )
  and {
    // for sure it's time to create pool
    validate_create_dex_pool_time(create_pool_time, validity_range),
    // for sure mint amm pool auth token
    quantity_of(mint_value, amm_authen_policy_id, amm_pool_auth_asset_name) == 1,
    // for sure the same asset_a, asset_b
    treasury_in_asset_a == pool_asset_a,
    treasury_in_asset_b == pool_asset_b,
    // for sure the same reserve_a, reserve_b
    treasury_in_reserve_a == pool_reserve_a,
    treasury_in_reserve_b == pool_reserve_b,
    // for sure 50% quantity LP Asset for treasury output
    quantity_of(treasury_out_value, amm_authen_policy_id, lp_asset_name) == treasury_out_total_liquidity,
    math.abs(
      treasury_out_total_liquidity + treasury_out_total_liquidity - pool_total_liquidity,
    ) <= 1,
    // for sure 50% quantity LP Asset for lbe's owner
    quantity_of(lbe_owner_value, amm_authen_policy_id, lp_asset_name) == pool_total_liquidity - treasury_out_total_liquidity,
    // for sure treasury output datum
    treasury_out_datum == TreasuryDatum {
      ..treasury_in_datum,
      total_liquidity: treasury_out_total_liquidity,
    },
  }
}
