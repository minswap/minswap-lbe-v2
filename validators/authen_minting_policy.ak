use aiken/bytearray
use aiken/dict.{Dict}
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Mint, NoDatum, Output, OutputReference, Redeemer,
  ScriptContext, ScriptPurpose, Spend, Transaction,
}
use aiken/transaction/credential
use aiken/transaction/value.{PolicyId}
use lb_v2/test_suits
use lb_v2/types.{
  AuthenRedeemer, CreateTreasury, FactoryDatum, FactoryRedeemer,
  MintFactoryAuthen,
}
use lb_v2/utils.{factory_auth_an, treasury_auth_an}
use lb_v2/validation.{get_treasury_creation_expected_mint}

validator(out_ref: OutputReference) {
  fn validate_authen(redeemer: AuthenRedeemer, context: ScriptContext) {
    let ScriptContext { transaction, purpose } = context
    expect Mint(authen_policy_id) = purpose
    when redeemer is {
      // The redeemer can be called once to initialize the whole LBE system
      MintFactoryAuthen -> {
        let Transaction { inputs, mint, outputs, .. } = transaction

        // validate that `out_ref` must be presented in the Transaction Inputs
        expect [_] =
          list.filter(
            inputs,
            fn(input) {
              let Input { output_reference, .. } = input
              output_reference == out_ref
            },
          )
        // Transaction must mint only 1 Factory Auth Asset
        let mint_value = value.from_minted_value(mint)
        expect [(minted_pid, minted_an, minted_amount)] =
          value.flatten(mint_value)
        expect and {
            minted_pid == authen_policy_id,
            minted_an == factory_auth_an,
            minted_amount == 1,
          }
        // validate that there's only 1 Factory UTxO in the Transaction Outputs
        // The Factory UTxO must contain Factory Token in the value
        expect [factory_output] =
          list.filter(
            outputs,
            fn(output) {
              let Output { value: out_value, .. } = output
              value.quantity_of(out_value, authen_policy_id, factory_auth_an) == 1
            },
          )
        expect Output { datum: InlineDatum(factory_datum), .. } = factory_output
        expect FactoryDatum { head, tail }: FactoryDatum = factory_datum
        and {
          head == #"00",
          tail == #"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
        }
      }
      CreateTreasury -> {
        let Transaction { inputs, mint, .. } = transaction
        // validate that there's a single Factory UTxO in the Transaction Inputs. 
        // Factory UTxO must contain Factory NFT Token in the value
        expect [_] =
          list.filter(
            inputs,
            fn(input) {
              let Input { output, .. } = input
              let Output { value: out_value, .. } = output
              value.quantity_of(out_value, authen_policy_id, factory_auth_an) == 1
            },
          )
        value.from_minted_value(mint) == get_treasury_creation_expected_mint(
          authen_policy_id: authen_policy_id,
        )
      }
    }
  }
}

test test_validate_authen_create_factory() {
  let out_ref = test_suits.gen_authen_out_ref()
  let redeemer = MintFactoryAuthen
  let policy_id: PolicyId = test_suits.gen_authen_minting_policy_id()
  let purpose = Mint(policy_id)
  let mint_value =
    value.zero()
      |> value.add(policy_id, factory_auth_an, 1)
  let mint = mint_value |> value.to_minted_value
  let output =
    Output {
      address: credential.from_verification_key(
        @"h'09a9dd24b43ce6f22de361f2423e62a8a72a6ebb1e972a69ebb3bdcc'"
          |> bytearray.from_string,
      ),
      value: value.from_lovelace(5000000),
      datum: NoDatum,
      reference_script: None,
    }
  let inputs: List<Input> =
    [Input { output_reference: out_ref, output }]
  let factory_address =
    @"h'6508d97458392cbc453922493dacb743c405c7a7c254ee8b85fa6af5'"
      |> bytearray.from_string
      |> credential.from_verification_key
  let output_value =
    value.from_lovelace(5000000) |> value.add(policy_id, factory_auth_an, 1)
  let output =
    Output {
      address: factory_address,
      value: output_value,
      reference_script: None,
      datum: InlineDatum(
        FactoryDatum {
          head: #"00",
          tail: #"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
        },
      ),
    }
  let outputs: List<Output> =
    [output, test_suits.gen_dummy_ouput()]
  let sc =
    ScriptContext {
      transaction: Transaction {
        ..transaction.placeholder(),
        inputs: inputs,
        mint: mint,
        outputs: outputs,
      },
      purpose,
    }
  validate_authen(out_ref, redeemer, sc)
}

test test_validate_authen_create_treasury() {
  let out_ref = test_suits.gen_authen_out_ref()
  let redeemer = CreateTreasury
  let policy_id: PolicyId = test_suits.gen_authen_minting_policy_id()
  let purpose = Mint(policy_id)
  let factory_input = test_suits.gen_factory_input()
  expect [base_asset, raise_asset, _] = test_suits.gen_lbe_assets()
  let f_redeemer: Redeemer = FactoryRedeemer { base_asset, raise_asset }
  let transaction_redeemers: Dict<ScriptPurpose, Redeemer> =
    dict.new()
      |> dict.insert(
          Spend(factory_input.output_reference),
          f_redeemer,
          test_suits.compare_script_purpose,
        )
  let inputs =
    [factory_input]
  let outputs: List<Output> =
    [test_suits.gen_dummy_ouput()]
  let mint =
    value.zero()
      |> value.add(policy_id, factory_auth_an, 1)
      |> value.add(policy_id, treasury_auth_an, 1)
      |> value.to_minted_value
  let sc =
    ScriptContext {
      transaction: Transaction {
        ..transaction.placeholder(),
        inputs: inputs,
        mint: mint,
        outputs: outputs,
        redeemers: transaction_redeemers,
      },
      purpose,
    }
  validate_authen(out_ref, redeemer, sc)
}
