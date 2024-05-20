use aiken/transaction.{ScriptContext, Spend, Transaction}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{ConfigRedeemer, UpdateConfig, UsingConfig, ValidatorHash}
use lb_v2/utils.{config_auth_an}
use lb_v2/validation

validator(authen_policy_id: PolicyId, treasury_hash: ValidatorHash) {
  fn validate_config(
    _datum: Data,
    redeemer: ConfigRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext { purpose: Spend(_), transaction } = context
    let Transaction { inputs, mint, .. } = transaction
    let mint_value = value.from_minted_value(mint)
    when redeemer is {
      UpdateConfig ->
        validation.has_spend_treasury(inputs, authen_policy_id, treasury_hash)
      UsingConfig ->
        value.quantity_of(mint_value, treasury_hash, config_auth_an) < 0
    }
  }
}
