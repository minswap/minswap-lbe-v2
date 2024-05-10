use aiken/transaction.{ScriptContext, Spend}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{
  OrderMintingDepositOrders, OrderTokenMintingRedeemer, SellerDatum,
  ValidatorHash,
}

validator(authen_policy_id: PolicyId, treasury_hash: ValidatorHash) {
  fn validate_seller(datum: SellerDatum, _: Data, context: ScriptContext) {
    let ScriptContext { purpose, .. } = context
    expect Spend(_) = purpose
    and {
      datum.amount == 0,
      authen_policy_id == #"00",
      treasury_hash == #"00",
    }
  }

  fn validate_minting_order_nft(
    redeemer: OrderTokenMintingRedeemer,
    context: ScriptContext,
  ) {
    let ScriptContext { purpose, .. } = context
    expect Spend(_) = purpose
    redeemer == OrderMintingDepositOrders
  }
}
