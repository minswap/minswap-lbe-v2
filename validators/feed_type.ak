use aiken/transaction.{ScriptContext}
use lb_v2/types.{PoolDatum}

// this is unused, only used to access the type in blueprints
validator {
  fn amm_pool(_datum: PoolDatum, _redeemer: Data, _ctx: ScriptContext) -> Bool {
    False
  }
}
