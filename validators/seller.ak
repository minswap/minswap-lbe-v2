use aiken/transaction.{ScriptContext, Spend, Transaction}
use aiken/transaction/value
use lb_v2/types.{
  CollectSellers, CountingSeller, SellerDatum, SellerRedeemer, UsingSeller,
  ValidatorHash,
}
use lb_v2/validation

validator(treasury_hash: ValidatorHash, manager_hash: ValidatorHash) {
  fn validate_seller_spending(
    seller_in_datum: SellerDatum,
    redeemer: SellerRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext { purpose: Spend(out_ref), transaction } = context
    let Transaction { mint, inputs, redeemers, .. } = transaction
    let SellerDatum { factory_policy_id, .. } = seller_in_datum
    let mint_value = value.from_minted_value(mint)
    when redeemer is {
      CountingSeller ->
        validation.has_spend_manager(
          inputs: inputs,
          factory_policy_id: factory_policy_id,
          manager_hash: manager_hash,
          redeemers: redeemers,
          expected_redeemer: CollectSellers,
        )
      UsingSeller -> {
        let Transaction {
          inputs,
          reference_inputs,
          outputs,
          validity_range,
          extra_signatories,
          ..
        } = transaction
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
