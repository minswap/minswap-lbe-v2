use aiken/dict
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Mint, Output, ScriptContext, Spend, Transaction,
  WithdrawFrom,
}
use aiken/transaction/credential.{Inline, ScriptCredential}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{
  Asset, OrderMintingEditOrders, OrderTokenMintingRedeemer, SellerDatum,
  TreasuryDatum, ValidatorHash,
}
use lb_v2/utils.{order_auth_an, treasury_auth_an}

validator(authen_policy_id: PolicyId, treasury_hash: ValidatorHash) {
  fn validate_seller(datum: SellerDatum, _: Data, context: ScriptContext) {
    let ScriptContext { purpose, .. } = context
    expect Spend(_) = purpose
    and {
      datum.amount == 0,
      authen_policy_id == #"00",
      treasury_hash == #"00",
    }
  }

  fn validate_minting_order_nft_and_seller_withdrawal(
    raw_redeemer: Data,
    context: ScriptContext,
  ) {
    let ScriptContext { purpose, transaction } = context
    when purpose is {
      WithdrawFrom(stake_credential) -> {
        let Transaction { outputs, inputs, reference_inputs, mint, .. } =
          transaction
        expect Inline(seller_hash_credential) = stake_credential
        expect ScriptCredential(seller_hash) = seller_hash_credential
        expect [treasury_ref_input] =
          list.filter(
            reference_inputs,
            fn(ref_input) {
              let Input { output: Output { value, .. }, .. } = ref_input
              value.quantity_of(value, authen_policy_id, treasury_auth_an) == 1
            },
          )
        let order_input =
          list.filter(
            inputs,
            fn(input) {
              let Input { output: Output { value, .. }, .. } = input
              value.quantity_of(value, seller_hash, order_auth_an) == 1
            },
          )
        let order_output =
          list.filter(
            outputs,
            fn(output) {
              let Output { value, .. } = output
              value.quantity_of(value, seller_hash, order_auth_an) == 1
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
        True
      }
      Mint(policy_id) -> {
        expect redeemer: OrderTokenMintingRedeemer = raw_redeemer
        when redeemer is {
          OrderMintingEditOrders -> {
            let Transaction { withdrawals, .. } = transaction
            // policy_id == seller_hash
            dict.has_key(withdrawals, Inline(ScriptCredential(policy_id)))
          }
          _ -> True
        }
      }
      _ -> False
    }
  }
}

fn validate_order_utxo(
  treasury_datum: TreasuryDatum,
  order_output: Output,
  seller_hash: ByteArray,
) -> Bool {
  let TreasuryDatum { base_asset, raise_asset,status .. } = treasury_datum
  let Output { value, datum: InlineDatum(raw_order_datum), .. } = output
  expect OrderDatum { base_asset: o_base_asset, raise_asset: o_raise_asset, .. }: OrderDatum =
    raw_order_datum
  value.quantity_of(value, seller_hash, order_auth_an) == 1
  True
}
