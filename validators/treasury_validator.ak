use aiken/transaction.{Input, Output, ScriptContext, Transaction}
use aiken/transaction/value.{AssetName, PolicyId, from_minted_value}
use lb_v2/treasury_validation
use lb_v2/types.{Batching, CreatePool, TreasuryRedeemer, ValidatorHash}
use lb_v2/utils

validator(
  authen_policy_id: PolicyId,
  treasury_auth_asset_name: AssetName,
  amm_authen_policy_id: PolicyId,
  amm_pool_auth_asset_name: AssetName,
  amm_pool_validation_hash: ValidatorHash,
) {
  fn validate(redeemer: TreasuryRedeemer, context: ScriptContext) {
    let treasury_input =
      treasury_validation.get_treasury_input(
        context,
        authen_policy_id,
        treasury_auth_asset_name,
      )
    let Input { output: Output { address: treasury_address, .. }, .. } =
      treasury_input
    let ScriptContext {
      transaction: Transaction { outputs, mint, datums, validity_range, .. },
      ..
    } = context
    let mint_value = from_minted_value(mint)
    when redeemer is {
      CreatePool -> {
        let Output { value: treasury_out_value, datum: treasury_out_datum, .. } =
          treasury_validation.get_treasury_output(
            outputs,
            treasury_address,
            authen_policy_id,
            treasury_auth_asset_name,
          )
        let treasury_out_raw_datum =
          utils.must_find_script_datum(datums, treasury_out_datum)
        expect amm_pool_raw_datum =
          treasury_validation.get_amm_pool_raw_datum(
            outputs,
            datums,
            amm_authen_policy_id,
            amm_pool_auth_asset_name,
            amm_pool_validation_hash,
          )
        let Input { output: Output { datum: treasury_in_datum, .. }, .. } =
          treasury_input
        expect treasury_in_raw_datum =
          utils.must_find_script_datum(datums, treasury_in_datum)
        treasury_validation.validate_create_dex_pool(
          treasury_in_raw_datum: treasury_in_raw_datum,
          treasury_out_value: treasury_out_value,
          treasury_out_raw_datum: treasury_out_raw_datum,
          amm_pool_raw_datum: amm_pool_raw_datum,
          mint_value: mint_value,
          amm_authen_policy_id: amm_authen_policy_id,
          amm_pool_auth_asset_name: amm_pool_auth_asset_name,
          validity_range: validity_range,
          all_outputs: outputs,
        )
      }
      Batching -> True
    }
  }
}
