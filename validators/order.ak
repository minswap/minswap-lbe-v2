use aiken/dict
use aiken/transaction.{ScriptContext, Spend, Transaction}
use aiken/transaction/credential.{Inline, ScriptCredential}
use aiken/transaction/value
use lb_v2/types.{
  CollectOrder, OrderRedeemer, RedeemOrder, UpdateOrder, ValidatorHash,
}
use lb_v2/utils.{order_auth_an}

validator(
  // ValidatorHash of Saller Contract
  seller_hash: ValidatorHash,
  // ValidatorHash of Treasury Contract
  treasury_hash: ValidatorHash,
) {
  fn validate_order(
    _raw_datum: Data,
    raw_redeemer: Data,
    context: ScriptContext,
  ) {
    True
    // expect ScriptContext {
    //   transaction: Transaction { mint, withdrawals, .. },
    //   purpose: Spend(_),
    // } = context
    // expect redeemer: OrderRedeemer = raw_redeemer
    // when redeemer is {
    //   UpdateOrder ->
    //     // -> SellerWithdrawal
    //     dict.has_key(withdrawals, Inline(ScriptCredential(seller_hash)))
    //   CollectOrder ->
    //     // -> TreasuryWithdrawal -> TreasurySpending(others spending need to check no orders)
    //     dict.has_key(withdrawals, Inline(ScriptCredential(treasury_hash)))
    //   RedeemOrder ->
    //     // -> SellerMinting -> TreasurySpending(others spending need to check no orders)
    //     value.quantity_of(
    //       value.from_minted_value(mint),
    //       seller_hash,
    //       order_auth_an,
    //     ) < 0
    // }
  }
}
