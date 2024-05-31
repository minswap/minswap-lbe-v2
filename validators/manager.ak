use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Output, ScriptContext, Spend, Transaction,
}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value
use lb_v2/types.{
  CollectManager, ManageSeller, ManagerDatum, ManagerRedeemer, SellerDatum,
  SpendManager, TreasuryDatum, ValidatorHash,
}
use lb_v2/utils.{assert, manager_auth_an}
use lb_v2/validation

// Spending Manager for:
// 1. Collect Manager
//   - Purpose: Update `reserve_raise`, `total_penalty` of Treasury
//   - 1 Manager Token needs to be burned (trigger Factory Minting)
//   - 1 Manager Input needs to be spent
//   - 1 Treasury Input needs to be spent
//   - 1 Treasury Output needs to be paid
validator(
  // ValidatorHash of Treasury Validator
  treasury_hash: ValidatorHash,
) {
  fn validate_manager_spending(
    manager_in_datum: ManagerDatum,
    redeemer: ManagerRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext { purpose: Spend(manager_out_ref), transaction } =
      context
    let Transaction {
      mint,
      reference_inputs,
      validity_range,
      inputs,
      outputs,
      redeemers,
      ..
    } = transaction
    let mint_value = value.from_minted_value(mint)
    let ManagerDatum { order_hash, factory_policy_id, .. } = manager_in_datum
    expect [] =
      validation.get_order_inputs(
        inputs: inputs,
        factory_policy_id: factory_policy_id,
        order_hash: order_hash,
      )
    when redeemer is {
      ManageSeller -> {
        expect Some(Input {
          output: Output {
            address: Address {
              payment_credential: ScriptCredential(manager_hash),
              ..
            },
            ..
          },
          ..
        }) =
          list.find(
            inputs,
            fn(input) {
              let Input {
                output_reference: out_ref,
                output: Output { value: sm_in_value, .. },
              } = input
              and {
                out_ref == manager_out_ref,
                assert(
                  value.quantity_of(
                    sm_in_value,
                    factory_policy_id,
                    manager_auth_an,
                  ) == 1,
                  @"Manager input dont have manager token",
                ),
              }
            },
          )
        expect [_] =
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
              payment_credential == ScriptCredential(manager_hash)
            },
          )
        expect [manager_out] =
          list.filter(
            outputs,
            fn(output) {
              let Output {
                address: Address { payment_credential, .. },
                value: sm_in_value,
                ..
              } = output
              payment_credential == ScriptCredential(manager_hash) && value.quantity_of(
                sm_in_value,
                factory_policy_id,
                manager_auth_an,
              ) == 1
            },
          )
        expect [treasury_ref_input] =
          validation.get_treasury_ref_inputs(
            ref_inputs: reference_inputs,
            factory_policy_id: factory_policy_id,
            treasury_hash: treasury_hash,
          )

        expect Input {
          output: Output { datum: InlineDatum(raw_treasury_datum), .. },
          ..
        } = treasury_ref_input
        expect treasury_datum: TreasuryDatum = raw_treasury_datum
        let TreasuryDatum { seller_hash, base_asset, raise_asset, .. } =
          treasury_datum
        let seller_inputs =
          validation.get_seller_inputs(
            inputs: inputs,
            factory_policy_id: factory_policy_id,
            seller_hash: seller_hash,
          )
        let seller_outputs =
          validation.get_seller_outputs(
            outputs: outputs,
            factory_policy_id: factory_policy_id,
            seller_hash: seller_hash,
            seller_datum: SellerDatum {
              factory_policy_id,
              base_asset,
              raise_asset,
              amount: 0,
              penalty_amount: 0,
            },
          )
        validation.validate_manage_seller(
          factory_policy_id: factory_policy_id,
          manager_in_datum: manager_in_datum,
          manager_out: manager_out,
          validity_range: validity_range,
          mint_value: mint_value,
          treasury_datum: treasury_datum,
          seller_inputs: seller_inputs,
          seller_outputs: seller_outputs,
        )
      }
      // Collect Manager Transaction note:
      //   1 Manager Token needs to be burned (trigger Factory Minting)
      //   1 Manager Input needs to be spent
      //   1 Treasury Input needs to be spent
      //   1 Treasury Output needs to be paid
      SpendManager ->
        // Delegate validation logic to the Treasury Validator.
        validation.has_spend_treasury(
          inputs: inputs,
          factory_policy_id: factory_policy_id,
          treasury_hash: treasury_hash,
          redeemers: redeemers,
          expected_redeemer: CollectManager,
        )
    }
  }
}
