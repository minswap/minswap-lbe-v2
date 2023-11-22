use aiken/dict
use aiken/list
use aiken/transaction.{
  Input, Output, ScriptContext, Spend, Transaction, WithdrawFrom,
}
use aiken/transaction/credential.{
  Address, ScriptCredential, StakeCredential, VerificationKeyCredential,
}
use aiken/transaction/value.{AssetName, PolicyId}
use lb_v2/treasury_validation
use lb_v2/types.{
  ApplyOrder, CancelOrder, OrderBatchingRedeemer, OrderDatum, OrderRedeemer,
  TreasuryDatum, TreasuryRedeemer, ValidatorHash,
}
use lb_v2/utils

validator(
  authen_policy_id: PolicyId,
  pool_auth_asset_name: AssetName,
  amm_authen_policy_id: PolicyId,
  amm_pool_auth_asset_name: AssetName,
) {
  fn validate(
    datum: TreasuryDatum,
    redeemer: TreasuryRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext { transaction, purpose: Spend(treasury_input_ref) } =
      context
    let Transaction {
      inputs,
      outputs,
      datums,
      extra_signatories,
      validity_range,
      mint,
      ..
    } = transaction
    let mint_value = value.from_minted_value(mint)
    when redeemer is {
      CreatePool -> {
        expect [treasury_input] =
          list.filter(
            inputs,
            fn(input) {
              let Input { output_reference: out_ref, .. } = input
              out_ref == factory_ref
            },
          )
        and {
          treasury_validation.validate_discovery_pharse_ended(),
          mint_value.quantity_of(mint_value, amm_authen_policy_id, amm_pool_auth_asset_name)
        }
      }
    }
    False
  }
}
