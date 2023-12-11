use aiken/transaction.{OutputReference, ScriptContext}
use aiken/transaction/value.{AssetName}
use lb_v2/types.{AuthenRedeemer}
use lb_v2/validation

validator(
  out_ref: OutputReference,
  factory_auth_asset_name: AssetName,
  treasury_auth_asset_name: AssetName,
) {
  fn validate_authen(redeemer: AuthenRedeemer, context: ScriptContext) {
    validation.validate_authen(
      out_ref,
      factory_auth_asset_name,
      treasury_auth_asset_name,
      redeemer,
      context,
    )
  }
}
