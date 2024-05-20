use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Mint, Output, OutputReference, ScriptContext, Transaction,
}
use aiken/transaction/value
use lb_v2/types.{AuthenRedeemer, FactoryDatum, Initialization, UsingFactory}
use lb_v2/utils.{factory_auth_an}

validator(out_ref: OutputReference) {
  fn validate_authen(redeemer: AuthenRedeemer, context: ScriptContext) {
    expect ScriptContext { transaction, purpose: Mint(authen_policy_id) } =
      context
    when redeemer is {
      // This redeemer can be called once to initialize the whole LBE system
      Initialization -> {
        let Transaction { inputs, mint, outputs, .. } = transaction
        // validate that `out_ref` must be presented in the Transaction Inputs
        expect [_] =
          list.filter(
            inputs,
            fn(input) {
              let Input { output_reference, .. } = input
              output_reference == out_ref
            },
          )
        // Transaction must mint only 1 Factory Auth Asset
        let mint_value = value.from_minted_value(mint)
        expect [(minted_pid, minted_an, minted_amount)] =
          value.flatten(mint_value)
        expect and {
            minted_pid == authen_policy_id,
            minted_an == factory_auth_an,
            minted_amount == 1,
          }
        // validate that there's only 1 Factory UTxO in the Transaction Outputs
        // The Factory UTxO must contain Factory Token in the value
        expect [Output { datum, .. }] =
          list.filter(
            outputs,
            fn(output) {
              let Output { value: out_value, .. } = output
              value.quantity_of(out_value, authen_policy_id, factory_auth_an) == 1
            },
          )
        datum == InlineDatum(
          FactoryDatum {
            head: #"00",
            tail: #"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
          },
        )
      }
      UsingFactory -> {
        let Transaction { inputs, .. } = transaction
        // Foward logic to Factory Validator
        list.any(
          inputs,
          fn(input) {
            let Input { output: Output { value: out_value, .. }, .. } = input
            value.quantity_of(out_value, authen_policy_id, factory_auth_an) == 1
          },
        )
      }
    }
  }
}
