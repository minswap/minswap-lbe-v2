use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Output, ScriptContext, Spend, Transaction,
}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value
use lb_v2/manager_validation.{validate_manage_seller}
use lb_v2/types.{
  CollectManager, ManagerDatum, ManagerRedeemer, SpendManager, TreasuryDatum,
  ValidatorHash,
}
use lb_v2/utils.{manager_auth_an}
use lb_v2/validation

// Spending Manager for:
// 1. AddSellers
//   - Increase `seller_count` 
// 2. CollectSellers
//   - Decrease `seller_count`
// 3. SpendManager
//   - Update `reserve_raise`, `total_penalty` of Treasury
validator(
  // ValidatorHash of Treasury Validator
  treasury_hash: ValidatorHash,
) {
  fn validate_manager_spending(
    manager_in_datum: ManagerDatum,
    redeemer: ManagerRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext { purpose: Spend(out_ref), transaction } = context
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
    let ManagerDatum { factory_policy_id, .. } = manager_in_datum
    when redeemer is {
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
      _ -> {
        expect Some(manager_input) =
          list.find(
            inputs,
            fn(input) {
              let Input { output_reference, .. } = input
              output_reference == out_ref
            },
          )
        // Extract some necessary data.
        expect Input {
          output: Output {
            address: Address {
              payment_credential: ScriptCredential(manager_hash),
              ..
            },
            value: manager_in_value,
            ..
          },
          ..
        } = manager_input
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
        // Assertion:
        // - Manager Input is legitimate
        // - Only 1 Manager Input
        expect and {
            value.quantity_of(
              manager_in_value,
              factory_policy_id,
              manager_auth_an,
            ) == 1,
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
            ) == [manager_input],
          }
        validate_manage_seller(
          outputs: outputs,
          inputs: inputs,
          factory_policy_id: factory_policy_id,
          manager_in_datum: manager_in_datum,
          manager_in_value: manager_in_value,
          validity_range: validity_range,
          mint_value: mint_value,
          treasury_datum: treasury_datum,
          redeemer: redeemer,
        )
      }
    }
  }
}
