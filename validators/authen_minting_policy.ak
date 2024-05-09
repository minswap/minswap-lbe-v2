use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Mint, NoDatum, Output, OutputReference, Redeemer,
  ScriptContext, ScriptPurpose, Spend, Transaction,
}
use lb_v2/types.{AuthenRedeemer, BurnTreasury, MintFactory, MintTreasury}
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
      MintTreasury -> {
        let Transaction { inputs, mint, .. } = transaction
        // validate that there's a single Factory UTxO in the Transaction Inputs. 
        // Factory UTxO must contain factory_token in the value
        expect [_] =
          list.filter(
            inputs,
            fn(input) {
              let Input { output, .. } = input
              let Output { value: out_value, .. } = output
              value.quantity_of(out_value, authen_policy_id, factory_auth_an) == 1
            },
          )
        // cause of foward logic to factory's validator,
        // only check mint 1 factory_token for new Factory UTxO (create node linked list)
        // and mint 1 treasury_token for new Treasury UTxO (create LBE)
        value.from_minted_value(mint) == value.from_asset(
          authen_policy_id,
          factory_auth_an,
          1,
        ).add(
          authen_policy_id,
          treasury_auth_an,
          1,
        )
      }
      BurnTreasury -> {
        // validate that there are 2 and only 2 Factory UTxOs in the Transaction Inputs. 
        // Factory UTxO must contain factory_token in the value
        expect [_, __] =
          list.filter(
            inputs,
            fn(input) {
              let Input { output, .. } = input
              let Output { value: out_value, .. } = output
              value.quantity_of(out_value, authen_policy_id, factory_auth_an) == 1
            },
          )

        // validate that there's a single Treasury UTxO in the Transaction Inputs. 
        // Treasury UTxO must contain treasury_token in the value
        expect [_] =
          list.filter(
            inputs,
            fn(input) {
              let Input { output, .. } = input
              let Output { value: out_value, .. } = output
              value.quantity_of(out_value, authen_policy_id, treasury_auth_an) == 1
            },
          )
        // cause of foward logic to factory's validator and treasury's validator,
        // only check burn 1 factory_token for spent Factory UTxO (remove node linked-list)
        // and burn 1 treasury_token for spent Treasury UTxO (close LBE)
        value.from_minted_value(mint) == value.from_asset(
          authen_policy_id,
          factory_auth_an,
          -1,
        ).add(
          authen_policy_id,
          treasury_auth_an,
          -1,
        )
      }
    }
  }
}
