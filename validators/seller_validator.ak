use aiken/transaction.{ScriptContext}
use aiken/transaction/value.{AssetName, PolicyId, from_minted_value}
use lb_v2/types.{
  OrderTokenMintingRedeemer, SellerDatum, SellerRedeemer, ValidatorHash,
}

validator(authen_policy_id: PolicyId, treasury_hash: ValidatorHash) {
  fn validate_seller(
    datum: SellerDatum,
    redeemer: SellerRedeemer,
    context: ScriptContext,
  ) {
    todo
  }

  fn validate_minting_order_nft(
    redeemer: OrderTokenMintingRedeemer,
    context: ScriptContext,
  ) {
    todo
  }
}
