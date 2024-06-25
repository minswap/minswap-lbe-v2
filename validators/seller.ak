use aiken/transaction.{ScriptContext, Spend, Transaction}
use aiken/transaction/value
use lb_v2/types.{
  CollectSellers, CountingSeller, SellerDatum, SellerRedeemer, UsingSeller,
  ValidatorHash,
}
use lb_v2/utils.{manager_auth_an}
use lb_v2/validation

validator(treasury_hash: ValidatorHash, manager_hash: ValidatorHash) {
  fn validate_seller_spending(
    seller_in_datum: SellerDatum,
    redeemer: SellerRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext { purpose: Spend(out_ref), transaction } = context
    let SellerDatum { factory_policy_id, .. } = seller_in_datum
    when redeemer is {
      CountingSeller -> {
        let Transaction { inputs, redeemers, .. } = transaction
        // Delegate Logic to Manager Spend
        validation.has_spend(
          inputs: inputs,
          auth_policy_id: factory_policy_id,
          auth_asset_name: manager_auth_an,
          validator_hash: manager_hash,
          redeemers: redeemers,
          expected_redeemer: CollectSellers,
        )
      }
      UsingSeller -> {
        let Transaction {
          inputs,
          reference_inputs,
          outputs,
          validity_range,
          extra_signatories,
          mint,
          ..
        } = transaction
        let mint_value = value.from_minted_value(mint)
        validation.validate_using_seller(
          treasury_hash: treasury_hash,
          out_ref: out_ref,
          seller_in_datum: seller_in_datum,
          inputs: inputs,
          reference_inputs: reference_inputs,
          outputs: outputs,
          validity_range: validity_range,
          extra_signatories: extra_signatories,
          mint_value: mint_value,
          factory_policy_id: factory_policy_id,
        )
      }
    }
  }
}
