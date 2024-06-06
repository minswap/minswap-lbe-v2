use aiken/dict
use aiken/transaction.{ScriptContext, Spend, Transaction}
use aiken/transaction/credential.{Inline, ScriptCredential}
use lb_v2/types.{
  OrderDatum, OrderRedeemer, UpdateOrder, UsingSeller, ValidatorHash,
}
use lb_v2/utils.{assert}
use lb_v2/validation

validator(
  // ValidatorHash of Seller Contract
  seller_hash: ValidatorHash,
) {
  fn validate_order(
    datum: OrderDatum,
    redeemer: OrderRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext {
      transaction: Transaction { inputs, redeemers, withdrawals, .. },
      purpose: Spend(_),
    } = context
    let OrderDatum { factory_policy_id, .. } = datum
    when redeemer is {
      UpdateOrder ->
        assert(
          validation.has_spend_seller(
            inputs: inputs,
            factory_policy_id: factory_policy_id,
            seller_hash: seller_hash,
            redeemers: redeemers,
            expected_redeemer: UsingSeller,
          ),
          @"Using-seller: Tx don't have any seller",
        )
      _ ->
        // Delegate Logic of CollectOrder and RedeemOrder to Factory Withdrawal
        dict.has_key(withdrawals, Inline(ScriptCredential(factory_policy_id)))
    }
  }
}
