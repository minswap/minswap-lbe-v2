use aiken/builtin
use aiken/dict.{Dict}
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Mint, Output, OutputReference, Redeemer, ScriptContext,
  ScriptPurpose, Spend, Transaction, WithdrawFrom,
}
use aiken/transaction/credential.{Address, Inline, ScriptCredential}
use aiken/transaction/value.{AssetName, PolicyId, Value}
use lb_v2/treasury_validation.{validate_creating_treasury_out}
use lb_v2/types.{
  AddSellers, Asset, BurnSeller, CloseTreasury, CollectManager, CollectOrders,
  CollectSellers, CreateTreasury, FactoryDatum, FactoryRedeemer, Initialization,
  ManageOrder, ManagerDatum, MintManager, MintOrder, MintRedeemOrders,
  MintSeller, RedeemOrders, TreasuryDatum, UsingSeller, ValidatorHash,
}
use lb_v2/utils.{
  assert, compute_lp_asset_name, factory_auth_an, make_wrapper_redeemer,
  manager_auth_an, manager_minimum_ada, minimum_number_seller,
  must_get_end_validity, seller_auth_an, treasury_auth_an,
}
use lb_v2/validation

// Spending Factory for:
// 1. Create a new Treasury (redeemer: )
//    - 1 Factory Input needs to be spent
//    - 2 Factory Outputs need to be paid
//    - 1 Factory Token needs to be mint
//    - 1 Treasury Token needs to be mint
//    - 1 Treasury Ouptut needs to be paid
//    - 1 Manager Token needs to be mint
//    - 1 Manager Ouptut needs to be paid
//    - at least @minimum_number_seller need to be mint
//    - at least @minimum_number_seller Seller Ouptuts need to be paid
// 2. Close a Treasury:
//    - 1 Treasury Token needs to be burn
//    - 1 Treasury Input needs to be spent
//    - 1 Factory Token needs to be burn
//    - 2 Factory Inputs need to be spent
//    - 1 Factory Output need to be paid
//    - Authorize by Project Owner
validator(
  // seed output to initialize Factory Linked List 
  out_ref: OutputReference,
  // ValidatorHash of Treasury Validator
  treasury_hash: ValidatorHash,
  // ValidatorHash of Seller Validator
  manager_hash: ValidatorHash,
  // ValidatorHash of Seller Validator
  seller_hash: ValidatorHash,
  // ValidatorHash of Order Validator
  order_hash: ValidatorHash,
) {
  fn validate_factory(
    datum: FactoryDatum,
    redeemer: FactoryRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext { transaction, purpose: Spend(factory_ref) } = context
    let Transaction {
      inputs,
      mint,
      outputs,
      extra_signatories,
      validity_range,
      ..
    } = transaction
    // find own's input to get `factory_hash`
    expect Some(Input {
      output: Output {
        address: Address {
          payment_credential: ScriptCredential(factory_hash),
          ..
        },
        ..
      },
      ..
    }) =
      list.find(
        inputs,
        fn(input) {
          let Input { output_reference: in_out_ref, .. } = input
          in_out_ref == factory_ref
        },
      )
    // find all Factory Inputs
    let factory_inputs =
      list.filter(
        inputs,
        fn(input) {
          let Input {
            output: Output { address: Address { payment_credential, .. }, .. },
            ..
          } = input
          payment_credential == ScriptCredential(factory_hash)
        },
      )
    // find all Factory Outputs
    let factory_outputs =
      list.filter(
        outputs,
        fn(output) {
          let Output { address: Address { payment_credential, .. }, .. } =
            output
          payment_credential == ScriptCredential(factory_hash)
        },
      )
    // Extract some necessary data.
    let end_valid_time_range = must_get_end_validity(validity_range)
    let FactoryDatum { head: current_head, tail: current_tail } = datum
    let (base_asset, raise_asset) =
      when redeemer is {
        CreateTreasury { base_asset: d_base_asset, raise_asset: d_raise_asset } ->
          (d_base_asset, d_raise_asset)
        CloseTreasury { base_asset: d_base_asset, raise_asset: d_raise_asset } ->
          (d_base_asset, d_raise_asset)
        _ -> fail @"Only spending Factory Input when Create | Close Treasury"
      }
    // sort to compute `asset_a`, `asset_b` in term AMM Pool Assets  
    let (asset_a, asset_b) = utils.sort_two_assets(base_asset, raise_asset)
    let Asset { policy_id: asset_a_policy_id, asset_name: asset_a_asset_name } =
      asset_a
    let Asset { policy_id: asset_b_policy_id, asset_name: asset_b_asset_name } =
      asset_b
    // Compute `lp_asset_name` in term AMM Pool LP Token
    let lp_asset_name =
      compute_lp_asset_name(
        asset_a_policy_id,
        asset_a_asset_name,
        asset_b_policy_id,
        asset_b_asset_name,
      )
    when redeemer is {
      CreateTreasury { .. } -> {
        let Transaction { datums, .. } = transaction
        // finding exactly 1 Factory Input
        expect [factory_input] = factory_inputs
        // finding exactly 2 Factory Outputs
        expect [f_out_head, f_out_tail] = factory_outputs
        // finding exactly 1 Treasury Output
        let treasury_output =
          validation.get_treasury_output(
            outputs: outputs,
            factory_policy_id: factory_hash,
            treasury_hash: treasury_hash,
          )
        // finding exactly 1 Manager Output
        expect [manager_output] =
          list.filter(
            outputs,
            fn(output) {
              let Output { address: Address { payment_credential, .. }, .. } =
                output
              // output belongs Manager Address
              payment_credential == ScriptCredential(manager_hash)
            },
          )
        // Extract some necessary data.
        let Input { output: Output { value: factory_input_value, .. }, .. } =
          factory_input
        let Output {
          datum: f_out_head_datum,
          value: f_out_head_value,
          reference_script: f_out_head_ref_script,
          ..
        } = f_out_head
        let Output {
          datum: f_out_tail_datum,
          value: f_out_tail_value,
          reference_script: f_out_tail_ref_script,
          ..
        } = f_out_tail
        let mint_value = value.from_minted_value(mint)
        let mint_seller_count =
          value.quantity_of(mint_value, factory_hash, seller_auth_an)
        let default_manager_output =
          build_default_manager_output(
            factory_policy_id: factory_hash,
            manager_hash: manager_hash,
            base_asset: base_asset,
            raise_asset: raise_asset,
            seller_count: mint_seller_count,
          )
        // Trivial Assertions
        expect
          assert(
            value.quantity_of(
              factory_input_value,
              factory_hash,
              factory_auth_an,
            ) == 1,
            @"Factory Input must be Legit!",
          )
        expect assert(and {
              // validate that new Factory UTxO datum must be followed by Linked List rule
              // (old head, old tail) -> (old head, LP Token Name) and (LP Token Name, old tail)
              // old head < LP Token Name < old tail
              builtin.less_than_bytearray(current_head, lp_asset_name),
              builtin.less_than_bytearray(lp_asset_name, current_tail),
              // Factory Output must contains 1 Factory Token
              value.quantity_of(f_out_head_value, factory_hash, factory_auth_an) == 1,
              value.quantity_of(f_out_tail_value, factory_hash, factory_auth_an) == 1,
              // Factory Output must contains only ADA and Factory Token
              list.length(value.flatten(f_out_head_value)) == 2,
              list.length(value.flatten(f_out_tail_value)) == 2,
              // Head Factory Datum must be correct!
              f_out_head_datum == InlineDatum(
                FactoryDatum { head: current_head, tail: lp_asset_name },
              ),
              // Tail Factory Datum must be correct!
              f_out_tail_datum == InlineDatum(
                FactoryDatum { head: lp_asset_name, tail: current_tail },
              ),
              // Prevent Factory Output becoming heavy!
              f_out_head_ref_script == None,
              f_out_tail_ref_script == None,
            }, @"2 Factory Outputs must pay correctly!")
        // Assertions:
        and {
          // Manager Output must pay correctly!
          manager_output == default_manager_output,
          // Must prepare enough Sellers
          mint_seller_count >= minimum_number_seller,
          // Seller Outputs must pay correctly!
          validation.validate_seller_outputs(
            outputs: outputs,
            factory_policy_id: factory_hash,
            base_asset: base_asset,
            raise_asset: raise_asset,
            seller_hash: seller_hash,
            seller_count: mint_seller_count,
          ),
          // Treasury Output must pay correctly!
          validate_creating_treasury_out(
            treasury_out: treasury_output,
            base_asset: base_asset,
            raise_asset: raise_asset,
            manager_hash: manager_hash,
            seller_hash: seller_hash,
            order_hash: order_hash,
            factory_policy_id: factory_hash,
            end_valid_time_range: end_valid_time_range,
            datums: datums,
            extra_signatories: extra_signatories,
            inputs: inputs,
          ),
          // Mint Value must be correct!
          mint_value == get_minting_treasury(
            factory_policy_id: factory_hash,
            seller_count: mint_seller_count,
          ),
        }
      }
      CloseTreasury { .. } -> {
        // finding exactly 2 Factory Inputs
        expect [factory_input_1, factory_input_2] = factory_inputs
        // finding exactly 1 Factory Output
        expect [factory_output] = factory_outputs
        // finding exactly 1 Treasury Input
        expect [treasury_input] =
          list.filter(
            inputs,
            fn(input) {
              let Input {
                output: Output {
                  address: Address { payment_credential, .. },
                  ..
                },
                ..
              } = input
              payment_credential == ScriptCredential(treasury_hash)
            },
          )
        // extract some necessary data
        expect Input {
          output: Output {
            datum: InlineDatum(factory_input_1_raw_datum),
            value: factory_input_1_value,
            ..
          },
          ..
        } = factory_input_1
        expect Input {
          output: Output {
            datum: InlineDatum(factory_input_2_raw_datum),
            value: factory_input_2_value,
            ..
          },
          ..
        } = factory_input_2
        expect Output {
          value: factory_out_value,
          datum: InlineDatum(factory_out_datum),
          reference_script: factory_out_ref_script,
          ..
        } = factory_output
        expect Input {
          output: Output {
            datum: InlineDatum(treasury_datum_raw),
            value: treasury_in_value,
            ..
          },
          ..
        } = treasury_input
        expect treasury_datum: TreasuryDatum = treasury_datum_raw
        let TreasuryDatum {
          base_asset: t_base_asset,
          raise_asset: t_raise_asset,
          owner,
          is_cancelled,
          reserve_raise,
          total_penalty,
          is_manager_collected,
          ..
        } = treasury_datum
        let Address { payment_credential: owner_payment_credential, .. } = owner
        and {
          // Auth Token Assertions:
          value.quantity_of(
            factory_input_1_value,
            factory_hash,
            factory_auth_an,
          ) == 1,
          value.quantity_of(
            factory_input_2_value,
            factory_hash,
            factory_auth_an,
          ) == 1,
          value.quantity_of(factory_out_value, factory_hash, factory_auth_an) == 1,
          value.quantity_of(treasury_in_value, factory_hash, treasury_auth_an) == 1,
          // Remove Factory Linked List must be correct!
          validate_factory_remove_node(
            out_datum: factory_out_datum,
            in_datum_1: factory_input_1_raw_datum,
            in_datum_2: factory_input_2_raw_datum,
            lp_asset_name: lp_asset_name,
          ),
          list.length(value.flatten(factory_out_value)) == 2,
          factory_out_ref_script == None,
          // LBE ID Assertions
          t_base_asset == base_asset,
          t_raise_asset == raise_asset,
          value.from_minted_value(mint) == get_burning_treasury(
            factory_policy_id: factory_hash,
          ),
          // authorize by owner
          validation.validate_authorize_by_owner(
            owner_payment_credential: owner_payment_credential,
            extra_signatories: extra_signatories,
            inputs: inputs,
          ),
          // LBE should already cancelled
          is_cancelled,
          // All Manager, Sellers must be collected!
          is_manager_collected,
          // All Orders have been executed.
          reserve_raise == 0,
          // All Penalty have been handled.
          total_penalty == 0,
        }
      }
      _ -> False
    }
  }

  fn validate_factory_minting(redeemer: FactoryRedeemer, context: ScriptContext) {
    let ScriptContext {
      transaction: Transaction { inputs, outputs, redeemers, mint, .. },
      purpose,
    } = context
    let mint_value = value.from_minted_value(mint)
    when purpose is {
      WithdrawFrom(stake_credential) -> {
        expect Inline(ScriptCredential(factory_policy_id)) = stake_credential
        and {
          when value.flatten(mint_value) is {
            [] ->
              // Delegate validation logic to the Treasury Validator.
              validation.has_spend(
                inputs: inputs,
                auth_policy_id: factory_policy_id,
                auth_asset_name: treasury_auth_an,
                validator_hash: treasury_hash,
                redeemers: redeemers,
                expected_redeemer: CollectOrders,
              )
            _ ->
              // Delegate validation logic to the Treasury Validator.
              validation.has_spend(
                inputs: inputs,
                auth_policy_id: factory_policy_id,
                auth_asset_name: treasury_auth_an,
                validator_hash: treasury_hash,
                redeemers: redeemers,
                expected_redeemer: RedeemOrders,
              )
          },
          redeemer == ManageOrder,
        }
      }
      Mint(factory_policy_id) ->
        when redeemer is {
          // Init Factory Linked List
          Initialization ->
            validate_initialization(
              inputs: inputs,
              outputs: outputs,
              factory_policy_id: factory_policy_id,
              out_ref: out_ref,
              mint_value: mint_value,
            )
          // Delegate validation logic to the Treasury Validator.
          CreateTreasury { .. } ->
            has_spend_factory(inputs, factory_policy_id, redeemers, redeemer)
          // Delegate validation logic to the Treasury Validator.
          CloseTreasury { .. } ->
            has_spend_factory(inputs, factory_policy_id, redeemers, redeemer)
          // Collect Manager Transaction note:
          //   1 Manager Token needs to be burned (trigger Factory Minting)
          //   1 Manager Input needs to be spent
          //   1 Treasury Input needs to be spent
          //   1 Treasury Output needs to be paid
          // Delegate validation logic to the Treasury Validator.
          MintManager ->
            // Delegate validation logic to the Treasury Validator.
            validation.has_spend(
              inputs: inputs,
              auth_policy_id: factory_policy_id,
              auth_asset_name: treasury_auth_an,
              validator_hash: treasury_hash,
              redeemers: redeemers,
              expected_redeemer: CollectManager,
            )
          MintSeller ->
            // Delegate Logic to Manager Spend
            validation.has_spend(
              inputs: inputs,
              auth_policy_id: factory_policy_id,
              auth_asset_name: manager_auth_an,
              validator_hash: manager_hash,
              redeemers: redeemers,
              expected_redeemer: AddSellers,
            )
          BurnSeller ->
            // Delegate Logic to Manager Spend
            validation.has_spend(
              inputs: inputs,
              auth_policy_id: factory_policy_id,
              auth_asset_name: manager_auth_an,
              validator_hash: manager_hash,
              redeemers: redeemers,
              expected_redeemer: CollectSellers,
            )
          MintOrder ->
            // Delegate Logic to Seller Spend
            validation.has_spend(
              inputs: inputs,
              auth_policy_id: factory_policy_id,
              auth_asset_name: seller_auth_an,
              validator_hash: seller_hash,
              redeemers: redeemers,
              expected_redeemer: UsingSeller,
            )
          MintRedeemOrders ->
            // Delegate validation logic to the Treasury Validator.
            validation.has_spend(
              inputs: inputs,
              auth_policy_id: factory_policy_id,
              auth_asset_name: treasury_auth_an,
              validator_hash: treasury_hash,
              redeemers: redeemers,
              expected_redeemer: RedeemOrders,
            )
          _ -> False
        }
      _ -> False
    }
  }
}

// Validate Transaction Init Factory Linked List
// Assertions:
// - Spending @out_ref
// - Mint 1 Factory Token
// - Paying 1 Legitimate Factory Token
fn validate_initialization(
  inputs: List<Input>,
  outputs: List<Output>,
  factory_policy_id: PolicyId,
  out_ref: OutputReference,
  mint_value: Value,
) -> Bool {
  // Ensure transaction's outptus contain exactly 1 Factory Output 
  expect [
    Output {
      value: out_value,
      datum,
      reference_script: factory_reference_script,
      ..
    },
  ] =
    list.filter(
      outputs,
      fn(output) {
        let Output { address: Address { payment_credential, .. }, .. } = output
        payment_credential == ScriptCredential(factory_policy_id)
      },
    )
  and {
    factory_reference_script == None,
    list.length(value.flatten(out_value)) == 2,
    // Must spend @out_ref
    list.any(
      inputs,
      fn(input) {
        let Input { output_reference, .. } = input
        output_reference == out_ref
      },
    ),
    // Must mint 1 Factory Token
    value.flatten(mint_value) == [(factory_policy_id, factory_auth_an, 1)],
    // Factory Output must contain 1 Factory Token
    value.quantity_of(out_value, factory_policy_id, factory_auth_an) == 1,
    // Factory Datum must be correct!
    datum == InlineDatum(
      FactoryDatum {
        head: #"00",
        tail: #"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
      },
    ),
  }
}

// Transaction's spending Legit Factory Input base on `expected_redeemer`
fn has_spend_factory(
  inputs: List<Input>,
  factory_hash: ValidatorHash,
  redeemers: Dict<ScriptPurpose, Redeemer>,
  expected_redeemer: FactoryRedeemer,
) -> Bool {
  // finding Legit Factory Inputs
  let factory_inputs =
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
          // input belongs Treasury Address
          payment_credential == ScriptCredential(factory_hash),
          // Factory Input must contains exactly 1 Factory Token
          value.quantity_of(in_value, factory_hash, factory_auth_an) == 1,
        }
      },
    )
  // wrapping Factory Mint Redeemer -> Factory Spend Redeemer
  let wrapper_redeemer = Some(make_wrapper_redeemer(expected_redeemer))
  when expected_redeemer is {
    CreateTreasury { .. } -> {
      // CreateTreasury require only 1 Factory Input
      expect [Input { output_reference, .. }] = factory_inputs
      dict.get(redeemers, Spend(output_reference)) == wrapper_redeemer
    }
    CloseTreasury { .. } -> {
      // CloseTreasury require 2 Factory Inputs as Head, Tail node
      expect [
        Input { output_reference: head_out_ref, .. },
        Input { output_reference: tail_out_ref, .. },
      ] = factory_inputs
      and {
        dict.get(redeemers, Spend(head_out_ref)) == wrapper_redeemer,
        dict.get(redeemers, Spend(tail_out_ref)) == wrapper_redeemer,
      }
    }
    _ -> False
  }
}

// return Manager Output when creating Treasury
fn build_default_manager_output(
  factory_policy_id: ValidatorHash,
  manager_hash: ValidatorHash,
  base_asset: Asset,
  raise_asset: Asset,
  seller_count: Int,
) -> Output {
  let manager_address = credential.from_script(manager_hash)
  // build default manager datum
  let manager_datum =
    ManagerDatum {
      factory_policy_id,
      base_asset,
      raise_asset,
      seller_count,
      reserve_raise: 0,
      total_penalty: 0,
    }
  // build default manager value
  let manager_value =
    value.from_lovelace(manager_minimum_ada)
      |> value.add(factory_policy_id, manager_auth_an, 1)
  Output {
    address: manager_address,
    value: manager_value,
    datum: InlineDatum(manager_datum),
    reference_script: None,
  }
}

// Close LBE require remove 1 node from Factory Linked List
// Logic remove node from Linked List is classic!
fn validate_factory_remove_node(
  // Factory Out Datum Raw
  out_datum: Data,
  // First Factory In Datum Raw
  in_datum_1: Data,
  // Second Factory In Datum Raw
  in_datum_2: Data,
  // LP Asset Name of LBE
  lp_asset_name: AssetName,
) -> Bool {
  // sorting to find Head, Tail Node in term Factory Linked List
  let (head_datum_raw, tail_datum_raw) =
    utils.sort_two_consecutive_factory_datum(in_datum_1, in_datum_2)
  expect head_datum: FactoryDatum = head_datum_raw
  expect tail_datum: FactoryDatum = tail_datum_raw
  expect factory_out_datum: FactoryDatum = out_datum
  and {
    factory_out_datum == FactoryDatum {
      head: head_datum.head,
      tail: tail_datum.tail,
    },
    head_datum.tail == lp_asset_name,
    tail_datum.head == lp_asset_name,
  }
}

// return Mint Value when creating new Treasury
fn get_minting_treasury(factory_policy_id: PolicyId, seller_count: Int) -> Value {
  value.from_asset(factory_policy_id, factory_auth_an, 1)
    |> value.add(factory_policy_id, treasury_auth_an, 1)
    |> value.add(factory_policy_id, manager_auth_an, 1)
    |> value.add(factory_policy_id, seller_auth_an, seller_count)
}

// return Mint Value when close a Treasury
fn get_burning_treasury(factory_policy_id: PolicyId) -> Value {
  value.from_asset(factory_policy_id, factory_auth_an, -1)
    |> value.add(factory_policy_id, treasury_auth_an, -1)
}
