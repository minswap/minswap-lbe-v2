use aiken/dict
use aiken/transaction.{Mint, ScriptContext, Spend, Transaction, WithdrawFrom}
use aiken/transaction/credential.{Inline, ScriptCredential}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{
  CountingSeller, RedeemOrders, SellerDatum, SellerRedeemer, UsingSeller,
  ValidatorHash,
}
use lb_v2/utils.{seller_auth_an}
use lb_v2/validation

validator(
  authen_policy_id: PolicyId,
  treasury_hash: ValidatorHash,
  manager_hash: ValidatorHash,
) {
  fn validate_seller_spending(
    seller_in_datum: SellerDatum,
    redeemer: SellerRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext { purpose: Spend(out_ref), transaction } = context
    let Transaction { mint, .. } = transaction
    let mint_value = value.from_minted_value(mint)
    when redeemer is {
      CountingSeller ->
        // foward logic to Manager Minting
        value.quantity_of(mint_value, manager_hash, seller_auth_an) < 0
      UsingSeller -> {
        let Transaction {
          inputs,
          reference_inputs,
          outputs,
          validity_range,
          extra_signatories,
          ..
        } = transaction
        validation.validate_using_seller(
          treasury_hash: treasury_hash,
          out_ref: out_ref,
          seller_in_datum: seller_in_datum,
          inputs: inputs,
          reference_inputs: reference_inputs,
          outputs: outputs,
          validity_range: validity_range,
          extra_signatories: extra_signatories,
          mint_value: mint_value,
          authen_policy_id: authen_policy_id,
          manager_hash: manager_hash,
        )
      }
    }
  }

  fn validate_seller_minting_or_withdraw(
    _redeemer: SellerRedeemer,
    context: ScriptContext,
  ) {
    let ScriptContext {
      purpose,
      transaction: Transaction { inputs, withdrawals, redeemers, .. },
    } = context
    when purpose is {
      WithdrawFrom(stake_credential) -> {
        // OrderSpending(UpdateOrder) -> SellerWithdrawal -> SellerSpending
        expect Inline(ScriptCredential(seller_hash)) = stake_credential
        validation.has_spend_seller(
          inputs: inputs,
          manager_policy_id: manager_hash,
          seller_hash: seller_hash,
          redeemers: redeemers,
          expected_redeemer: UsingSeller,
        )
      }
      Mint(policy_id) ->
        if dict.has_key(withdrawals, Inline(ScriptCredential(policy_id))) {
          // forward logic to (Seller - WithdrawFrom) -> (Seller - Spending - UsingSeller)
          True
        } else {
          // forward logic to (Treasury-Spending-RedeemOrders)
          validation.has_spend_treasury(
            inputs: inputs,
            authen_policy_id: authen_policy_id,
            treasury_hash: treasury_hash,
            redeemers: redeemers,
            expected_redeemer: RedeemOrders,
          )
        }
      _ -> False
    }
  }
}
