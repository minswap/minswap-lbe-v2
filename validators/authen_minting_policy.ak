use aiken/bytearray
use aiken/dict
use aiken/hash
use aiken/list
use aiken/transaction.{
  Input, Mint, Output, OutputReference, ScriptContext, Spend, Transaction,
}
use aiken/transaction/value.{AssetName}
use lb_v2/treasury_validation
use lb_v2/types.{
  Asset, AuthenRedeemer, CreateTreasury, FactoryDatum, FactoryRedeemer,
  MintFactoryAuthen,
}
use lb_v2/utils

validator(
  out_ref: OutputReference,
  factory_auth_asset_name: AssetName,
  treasury_auth_asset_name: AssetName,
) {
  fn validate_authen(redeemer: AuthenRedeemer, context: ScriptContext) {
    let ScriptContext { transaction, purpose } = context
    expect Mint(authen_policy_id) = purpose
    when redeemer is {
      MintFactoryAuthen -> {
        let Transaction { inputs, mint, outputs, datums, .. } = transaction

        // Transaction must has @out_ref in the input to make sure that this redeemer can only be executed once
        expect
          list.any(
            inputs,
            fn(input) {
              let Input { output_reference, .. } = input
              output_reference == out_ref
            },
          )
        let mint_value = value.from_minted_value(mint)
        expect [(minted_pid, minted_an, minted_amount)] =
          value.flatten(mint_value)
        // Transaction must mint only 1 Factory Auth Asset
        expect and {
            minted_pid == authen_policy_id,
            minted_an == factory_auth_asset_name,
            minted_amount == 1,
          }
        expect [factory_output] =
          list.filter(
            outputs,
            fn(output) {
              let Output { value: out_value, .. } = output
              value.quantity_of(
                out_value,
                authen_policy_id,
                factory_auth_asset_name,
              ) == 1
            },
          )
        let Output { datum: factory_raw_datum, .. } = factory_output
        let FactoryDatum { head, tail } =
          utils.must_find_factory_datum(datums, factory_raw_datum)
        and {
          head == #"00",
          tail == #"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
        }
      }
      CreateTreasury -> {
        let Transaction { inputs, mint, redeemers, .. } = transaction
        expect [factory_input] =
          list.filter(
            inputs,
            fn(input) {
              let Input { output, .. } = input
              let Output { value: out_value, .. } = output
              value.quantity_of(
                out_value,
                authen_policy_id,
                factory_auth_asset_name,
              ) == 1
            },
          )
        let Input { output_reference: factory_input_ref, .. } = factory_input
        let redeemer_list = dict.to_list(redeemers)
        expect [(_, raw_factory_redeemer)] =
          list.filter(
            redeemer_list,
            fn(r) {
              let (p, _) = r
              when p is {
                Spend(ref) -> factory_input_ref == ref
                _ -> False
              }
            },
          )
        expect factory_redeemer: FactoryRedeemer = raw_factory_redeemer
        let FactoryRedeemer { lbe_asset } = factory_redeemer
        let Asset { policy_id: lbe_policy_id, asset_name: lbe_asset_name } =
          lbe_asset
        let hash_lbe_asset =
          hash.sha3_256(bytearray.concat(lbe_policy_id, lbe_asset_name))
        value.from_minted_value(mint) == treasury_validation.get_treasury_creation_expected_mint(
          authen_policy_id: authen_policy_id,
          factory_auth_asset_name: factory_auth_asset_name,
          treasury_auth_asset_name: treasury_auth_asset_name,
          hash_lbe_asset: hash_lbe_asset,
        )
      }
    }
  }
}
