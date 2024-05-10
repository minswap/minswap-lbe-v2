use aiken/transaction.{Mint, ScriptContext, Spend, Transaction}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{CreateTreasury, InitTreasury, MintSeller, TreasuryRedeemer}
use lb_v2/validation

validator(authen_policy_id: PolicyId) {
  fn validate_treasury(
    _: Data,
    redeemer: TreasuryRedeemer,
    context: ScriptContext,
  ) {
    let ScriptContext { purpose, transaction } = context
    let Transaction { mint, .. } = transaction
    let ok =
      when purpose is {
        Spend(_) -> True
        Mint(treasury_policy_id) -> {
          expect MintSeller { step: mint_seller_step, .. } = redeemer
          when mint_seller_step is {
            InitTreasury ->
              value.from_minted_value(mint) == validation.get_value_of_minting_treasury(
                authen_policy_id: authen_policy_id,
                treasury_policy_id: treasury_policy_id,
                step: CreateTreasury,
              )
            _ -> False
          }
        }
        _ -> False
      }
    ok
  }
}
