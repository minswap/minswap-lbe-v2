use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Mint, Output, ScriptContext, Spend, Transaction,
  WithdrawFrom,
}
use aiken/transaction/credential.{Address, Inline, ScriptCredential}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{
  CollectOrderToken, ManageSeller, SellerDatum, SellerManagerDatum,
  SellerManagerRedeemer, SellerRedeemer, SpendSellerManager, TreasuryDatum,
  UsingSeller, ValidatorHash,
}
use lb_v2/utils.{manager_auth_an}
use lb_v2/validation

validator(authen_policy_id: PolicyId, treasury_hash: ValidatorHash) {
  fn validate_seller_manager_spending(
    seller_manager_in_datum: SellerManagerDatum,
    redeemer: SellerManagerRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext { purpose: Spend(seller_manager_out_ref), transaction } =
      context
    let Transaction {
      mint,
      reference_inputs,
      validity_range,
      inputs,
      outputs,
      ..
    } = transaction
    let mint_value = value.from_minted_value(mint)
    when redeemer is {
      ManageSeller -> {
        expect Some(Input {
          output: Output {
            address: Address {
              payment_credential: ScriptCredential(seller_manager_hash),
              ..
            },
            ..
          },
          ..
        }) =
          list.find(
            inputs,
            fn(input) {
              let Input {
                output_reference: out_ref,
                output: Output { value: sm_in_value, .. },
              } = input
              and {
                out_ref == seller_manager_out_ref,
                value.quantity_of(sm_in_value, treasury_hash, manager_auth_an) == 1,
              }
            },
          )
        expect [_] =
          list.filter(
            inputs,
            fn(input) {
              let Input {
                output: Output {
                  address: Address { payment_credential, .. },
                  ..
                },
                ..
              } = input
              payment_credential == ScriptCredential(seller_manager_hash)
            },
          )
        expect [seller_manager_out] =
          list.filter(
            outputs,
            fn(output) {
              let Output {
                address: Address { payment_credential, .. },
                value: sm_in_value,
                ..
              } = output
              payment_credential == ScriptCredential(seller_manager_hash) && value.quantity_of(
                sm_in_value,
                treasury_hash,
                manager_auth_an,
              ) == 1
            },
          )
        expect [treasury_ref_input] =
          validation.get_treasury_input_by_ref_inputs(
            ref_inputs: reference_inputs,
            authen_policy_id: authen_policy_id,
            treasury_hash: treasury_hash,
          )

        expect Input {
          output: Output { datum: InlineDatum(raw_treasury_datum), .. },
          ..
        } = treasury_ref_input
        expect treasury_datum: TreasuryDatum = raw_treasury_datum
        let TreasuryDatum { seller_hash, base_asset, raise_asset, .. } =
          treasury_datum
        let seller_inputs =
          validation.get_seller_inputs(
            inputs: inputs,
            seller_manager_policy_id: seller_manager_hash,
            seller_hash: seller_hash,
          )
        let seller_outputs =
          validation.get_seller_outputs(
            outputs: outputs,
            seller_manager_policy_id: seller_manager_hash,
            seller_hash: seller_hash,
            seller_datum: SellerDatum {
              base_asset,
              raise_asset,
              amount: 0,
              penalty_amount: 0,
            },
          )
        validation.validate_manage_seller(
          seller_manager_hash: seller_manager_hash,
          // seller_manager_in_value: seller_manager_in_value,
          seller_manager_in_datum: seller_manager_in_datum,
          seller_manager_out: seller_manager_out,
          // treasury_ref_input: treasury_ref_input,
          validity_range: validity_range,
          mint_value: mint_value,
          treasury_datum: treasury_datum,
          seller_inputs: seller_inputs,
          seller_outputs: seller_outputs,
        )
      }

      SpendSellerManager -> True
    }
  }

  fn validate_seller_manager_minting(
    redeemer: SellerRedeemer,
    context: ScriptContext,
  ) {
    let ScriptContext { purpose, transaction: Transaction { inputs, .. } } =
      context
    when redeemer is {
      UsingSeller -> {
        let seller_policy_id =
          when purpose is {
            Mint(policy_id) -> policy_id
            WithdrawFrom(stake_credential) -> {
              expect Inline(ScriptCredential(script_hash)) = stake_credential
              script_hash
            }
            _ -> fail
          }
        validation.has_spend_seller(inputs, treasury_hash, seller_policy_id)
      }
      CollectOrderToken ->
        validation.has_spend_treasury(inputs, authen_policy_id, treasury_hash)
      _ -> False
    }
  }
}
