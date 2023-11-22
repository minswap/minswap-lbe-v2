use aiken/builtin
use aiken/bytearray
use aiken/hash
use aiken/list
use aiken/transaction.{Input, Output, ScriptContext, Spend, Transaction}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value.{AssetName, PolicyId, ada_asset_name, ada_policy_id}
use lb_v2/treasury_validation
use lb_v2/types.{
  Asset, FactoryDatum, FactoryRedeemer, TreasuryDatum, ValidatorHash,
}
use lb_v2/utils

validator(
  authen_policy_id: PolicyId,
  treasury_hash: ValidatorHash,
  order_hash: ValidatorHash,
  factory_auth_asset_name: AssetName,
  pool_auth_asset_name: AssetName,
) {
  fn validate_factory(
    datum: FactoryDatum,
    redeemer: FactoryRedeemer,
    context: ScriptContext,
  ) {
    let ScriptContext { transaction, purpose } = context
    expect Spend(factory_ref) = purpose
    let Transaction { inputs, mint, outputs, datums, .. } = transaction
    let FactoryRedeemer { lbe_asset } = redeemer
    let FactoryDatum { head: current_head, tail: current_tail } = datum
    let Asset { policy_id: lbe_policy_id, asset_name: lbe_asset_name } =
      lbe_asset
    let hash_lbe_asset =
      hash.sha3_256(bytearray.concat(lbe_policy_id, lbe_asset_name))
    expect [factory_input] =
      list.filter(
        inputs,
        fn(input) {
          let Input { output_reference: out_ref, .. } = input
          out_ref == factory_ref
        },
      )
    let Input { output: factory_input_out, .. } = factory_input
    let Output { value: factory_input_value, address: factory_address, .. } =
      factory_input_out
    // Transaction must have a Factory Asset in the Spending Script
    expect
      value.quantity_of(
        factory_input_value,
        authen_policy_id,
        factory_auth_asset_name,
      ) == 1
    expect [factory_output_1, factory_output_2] =
      list.filter(
        outputs,
        fn(output) {
          let Output { address: out_addr, value: out_value, .. } = output
          out_addr == factory_address && value.quantity_of(
            out_value,
            authen_policy_id,
            factory_auth_asset_name,
          ) == 1
        },
      )
    let Output { datum: factory_output_1_raw_datum, .. } = factory_output_1
    let Output { datum: factory_output_2_raw_datum, .. } = factory_output_2
    let FactoryDatum { head: new_head_1, tail: new_tail_1 } =
      utils.must_find_factory_datum(datums, factory_output_1_raw_datum)
    let FactoryDatum { head: new_head_2, tail: new_tail_2 } =
      utils.must_find_factory_datum(datums, factory_output_2_raw_datum)
    // Transaction must put new hash between old hashes, (current_head, current_tail) -> (current_head, new_hash) && (new_hash, current_tail)
    expect
      builtin.less_than_bytearray(new_head_1, new_tail_1) && builtin.less_than_bytearray(
        new_head_2,
        new_tail_2,
      ) && new_head_1 == current_head && new_tail_2 == current_tail && hash_lbe_asset == new_tail_1 && hash_lbe_asset == new_head_2
    expect [pool_output] =
      list.filter(
        outputs,
        fn(output) {
          let Output { address: out_addr, value: out_value, .. } = output
          let Address { payment_credential: out_addr_payment_credential, .. } =
            out_addr
          when out_addr_payment_credential is {
            ScriptCredential(hash) ->
              treasury_hash == hash && value.quantity_of(
                out_value,
                authen_policy_id,
                pool_auth_asset_name,
              ) == 1
            _ -> False
          }
        },
      )
    let Output { value: pool_output_value, datum: pool_output_raw_datum, .. } =
      pool_output
    let TreasuryDatum {
      lbe_policy_id: treasury_datum_lbe_policy_id,
      lbe_asset_name: treasury_datum_lbe_asset_name,
      order_hash: treasury_datum_order_hash,
      ..
    } = utils.must_find_treasury_datum(datums, pool_output_raw_datum)
    let expected_pool_out_value =
      value.zero()
        |> value.add(ada_policy_id, ada_asset_name, 3000000)
        |> value.add(authen_policy_id, hash_lbe_asset, 9223372036854775807)
        |> value.add(authen_policy_id, pool_auth_asset_name, 1)
    and {
      treasury_datum_lbe_policy_id == lbe_policy_id,
      treasury_datum_lbe_asset_name == lbe_asset_name,
      treasury_datum_order_hash == order_hash,
      value.from_minted_value(mint) == treasury_validation.get_treasury_creation_expected_mint(
        authen_policy_id: authen_policy_id,
        factory_auth_asset_name: factory_auth_asset_name,
        pool_auth_asset_name: pool_auth_asset_name,
        hash_lbe_asset: hash_lbe_asset,
      ),
      expected_pool_out_value == pool_output_value,
    }
  }
}
