use aiken/dict
use aiken/transaction.{ScriptContext, Transaction}
use aiken/transaction/credential.{Inline, ScriptCredential}
use lb_v2/types.{
  CollectOrder, OrderRedeemer, RedeemOrder, ValidatorHash, WithdrawOrder,
}

// use aiken/transaction/value.{PolicyId}

validator(
  // // The PolicyID of Authen Minting Policy
  // authen_policy_id: PolicyId,
  // ValidatorHash of Treasury Contract
  treasury_hash: ValidatorHash,
  // ValidatorHash of Saller Contract
  seller_hash: ValidatorHash,
) {
  fn validate_order(_: Data, redeemer: OrderRedeemer, context: ScriptContext) {
    let ScriptContext { transaction, .. } = context
    let Transaction { withdrawals, .. } = transaction
    when redeemer is {
      WithdrawOrder ->
        dict.has_key(withdrawals, Inline(ScriptCredential(seller_hash)))
      CollectOrder ->
        dict.has_key(withdrawals, Inline(ScriptCredential(treasury_hash)))
      RedeemOrder ->
        dict.has_key(withdrawals, Inline(ScriptCredential(treasury_hash)))
    }
  }
}
