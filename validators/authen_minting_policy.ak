use aiken/list
use aiken/transaction.{
  Input, Mint, Output, OutputReference, ScriptContext, Transaction,
}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value.{AssetName}
use lb_v2/types.{AuthenRedeemer, MintAuthen, MintRedeem, ValidatorHash}

validator(
  out_ref: OutputReference,
  treasury_auth_asset_name: AssetName,
  treasury_hash: ValidatorHash,
) {
  fn validate_treasury(redeemer: AuthenRedeemer, context: ScriptContext) {
    let ScriptContext { transaction, purpose } = context
    let Transaction { inputs, mint, outputs, .. } = transaction
    expect Mint(authen_policy_id) = purpose
    when redeemer is {
      MintAuthen -> {
        expect [_] =
          list.filter(
            inputs,
            fn(input) {
              let Input { output_reference, .. } = input
              output_reference == out_ref
            },
          )
        let mint_value = value.from_minted_value(mint)
        expect [(minted_pid, minted_an, minted_amount)] =
          value.flatten(mint_value)
        expect and {
            minted_pid == authen_policy_id,
            minted_an == treasury_auth_asset_name,
            minted_amount == 1,
          }
        expect [treasury_output] =
          list.filter(
            outputs,
            fn(output) {
              let Output { value: out_value, .. } = output
              value.quantity_of(
                out_value,
                authen_policy_id,
                treasury_auth_asset_name,
              ) == 1
            },
          )
        let Output { address: Address { payment_credential, .. }, .. } =
          treasury_output
        expect ScriptCredential(hash) = payment_credential
        treasury_hash == hash
      }
      MintRedeem -> {
        expect [treasury_input] =
          list.filter(
            inputs,
            fn(input) {
              let Input { output, .. } = input
              let Output { value: out_value, .. } = output
              value.quantity_of(
                out_value,
                authen_policy_id,
                treasury_auth_asset_name,
              ) == 1
            },
          )
        True
      }
    }
  }
}
