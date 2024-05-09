use aiken/transaction.{ScriptContext, Spend}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{
  CreateSeller, SellerMintingCreateLBE, SellerTokenMintingRedeemer,
  TreasuryDatum, TreasurySpendingRedeemer,
}

validator(authen_policy_id: PolicyId) {
  fn validate_treasury(
    datum: TreasuryDatum,
    redeemer: TreasurySpendingRedeemer,
    context: ScriptContext,
  ) {
    let ScriptContext { purpose, .. } = context
    expect Spend(_) = purpose
    and {
      datum.reserve_raise == 0,
      authen_policy_id == #"00",
      redeemer == CreateSeller,
    }
  }

  fn validate_minting_seller_nft(
    redeemer: SellerTokenMintingRedeemer,
    context: ScriptContext,
  ) {
    let ScriptContext { purpose, .. } = context
    expect Spend(_) = purpose
    redeemer == SellerMintingCreateLBE
  }
}
