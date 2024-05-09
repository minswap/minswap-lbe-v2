use aiken/transaction.{ScriptContext, Spend}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{CancelOrder, OrderDatum, OrderRedeemer, ValidatorHash}

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
    let ScriptContext { purpose, .. } = context
    expect Spend(_) = purpose
    and {
      authen_policy_id == #"00",
      treasury_hash == #"00",
      seller_hash == #"00",
      datum.amount == 0,
      redeemer == CancelOrder,
    }
  }
}
