use aiken/transaction.{ScriptContext}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{OrderDatum, OrderRedeemer, ValidatorHash}

validator(
  // The PolicyID of Authen Minting Policy
  authen_policy_id: PolicyId,
  // ValidatorHash of Treasury Contract
  treasury_hash: ValidatorHash,
  // ValidatorHash of Saller Contract
  seller_hash: ValidatorHash,
) {
  fn validate_order(
    datum: OrderDatum,
    redeemer: OrderRedeemer,
    context: ScriptContext,
  ) {
    todo
  }
}
