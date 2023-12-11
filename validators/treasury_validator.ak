use aiken/bytearray
use aiken/cbor
use aiken/transaction.{
  InlineDatum, Input, Output, ScriptContext, Spend, Transaction,
}
use aiken/transaction/value.{AssetName, PolicyId, from_minted_value}
use lb_v2/test_suits
use lb_v2/types.{
  Batching, CreatePool, TreasuryDatum, TreasuryRedeemer, ValidatorHash,
}
use lb_v2/utils
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
        expect amm_pool_raw_datum =
          validation.get_amm_pool_raw_datum(
            outputs,
            datums,
            amm_authen_policy_id,
            amm_pool_auth_asset_name,
            amm_pool_validation_hash,
          )
        validation.validate_create_dex_pool(
          treasury_input: treasury_input,
          treasury_output: treasury_output,
          amm_pool_raw_datum: amm_pool_raw_datum,
          mint_value: mint_value,
          amm_authen_policy_id: amm_authen_policy_id,
          amm_pool_auth_asset_name: amm_pool_auth_asset_name,
          validity_range: validity_range,
          all_outputs: outputs,
          all_inputs: inputs,
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
    }
  }
}

test test_validate_treasury_apply_order() {
  let authen_policy_id = test_suits.gen_authen_minting_policy_id()
  let treasury_auth_asset_name = @"TA" |> bytearray.from_string
  let (
    amm_authen_policy_id,
    (amm_pool_auth_asset_name, amm_pool_validation_hash),
  ) = test_suits.gen_dummy_amm_params()
  let treasury_input =
    Input {
      output_reference: test_suits.gen_dummy_output_ref(),
      output: test_suits.gen_dummy_treasury_out(),
    }
  expect InlineDatum(treasury_datum_raw) = treasury_input.output.datum
  expect treasury_datum: TreasuryDatum = treasury_datum_raw
  let treasury_redeemer = Batching
  let purpose = Spend(treasury_input.output_reference)
  let output = test_suits.gen_dummy_treasury_out()
  let sc =
    ScriptContext {
      transaction: Transaction {
        ..transaction.placeholder(),
        inputs: [treasury_input],
        outputs: [output],
      },
      purpose,
    }
  validate_treasury(
    authen_policy_id,
    treasury_auth_asset_name,
    amm_authen_policy_id,
    amm_pool_auth_asset_name,
    amm_pool_validation_hash,
    datum: treasury_datum,
    redeemer: treasury_redeemer,
    context: sc,
  )
}
