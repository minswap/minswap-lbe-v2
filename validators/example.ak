use aiken/transaction.{Mint, ScriptContext, Spend}

type Redeemer {
  Spending1
  Minting2
}

validator {
  fn validate_spending(_, redeemer: Redeemer, context: ScriptContext) {
    expect ScriptContext { purpose: Spend(_), .. } = context
    when redeemer is {
      Spending1 -> True
      _ -> False
    }
  }

  fn validate_minting(redeemer: Redeemer, context: ScriptContext) {
    expect ScriptContext { purpose: Mint(_), .. } = context
    when redeemer is {
      Minting2 -> True
      _ -> False
    }
  }
}
