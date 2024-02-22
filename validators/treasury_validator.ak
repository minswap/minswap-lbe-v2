use aiken/list
use aiken/transaction.{Input, Output, ScriptContext, Spend, Transaction}
use aiken/transaction/credential.{
  Address, ScriptCredential, VerificationKeyCredential,
}
use aiken/transaction/value.{AssetName, PolicyId, from_minted_value}
use lb_v2/types.{
  Batching, CancelLBE, CreatePool, PoolDatum, TreasuryDatum, TreasuryRedeemer,
  UpdateLBE, ValidatorHash,
}
use lb_v2/validation

validator(
  authen_policy_id: PolicyId,
  treasury_auth_asset_name: AssetName,
  amm_authen_policy_id: PolicyId,
  amm_pool_auth_asset_name: AssetName,
  amm_pool_validation_hash: ValidatorHash,
) {
  fn validate_treasury(
    datum: TreasuryDatum,
    redeemer: TreasuryRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext {
      transaction: Transaction {
        inputs,
        outputs,
        mint,
        datums,
        validity_range,
        reference_inputs,
        extra_signatories,
        ..
      },
      purpose: Spend(self_out_ref),
    } = context
    let treasury_input =
      validation.get_treasury_input(
        inputs,
        self_out_ref,
        authen_policy_id,
        treasury_auth_asset_name,
      )
    let Input { output: Output { address: treasury_address, .. }, .. } =
      treasury_input
    let treasury_output =
      validation.get_treasury_output(
        outputs,
        treasury_address,
        authen_policy_id,
        treasury_auth_asset_name,
      )
    let mint_value = from_minted_value(mint)
    when redeemer is {
      CreatePool -> {
        expect amm_pool_datum: PoolDatum =
          validation.get_amm_pool_datum(
            outputs,
            datums,
            amm_authen_policy_id,
            amm_pool_auth_asset_name,
            amm_pool_validation_hash,
          )
        let TreasuryDatum { order_hash, .. } = datum
        expect [] =
          list.filter(
            inputs,
            fn(input) {
              let Input { output: out, .. } = input
              let Output { address: addr, .. } = out
              let Address { payment_credential: payment_cred, .. } = addr
              when payment_cred is {
                ScriptCredential(hash) -> hash == order_hash
                _ -> False
              }
            },
          )
        let Output { value: treasury_out_value, .. } = treasury_output
        expect
          value.quantity_of(
            treasury_out_value,
            authen_policy_id,
            treasury_auth_asset_name,
          ) == 1
        validation.validate_create_dex_pool(
          treasury_in_datum: datum,
          treasury_output: treasury_output,
          all_outputs: outputs,
          datums: datums,
          validity_range: validity_range,
          mint_value: mint_value,
          amm_authen_policy_id: amm_authen_policy_id,
          amm_pool_auth_asset_name: amm_pool_auth_asset_name,
          amm_pool_datum: amm_pool_datum,
        )
      }
      Batching ->
        validation.validate_apply_order(
          treasury_input: treasury_input,
          treasury_output: treasury_output,
          all_inputs: inputs,
          all_outputs: outputs,
          datums: datums,
          validity_range: validity_range,
          authen_policy_id: authen_policy_id,
          amm_authen_policy_id: amm_authen_policy_id,
          mint_value: mint_value,
        )
      CancelLBE ->
        validation.validate_cancel_lbe(
          treasury_in_datum: datum,
          treasury_input: treasury_input,
          treasury_output: treasury_output,
          validity_range: validity_range,
          reference_inputs: reference_inputs,
          amm_pool_validation_hash: amm_pool_validation_hash,
          amm_authen_policy_id: amm_authen_policy_id,
          amm_pool_auth_asset_name: amm_pool_auth_asset_name,
        )
      UpdateLBE -> {
        let TreasuryDatum { owner, .. } = datum
        expect Address {
          payment_credential: VerificationKeyCredential(owner_pkh),
          ..
        } = owner
        and {
          list.has(extra_signatories, owner_pkh),
          validation.validate_update_lbe(
            treasury_in_datum: datum,
            treasury_input: treasury_input,
            treasury_output: treasury_output,
            datums: datums,
            validity_range: validity_range,
          ),
        }
      }
    }
  }
}
