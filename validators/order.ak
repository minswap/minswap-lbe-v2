use aiken/transaction.{ScriptContext, Spend, Transaction}
use lb_v2/types.{
  CollectOrder, CollectOrders, OrderDatum, OrderRedeemer, RedeemOrder,
  RedeemOrders, UpdateOrder, UsingSeller, ValidatorHash,
}
use lb_v2/utils.{assert}
use lb_v2/validation

validator(
  // ValidatorHash of Saller Contract
  seller_hash: ValidatorHash,
  // ValidatorHash of Treasury Contract
  treasury_hash: ValidatorHash,
) {
  fn validate_order(
    datum: OrderDatum,
    redeemer: OrderRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext {
      transaction: Transaction { inputs, redeemers, .. },
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
      CollectOrder ->
        validation.has_spend_treasury(
          inputs: inputs,
          factory_policy_id: factory_policy_id,
          treasury_hash: treasury_hash,
          redeemers: redeemers,
          expected_redeemer: CollectOrders,
        )
      RedeemOrder ->
        validation.has_spend_treasury(
          inputs: inputs,
          factory_policy_id: factory_policy_id,
          treasury_hash: treasury_hash,
          redeemers: redeemers,
          expected_redeemer: RedeemOrders,
        )
    }
  }
}
