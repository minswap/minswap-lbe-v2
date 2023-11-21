use aiken/dict
use aiken/list
use aiken/transaction.{
  Input, Output, ScriptContext, Spend, Transaction, WithdrawFrom,
}
use aiken/transaction/credential.{
  Address, ScriptCredential, StakeCredential, VerificationKeyCredential,
}
use lb_v2/types.{
  ApplyOrder, CancelOrder, OrderBatchingRedeemer, OrderDatum, OrderRedeemer,
  ValidatorHash,
}
use lb_v2/utils

validator(stake_credential: StakeCredential) {
  fn validate_order(raw_datum: Data, raw_redeemer: Data, context: ScriptContext) {
    expect ScriptContext { transaction, purpose: Spend(_) } = context
    expect redeemer: OrderRedeemer = raw_redeemer
    when redeemer is {
      ApplyOrder -> {
        let Transaction { withdrawals, .. } = transaction
        dict.has_key(withdrawals, stake_credential)
      }
      CancelOrder -> {
        let Transaction { extra_signatories, .. } = transaction
        expect order_datum: OrderDatum = raw_datum
        let OrderDatum{owner: Address { payment_credential, .. }} = order_datum
        expect VerificationKeyCredential(owner_pkh) = payment_credential
        list.has(extra_signatories, owner_pkh)
      }
    }
  }
}

validator(treasury_hash: ValidatorHash) {
  fn validate_order_spending_in_batching(
    redeemer: OrderBatchingRedeemer,
    context: ScriptContext,
  ) -> Bool {
    expect ScriptContext { transaction, purpose: WithdrawFrom(_) } = context
    let OrderBatchingRedeemer { treasury_input_index } = redeemer

    let Transaction { inputs, .. } = transaction
    let Input {
      output: Output { address: Address { payment_credential, .. }, .. },
      ..
    } = utils.list_at_index(inputs, treasury_input_index)
    expect ScriptCredential(hash) = payment_credential
    treasury_hash == hash
  }
}
