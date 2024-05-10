use aiken/transaction.{ScriptContext, Spend, Transaction}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{
  OrderMintingDepositOrders, OrderTokenMintingRedeemer, SellerRedeemer,
  SpendCounting, ValidatorHash,
}
use lb_v2/utils.{seller_auth_an}

validator(authen_policy_id: PolicyId, treasury_hash: ValidatorHash) {
  fn validate_seller(_: Data, redeemer: SellerRedeemer, context: ScriptContext) {
    let ScriptContext { purpose, transaction } = context
    let Transaction { mint, .. } = transaction
    expect Spend(_) = purpose
    when redeemer is {
      SpendCounting -> {
        let mint_value = value.from_minted_value(mint)
        value.quantity_of(mint_value, treasury_hash, seller_auth_an) < 0
      }
      _ -> authen_policy_id == #"00"
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
