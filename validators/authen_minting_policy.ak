use aiken/transaction.{OutputReference, ScriptContext}
use lb_v2/types.{AuthenRedeemer}

validator(out_ref: OutputReference) {
  fn validate_authen(redeemer: AuthenRedeemer, context: ScriptContext) {
    todo
  }
}
