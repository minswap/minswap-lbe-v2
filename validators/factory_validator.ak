use aiken/transaction.{ScriptContext}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{FactoryDatum, FactoryRedeemer, ValidatorHash}

validator(
  // The PolicyID of Authen Minting Policy
  authen_policy_id: PolicyId,
  // ValidatorHash of Treasury Contract
  treasury_hash: ValidatorHash,
  // ValidatorHash of Order Contract
  order_hash: ValidatorHash,
  // ValidatorHash of Saller Contract
  seller_hash: ValidatorHash,
) {
  fn validate_factory(
    datum: FactoryDatum,
    redeemer: FactoryRedeemer,
    context: ScriptContext,
  ) {
    todo
  }
}
