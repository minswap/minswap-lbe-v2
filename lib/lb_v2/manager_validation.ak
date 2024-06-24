use aiken/list
use aiken/transaction.{InlineDatum, Input, NoDatum, Output, ValidityRange}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value.{PolicyId, Value}
use lb_v2/types.{
  AddSellers, Asset, CollectSellers, ManagerDatum, ManagerRedeemer, SellerDatum,
  TreasuryDatum,
}
use lb_v2/utils.{
  assert, collect_seller_commission, minimum_seller_collected,
  must_get_start_end_validity, seller_auth_an,
}
use lb_v2/validation.{validate_seller_outputs}

// Assertions:
// - Manager, Treasury share the same LBE ID
// - Paying Manager Output correctly!
// Add Seller:
//  + Before `end_time` and LBE is not cancelled
//  + No Seller Inputs
//  + Mint should be correctly!
//  + Paying Seller Outputs correctly!
// Collect Sellers:
//  + After `end_time` or LBE is cancelled
//  + Mint should be correctly!
//  + No Seller Outputs (no need to check)
//  + Collect at least 1 Seller
//  + Spending Seller Inputs correctly!
pub fn validate_manage_seller(
  outputs: List<Output>,
  inputs: List<Input>,
  factory_policy_id: PolicyId,
  manager_in_datum: ManagerDatum,
  manager_in_value: Value,
  validity_range: ValidityRange,
  mint_value: Value,
  treasury_datum: TreasuryDatum,
  redeemer: ManagerRedeemer,
) -> Bool {
  let (start_valid_time_range, end_valid_time_range) =
    must_get_start_end_validity(validity_range)
  let TreasuryDatum {
    manager_hash,
    seller_hash,
    base_asset,
    raise_asset,
    end_time,
    is_cancelled,
    ..
  } = treasury_datum
  let ManagerDatum {
    base_asset: m_base_asset,
    raise_asset: m_raise_asset,
    seller_count,
    reserve_raise,
    total_penalty,
    ..
  } = manager_in_datum
  // Finding exactly 1 Manager Output
  expect [manager_out] =
    list.filter(
      outputs,
      fn(output) {
        let Output { address: Address { payment_credential, .. }, .. } = output
        payment_credential == ScriptCredential(manager_hash)
      },
    )
  expect Output {
    value: manager_out_value,
    datum: InlineDatum(raw_manager_out_datum),
    reference_script: manager_out_rs,
    ..
  } = manager_out
  expect manager_out_datum: ManagerDatum = raw_manager_out_datum
  expect and {
      // Manager, Treasury share the same LBE ID
      m_base_asset == base_asset,
      m_raise_asset == raise_asset,
      manager_out_value == manager_in_value,
      manager_out_rs == None,
    }
  when redeemer is {
    AddSellers -> {
      let mint_seller_count =
        value.quantity_of(mint_value, factory_policy_id, seller_auth_an)
      and {
        end_valid_time_range < end_time,
        is_cancelled == False,
        // Mint should be correctly!
        mint_value == value.from_asset(
          factory_policy_id,
          seller_auth_an,
          mint_seller_count,
        ),
        // Paying Manager Output correctly!
        manager_out_datum == ManagerDatum {
          ..manager_in_datum,
          seller_count: seller_count + mint_seller_count,
        },
        // Seller Outputs must pay correctly!
        validate_seller_outputs(
          outputs: outputs,
          factory_policy_id: factory_policy_id,
          base_asset: base_asset,
          raise_asset: raise_asset,
          seller_hash: seller_hash,
          seller_count: mint_seller_count,
        ),
      }
    }
    CollectSellers -> {
      let seller_inputs =
        validation.get_seller_inputs(
          inputs: inputs,
          factory_policy_id: factory_policy_id,
          seller_hash: seller_hash,
        )
      // Validate collect sellers
      let seller_input_count = list.length(seller_inputs)
      let (total_reserve_raise, total_penalty_input) =
        apply_collect_sellers(
          seller_inputs: seller_inputs,
          outputs: outputs,
          base_asset: base_asset,
          raise_asset: raise_asset,
          acc_raise: 0,
          acc_penalty: 0,
        )
      and {
        or {
          start_valid_time_range > end_time,
          is_cancelled == True,
        },
        // Mint should be correctly!
        mint_value == value.from_asset(
          factory_policy_id,
          seller_auth_an,
          -seller_input_count,
        ),
        // Paying Manager Output correctly!
        assert(
          manager_out_datum == ManagerDatum {
            ..manager_in_datum,
            seller_count: seller_count - seller_input_count,
            reserve_raise: reserve_raise + total_reserve_raise,
            total_penalty: total_penalty + total_penalty_input,
          },
          @"Collect sellers: Invalid manager datum",
        ),
        or {
          // prevent spamming by setting minimum for seller collected 
          //  if this tx is not the last collect action
          minimum_seller_collected <= seller_input_count,
          // the last collecting
          seller_count == seller_input_count,
        },
      }
    }
    _ -> False
  }
}

fn apply_collect_sellers(
  seller_inputs: List<Input>,
  outputs: List<Output>,
  base_asset: Asset,
  raise_asset: Asset,
  acc_raise: Int,
  acc_penalty: Int,
) -> (Int, Int) {
  expect [input, ..inputs] = seller_inputs
  expect [seller_owner_output, ..remaining_outputs] = outputs
  expect Input {
    output: Output { datum: InlineDatum(raw_datum), value: in_value, .. },
    ..
  } = input
  expect seller_datum: SellerDatum = raw_datum
  let SellerDatum {
    base_asset: s_base_asset,
    raise_asset: s_raise_asset,
    amount,
    penalty_amount,
    owner,
    ..
  } = seller_datum
  expect and {
      s_base_asset == base_asset,
      s_raise_asset == raise_asset,
      seller_owner_output == Output {
        address: owner,
        value: value.from_lovelace(
          value.lovelace_of(in_value) - collect_seller_commission,
        ),
        datum: NoDatum,
        reference_script: None,
      },
    }
  let collect_raise = acc_raise + amount
  let collect_penalty = acc_penalty + penalty_amount
  when inputs is {
    [] -> (collect_raise, collect_penalty)
    _ ->
      apply_collect_sellers(
        seller_inputs: inputs,
        outputs: remaining_outputs,
        base_asset: base_asset,
        raise_asset: raise_asset,
        acc_raise: collect_raise,
        acc_penalty: collect_penalty,
      )
  }
}
