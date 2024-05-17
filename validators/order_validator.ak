use aiken/dict
use aiken/transaction.{ScriptContext, Spend, Transaction}
use aiken/transaction/credential.{Inline, ScriptCredential}
use aiken/transaction/value
use lb_v2/types.{
  CollectOrder, OrderDatum, OrderRedeemer, RedeemOrder, UpdateOrder,
  ValidatorHash, WithdrawOrder,
}
use lb_v2/utils.{order_auth_an}

validator(
  // ValidatorHash of Treasury Contract
  treasury_hash: ValidatorHash,
  // ValidatorHash of Saller Contract
  seller_hash: ValidatorHash,
) {
  fn validate_order(
    _raw_datum: Data,
    raw_redeemer: Data,
    context: ScriptContext,
  ) {
    expect ScriptContext {
      transaction: Transaction { mint, withdrawals, .. },
      purpose: Spend(_),
    } = context
    expect redeemer: OrderRedeemer = raw_redeemer
    when redeemer is {
      CollectOrder ->
        dict.has_key(withdrawals, Inline(ScriptCredential(treasury_hash)))
      UpdateOrder ->
        dict.has_key(withdrawals, Inline(ScriptCredential(seller_hash)))
      RedeemOrder ->
        value.quantity_of(
          value.from_minted_value(mint),
          seller_hash,
          order_auth_an,
        ) < 0
    }
  }
}

// this is unused, only used to access the type in blueprints
validator {
  fn feed_type_order(
    _datum: OrderDatum,
    _redeemer: OrderRedeemer,
    _ctx: ScriptContext,
  ) -> Bool {
    False
  }
}
