use aiken/builtin
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
  // The PolicyID of Authen Minting Policy
  authen_policy_id: PolicyId,
  // ValidatorHash of Treasury Contract
  treasury_hash: ValidatorHash,
  // ValidatorHash of Order Contract
  order_hash: ValidatorHash,
  // the legitimate Factory TokenName
  factory_auth_asset_name: AssetName,
  // the legitimate Treasury TokenName     
  treasury_auth_asset_name: AssetName,
) {
  fn validate_factory(
    datum: FactoryDatum,
    redeemer: FactoryRedeemer,
    context: ScriptContext,
  ) {
    let ScriptContext { transaction, purpose } = context
    expect Spend(factory_ref) = purpose
    let Transaction { inputs, mint, outputs, datums, .. } = transaction
    let FactoryRedeemer { asset_a, asset_b } = redeemer
    let FactoryDatum { head: current_head, tail: current_tail } = datum
    let Asset { policy_id: asset_a_policy_id, asset_name: asset_a_asset_name } =
      asset_a
    let Asset { policy_id: asset_b_policy_id, asset_name: asset_b_asset_name } =
      asset_b
    // validate that Asset A and Asset B must be sorted
    expect utils.sorted_asset(asset_a, asset_b)
    let lp_asset_name =
      utils.compute_lp_asset_name(
        asset_a_policy_id,
        asset_a_asset_name,
        asset_b_policy_id,
        asset_b_asset_name,
      )
    expect Some(factory_input) =
      list.find(
        inputs,
        fn(input) {
          let Input { output_reference: out_ref, .. } = input
          out_ref == factory_ref
        },
      )
    let Input {
      output: Output {
        value: factory_input_value,
        address: factory_address,
        ..
      },
      ..
    } = factory_input
    let Address { payment_credential: factory_payment_credential, .. } =
      factory_address
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
          factory_payment_credential == payment_cred
        },
      )
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
    // validate that new Factory UTxO datum must be followed by Linked List rule
    // (old head, old tail) -> (old head, Pool LP Token Name) and (Pool LP Token Name, old tail)
    // old head < Pool LP Token Name < old tail
    expect and {
        builtin.less_than_bytearray(new_head_1, new_tail_1),
        builtin.less_than_bytearray(new_head_2, new_tail_2),
        new_head_1 == current_head,
        new_tail_2 == current_tail,
        lp_asset_name == new_tail_1,
        lp_asset_name == new_head_2,
      }
    expect [treasury_output] =
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
                treasury_auth_asset_name,
              ) == 1
            _ -> False
          }
        },
      )
    let Output {
      value: treasury_output_value,
      datum: treasury_output_raw_datum,
      ..
    } = treasury_output
    let amount_a =
      value.quantity_of(
        treasury_output_value,
        asset_a_policy_id,
        asset_a_asset_name,
      )
    let TreasuryDatum {
      asset_a: treasury_datum_asset_a,
      asset_b: treasury_datum_asset_b,
      reserve_a: treasury_datum_reserve_a,
      order_hash: treasury_datum_order_hash,
      ..
    } = utils.must_find_treasury_datum(datums, treasury_output_raw_datum)
    let expected_treasury_out_value =
      value.zero()
        |> value.add(ada_policy_id, ada_asset_name, 3000000)
        |> value.add(authen_policy_id, lp_asset_name, 9223372036854775807)
        |> value.add(authen_policy_id, treasury_auth_asset_name, 1)
    and {
      // asset_a and asset_b must be the same with Factory Redeemer
      treasury_datum_asset_a == asset_a,
      treasury_datum_asset_b == asset_b,
      treasury_datum_reserve_a == amount_a,
      // Order Hash in Pool Datum must be matched with Order Hash in parameters
      treasury_datum_order_hash == order_hash,
      value.from_minted_value(mint) == treasury_validation.get_treasury_creation_expected_mint(
        authen_policy_id: authen_policy_id,
        factory_auth_asset_name: factory_auth_asset_name,
        treasury_auth_asset_name: treasury_auth_asset_name,
        lp_asset_name: lp_asset_name,
      ),
      expected_treasury_out_value == treasury_output_value,
    }
  }
}
