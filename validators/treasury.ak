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
  TreasuryDatum, TreasuryRedeemer, ValidatorHash,
}
use lb_v2/utils

validator {
  fn validate(
    datum: TreasuryDatum,
    redeemer: TreasuryRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext { transaction, purpose: Spend(pool_input_ref) } =
      context
    False
  }
}
