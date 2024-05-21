use aiken/transaction.{Mint, ScriptContext, Spend, Transaction, WithdrawFrom}
use aiken/transaction/credential.{Inline, ScriptCredential}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{
  CollectOrderToken, CountingSeller, SellerDatum, SellerRedeemer, UsingSeller,
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
        // foward logic to Treasury Minting
        value.quantity_of(mint_value, treasury_hash, seller_auth_an) < 0
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
      _ -> False
    }
  }

  fn validate_seller_minting_or_withdraw(
    redeemer: SellerRedeemer,
    context: ScriptContext,
  ) {
    let ScriptContext { purpose, transaction: Transaction { inputs, .. } } =
      context
    when redeemer is {
      UsingSeller -> {
        let seller_hash =
          when purpose is {
            Mint(policy_id) -> policy_id
            WithdrawFrom(stake_credential) -> {
              expect Inline(ScriptCredential(script_hash)) = stake_credential
              script_hash
            }
            _ -> fail
          }
        validation.has_spend_seller(inputs, manager_hash, seller_hash)
      }
      CollectOrderToken ->
        validation.has_spend_treasury(inputs, authen_policy_id, treasury_hash)
      CountingSeller -> False
    }
  }
}
