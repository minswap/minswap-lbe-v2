use aiken/transaction.{ScriptContext, Spend, WithdrawFrom}

validator {
  fn validate_dummy(_, ctx: ScriptContext) {
    when ctx.purpose is {
      WithdrawFrom(_) -> True
      _ -> False
    }
  }
}
