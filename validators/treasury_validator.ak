use aiken/list
use aiken/transaction.{Input, Output, ScriptContext, Spend, Transaction}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value.{AssetName, PolicyId, quantity_of}
use lb_v2/treasury_validation
use lb_v2/types.{
  AmmPoolDatum, Asset, Batching, CreatePool, TreasuryDatum, TreasuryRedeemer,
  ValidatorHash,
}
use lb_v2/utils

validator(
  authen_policy_id: PolicyId,
  treasury_auth_asset_name: AssetName,
  amm_authen_policy_id: PolicyId,
  amm_pool_auth_asset_name: AssetName,
  amm_pool_validation_hash: ValidatorHash,
) {
  fn validate(
    datum: TreasuryDatum,
    redeemer: TreasuryRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext { transaction, purpose: Spend(treasury_input_ref) } =
      context
    let Transaction { inputs, outputs, datums, mint, validity_range, .. } =
      transaction
    let TreasuryDatum {
      asset_a,
      asset_b,
      reserve_a,
      reserve_b,
      lbe_owner,
      create_pool_time,
      ..
    } = datum
    let mint_value = value.from_minted_value(mint)
    expect Some(treasury_input) =
      list.find(
        inputs,
        fn(input) {
          let Input { output_reference: out_ref, .. } = input
          out_ref == treasury_input_ref
        },
      )
    let Input {
      output: Output {
        value: treasury_input_value,
        address: treasury_address,
        ..
      },
      ..
    } = treasury_input
    let Address { payment_credential: treasury_payment_credential, .. } =
      treasury_address
    expect [_] =
      list.filter(
        inputs,
        fn(input) {
          let Input {
            output: Output {
              address: Address { payment_credential: payment_cred, .. },
              ..
            },
            ..
          } = input
          treasury_payment_credential == payment_cred
        },
      )
    expect
      quantity_of(
        treasury_input_value,
        authen_policy_id,
        treasury_auth_asset_name,
      ) == 1
    when redeemer is {
      CreatePool -> {
        expect Some(amm_pool_output) =
          list.find(
            outputs,
            fn(output) {
              let Output { address: Address { payment_credential, .. }, .. } =
                output
              when payment_credential is {
                ScriptCredential(hash) -> hash == amm_pool_validation_hash
                _ -> False
              }
            },
          )
        let Output { datum: amm_pool_datum, .. } = amm_pool_output
        let AmmPoolDatum {
          asset_a: amm_asset_a,
          asset_b: amm_asset_b,
          reserve_a: amm_reserve_a,
          reserve_b: amm_reserve_b,
          total_liquidity: amm_total_liquidity,
        } = utils.must_find_amm_pool_datum(datums, amm_pool_datum)
        let Asset {
          policy_id: asset_a_policy_id,
          asset_name: asset_a_asset_name,
        } = amm_asset_a
        let Asset {
          policy_id: asset_b_policy_id,
          asset_name: asset_b_asset_name,
        } = amm_asset_b
        let lp_asset_name =
          utils.compute_lp_asset_name(
            asset_a_policy_id,
            asset_a_asset_name,
            asset_b_policy_id,
            asset_b_asset_name,
          )
        let lp_asset =
          Asset { policy_id: amm_authen_policy_id, asset_name: lp_asset_name }
        // For sure lbe_project_owner has 50% liquidity
        expect [_] =
          list.filter(
            outputs,
            fn(output) {
              let Output { address, value, .. } = output
              let amount_lp_asset =
                quantity_of(value, amm_authen_policy_id, lp_asset_name)
              and {
                address == lbe_owner,
                amount_lp_asset + amount_lp_asset == amm_total_liquidity,
              }
            },
          )
        // For sure Treasury remain 50% liquidity
        expect [treasury_output] =
          list.filter(
            outputs,
            fn(output) {
              let Output { address, value, .. } = output
              let amount_lp_asset =
                quantity_of(value, amm_authen_policy_id, lp_asset_name)
              and {
                address == treasury_address,
                amount_lp_asset + amount_lp_asset == amm_total_liquidity,
              }
            },
          )
        let Output { datum: treasury_output_raw_datum, .. } = treasury_output
        // for sure treasury output datum is correct
        let TreasuryDatum {
          total_liquidity: treasury_total_liquidity,
          lp_asset: treasury_lp_asset,
          ..
        } = utils.must_find_treasury_datum(datums, treasury_output_raw_datum)
        and {
          treasury_validation.validate_create_dex_pool_time(
            create_pool_time,
            validity_range,
          ),
          asset_a == amm_asset_a,
          asset_b == amm_asset_b,
          reserve_a == amm_reserve_a,
          reserve_b == amm_reserve_b,
          treasury_total_liquidity + treasury_total_liquidity == amm_total_liquidity,
          treasury_lp_asset == lp_asset,
          quantity_of(
            mint_value,
            amm_authen_policy_id,
            amm_pool_auth_asset_name,
          ) == 1,
        }
      }
      Batching -> True
    }
  }
}
