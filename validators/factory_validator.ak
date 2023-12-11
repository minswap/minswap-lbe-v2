use aiken/builtin
use aiken/cbor
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Output, ScriptContext, Spend, Transaction,
}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value.{AssetName, PolicyId}
use lb_v2/test_suits.{AuthenValidatorParams}
use lb_v2/types.{
  Asset, FactoryDatum, FactoryRedeemer, TreasuryDatum, ValidatorHash,
}
use lb_v2/utils
use lb_v2/validation

validator(
  // The PolicyID of Authen Minting Policy
  authen_policy_id: PolicyId,
  // ValidatorHash of Treasury Contract
  treasury_hash: ValidatorHash,
  // ValidatorHash of Order Contract
  order_hash: ValidatorHash,
  // the legitimate Factory TokenName
  factory_auth_an: AssetName,
  // the legitimate Treasury TokenName     
  treasury_auth_an: AssetName,
) {
  fn validate_factory(
    datum: FactoryDatum,
    redeemer: FactoryRedeemer,
    context: ScriptContext,
  ) {
    let ScriptContext { transaction, purpose } = context
    expect Spend(factory_ref) = purpose
    let Transaction { inputs, mint, outputs, datums, .. } = transaction
    let FactoryRedeemer { base_asset, raise_asset } = redeemer
    let FactoryDatum { head: current_head, tail: current_tail } = datum
    let (asset_a, asset_b) = utils.sort_two_assets(base_asset, raise_asset)
    let Asset { policy_id: asset_a_policy_id, asset_name: asset_a_asset_name } =
      asset_a
    let Asset { policy_id: asset_b_policy_id, asset_name: asset_b_asset_name } =
      asset_b
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
          let Input { output_reference: out_ref, output: Output { value, .. } } =
            input
          and {
            out_ref == factory_ref,
            value.quantity_of(value, authen_policy_id, factory_auth_an) == 1,
          }
        },
      )
    let Input { output: Output { address: factory_address, .. }, .. } =
      factory_input
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
    expect [f_out_head, f_out_tail] =
      list.filter(
        outputs,
        fn(output) {
          let Output { address: out_addr, value: out_value, .. } = output
          and {
            out_addr == factory_address,
            value.quantity_of(out_value, authen_policy_id, factory_auth_an) == 1,
          }
        },
      )
    let Output { datum: f_out_head_raw_datum, .. } = f_out_head
    let Output { datum: f_out_tail_raw_datum, .. } = f_out_tail
    expect f_out_head_datum: FactoryDatum =
      when f_out_head_raw_datum is {
        InlineDatum(d) -> d
        _ -> utils.must_find_script_datum(datums, f_out_head_raw_datum)
      }
    expect f_out_tai_datum: FactoryDatum =
      when f_out_tail_raw_datum is {
        InlineDatum(d) -> d
        _ -> utils.must_find_script_datum(datums, f_out_tail_raw_datum)
      }
    expect [treasury_out] =
      list.filter(
        outputs,
        fn(output) {
          let Output { address: out_addr, value: out_value, .. } = output
          let Address { payment_credential: out_addr_payment_credential, .. } =
            out_addr
          when out_addr_payment_credential is {
            ScriptCredential(hash) -> and {
                treasury_hash == hash,
                value.quantity_of(out_value, authen_policy_id, treasury_auth_an) == 1,
              }
            _ -> False
          }
        },
      )
    let Output { value: treasury_out_value, datum: treasury_out_raw_datum, .. } =
      treasury_out
    expect treasury_out_datum: TreasuryDatum =
      when treasury_out_raw_datum is {
        InlineDatum(d) -> d
        _ -> utils.must_find_script_datum(datums, treasury_out_raw_datum)
      }
    and {
      // validate that new Factory UTxO datum must be followed by Linked List rule
      // (old head, old tail) -> (old head, Pool LP Token Name) and (Pool LP Token Name, old tail)
      // old head < Pool LP Token Name < old tail
      builtin.less_than_bytearray(current_head, lp_asset_name),
      builtin.less_than_bytearray(lp_asset_name, current_tail),
      f_out_head_datum == FactoryDatum {
        head: current_head,
        tail: lp_asset_name,
      },
      f_out_tai_datum == FactoryDatum {
        head: lp_asset_name,
        tail: current_tail,
      },
      value.from_minted_value(mint) == validation.get_treasury_creation_expected_mint(
        authen_policy_id: authen_policy_id,
        factory_auth_an: factory_auth_an,
        treasury_auth_an: treasury_auth_an,
        lp_asset_name: lp_asset_name,
      ),
      validation.validate_creating_treasury_out(
        treasury_out_value: treasury_out_value,
        treasury_out_datum: treasury_out_datum,
        base_asset: base_asset,
        raise_asset: raise_asset,
        order_hash: order_hash,
        authen_policy_id: authen_policy_id,
        treasury_auth_an: treasury_auth_an,
        lp_asset_name: lp_asset_name,
      ),
    }
  }
}

test test_001_create_treasury_passed() {
  let authen_policy_id = test_suits.gen_authen_minting_policy_id()
  let AuthenValidatorParams { factory_auth_an, treasury_auth_an, .. } =
    test_suits.gen_authen_validator_params()
  let treasury_hash = test_suits.gen_treasury_hash()
  let order_hash = test_suits.gen_order_hash()
  let factory_input = test_suits.gen_factory_input()
  let Input {
    output_reference: f_in_out_ref,
    output: Output { address: factory_address, value: f_in_value, .. },
  } = factory_input
  expect [base_asset, raise_asset, lp_asset] = test_suits.gen_lbe_assets()
  let mint =
    validation.get_treasury_creation_expected_mint(
      authen_policy_id: authen_policy_id,
      factory_auth_an: factory_auth_an,
      treasury_auth_an: treasury_auth_an,
      lp_asset_name: lp_asset.asset_name,
    )
      |> value.to_minted_value
  let purpose = Spend(f_in_out_ref)
  let factory_redeemer = FactoryRedeemer { base_asset, raise_asset }
  let factory_datum =
    FactoryDatum {
      head: #"00",
      tail: #"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
    }
  let f_out_head =
    Output {
      address: factory_address,
      value: f_in_value,
      datum: InlineDatum(
        FactoryDatum { head: #"00", tail: lp_asset.asset_name },
      ),
      reference_script: None,
    }
  let f_out_tail =
    Output {
      address: factory_address,
      value: f_in_value,
      datum: InlineDatum(
        FactoryDatum {
          head: lp_asset.asset_name,
          tail: #"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
        },
      ),
      reference_script: None,
    }
  let outputs: List<Output> =
    [
      test_suits.gen_dummy_ouput(),
      f_out_head,
      f_out_tail,
      test_suits.gen_dummy_treasury_out(),
    ]
  let transaction: Transaction =
    Transaction {
      ..transaction.placeholder(),
      outputs: outputs,
      inputs: [factory_input],
      mint: mint,
    }
  validate_factory(
    authen_policy_id,
    treasury_hash,
    order_hash,
    factory_auth_an,
    treasury_auth_an,
    datum: factory_datum,
    redeemer: factory_redeemer,
    context: ScriptContext { transaction, purpose },
  )
}
