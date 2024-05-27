use aiken/builtin
use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Output, OutputReference, ScriptContext, Spend, Transaction,
}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value.{PolicyId, ada_policy_id}
use lb_v2/types.{
  Asset, FactoryDatum, FactoryRedeemer, ManagerDatum, SellerDatum, TreasuryDatum,
  ValidatorHash,
}
use lb_v2/utils.{
  compute_lp_asset_name, default_number_seller, factory_auth_an, seller_auth_an,
  treasury_auth_an,
}
use lb_v2/validation

validator(
  out_ref: OutputReference,
  // ValidatorHash of Treasury Contract
  treasury_hash: ValidatorHash,
  // ValidatorHash of Seller Contract
  manager_hash: ValidatorHash,
  // ValidatorHash of Seller Contract
  seller_hash: ValidatorHash,
  // ValidatorHash of Order Contract
  order_hash: ValidatorHash,
) {
  fn validate_factory(
    datum: FactoryDatum,
    redeemer: FactoryRedeemer,
    context: ScriptContext,
  ) {
    True
    // expect ScriptContext {
    //   transaction: Transaction {
    //     inputs,
    //     mint,
    //     outputs,
    //     extra_signatories,
    //     validity_range,
    //     ..
    //   },
    //   purpose: Spend(factory_ref),
    // } = context
    // let FactoryRedeemer { base_asset, raise_asset } = redeemer
    // let FactoryDatum { head: current_head, tail: current_tail } = datum
    // let (asset_a, asset_b) = utils.sort_two_assets(base_asset, raise_asset)
    // let Asset { policy_id: asset_a_policy_id, asset_name: asset_a_asset_name } =
    //   asset_a
    // let Asset { policy_id: asset_b_policy_id, asset_name: asset_b_asset_name } =
    //   asset_b
    // let lp_asset_name =
    //   compute_lp_asset_name(
    //     asset_a_policy_id,
    //     asset_a_asset_name,
    //     asset_b_policy_id,
    //     asset_b_asset_name,
    //   )
    // expect Some(Input {
    //   output: Output {
    //     address: Address { payment_credential: factory_payment_credential, .. },
    //     ..
    //   },
    //   ..
    // }) =
    //   list.find(
    //     inputs,
    //     fn(input) {
    //       let Input { output_reference: out_ref, .. } = input
    //       out_ref == factory_ref
    //     },
    //   )
    // let factory_inputs =
    //   list.filter(
    //     inputs,
    //     fn(input) {
    //       let Input {
    //         output: Output { address: Address { payment_credential, .. }, .. },
    //         ..
    //       } = input
    //       payment_credential == factory_payment_credential
    //     },
    //   )

    // expect Interval {
    //   upper_bound: IntervalBound {
    //     bound_type: Finite(end_valid_time_range),
    //     ..
    //   },
    //   lower_bound: IntervalBound {
    //     bound_type: Finite(_start_valid_time_range),
    //     ..
    //   },
    // } = validity_range
    // when factory_inputs is {
    //   [factory_input] -> {
    //     // 1. Validate 1 factory In and 2 Factory Outs
    //     // validate legitimate of factory input 
    //     let Input { output: Output { value: factory_input_value, .. }, .. } =
    //       factory_input
    //     expect
    //       value.quantity_of(
    //         factory_input_value,
    //         authen_policy_id,
    //         factory_auth_an,
    //       ) == 1
    //     expect [f_out_head, f_out_tail] =
    //       list.filter(
    //         outputs,
    //         fn(output) {
    //           let Output { address: Address { payment_credential, .. }, .. } =
    //             output
    //           payment_credential == factory_payment_credential
    //         },
    //       )
    //     let Output { datum: f_out_head_datum, value: f_out_head_value, .. } =
    //       f_out_head
    //     let Output { datum: f_out_tail_datum, value: f_out_tail_value, .. } =
    //       f_out_tail
    //     // validate factory outputs
    //     expect and {
    //         // validate that new Factory UTxO datum must be followed by Linked List rule
    //         // (old head, old tail) -> (old head, LP Token Name) and (LP Token Name, old tail)
    //         // old head < LP Token Name < old tail
    //         builtin.less_than_bytearray(current_head, lp_asset_name),
    //         builtin.less_than_bytearray(lp_asset_name, current_tail),
    //         value.quantity_of(
    //           f_out_head_value,
    //           authen_policy_id,
    //           factory_auth_an,
    //         ) == 1,
    //         value.quantity_of(
    //           f_out_tail_value,
    //           authen_policy_id,
    //           factory_auth_an,
    //         ) == 1,
    //         f_out_head_datum == InlineDatum(
    //           FactoryDatum { head: current_head, tail: lp_asset_name },
    //         ),
    //         f_out_tail_datum == InlineDatum(
    //           FactoryDatum { head: lp_asset_name, tail: current_tail },
    //         ),
    //       }
    //     // 2. Validate Treasury Out
    //     // validate that there's only 1 Treasury UTxO in the Transaction Outputs
    //     // Treasury UTxO must contain treasury_token in the value
    //     expect [treasury_out] =
    //       list.filter(
    //         outputs,
    //         fn(output) {
    //           let Output { address: Address { payment_credential, .. }, .. } =
    //             output
    //           payment_credential == ScriptCredential(treasury_hash)
    //         },
    //       )
    //     expect Output {
    //       value: treasury_out_value,
    //       datum: InlineDatum(treasury_out_raw_datum),
    //       ..
    //     } = treasury_out
    //     expect treasury_out_datum: TreasuryDatum = treasury_out_raw_datum
    //     expect
    //       validation.validate_creating_treasury_out(
    //         treasury_out_value: treasury_out_value,
    //         treasury_out_datum: treasury_out_datum,
    //         base_asset: base_asset,
    //         raise_asset: raise_asset,
    //         manager_hash: manager_hash,
    //         seller_hash: seller_hash,
    //         order_hash: order_hash,
    //         authen_policy_id: authen_policy_id,
    //         end_valid_time_range: end_valid_time_range,
    //       )
    //     // 3. Validate Manager Out
    //     // manager 
    //     expect [manager_out] =
    //       list.filter(
    //         outputs,
    //         fn(output) {
    //           let Output { address: Address { payment_credential, .. }, .. } =
    //             output
    //           payment_credential == ScriptCredential(manager_hash)
    //         },
    //       )
    //     expect Output {
    //       value: manager_out_value,
    //       datum: InlineDatum(manager_out_raw_datum),
    //       ..
    //     } = manager_out
    //     expect manager_datum: ManagerDatum = manager_out_raw_datum
    //     expect
    //       validation.validate_creating_manager_out(
    //         base_asset: base_asset,
    //         raise_asset: raise_asset,
    //         manager_out_value: manager_out_value,
    //         manager_out_datum: manager_datum,
    //         treasury_hash: treasury_hash,
    //         seller_hash: seller_hash,
    //         order_hash: order_hash,
    //       )
    //     // 4. Validate Sellers
    //     // validate that there's default_number_seller Seller UTxOs in the Transaction Outputs
    //     // Each Seller UTxO must cointain seller_token in the value
    //     let default_seller_datum =
    //       SellerDatum { base_asset, raise_asset, amount: 0, penalty_amount: 0 }
    //     let seller_outputs =
    //       list.filter(
    //         outputs,
    //         fn(output) {
    //           let Output {
    //             address: Address { payment_credential, .. },
    //             value: out_value,
    //             datum,
    //             ..
    //           } = output
    //           and {
    //             value.quantity_of(out_value, manager_hash, seller_auth_an) == 1,
    //             payment_credential == ScriptCredential(seller_hash),
    //             datum == InlineDatum(default_seller_datum),
    //           }
    //         },
    //       )
    //     expect list.length(seller_outputs) == default_number_seller
    //     and {
    //       // 5. Mint value
    //       value.from_minted_value(mint) == validation.get_value_of_minting_treasury(
    //         authen_policy_id: authen_policy_id,
    //         treasury_policy_id: treasury_hash,
    //         manager_policy_id: manager_hash,
    //         is_create_treasury: True,
    //       ),
    //       // 6. Base-Raise Asset
    //       // base_asset must not ada
    //       // base_asset != raise_asset
    //       base_asset.policy_id != ada_policy_id,
    //       base_asset != raise_asset,
    //     }
    //   }
    //   [factory_input_1, factory_input_2] -> {
    //     // 1. Validate 2 Factory inputs and 1 Factory Output
    //     expect Input {
    //       output: Output {
    //         datum: InlineDatum(factory_input_1_raw_datum),
    //         value: factory_input_1_value,
    //         ..
    //       },
    //       ..
    //     } = factory_input_1
    //     expect Input {
    //       output: Output {
    //         datum: InlineDatum(factory_input_2_raw_datum),
    //         value: factory_input_2_value,
    //         ..
    //       },
    //       ..
    //     } = factory_input_2
    //     let (f_in_head_raw_datum, f_in_tail_raw_datum) =
    //       utils.sort_two_consecutive_factory_datum(
    //         factory_input_1_raw_datum,
    //         factory_input_2_raw_datum,
    //       )
    //     expect f_in_head_datum: FactoryDatum = f_in_head_raw_datum
    //     expect f_in_tail_datum: FactoryDatum = f_in_tail_raw_datum
    //     let FactoryDatum { head: new_f_datum_head, tail: f_datum_tail_lp } =
    //       f_in_head_datum
    //     let FactoryDatum { head: f_datum_head_lp, tail: new_f_datum_tail } =
    //       f_in_tail_datum
    //     expect and {
    //         value.quantity_of(
    //           factory_input_1_value,
    //           authen_policy_id,
    //           treasury_auth_an,
    //         ) == 1,
    //         value.quantity_of(
    //           factory_input_2_value,
    //           authen_policy_id,
    //           treasury_auth_an,
    //         ) == 1,
    //         f_datum_tail_lp == lp_asset_name,
    //         f_datum_head_lp == lp_asset_name,
    //       }
    //     expect Some(factory_output) = list.head(outputs)
    //     let Output {
    //       value: f_out_value,
    //       address: Address { payment_credential: f_out_pc, .. },
    //       datum: f_out_datum,
    //       ..
    //     } = factory_output
    //     expect and {
    //         value.quantity_of(f_out_value, authen_policy_id, factory_auth_an) == 1,
    //         f_out_pc == factory_payment_credential,
    //         f_out_datum == InlineDatum(
    //           FactoryDatum { head: new_f_datum_head, tail: new_f_datum_tail },
    //         ),
    //       }
    //     // 2. Validate treasury in 
    //     expect [treasury_in] =
    //       list.filter(
    //         inputs,
    //         fn(input) {
    //           let Input {
    //             output: Output {
    //               address: Address { payment_credential, .. },
    //               value: out_value,
    //               ..
    //             },
    //             ..
    //           } = input
    //           and {
    //             payment_credential == ScriptCredential(treasury_hash),
    //             value.quantity_of(out_value, authen_policy_id, factory_auth_an) == 1,
    //           }
    //         },
    //       )
    //     expect Input {
    //       output: Output { datum: InlineDatum(treasury_datum_raw), .. },
    //       ..
    //     } = treasury_in
    //     expect treasury_datum: TreasuryDatum = treasury_datum_raw
    //     let TreasuryDatum {
    //       owner,
    //       is_cancelled,
    //       reserve_raise,
    //       total_penalty,
    //       is_manager_collected,
    //       ..
    //     } = treasury_datum
    //     let Address { payment_credential: owner_payment_credential, .. } = owner

    //     and {
    //       value.from_minted_value(mint) == validation.get_value_of_minting_treasury(
    //         authen_policy_id: authen_policy_id,
    //         treasury_policy_id: treasury_hash,
    //         manager_policy_id: manager_hash,
    //         is_create_treasury: False,
    //       ),
    //       // authorize by owner
    //       validation.validate_authorize_by_owner(
    //         owner_payment_credential: owner_payment_credential,
    //         extra_signatories: extra_signatories,
    //         inputs: inputs,
    //       ),
    //       // cancel beacause fail + Collected All sellers and manager + refunded all
    //       and {
    //         is_cancelled == True,
    //         is_manager_collected == True,
    //         reserve_raise == 0,
    //         total_penalty == 0,
    //       },
    //     }
    //   }
    //   _ -> False
    // }
  }

  fn validate_factory_minting(redeemer: FactoryRedeemer, context: ScriptContext) {
    True
  }
}
