use aiken/transaction.{ScriptContext, Spend}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{
  DepositOrders, OrderMintingDepositOrders, OrderTokenMintingRedeemer,
  SellerDatum, SellerRedeemer, ValidatorHash,
}

validator(authen_policy_id: PolicyId, treasury_hash: ValidatorHash) {
  fn validate_seller(
    datum: SellerDatum,
    redeemer: SellerRedeemer,
    context: ScriptContext,
  ) {
    let ScriptContext { purpose, .. } = context
    expect Spend(_) = purpose
    and {
      datum.total_fund == 0,
      authen_policy_id == #"00",
      treasury_hash == #"00",
      redeemer == DepositOrders,
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
