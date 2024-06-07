use aiken/list
use aiken/transaction.{InlineDatum, Input, Output}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value.{Value}
use lb_v2/types.{
  ByOwner, CancelReason, CreatedPool, NotReachMinimum, PoolDatum, PubKeyHash,
  TreasuryDatum,
}
use lb_v2/utils.{
  amm_authen_policy_id, amm_pool_auth_asset_name, amm_pool_validation_hash,
  assert,
}
use lb_v2/validation.{validate_authorize_by_owner}

// If transaction showing that AMM Pool have been created
//  then LBE should be cancelled. 
// Notes: The existence of the pool 
//  is verified by passing the AMM Pool UTxO into the reference inputs.
fn cancel_by_pool_exist(
  treasury_datum: TreasuryDatum,
  ref_inputs: List<Input>,
) -> Bool {
  // finding AMM Pool Ref Input
  expect [pool_ref_input] =
    list.filter(
      ref_inputs,
      fn(ref_input) {
        let Input {
          output: Output {
            address: Address { payment_credential, .. },
            value: in_value,
            ..
          },
          ..
        } = ref_input
        and {
          // Ref Input belongs Amm Pool Address
          payment_credential == ScriptCredential(amm_pool_validation_hash),
          // Ref Input has AMM Pool Auth Token
          value.quantity_of(
            in_value,
            amm_authen_policy_id,
            amm_pool_auth_asset_name,
          ) == 1,
        }
      },
    )
  // Extract some necessary data.
  expect Input { output: Output { datum: InlineDatum(raw_pool_datum), .. }, .. } =
    pool_ref_input
  expect PoolDatum { asset_a, asset_b, .. }: PoolDatum = raw_pool_datum
  let TreasuryDatum { base_asset, raise_asset, .. } = treasury_datum
  // Ensure that the AMM Pool ID and the LBE bootstrapping pool are the same.
  utils.sort_two_assets(base_asset, raise_asset) == (asset_a, asset_b)
}

// After Discovery Phase, If final reserve raise amount not reach target
//  then LBE should be cancelled.
fn cancel_by_not_reach_minimum_raise(treasury_datum: TreasuryDatum) -> Bool {
  let TreasuryDatum {
    minimum_raise,
    is_manager_collected,
    reserve_raise,
    total_penalty,
    ..
  } = treasury_datum
  let min_raise =
    when minimum_raise is {
      None -> 1
      Some(min_raise) -> min_raise
    }
  and {
    // All Manager, Sellers must be collected
    is_manager_collected,
    // Final reserve base = reserve_raise + total_penalty
    reserve_raise + total_penalty < min_raise,
  }
}

// Before discovery phase start:
//  - Project Owner can cancel LBE if need.
// After discovery phase start and `is_cancelable` truthy:
//  - Project Owner can cancel LBE before discovery phase ended.
fn cancel_by_owner(
  treasury_datum: TreasuryDatum,
  end_valid_time_range: Int,
  inputs: List<Input>,
  extra_signatories: List<PubKeyHash>,
) -> Bool {
  let TreasuryDatum { is_cancelable, start_time, end_time, owner, .. } =
    treasury_datum
  let Address { payment_credential: owner_payment_credential, .. } = owner
  // get last time project owner can make cancel
  let last_time =
    when is_cancelable is {
      True -> start_time
      False -> end_time
    }
  and {
    // transaction validity before the last time
    end_valid_time_range < last_time,
    // project owner has authorize transaction
    validate_authorize_by_owner(
      owner_payment_credential,
      extra_signatories: extra_signatories,
      inputs: inputs,
    ),
  }
}

// Assertions:
// - The LBE has not cancelled yet.
// - Paying Treasury Output correctly!
// - Validate cancel base on reason
// - Ensure there's no cancellation after successfully creating an AMM Pool with LBE.
pub fn validate_cancel_lbe(
  treasury_in_datum: TreasuryDatum,
  treasury_in_value: Value,
  treasury_output: Output,
  ref_inputs: List<Input>,
  inputs: List<Input>,
  extra_signatories: List<PubKeyHash>,
  end_valid_time_range: Int,
  cancel_reason: CancelReason,
  mint_value: Value,
) -> Bool {
  // Extract some necessary data.
  let TreasuryDatum { is_cancelled, total_liquidity, .. } = treasury_in_datum
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(raw_treasury_out_datum),
    ..
  } = treasury_output
  expect treasury_out_datum: TreasuryDatum = raw_treasury_out_datum
  and {
    // validate cancel base on reason
    when cancel_reason is {
      CreatedPool ->
        cancel_by_pool_exist(
          treasury_datum: treasury_in_datum,
          ref_inputs: ref_inputs,
        )
      ByOwner ->
        cancel_by_owner(
          treasury_datum: treasury_in_datum,
          end_valid_time_range: end_valid_time_range,
          inputs: inputs,
          extra_signatories: extra_signatories,
        )
      NotReachMinimum ->
        cancel_by_not_reach_minimum_raise(treasury_datum: treasury_in_datum)
    },
    // Paying Treasury Output correctly!
    is_cancelled == False,
    // Ensure there's no cancellation after successfully creating an AMM Pool with LBE.
    total_liquidity == 0,
    treasury_out_datum == TreasuryDatum {
      ..treasury_in_datum,
      is_cancelled: True,
    },
    treasury_in_value == treasury_out_value,
    assert(mint_value == value.zero(), @"Avoid minting unnecessary"),
  }
}
