use aiken/transaction.{ScriptContext}
use aiken/transaction/value.{AssetName, PolicyId}
use lb_v2/types.{FactoryDatum, FactoryRedeemer, ValidatorHash}
use lb_v2/validation

validator(
  // The PolicyID of Authen Minting Policy
  authen_policy_id: PolicyId,
  // ValidatorHash of Treasury Contract
  treasury_hash: ValidatorHash,
  // ValidatorHash of Order Contract
  order_hash: ValidatorHash,
  // the legitimate Factory TokenName
  factory_auth_asset_name: AssetName,
  // the legitimate Treasury TokenName     
  treasury_auth_asset_name: AssetName,
) {
  fn validate_factory(
    datum: FactoryDatum,
    redeemer: FactoryRedeemer,
    context: ScriptContext,
  ) {
    validation.validate_factory(
      authen_policy_id,
      treasury_hash,
      order_hash,
      factory_auth_asset_name,
      treasury_auth_asset_name,
      datum,
      redeemer,
      context,
    )
  }
}
