use aiken/dict.{Dict}
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Output, OutputReference, Redeemer, ScriptPurpose, Spend,
  ValidityRange,
}
use aiken/transaction/credential.{
  Address, PaymentCredential, ScriptCredential, VerificationKeyCredential,
}
use aiken/transaction/value.{PolicyId, Value, ada_asset_name, ada_policy_id}
use lb_v2/types.{
  Asset, ManagerDatum, ManagerRedeemer, OrderDatum, PenaltyConfig, PubKeyHash,
  SellerDatum, SellerRedeemer, TreasuryDatum, TreasuryRedeemer, ValidatorHash,
}
use lb_v2/utils.{
  amm_authen_policy_id, amm_pool_auth_asset_name, amm_pool_validation_hash,
  assert, calculate_penalty, fee_ada, manager_auth_an,
  must_get_start_end_validity, order_auth_an, order_minimum_ada, seller_auth_an,
  seller_minimum_ada, treasury_auth_an,
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
      let Input {
        output: Output {
          address: Address { payment_credential, .. },
          value: in_value,
          ..
        },
        ..
      } = input
      and {
        value.quantity_of(in_value, factory_policy_id, seller_auth_an) == 1,
        payment_credential == ScriptCredential(seller_hash),
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

pub fn get_amm_pool_output(outputs: List<Output>) -> Output {
  expect [pool_output] =
    list.filter(
      outputs,
      fn(output) {
        let Output { address: Address { payment_credential, .. }, value, .. } =
          output
        and {
          payment_credential == ScriptCredential(amm_pool_validation_hash),
          value.quantity_of(
            value,
            amm_authen_policy_id,
            amm_pool_auth_asset_name,
          ) == 1,
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
      and {
        payment_credential == ScriptCredential(order_hash),
        value.quantity_of(out_value, factory_policy_id, order_auth_an) == 1,
        reference_script == None,
      }
    },
  )
}

// Assertions:
// - All Sellers must be collected before collecting Manager => no need to check time range
// - 1 Treasury Output needs to be paid
// - 1 Manager Input needs to be spent
// - Treasury Input and Manager Input must be the same LBE ID.
// - The Treasury Values have no changes.
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

// Assertions:
// 3 use-cases: Deposit | Update | WithdrawAll Orders
// The LBE is not cancelled
// Treasury, Seller, Orders share the same LBE ID
// Time Range: in discovery phase
// Spending exactly 1 Legit Seller Input
// Paying 1 Seller Output correctly!
// Paying Order Outputs correctly!
// Spending Order Input requires the owner's authorization
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
  let (start_valid_time_range, end_valid_time_range) =
    must_get_start_end_validity(validity_range)
  // Finding 1 Treasury Ref Input, 1 Seller Input, 1 Seller Output, Order Inputs, Order Outputs
  expect [treasury_ref_input] =
    get_treasury_ref_inputs(reference_inputs, factory_policy_id, treasury_hash)
  expect Input {
    output: Output { datum: InlineDatum(raw_treasury_datum), .. },
    ..
  } = treasury_ref_input
  expect TreasuryDatum {
    factory_policy_id,
    seller_hash,
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
  expect Some(seller_input) =
    list.find(
      inputs,
      fn(input) {
        let Input { output_reference, .. } = input
        output_reference == out_ref
      },
    )
  let SellerDatum {
    base_asset: s_base_asset,
    raise_asset: s_raise_asset,
    amount,
    penalty_amount,
    ..
  } = seller_in_datum
  let Input { output: Output { value: seller_input_value, .. }, .. } =
    seller_input
  expect [seller_output] =
    list.filter(
      outputs,
      fn(output) {
        let Output { address: Address { payment_credential, .. }, .. } = output
        payment_credential == ScriptCredential(seller_hash)
      },
    )
  expect Output {
    value: seller_output_value,
    datum: InlineDatum(seller_output_raw_datum),
    reference_script: seller_output_rs,
    ..
  } = seller_output
  expect seller_output_datum: SellerDatum = seller_output_raw_datum
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
  let order_input_count = list.length(order_inputs)
  let order_output_count = list.length(order_outputs)
  and {
    // prevent spam
    order_input_count + order_output_count > 0,
    // Validate Seller Input
    value.quantity_of(seller_input_value, factory_policy_id, seller_auth_an) == 1,
    s_base_asset == base_asset,
    s_raise_asset == raise_asset,
    // Spending exactly 1 Legit Seller Input
    list.filter(
      inputs,
      fn(input) {
        let Input {
          output: Output { address: Address { payment_credential, .. }, .. },
          ..
        } = input
        payment_credential == ScriptCredential(seller_hash)
      },
    ) == [seller_input],
    // Validate Seller Output
    seller_output_value == seller_input_value,
    seller_output_rs == None,
    seller_output_datum == SellerDatum {
      ..seller_in_datum,
      amount: amount + delta_amount,
      penalty_amount: penalty_amount + delta_penalty,
    },
    // validate time frame
    start_time <= start_valid_time_range,
    end_valid_time_range <= end_time,
    // validate minting
    mint_value == value.from_asset(
      factory_policy_id,
      order_auth_an,
      order_output_count - order_input_count,
    ),
    // The LBE is not cancelled
    is_cancelled == False,
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
          output: Output { datum: InlineDatum(raw_o_datum), .. },
          ..
        } = order_input
        let (acc_amount, acc_penalty) = acc
        expect OrderDatum {
          base_asset: o_base_asset,
          raise_asset: o_raise_asset,
          amount,
          penalty_amount,
          owner,
          ..
        }: OrderDatum = raw_o_datum
        let Address { payment_credential: owner_payment_credential, .. } = owner
        // validate orders
        expect and {
            validate_authorize_by_owner(
              owner_payment_credential: owner_payment_credential,
              extra_signatories: extra_signatories,
              inputs: inputs,
            ),
            o_base_asset == base_asset,
            o_raise_asset == raise_asset,
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
          reference_script: None,
          ..
        } = order_output
        let (acc_amount, acc_penalty) = acc
        expect OrderDatum {
          factory_policy_id: o_factory_policy_id,
          base_asset: o_base_asset,
          raise_asset: o_raise_asset,
          amount,
          is_collected,
          penalty_amount,
          ..
        }: OrderDatum = raw_o_datum
        let expected_order =
          value.from_asset(factory_policy_id, order_auth_an, 1)
            |> value.add(
                raise_asset.policy_id,
                raise_asset.asset_name,
                amount + penalty_amount,
              )
            |> value.add(
                ada_policy_id,
                ada_asset_name,
                order_minimum_ada + fee_ada * 2,
              )
        let minimum_amount =
          when minimum_order_raise is {
            Some(minn) -> minn
            None -> 0
          }
        // validate orders
        expect and {
            o_factory_policy_id == factory_policy_id,
            is_collected == False,
            o_base_asset == base_asset,
            o_raise_asset == raise_asset,
            penalty_amount >= 0,
            amount + penalty_amount > 0,
            when amount is {
              // order amount == 0 mean withdraw all
              0 -> True
              // order amount cannot less than minimum_amount
              _ -> amount >= minimum_amount
            },
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
      total_output_penalty == penalty + total_input_penalty,
      @"Invalid penalty amount",
    )

  (
    total_output_amount - total_input_amount,
    total_output_penalty - total_input_penalty,
  )
}

// return Seller Output when creating Treasury
pub fn build_default_seller_output(
  factory_policy_id: ValidatorHash,
  base_asset: Asset,
  raise_asset: Asset,
  seller_hash: ValidatorHash,
) -> Output {
  let seller_address = credential.from_script(seller_hash)
  // build default seller datum
  let seller_datum =
    SellerDatum {
      factory_policy_id,
      base_asset,
      raise_asset,
      amount: 0,
      penalty_amount: 0,
    }
  // build default seller value
  let seller_value =
    value.from_lovelace(seller_minimum_ada)
      |> value.add(factory_policy_id, seller_auth_an, 1)
  Output {
    address: seller_address,
    value: seller_value,
    datum: InlineDatum(seller_datum),
    reference_script: None,
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
