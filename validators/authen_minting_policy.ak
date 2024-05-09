use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Mint, NoDatum, Output, OutputReference, Redeemer,
  ScriptContext, ScriptPurpose, Spend, Transaction,
}
use aiken/transaction/value
use lb_v2/types.{AuthenRedeemer, CreateTreasury, FactoryDatum, MintFactory, MintTreasury, RemoveTreasury}
use lb_v2/utils.{factory_auth_an, treasury_auth_an}

validator(out_ref: OutputReference) {
  fn validate_authen(redeemer: AuthenRedeemer, context: ScriptContext) {
    let ScriptContext { transaction, purpose } = context
    expect Mint(authen_policy_id) = purpose
    when redeemer is {
      MintFactory -> {
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
        expect [factory_output] =
          list.filter(
            outputs,
            fn(output) {
              let Output { value: out_value, .. } = output
              value.quantity_of(out_value, authen_policy_id, factory_auth_an) == 1
            },
          )
        expect Output { datum: InlineDatum(factory_datum), .. } = factory_output
        expect FactoryDatum { head, tail }: FactoryDatum = factory_datum
        and {
          head == #"00",
          tail == #"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
        }
      }
      MintTreasury { step } -> {
        let Transaction { inputs, .. } = transaction
        expect factory_inputs =
          list.filter(
            inputs,
            fn(input) {
              let Input { output, .. } = input
              let Output { value: out_value, .. } = output
              value.quantity_of(out_value, authen_policy_id, factory_auth_an) == 1
            },
          )
        let count_factory_inputs = list.length(factory_inputs)
        when step is {
          CreateTreasury -> count_factory_inputs == 1
          RemoveTreasury -> count_factory_inputs == 2
        }
      }
    }
  }
}
