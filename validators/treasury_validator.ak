use aiken/transaction.{Input, Output, ScriptContext, Transaction}
use aiken/transaction/value.{AssetName, PolicyId, from_minted_value}
use lb_v2/types.{
  SellerTokenMintingRedeemer, TreasuryDatum, TreasurySpendingRedeemer,
  ValidatorHash,
}

validator(authen_policy_id: PolicyId) {
  fn validate_treasury(
    datum: TreasuryDatum,
    redeemer: TreasurySpendingRedeemer,
    context: ScriptContext,
  ) {
    todo
  }

  fn validate_minting_seller_nft(
    redeemer: SellerTokenMintingRedeemer,
    context: ScriptContext,
  ) {
    todo
  }
}
