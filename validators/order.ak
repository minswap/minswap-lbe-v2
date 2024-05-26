use aiken/dict
use aiken/transaction.{ScriptContext, Spend, Transaction}
use aiken/transaction/credential.{Inline, ScriptCredential}
use aiken/transaction/value
use lb_v2/types.{
  CollectOrder, OrderRedeemer, RedeemOrder, UpdateOrder, UsingSeller,
  ValidatorHash,
}
use lb_v2/utils.{order_auth_an}
use lb_v2/validation

validator(
  // ValidatorHash of Treasury Contract
  treasury_hash: ValidatorHash,
  // ValidatorHash of Saller Contract
  seller_hash: ValidatorHash,
  manager_hash: ValidatorHash,
) {
  fn validate_order(
    _raw_datum: Data,
    raw_redeemer: Data,
    context: ScriptContext,
  ) {
    expect ScriptContext {
      transaction: Transaction { inputs, mint, withdrawals, redeemers, .. },
      purpose: Spend(_),
    } = context
    expect redeemer: OrderRedeemer = raw_redeemer
    when redeemer is {
      UpdateOrder ->
        validation.has_spend_seller(
          inputs: inputs,
          manager_policy_id: manager_hash,
          seller_hash: seller_hash,
          redeemers: redeemers,
          expected_redeemer: UsingSeller,
        )
      CollectOrder ->
        // -> TreasuryWithdrawal -> TreasurySpending(others spending need to check no orders)
        dict.has_key(withdrawals, Inline(ScriptCredential(treasury_hash)))
      RedeemOrder ->
        // -> SellerMinting -> TreasurySpending(others spending need to check no orders)
        value.quantity_of(
          value.from_minted_value(mint),
          seller_hash,
          order_auth_an,
        ) < 0
    }
  }
}
