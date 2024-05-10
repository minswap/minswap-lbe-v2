use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Mint, Output, ScriptContext, Spend, Transaction,
}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{OrderDatum, TreasuryDatum, ValidatorHash}
use lb_v2/utils.{order_auth_an, treasury_auth_an}

validator(
  // The PolicyID of Authen Minting Policy
  authen_policy_id: PolicyId,
  // ValidatorHash of Treasury Contract
  treasury_hash: ValidatorHash,
  // ValidatorHash of Saller Contract
  seller_hash: ValidatorHash,
) {
  fn validate_order(datum: OrderDatum, _: Data, context: ScriptContext) {
    let ScriptContext { purpose, transaction } = context
    let Transaction { reference_inputs, inputs, outputs, .. } = transaction
    expect [order_input] =
      list.filter(
        inputs,
        fn(input) {
          let Input { output: Output { value, .. }, .. } = input
          value.quantity_of(value, treasury_hash, order_auth_an) == 1
        },
      )
    expect Input {
      output: Output { datum: InlineDatum(order_raw_datum), .. },
      ..
    } = order_input
    expect order_datum: OrderDatum = order_raw_datum
    let OrderDatum { base_asset: o_base_asset, raise_asset: o_raise_asset, .. } =
      order_datum

    let order_outputs =
      list.filter(
        outputs,
        fn(output) {
          let Output { value, .. } = output
          value.quantity_of(value, treasury_hash, order_auth_an) == 1
        },
      )
    expect list.length(order_outputs) > 0
    expect [treasury_ref_input] =
      list.filter(
        reference_inputs,
        fn(ref_input) {
          let Input { output: Output { value, .. }, .. } = ref_input
          value.quantity_of(value, authen_policy_id, treasury_auth_an) == 1
        },
      )
    expect Input {
      output: Output { datum: InlineDatum(treasury_raw_datum), .. },
      ..
    } = treasury_ref_input
    expect treasury_datum: TreasuryDatum = treasury_raw_datum
    let TreasuryDatum {
      base_asset: t_base_asset,
      raise_asset: t_raise_asset,
      ..
    } = treasury_datum
    expect and {
        o_base_asset == t_base_asset,
        o_raise_asset == t_raise_asset,
      }
    expect
      when purpose is {
        Mint(_) -> False
        Spend(_) -> True
        _ -> False
      }
    and {
      seller_hash == #"00",
      datum.amount == 0,
    }
  }
}
