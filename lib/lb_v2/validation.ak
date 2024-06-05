use aiken/cbor
use aiken/dict.{Dict}
use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Output, OutputReference, Redeemer, ScriptPurpose, Spend,
  ValidityRange,
}
use aiken/transaction/credential.{
  Address, PaymentCredential, ScriptCredential, VerificationKeyCredential,
}
use aiken/transaction/value.{
  AssetName, PolicyId, Value, ada_asset_name, ada_policy_id,
}
use lb_v2/types.{
  Asset, ByOwner, CancelReason, CreatedPool, ManagerDatum, ManagerRedeemer,
  NotReachMinimum, OrderDatum, PenaltyConfig, PoolDatum, PubKeyHash, SellerDatum,
  SellerRedeemer, TreasuryDatum, TreasuryRedeemer, ValidatorHash,
}
use lb_v2/utils.{
  amm_authen_policy_id, amm_factory_auth_asset_name, amm_pool_auth_asset_name,
  amm_pool_validation_hash, assert, calculate_penalty,
  compute_asset_name_from_base_and_raise, default_burn_liquidity, fee_ada,
  get_order_value, manager_auth_an, order_auth_an, order_minimum_ada,
  seller_auth_an, treasury_auth_an, treasury_minimum_ada, two_day_ms,
}

pub fn validate_creating_treasury_out(
  treasury_out: Output,
  base_asset: Asset,
  raise_asset: Asset,
  manager_hash: ValidatorHash,
  seller_hash: ValidatorHash,
  order_hash: ValidatorHash,
  factory_policy_id: PolicyId,
  end_valid_time_range: Int,
) -> Bool {
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(treasury_out_raw_datum),
    reference_script,
    ..
  } = treasury_out
  expect treasury_out_datum: TreasuryDatum = treasury_out_raw_datum
  let TreasuryDatum {
    factory_policy_id: t_factory_policy_id,
    manager_hash: t_manager_hash,
    seller_hash: t_seller_hash,
    order_hash: t_order_hash,
    collected_fund,
    base_asset: t_base_asset,
    raise_asset: t_raise_asset,
    start_time,
    end_time,
    minimum_order_raise,
    minimum_raise,
    maximum_raise,
    reserve_base,
    reserve_raise,
    total_liquidity,
    penalty_config,
    total_penalty,
    is_cancelled,
    is_manager_collected,
    ..
  } = treasury_out_datum
  let Asset { policy_id: base_asset_pid, asset_name: base_asset_an } =
    base_asset
  let expected_treasury_out_value =
    value.zero()
      |> value.add(factory_policy_id, treasury_auth_an, 1)
      |> value.add(base_asset_pid, base_asset_an, reserve_base)
      |> value.add(ada_policy_id, ada_asset_name, treasury_minimum_ada)
  and {
    // treasury datum
    base_asset != raise_asset,
    base_asset.policy_id != ada_policy_id,
    factory_policy_id == t_factory_policy_id,
    manager_hash == t_manager_hash,
    seller_hash == t_seller_hash,
    order_hash == t_order_hash,
    collected_fund == 0,
    t_base_asset == base_asset,
    t_raise_asset == raise_asset,
    start_time > end_valid_time_range,
    start_time < end_time,
    when minimum_order_raise is {
      Some(min_order) -> min_order > 0
      _ -> True
    },
    when minimum_raise is {
      Some(minn) ->
        when maximum_raise is {
          Some(maxx) -> minn < maxx
          _ -> True
        } && minn > 0
      _ ->
        when maximum_raise is {
          Some(maxx) -> maxx > 0
          _ -> True
        }
    },
    reserve_base > 0,
    reserve_raise == 0,
    total_liquidity == 0,
    when penalty_config is {
      Some(PenaltyConfig { penalty_start_time, percent }) -> and {
          penalty_start_time > start_time,
          penalty_start_time < end_time,
          // Business requires a maximum penalty period of 2 final days
          penalty_start_time >= end_time - two_day_ms,
          percent > 0,
          // Business requires maximum penalty rate is 25 percent
          percent <= 25,
        }
      _ -> True
    },
    total_penalty == 0,
    is_cancelled == False,
    is_manager_collected == False,
    // treasury value
    treasury_out_value == expected_treasury_out_value,
    // reference_script
    reference_script == None,
  }
}

pub fn validate_create_dex_pool(
  treasury_in_datum: TreasuryDatum,
  treasury_output: Output,
  validity_range: ValidityRange,
  mint_value: Value,
  amm_pool_datum: PoolDatum,
  factory_policy_id: PolicyId,
  project_owner_outputs: List<Output>,
) -> Bool {
  let TreasuryDatum {
    collected_fund,
    base_asset,
    raise_asset,
    end_time,
    minimum_raise,
    maximum_raise,
    reserve_base,
    reserve_raise,
    total_penalty,
    is_cancelled,
    is_manager_collected,
    ..
  } = treasury_in_datum
  // vaidate timing when create amm pool
  expect Interval {
    lower_bound: IntervalBound {
      bound_type: Finite(start_valid_time_range),
      ..
    },
    ..
  } = validity_range
  let final_reserve_raise =
    when maximum_raise is {
      Some(maxx) ->
        when reserve_raise + total_penalty > maxx is {
          True -> maxx
          False -> reserve_raise + total_penalty
        }
      None -> reserve_raise + total_penalty
    }
  let Asset { policy_id: raise_pid, asset_name: raise_an } = raise_asset
  // validate LBE status
  expect and {
      start_valid_time_range > end_time,
      collected_fund == reserve_raise + total_penalty,
      when minimum_raise is {
        Some(minn) -> final_reserve_raise >= minn
        None -> True
      },
      is_cancelled == False,
      is_manager_collected == True,
    }
  let (asset_a, asset_b) = utils.sort_two_assets(base_asset, raise_asset)
  let (datum_in_reserve_a, datum_in_reserve_b) =
    when asset_a == base_asset is {
      True -> (reserve_base, final_reserve_raise)
      False -> (final_reserve_raise, reserve_base)
    }
  let Asset { policy_id: asset_a_policy_id, asset_name: asset_a_asset_name } =
    asset_a
  let Asset { policy_id: asset_b_policy_id, asset_name: asset_b_asset_name } =
    asset_b
  let PoolDatum {
    asset_a: pool_asset_a,
    asset_b: pool_asset_b,
    reserve_a: pool_reserve_a,
    reserve_b: pool_reserve_b,
    total_liquidity: pool_total_liquidity,
    ..
  } = amm_pool_datum
  let lp_asset_name =
    utils.compute_lp_asset_name(
      asset_a_policy_id,
      asset_a_asset_name,
      asset_b_policy_id,
      asset_b_asset_name,
    )
  expect and {
      // check mint value of this redeemer to make sure tx not burn manager token or mint/burn order tokens,...
      mint_value == (
        value.zero()
          |> value.add(amm_authen_policy_id, amm_factory_auth_asset_name, 1)
          |> value.add(amm_authen_policy_id, amm_pool_auth_asset_name, 1)
          |> value.add(amm_authen_policy_id, lp_asset_name, 9223372036854775807)
      ),
      asset_a == pool_asset_a,
      asset_b == pool_asset_b,
      datum_in_reserve_a == pool_reserve_a,
      datum_in_reserve_b == pool_reserve_b,
    }
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(treasury_out_datum_raw),
    ..
  } = treasury_output
  let total_lbe_lp = pool_total_liquidity - default_burn_liquidity
  let expected_owner_lp_outputs = total_lbe_lp / 2
  let treasury_lp_amount = total_lbe_lp - expected_owner_lp_outputs
  expect treasury_out_datum: TreasuryDatum = treasury_out_datum_raw
  let owner_lp_amount =
    list.foldl(
      project_owner_outputs,
      0,
      fn(output, acc) {
        let Output { value, .. } = output
        acc + value.quantity_of(value, amm_authen_policy_id, lp_asset_name)
      },
    )
  and {
    treasury_out_value == (
      value.zero()
        |> value.add(factory_policy_id, treasury_auth_an, 1)
        |> value.add(ada_policy_id, ada_asset_name, treasury_minimum_ada)
        |> value.add(amm_authen_policy_id, lp_asset_name, treasury_lp_amount)
        |> value.add(raise_pid, raise_an, collected_fund - final_reserve_raise)
    ),
    treasury_out_datum == TreasuryDatum {
      ..treasury_in_datum,
      total_liquidity: treasury_lp_amount,
    },
    owner_lp_amount == expected_owner_lp_outputs,
  }
}

pub fn has_spend_treasury(
  inputs: List<Input>,
  factory_policy_id: PolicyId,
  treasury_hash: ValidatorHash,
  redeemers: Dict<ScriptPurpose, Redeemer>,
  expected_redeemer: TreasuryRedeemer,
) -> Bool {
  // Transaction always contain exactly 1 Treasury Input
  expect [treasury_input] =
    list.filter(
      inputs,
      fn(input) {
        let Input {
          output: Output { address: Address { payment_credential, .. }, .. },
          ..
        } = input
        payment_credential == ScriptCredential(treasury_hash)
      },
    )
  let Input {
    output_reference: treasury_out_ref,
    output: Output { value: out_value, .. },
  } = treasury_input
  expect Some(raw_redeemer) = dict.get(redeemers, Spend(treasury_out_ref))
  expect redeemer: TreasuryRedeemer = raw_redeemer
  and {
    assert(
      value.quantity_of(out_value, factory_policy_id, treasury_auth_an) == 1,
      @"Treasury UTxO must contain 1 Treasury Token",
    ),
    assert(
      expected_redeemer == redeemer,
      @"Spending Treasury must be correct redeemer!",
    ),
  }
}

pub fn has_spend_manager(
  inputs: List<Input>,
  factory_policy_id: PolicyId,
  manager_hash: ValidatorHash,
  redeemers: Dict<ScriptPurpose, Redeemer>,
  expected_redeemer: ManagerRedeemer,
) -> Bool {
  expect [manager_input] =
    list.filter(
      inputs,
      fn(input) {
        let Input {
          output: Output { address: Address { payment_credential, .. }, .. },
          ..
        } = input
        payment_credential == ScriptCredential(manager_hash)
      },
    )
  let Input {
    output_reference: manager_out_ref,
    output: Output { value: out_value, .. },
  } = manager_input
  expect value.quantity_of(out_value, factory_policy_id, manager_auth_an) == 1
  expect Some(raw_redeemer) = dict.get(redeemers, Spend(manager_out_ref))
  expect redeemer: ManagerRedeemer = raw_redeemer
  expected_redeemer == redeemer
}

pub fn has_spend_seller(
  inputs: List<Input>,
  factory_policy_id: PolicyId,
  seller_hash: ValidatorHash,
  redeemers: Dict<ScriptPurpose, Redeemer>,
  expected_redeemer: SellerRedeemer,
) -> Bool {
  expect [seller_input] =
    list.filter(
      inputs,
      fn(input) {
        let Input {
          output: Output { address: Address { payment_credential, .. }, .. },
          ..
        } = input
        payment_credential == ScriptCredential(seller_hash)
      },
    )
  let Input {
    output_reference: seller_out_ref,
    output: Output { value: seller_out_value, .. },
  } = seller_input
  expect
    value.quantity_of(seller_out_value, factory_policy_id, seller_auth_an) == 1
  expect Some(raw_redeemer) = dict.get(redeemers, Spend(seller_out_ref))
  expect redeemer: SellerRedeemer = raw_redeemer
  expected_redeemer == redeemer
}

pub fn get_seller_inputs(
  inputs: List<Input>,
  factory_policy_id: PolicyId,
  seller_hash: ValidatorHash,
) -> List<Input> {
  list.filter(
    inputs,
    fn(input) {
      let Input { output: Output { address: in_addr, value: in_value, .. }, .. } =
        input
      let Address { payment_credential, .. } = in_addr
      and {
        value.quantity_of(in_value, factory_policy_id, seller_auth_an) == 1,
        when payment_credential is {
          ScriptCredential(hash) -> seller_hash == hash
          _ -> False
        },
      }
    },
  )
}

pub fn get_order_inputs(
  inputs: List<Input>,
  factory_policy_id: PolicyId,
  order_hash: ValidatorHash,
) -> List<Input> {
  list.filter(
    inputs,
    fn(input) {
      let Input {
        output: Output {
          address: Address { payment_credential, .. },
          value: in_value,
          ..
        },
        ..
      } = input
      and {
        value.quantity_of(in_value, factory_policy_id, order_auth_an) == 1,
        payment_credential == ScriptCredential(order_hash),
      }
    },
  )
}

// Getting Legit Manager Inputs from Transaction's Inputs
pub fn get_manager_inputs(
  inputs: List<Input>,
  factory_policy_id: PolicyId,
  manager_hash: ValidatorHash,
) -> List<Input> {
  list.filter(
    inputs,
    fn(input) {
      let Input {
        output: Output {
          address: Address { payment_credential, .. },
          value: in_value,
          ..
        },
        ..
      } = input
      and {
        // Has 1 Manager Token
        value.quantity_of(in_value, factory_policy_id, manager_auth_an) == 1,
        // output belongs Manager Address
        payment_credential == ScriptCredential(manager_hash),
      }
    },
  )
}

pub fn get_treasury_ref_inputs(
  ref_inputs: List<Input>,
  factory_policy_id: PolicyId,
  treasury_hash: ValidatorHash,
) -> List<Input> {
  list.filter(
    ref_inputs,
    fn(input) {
      let Input {
        output: Output {
          address: Address { payment_credential, .. },
          value: in_value,
          ..
        },
        ..
      } = input
      and {
        value.quantity_of(in_value, factory_policy_id, treasury_auth_an) == 1,
        payment_credential == ScriptCredential(treasury_hash),
      }
    },
  )
}

pub fn get_treasury_input_by_out_ref(
  inputs: List<Input>,
  factory_policy_id: PolicyId,
  out_ref: OutputReference,
) -> Input {
  expect [treasury_input] =
    list.filter(
      inputs,
      fn(input) {
        let Input { output_reference, output: Output { value: out_value, .. } } =
          input
        and {
          value.quantity_of(out_value, factory_policy_id, treasury_auth_an) == 1,
          output_reference == out_ref,
        }
      },
    )
  treasury_input
}

pub fn get_seller_input_by_out_ref(
  inputs: List<Input>,
  factory_policy_id: PolicyId,
  out_ref: OutputReference,
) -> Input {
  expect [seller_input] =
    list.filter(
      inputs,
      fn(input) {
        let Input { output_reference, output: Output { value: out_value, .. } } =
          input
        and {
          value.quantity_of(out_value, factory_policy_id, seller_auth_an) == 1,
          output_reference == out_ref,
        }
      },
    )
  seller_input
}

pub fn get_amm_pool_output(outputs: List<Output>) -> Output {
  expect [pool_output] =
    list.filter(
      outputs,
      fn(output) {
        let Output { address: Address { payment_credential, .. }, value, .. } =
          output
        when payment_credential is {
          ScriptCredential(hash) -> and {
              hash == amm_pool_validation_hash,
              value.quantity_of(
                value,
                amm_authen_policy_id,
                amm_pool_auth_asset_name,
              ) == 1,
            }
          _ -> False
        }
      },
    )
  pool_output
}

// If a transaction needs to pay the Treasury,
// its outputs must contain exactly 1 Legit Treasury Output.
pub fn get_treasury_output(
  outputs: List<Output>,
  factory_policy_id: PolicyId,
  treasury_hash: ValidatorHash,
) -> Output {
  expect [treasury_output] =
    list.filter(
      outputs,
      fn(output) {
        let Output {
          address: Address { payment_credential, .. },
          value: out_value,
          reference_script,
          ..
        } = output
        and {
          // output belongs Treasury Address
          payment_credential == ScriptCredential(treasury_hash),
          // No ref_script to avoid increase minimum ADA
          reference_script == None,
          // Has 1 Treasury Token
          value.quantity_of(out_value, factory_policy_id, treasury_auth_an) == 1,
        }
      },
    )
  treasury_output
}

// If a transaction needs to pay the Manager,
// its outputs must contain exactly 1 Legit Manager Output.
pub fn get_manager_output(
  outputs: List<Output>,
  factory_policy_id: PolicyId,
  manager_hash: ValidatorHash,
) -> Output {
  expect [manager_output] =
    list.filter(
      outputs,
      fn(output) {
        let Output {
          address: Address { payment_credential, .. },
          value: out_value,
          reference_script,
          ..
        } = output
        and {
          // output belongs Manager Address
          payment_credential == ScriptCredential(manager_hash),
          // No ref_script to avoid increase minimum ADA
          reference_script == None,
          // Has 1 Manager Token
          value.quantity_of(out_value, factory_policy_id, manager_auth_an) == 1,
        }
      },
    )
  manager_output
}

pub fn get_seller_outputs(
  outputs: List<Output>,
  factory_policy_id: PolicyId,
  seller_hash: ValidatorHash,
  seller_datum: Data,
) -> List<Output> {
  let seller_outputs =
    list.filter(
      outputs,
      fn(output) {
        let Output { address: Address { payment_credential, .. }, .. } = output
        payment_credential == ScriptCredential(seller_hash)
      },
    )
  expect
    list.all(
      seller_outputs,
      fn(output) {
        let Output { value: out_value, datum: out_datum, .. } = output
        and {
          assert(
            value.quantity_of(out_value, factory_policy_id, seller_auth_an) == 1,
            @"Seller output don't have any seller token",
          ),
          assert(
            InlineDatum(seller_datum) == out_datum,
            @"Invalid seller output datum",
          ),
        }
      },
    )
  seller_outputs
}

pub fn get_order_outputs(
  outputs: List<Output>,
  factory_policy_id: PolicyId,
  order_hash: ValidatorHash,
) -> List<Output> {
  list.filter(
    outputs,
    fn(output) {
      let Output {
        address: Address { payment_credential, .. },
        value: out_value,
        reference_script,
        ..
      } = output
      if payment_credential == ScriptCredential(order_hash) {
        expect and {
            value.quantity_of(out_value, factory_policy_id, order_auth_an) == 1,
            reference_script == None,
          }
        True
      } else {
        False
      }
    },
  )
}

// Checking Condition to collect manager
// Assertions:
// - 1 Treasury Ouput needs to be paid
// - 1 Manager Input needs to be spent
// - Treasury Input and Manager Input must be the same LBE ID.
// - The Treasury Values have no changes.
// - All Sellers must be collected before collecting Manager.
// - Burn 1 Manager Token
// - Treasury In Datum must be correct!
// - Treasury Out Datum must be correct!
pub fn validate_collect_manager(
  inputs: List<Input>,
  outputs: List<Output>,
  treasury_in_value: Value,
  treasury_in_datum: TreasuryDatum,
  mint_value: Value,
  factory_policy_id: PolicyId,
  manager_hash: ValidatorHash,
  treasury_hash: ValidatorHash,
) -> Bool {
  // get 1 Legit Treasury Output
  let treasury_output =
    get_treasury_output(outputs, factory_policy_id, treasury_hash)
  // get 1 Legit Manager Input
  expect [manager_input] =
    get_manager_inputs(
      inputs: inputs,
      factory_policy_id: factory_policy_id,
      manager_hash: manager_hash,
    )
  // Extract some necessary data.
  expect Output {
    datum: InlineDatum(treasury_out_raw_datum),
    value: treasury_out_value,
    ..
  } = treasury_output
  expect treasury_out_datum: TreasuryDatum = treasury_out_raw_datum
  expect Input {
    output: Output { datum: InlineDatum(raw_manager_datum), .. },
    ..
  } = manager_input
  expect ManagerDatum {
    base_asset,
    raise_asset,
    seller_count,
    reserve_raise,
    total_penalty,
    ..
  }: ManagerDatum = raw_manager_datum
  and {
    // Both treasury, manager share the same LBE ID.
    // The Manager must not have been collected yet.
    assert(
      treasury_in_datum == TreasuryDatum {
        ..treasury_in_datum,
        is_manager_collected: False,
        base_asset: base_asset,
        raise_asset: raise_asset,
      },
      @"Treasury In Datum must be correct!",
    ),
    assert(
      mint_value == value.from_asset(factory_policy_id, manager_auth_an, -1),
      @"Must burn 1 Manager Token",
    ),
    assert(
      seller_count == 0,
      @"All sellers must be collected before collecting the manager.",
    ),
    // validate treasury output
    assert(
      treasury_out_datum == TreasuryDatum {
        ..treasury_in_datum,
        reserve_raise: reserve_raise,
        total_penalty: total_penalty,
        is_manager_collected: True,
      },
      @"Treasury Out Datum must be correct!",
    ),
    assert(
      treasury_in_value == treasury_out_value,
      @"Treasury Value must no changes",
    ),
  }
}

pub fn validate_using_seller(
  treasury_hash: ValidatorHash,
  out_ref: OutputReference,
  seller_in_datum: SellerDatum,
  inputs: List<Input>,
  reference_inputs: List<Input>,
  outputs: List<Output>,
  validity_range: ValidityRange,
  extra_signatories: List<PubKeyHash>,
  mint_value: Value,
  factory_policy_id: PolicyId,
) -> Bool {
  expect Interval {
    upper_bound: IntervalBound { bound_type: Finite(end_valid_time_range), .. },
    lower_bound: IntervalBound {
      bound_type: Finite(start_valid_time_range),
      ..
    },
  } = validity_range
  // Validate always spend exactly 1 Seller UTxO
  let seller_input =
    get_seller_input_by_out_ref(
      inputs: inputs,
      factory_policy_id: factory_policy_id,
      out_ref: out_ref,
    )
  expect Input {
    output: Output {
      address: Address { payment_credential: ScriptCredential(seller_hash), .. },
      ..
    },
    ..
  } = seller_input
  expect [_] =
    list.filter(
      inputs,
      fn(input) {
        let Input {
          output: Output { address: Address { payment_credential, .. }, .. },
          ..
        } = input
        when payment_credential is {
          ScriptCredential(hash) -> hash == seller_hash
          _ -> False
        }
      },
    )
  // Validate Datums
  expect [treasury_ref_input] =
    get_treasury_ref_inputs(reference_inputs, factory_policy_id, treasury_hash)
  expect Input {
    output: Output { datum: InlineDatum(raw_treasury_datum), .. },
    ..
  } = treasury_ref_input
  expect TreasuryDatum {
    factory_policy_id,
    base_asset,
    raise_asset,
    order_hash,
    penalty_config,
    start_time,
    end_time,
    minimum_order_raise,
    is_cancelled,
    ..
  }: TreasuryDatum = raw_treasury_datum
  let order_inputs =
    get_order_inputs(
      inputs: inputs,
      factory_policy_id: factory_policy_id,
      order_hash: order_hash,
    )
  let order_outputs =
    get_order_outputs(
      outputs: outputs,
      factory_policy_id: factory_policy_id,
      order_hash: order_hash,
    )
  trace cbor.diagnostic(#"1234")
  let (delta_amount, delta_penalty) =
    apply_order(
      order_inputs: order_inputs,
      order_outputs: order_outputs,
      penalty_config: penalty_config,
      end_valid_time_range: end_valid_time_range,
      factory_policy_id: factory_policy_id,
      base_asset: base_asset,
      raise_asset: raise_asset,
      extra_signatories: extra_signatories,
      inputs: inputs,
      minimum_order_raise: minimum_order_raise,
    )
  trace cbor.diagnostic(delta_amount)
  trace cbor.diagnostic(delta_penalty)
  let order_input_count = list.length(order_inputs)
  let order_output_count = list.length(order_outputs)
  let is_valid_minting =
    if order_input_count == order_output_count {
      value.flatten(mint_value) == []
    } else {
      value.flatten(mint_value) == [
        (
          factory_policy_id,
          order_auth_an,
          order_output_count - order_input_count,
        ),
      ]
    }
  expect [_] =
    get_seller_outputs(
      outputs: outputs,
      factory_policy_id: factory_policy_id,
      seller_hash: seller_hash,
      seller_datum: SellerDatum {
        factory_policy_id,
        base_asset,
        raise_asset,
        amount: seller_in_datum.amount + delta_amount,
        penalty_amount: seller_in_datum.penalty_amount + delta_penalty,
      },
    )
  and {
    // validate LBE ID
    assert(
      base_asset == seller_in_datum.base_asset,
      @"Invalid seller input LBE ID",
    ),
    assert(
      raise_asset == seller_in_datum.raise_asset,
      @"Invalid seller input LBE ID",
    ),
    // validate time frame
    assert(
      start_time <= start_valid_time_range,
      @"Using-seller: Before discovery phase",
    ),
    assert(
      end_valid_time_range <= end_time,
      @"Using-seller: After discovery phase",
    ),
    // validate minting
    assert(is_valid_minting, @"Using-seller: Invalid minting"),
    // not cancelled yet
    assert(is_cancelled == False, @"Using-seller: LBE is cancelled"),
  }
}

pub fn apply_order(
  order_inputs: List<Input>,
  order_outputs: List<Output>,
  penalty_config: Option<PenaltyConfig>,
  end_valid_time_range: Int,
  factory_policy_id: PolicyId,
  base_asset: Asset,
  raise_asset: Asset,
  extra_signatories: List<ByteArray>,
  inputs: List<Input>,
  minimum_order_raise: Option<Int>,
) -> (Int, Int) {
  let (total_input_amount, total_input_penalty) =
    list.foldl(
      order_inputs,
      (0, 0),
      fn(order_input, acc) {
        expect Input {
          output: Output {
            datum: InlineDatum(raw_o_datum),
            value: order_value,
            ..
          },
          ..
        } = order_input
        let (acc_amount, acc_penalty) = acc
        expect OrderDatum {
          base_asset: o_base_asset,
          raise_asset: o_raise_asset,
          amount,
          is_collected,
          penalty_amount,
          owner,
          ..
        }: OrderDatum = raw_o_datum
        let Address { payment_credential: owner_payment_credential, .. } = owner
        let expected_order =
          get_order_value(
            amount: amount,
            penalty_amount: penalty_amount,
            factory_policy_id: factory_policy_id,
            raise_asset: raise_asset,
          )
        trace cbor.diagnostic(expected_order)
        trace cbor.diagnostic(order_value)

        // validate orders
        expect and {
            validate_authorize_by_owner(
              owner_payment_credential: owner_payment_credential,
              extra_signatories: extra_signatories,
              inputs: inputs,
            ),
            is_collected == False,
            assert(o_base_asset == base_asset, @"Invalid order input LBE ID"),
            assert(o_raise_asset == raise_asset, @"Invalid order input LBE ID"),
            expected_order == order_value,
          }
        (acc_amount + amount, acc_penalty + penalty_amount)
      },
    )
  let (total_output_amount, total_output_penalty) =
    list.foldl(
      order_outputs,
      (0, 0),
      fn(order_output, acc) {
        expect Output {
          datum: InlineDatum(raw_o_datum),
          value: order_value,
          ..
        } = order_output
        let (acc_amount, acc_penalty) = acc
        expect OrderDatum {
          base_asset: o_base_asset,
          raise_asset: o_raise_asset,
          amount,
          is_collected,
          penalty_amount,
          ..
        }: OrderDatum = raw_o_datum
        let expected_order =
          get_order_value(
            amount: amount,
            penalty_amount: penalty_amount,
            factory_policy_id: factory_policy_id,
            raise_asset: raise_asset,
          )
        // validate orders
        expect and {
            when minimum_order_raise is {
              Some(min_order_raise) -> amount >= min_order_raise
              None -> amount > 0
            },
            assert(
              penalty_amount >= 0,
              @"penalty_amount must higher than or equal to 0",
            ),
            is_collected == False,
            assert(o_base_asset == base_asset, @"Invalid order output LBE ID"),
            assert(o_raise_asset == raise_asset, @"Invalid order output LBE ID"),
            assert(expected_order == order_value, @"Invalid order output value"),
          }
        (acc_amount + amount, acc_penalty + penalty_amount)
      },
    )
  // penalty of this tx
  let penalty =
    calculate_penalty(
      penalty_config: penalty_config,
      end_valid_time_range: end_valid_time_range,
      total_input_amount: total_input_amount,
      total_output_amount: total_output_amount,
    )
  expect
    assert(
      total_output_penalty - total_input_penalty == penalty,
      @"Invalid penalty amount",
    )

  (
    total_output_amount - total_input_amount,
    total_output_penalty - total_input_penalty,
  )
}

// Assertions:
// - All Sellers, Manager have been collected.
// - All Inputs and Outputs must be legitimate by containing an Auth Token.
// - Treasury Input, Order Inputs must share the same LBE ID.
// - Paying Treasury Output correctly!
// - Paying Order Outputs correctly!
// - Collect at least 1 Order.
// - The length of Order Inputs equals the length of Order Outputs.
// - Transaction mint nothing.
// Notes:
// - Collecting orders and cancelling LBE are independent operations.
// - There's no need to check the time range since it should collect sellers first.
pub fn validate_collect_orders(
  inputs: List<Input>,
  outputs: List<Output>,
  treasury_in_datum: TreasuryDatum,
  treasury_in_value: Value,
  mint_value: Value,
  treasury_hash: ValidatorHash,
) -> Bool {
  let TreasuryDatum {
    factory_policy_id,
    order_hash,
    collected_fund,
    base_asset,
    raise_asset,
    is_manager_collected,
    ..
  } = treasury_in_datum
  let order_inputs =
    get_order_inputs(
      inputs: inputs,
      factory_policy_id: factory_policy_id,
      order_hash: order_hash,
    )
  let order_outputs = get_order_outputs(outputs, factory_policy_id, order_hash)
  let treasury_output =
    get_treasury_output(outputs, factory_policy_id, treasury_hash)
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(raw_treasury_out_datum),
    reference_script: treasury_out_rs,
    ..
  } = treasury_output
  expect treasury_out_datum: TreasuryDatum = raw_treasury_out_datum
  let collect_amount =
    apply_collecting_orders(
      order_inputs: order_inputs,
      order_outputs: order_outputs,
      base_asset: base_asset,
      raise_asset: raise_asset,
      factory_policy_id: factory_policy_id,
      acc_collect_amount: 0,
    )
  let Asset { policy_id: raise_asset_pid, asset_name: raise_asset_an } =
    raise_asset
  and {
    // Treasury Out Datum should update correctly!
    TreasuryDatum {
      ..treasury_in_datum,
      collected_fund: collected_fund + collect_amount,
    } == treasury_out_datum,
    // Accumulate Treasury Out Value with the `collect_amount` of `raise_asset` Token.
    treasury_out_value == (
      treasury_in_value
        |> value.add(raise_asset_pid, raise_asset_an, collect_amount)
    ),
    // prevent Treasury Output becomes heavy.
    treasury_out_rs == None,
    // Transaction mint nothing.
    value.flatten(mint_value) == [],
    // All Sellers, Manager have been collected.
    is_manager_collected == True,
  }
}

// Transaction must collects at least 1 order.
// return Sum(amount + penalty_amount) of orders
pub fn apply_collecting_orders(
  order_inputs: List<Input>,
  order_outputs: List<Output>,
  base_asset: Asset,
  raise_asset: Asset,
  factory_policy_id: PolicyId,
  acc_collect_amount: Int,
) -> Int {
  expect [input, ..inputs] = order_inputs
  expect [output, ..outputs] = order_outputs
  expect Input { output: Output { datum: InlineDatum(in_datum_raw), .. }, .. } =
    input
  expect in_datum: OrderDatum = in_datum_raw
  expect Output {
    value: out_value,
    datum: InlineDatum(out_datum_raw),
    reference_script: out_ref_script,
    ..
  } = output
  expect out_datum: OrderDatum = out_datum_raw
  expect and {
      // Order, Treasury must share the same LBE ID
      in_datum == OrderDatum {
        ..in_datum,
        base_asset: base_asset,
        raise_asset: raise_asset,
      },
      // Out Datum only changes: {is_collected: True } compare to In Datum
      out_datum == OrderDatum { ..in_datum, is_collected: True },
      // Out Value should be correct!
      out_value == (
        value.from_asset(factory_policy_id, order_auth_an, 1)
          |> value.add(ada_policy_id, ada_asset_name, order_minimum_ada + fee_ada)
      ),
      // Prevent Order Output from becoming heavy
      out_ref_script == None,
    }
  let OrderDatum { amount, penalty_amount, .. } = in_datum
  let collect_amount = acc_collect_amount + amount + penalty_amount
  when inputs == [] is {
    True -> {
      // Ensure order_inputs.length == order_outputs.length
      expect outputs == []
      collect_amount
    }
    False ->
      apply_collecting_orders(
        order_inputs: inputs,
        order_outputs: outputs,
        base_asset: base_asset,
        raise_asset: raise_asset,
        factory_policy_id: factory_policy_id,
        acc_collect_amount: collect_amount,
      )
  }
}

pub fn validate_redeem_lp(
  order_inputs: List<Input>,
  outputs: List<Output>,
  treasury_output: Output,
  treasury_in_datum: TreasuryDatum,
  treasury_in_value: Value,
  mint_value: Value,
  factory_policy_id: PolicyId,
) -> Bool {
  let TreasuryDatum {
    collected_fund,
    base_asset,
    raise_asset,
    reserve_raise,
    total_liquidity,
    maximum_raise,
    total_penalty,
    ..
  } = treasury_in_datum
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(raw_treasury_out_datum),
    ..
  } = treasury_output
  expect treasury_out_datum: TreasuryDatum = raw_treasury_out_datum
  let lp_asset_name =
    compute_asset_name_from_base_and_raise(base_asset, raise_asset)

  let total_remaining_raise =
    when maximum_raise is {
      Some(maxx) ->
        when reserve_raise + total_penalty > maxx is {
          True -> reserve_raise + total_penalty - maxx
          False -> 0
        }
      None -> 0
    }
  let Asset { policy_id: raise_asset_pid, asset_name: raise_asset_an } =
    raise_asset
  // 1. validate orders. 
  //    - each order validate(n first output is n output of order)
  //      - check id of order input
  //      - order output 
  //        - value_out =  minimum_ada+ LP + remaining raise asset depend on how much they provided
  //        - address = owner of order input datum
  //    - calculate acc amount and penalty of all order(from input datum) and total LP and remaining raise asset that users redeemed
  let (total_o_fund, total_o_lp, total_o_remaining_raise) =
    apply_redeeming_lp_orders(
      order_inputs: order_inputs,
      outputs: outputs,
      base_asset: base_asset,
      raise_asset: raise_asset,
      total_lp: total_liquidity,
      reserve_raise: reserve_raise,
      remaing_raise: total_remaining_raise,
      lp_asset_name: lp_asset_name,
    )
  and {
    // 2. validate treasury.
    //    - treasury_datum
    //      - collected_fund: 
    //            total_o_fund = amount+penalty(of all orders)
    //            datum_out.collected_fund = datum_in.collected_fund - delta_fund
    //      - other field: nothing change
    //    - treasury_value: t_value_out = t_value_in - ((totalLP+raise asset) user redeem in this tx)
    treasury_out_datum == TreasuryDatum {
      ..treasury_in_datum,
      collected_fund: collected_fund - total_o_fund,
    },
    treasury_out_value == (
      treasury_in_value
        |> value.add(amm_authen_policy_id, lp_asset_name, -total_o_lp)
        |> value.add(raise_asset_pid, raise_asset_an, -total_o_remaining_raise)
    ),
    // 3. Mint: burn order NFT
    value.flatten(mint_value) == [
      (factory_policy_id, order_auth_an, -list.length(order_inputs)),
    ],
  }
  // this function dont need to check collected beacause treasury must collect before create pool
}

// return (total fund(amount and penalty) of orders, total lp that users redeemed, total raise asset that user redeem)
pub fn apply_redeeming_lp_orders(
  order_inputs: List<Input>,
  outputs: List<Output>,
  base_asset: Asset,
  raise_asset: Asset,
  total_lp: Int,
  reserve_raise: Int,
  remaing_raise: Int,
  lp_asset_name: AssetName,
) -> (Int, Int, Int) {
  expect [order_input, ..remaining_order_inputs] = order_inputs
  expect Input {
    output: Output { datum: InlineDatum(raw_order_in_datum), .. },
    ..
  } = order_input
  expect order_in_datum: OrderDatum = raw_order_in_datum
  expect [order_output, ..remaining_outputs] = outputs
  let (o_fund, o_lp_amount, o_remaining_raise_amount) =
    apply_redeeming_lp_order(
      order_in_datum,
      order_output,
      base_asset,
      raise_asset,
      total_lp,
      reserve_raise,
      remaing_raise,
      lp_asset_name,
    )
  if remaining_order_inputs == [] {
    (o_fund, o_lp_amount, o_remaining_raise_amount)
  } else {
    let (acc_fund, acc_lp, acc_raise) =
      apply_redeeming_lp_orders(
        remaining_order_inputs,
        remaining_outputs,
        base_asset,
        raise_asset,
        total_lp,
        reserve_raise,
        remaing_raise,
        lp_asset_name,
      )
    (
      acc_fund + o_fund,
      acc_lp + o_lp_amount,
      acc_raise + o_remaining_raise_amount,
    )
  }
}

fn apply_redeeming_lp_order(
  order_in_datum: OrderDatum,
  order_output: Output,
  base_asset: Asset,
  raise_asset: Asset,
  total_lp: Int,
  reserve_raise: Int,
  remaing_raise: Int,
  lp_asset_name: AssetName,
) -> (Int, Int, Int) {
  let OrderDatum {
    base_asset: o_base_asset,
    raise_asset: o_raise_asset,
    owner,
    amount,
    penalty_amount,
    ..
  } = order_in_datum
  let o_lp_amount = total_lp * amount / reserve_raise
  let o_remaining_raise_amount = remaing_raise * amount / reserve_raise

  let Asset { policy_id: raise_asset_pid, asset_name: raise_asset_an } =
    raise_asset
  let expected_order_out_value =
    value.zero()
      |> value.add(ada_policy_id, ada_asset_name, order_minimum_ada)
      |> value.add(raise_asset_pid, raise_asset_an, o_remaining_raise_amount)
      |> value.add(amm_authen_policy_id, lp_asset_name, o_lp_amount)
  let Output { address: owner_address, value: order_out_value, .. } =
    order_output
  expect and {
      base_asset == o_base_asset,
      raise_asset == o_raise_asset,
      owner_address == owner,
      expected_order_out_value == order_out_value,
    }
  (amount + penalty_amount, o_lp_amount, o_remaining_raise_amount)
}

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

pub fn validate_cancel_lbe(
  treasury_in_datum: TreasuryDatum,
  treasury_in_value: Value,
  treasury_output: Output,
  ref_inputs: List<Input>,
  inputs: List<Input>,
  extra_signatories: List<PubKeyHash>,
  end_valid_time_range: Int,
  cancel_reason: CancelReason,
) -> Bool {
  // Extract some necessary data.
  let TreasuryDatum { is_cancelled, .. } = treasury_in_datum
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
    // LBE should not be cancelled yet.
    is_cancelled == False,
    // Treasury Out Datum must be correct!
    treasury_out_datum == TreasuryDatum {
      ..treasury_in_datum,
      is_cancelled: True,
    },
    // Treasury Value has no changes.
    treasury_in_value == treasury_out_value,
  }
}

pub fn validate_refund(
  order_inputs: List<Input>,
  outputs: List<Output>,
  treasury_output: Output,
  treasury_in_datum: TreasuryDatum,
  treasury_in_value: Value,
  mint_value: Value,
) -> Bool {
  let TreasuryDatum {
    factory_policy_id,
    collected_fund,
    base_asset,
    raise_asset,
    is_cancelled,
    reserve_raise,
    total_penalty,
    is_manager_collected,
    ..
  } = treasury_in_datum
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(raw_treasury_out_datum),
    ..
  } = treasury_output
  expect treasury_out_datum: TreasuryDatum = raw_treasury_out_datum

  let Asset { policy_id: raise_asset_pid, asset_name: raise_asset_an } =
    raise_asset
  // 1. validate orders. 
  //    - each order validate(n first output is n output of order)
  //      - check lbe id of order input
  //      - order output 
  //        - value_out =  minimum_ada+ refund_amount(refund_amount= amount+penalty )
  //        - address = owner of order input datum
  //    - calculate all order fund
  let (total_orders_amount, total_orders_penalty) =
    apply_refund_orders(
      order_inputs: order_inputs,
      outputs: outputs,
      base_asset: base_asset,
      raise_asset: raise_asset,
    )
  let orders_collected_fund = total_orders_amount + total_orders_penalty
  and {
    // check this LBE collected all orders
    collected_fund == reserve_raise + total_penalty,
    // 2. validate treasury.
    //    - treasury_datum
    //      - is_cancelled = True
    //      - collected_fund: 
    //            datum_out.collected_fund: datum_in.collected_fund - total_orders_collected_fund
    //            datum_out.reserve_raise: datum_in.reserve_raise - total_orders_amount
    //            datum_out.total_penalty: datum_in.total_penalty - total_orders_penalty
    //      - other field: nothing change
    //    - treasury_value: t_value_out = t_value_in - (total_orders_collected_fund)
    is_cancelled == True,
    treasury_out_datum == TreasuryDatum {
      ..treasury_in_datum,
      collected_fund: collected_fund - orders_collected_fund,
      reserve_raise: reserve_raise - total_orders_amount,
      total_penalty: total_penalty - total_orders_penalty,
    },
    treasury_out_value == (
      treasury_in_value
        |> value.add(raise_asset_pid, raise_asset_an, -orders_collected_fund)
    ),
    // 3. Mint: burn order NFT
    value.flatten(mint_value) == [
      (factory_policy_id, order_auth_an, -list.length(order_inputs)),
    ],
    is_manager_collected == True,
  }
}

// return (total fund(amount and penalty) of orders, total lp that users redeemed, total raise asset that user redeem)
// (total_collected_fund, total_amount, total_penalty)
pub fn apply_refund_orders(
  order_inputs: List<Input>,
  outputs: List<Output>,
  base_asset: Asset,
  raise_asset: Asset,
) -> (Int, Int) {
  expect [order_input, ..remaining_order_inputs] = order_inputs
  expect Input {
    output: Output { datum: InlineDatum(raw_order_in_datum), .. },
    ..
  } = order_input
  expect order_in_datum: OrderDatum = raw_order_in_datum
  expect [order_output, ..remaining_outputs] = outputs
  let (amount, penalty_amount) =
    apply_refund_order(order_in_datum, order_output, base_asset, raise_asset)
  if remaining_order_inputs == [] {
    (amount, penalty_amount)
  } else {
    let (acc_amount, acc_penalty) =
      apply_refund_orders(
        remaining_order_inputs,
        remaining_outputs,
        base_asset,
        raise_asset,
      )
    (acc_amount + amount, acc_penalty + penalty_amount)
  }
}

fn apply_refund_order(
  order_in_datum: OrderDatum,
  order_output: Output,
  base_asset: Asset,
  raise_asset: Asset,
) -> (Int, Int) {
  let OrderDatum {
    base_asset: o_base_asset,
    raise_asset: o_raise_asset,
    owner,
    amount,
    penalty_amount,
    is_collected,
    ..
  } = order_in_datum

  let Asset { policy_id: raise_asset_pid, asset_name: raise_asset_an } =
    raise_asset
  let expected_order_out_value =
    value.zero()
      |> value.add(ada_policy_id, ada_asset_name, order_minimum_ada)
      |> value.add(raise_asset_pid, raise_asset_an, amount + penalty_amount)
  let Output { address: owner_address, value: order_out_value, .. } =
    order_output
  expect and {
      base_asset == o_base_asset,
      raise_asset == o_raise_asset,
      owner_address == owner,
      expected_order_out_value == order_out_value,
      is_collected == True,
    }
  (amount, penalty_amount)
}

pub fn validate_manage_seller(
  factory_policy_id: PolicyId,
  manager_in_datum: ManagerDatum,
  manager_out: Output,
  validity_range: ValidityRange,
  mint_value: Value,
  treasury_datum: TreasuryDatum,
  seller_inputs: List<Input>,
  seller_outputs: List<Output>,
) -> Bool {
  expect Interval {
    upper_bound: IntervalBound { bound_type: Finite(end_valid_time_range), .. },
    lower_bound: IntervalBound {
      bound_type: Finite(start_valid_time_range),
      ..
    },
  } = validity_range
  let TreasuryDatum { base_asset, raise_asset, end_time, is_cancelled, .. } =
    treasury_datum
  let ManagerDatum {
    base_asset: sm_base_asset,
    raise_asset: sm_raise_asset,
    seller_count,
    reserve_raise,
    total_penalty,
    ..
  } = manager_in_datum
  // validate LBE ID
  expect assert(and {
        sm_base_asset == base_asset,
        sm_raise_asset == raise_asset,
      }, @"Collect Sellers: invalid manager input's LBE ID")
  expect Output { datum: InlineDatum(raw_manager_out_datum), .. } = manager_out
  expect manager_out_datum: ManagerDatum = raw_manager_out_datum
  if and {
    end_valid_time_range < end_time,
    is_cancelled == False,
  } {
    let addition_seller = list.length(seller_outputs)
    // add seller
    and {
      // mint value
      mint_value == value.from_asset(
        factory_policy_id,
        seller_auth_an,
        addition_seller,
      ),
      // no input
      list.length(seller_inputs) == 0,
      // update datum
      manager_out_datum == ManagerDatum {
        ..manager_in_datum,
        seller_count: seller_count + addition_seller,
      },
    }
  } else if or {
    start_valid_time_range > end_time,
    is_cancelled == True,
  } {
    // total amount and penalty
    // -> update manager datum
    expect [total_reserve_raise, total_penalty_input, seller_input_count] =
      list.foldl(
        seller_inputs,
        [0, 0, 0],
        fn(seller_input, acc) {
          expect [acc_reserve_raise, acc_total_penalty, acc_seller_count] = acc
          expect Input {
            output: Output { datum: InlineDatum(seller_raw_datum), .. },
            ..
          } = seller_input
          expect seller_datum: SellerDatum = seller_raw_datum
          let SellerDatum {
            base_asset: s_base_asset,
            raise_asset: s_raise_asset,
            amount,
            penalty_amount,
            ..
          } = seller_datum
          expect assert(and {
                s_base_asset == base_asset,
                s_raise_asset == raise_asset,
              }, @"Collect Sellers: invalid seller inputs' LBE ID")
          [
            acc_reserve_raise + amount,
            acc_total_penalty + penalty_amount,
            acc_seller_count + 1,
          ]
        },
      )
    and {
      // no seller outputs
      assert(
        list.length(seller_outputs) == 0,
        @"Collect sellers: Tx mustn't have seller output",
      ),
      // mint value
      assert(
        value.flatten(mint_value) == [
          (factory_policy_id, seller_auth_an, -seller_input_count),
        ],
        @"Collect sellers: Invalid minting",
      ),
      // update datum
      assert(
        manager_out_datum == ManagerDatum {
          ..manager_in_datum,
          seller_count: seller_count - seller_input_count,
          reserve_raise: reserve_raise + total_reserve_raise,
          total_penalty: total_penalty + total_penalty_input,
        },
        @"Collect sellers: Invalid manager datum",
      ),
    }
  } else {
    fail @"Unable to determine action"
  }
}

// Check if the owner authorizes the transaction
// If Owner is Script -> Transaction must contains at least 1 Script Input
// Else Transaction must be signed by Owner.
pub fn validate_authorize_by_owner(
  owner_payment_credential: PaymentCredential,
  extra_signatories: List<PubKeyHash>,
  inputs: List<Input>,
) -> Bool {
  when owner_payment_credential is {
    VerificationKeyCredential(owner_pkh) ->
      // Verify transaction must be signed by Owner
      list.has(extra_signatories, owner_pkh)
    ScriptCredential(_) -> {
      // In case owner is script address, this script will require at least 1 owner UTxO in input
      // If owner UTxO has enough condition to unlock itself, it can unlock this script as well
      let has_owner_script_in_inputs =
        list.any(
          inputs,
          fn(input) {
            let Input { output, .. } = input
            let Output { address: out_address, .. } = output
            let Address { payment_credential: out_payment_credential, .. } =
              out_address
            out_payment_credential == owner_payment_credential
          },
        )
      has_owner_script_in_inputs
    }
  }
}
