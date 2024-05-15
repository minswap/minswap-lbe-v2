use aiken/builtin
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Output, ScriptContext, Spend, Transaction,
}
use aiken/transaction/credential.{
  Address, ScriptCredential, VerificationKeyCredential,
}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{
  Asset, CreateTreasury, FactoryDatum, FactoryRedeemer, RemoveTreasury,
  SellerDatum, TreasuryDatum, ValidatorHash,
}
use lb_v2/utils.{
  compute_lp_asset_name, default_number_seller, factory_auth_an, seller_auth_an,
  sort_two_assets, treasury_auth_an,
}
use lb_v2/validation

validator(
  // The PolicyID of Authen Minting Policy
  authen_policy_id: PolicyId,
  // ValidatorHash of Treasury Contract
  treasury_hash: ValidatorHash,
  // ValidatorHash of Order Contract
  order_hash: ValidatorHash,
  // ValidatorHash of Seller Contract
  seller_hash: ValidatorHash,
) {
  fn validate_factory(
    datum: FactoryDatum,
    redeemer: FactoryRedeemer,
    context: ScriptContext,
  ) {
    let ScriptContext { transaction, purpose } = context
    expect Spend(factory_ref) = purpose
    let Transaction { inputs, mint, outputs, extra_signatories, .. } =
      transaction
    let FactoryRedeemer { base_asset, raise_asset, step: factory_step } =
      redeemer
    let FactoryDatum { head: current_head, tail: current_tail } = datum
    let (asset_a, asset_b) = sort_two_assets(base_asset, raise_asset)
    let Asset { policy_id: asset_a_policy_id, asset_name: asset_a_asset_name } =
      asset_a
    let Asset { policy_id: asset_b_policy_id, asset_name: asset_b_asset_name } =
      asset_b
    let lp_asset_name =
      compute_lp_asset_name(
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
    when factory_step is {
      CreateTreasury -> {
        // validate that there's only 1 Factory UTxO in the Transaction Inputs
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
        expect Output { datum: InlineDatum(f_out_head_raw_datum), .. } =
          f_out_head
        expect Output { datum: InlineDatum(f_out_tail_raw_datum), .. } =
          f_out_tail
        expect f_out_head_datum: FactoryDatum = f_out_head_raw_datum
        expect f_out_tai_datum: FactoryDatum = f_out_tail_raw_datum
        // validate that there's only 1 Treasury UTxO in the Transaction Outputs
        // Treasury UTxO must contain treasury_token in the value
        expect [treasury_out] =
          list.filter(
            outputs,
            fn(output) {
              let Output { address: out_addr, value: out_value, .. } = output
              let Address { payment_credential, .. } = out_addr
              and {
                value.quantity_of(out_value, authen_policy_id, treasury_auth_an) == 1,
                when payment_credential is {
                  ScriptCredential(hash) -> treasury_hash == hash
                  _ -> False
                },
              }
            },
          )
        // validate that there's default_number_seller Seller UTxOs in the Transaction Outputs
        // Each Seller UTxO must cointain seller_token in the value
        let seller_outputs =
          list.filter(
            outputs,
            fn(output) {
              let Output { address: out_addr, value: out_value, .. } = output
              let Address { payment_credential, .. } = out_addr
              and {
                value.quantity_of(out_value, treasury_hash, seller_auth_an) == 1,
                when payment_credential is {
                  ScriptCredential(hash) -> seller_hash == hash
                  _ -> False
                },
              }
            },
          )
        expect list.length(seller_outputs) == default_number_seller
        expect
          list.all(
            seller_outputs,
            fn(seller_output) {
              expect Output { datum: InlineDatum(seller_raw_datum), .. } =
                seller_output
              expect seller_datum: SellerDatum = seller_raw_datum
              let SellerDatum {
                base_asset: s_base_asset,
                raise_asset: s_raise_asset,
                amount: s_amount,
                penalty_amount: s_penalty_amount,
              } = seller_datum
              and {
                s_base_asset == base_asset,
                s_raise_asset == raise_asset,
                s_amount == 0,
                s_penalty_amount == 0,
              }
            },
          )
        expect Output {
          value: treasury_out_value,
          datum: InlineDatum(treasury_out_raw_datum),
          ..
        } = treasury_out
        expect treasury_out_datum: TreasuryDatum = treasury_out_raw_datum
        and {
          // validate that new Factory UTxO datum must be followed by Linked List rule
          // (old head, old tail) -> (old head, LP Token Name) and (LP Token Name, old tail)
          // old head < LP Token Name < old tail
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
          value.from_minted_value(mint) == validation.get_value_of_minting_treasury(
            authen_policy_id: authen_policy_id,
            treasury_policy_id: treasury_hash,
            step: factory_step,
          ),
          validation.validate_creating_treasury_out(
            treasury_out_value: treasury_out_value,
            treasury_out_datum: treasury_out_datum,
            base_asset: base_asset,
            raise_asset: raise_asset,
            order_hash: order_hash,
            seller_hash: seller_hash,
            authen_policy_id: authen_policy_id,
          ),
        }
      }
      RemoveTreasury -> {
        expect [factory_input_1, factory_input_2] =
          list.filter(
            inputs,
            fn(input) {
              let Input {
                output: Output { address: out_addr, value: out_value, .. },
                ..
              } = input
              and {
                out_addr == factory_address,
                value.quantity_of(out_value, authen_policy_id, factory_auth_an) == 1,
              }
            },
          )
        expect Input {
          output: Output { datum: InlineDatum(factory_input_1_raw_datum), .. },
          ..
        } = factory_input_1
        expect Input {
          output: Output { datum: InlineDatum(factory_input_2_raw_datum), .. },
          ..
        } = factory_input_2
        expect factory_input_1_datum: FactoryDatum = factory_input_1_raw_datum
        expect factory_input_2_datum: FactoryDatum = factory_input_2_raw_datum
        let FactoryDatum { head: f1_head, tail: f1_tail } =
          factory_input_1_datum
        let FactoryDatum { head: f2_head, tail: f2_tail } =
          factory_input_2_datum
        expect [new_factory_head, new_factory_tail] =
          if f1_head == lp_asset_name && f2_tail == lp_asset_name {
            [f2_head, f1_tail]
          } else if f1_tail == lp_asset_name && f2_head == lp_asset_name {
            [f1_head, f2_tail]
          } else {
            fail
          }
        expect Some(factory_output) = list.head(outputs)
        expect factory_output.address == factory_address
        expect
          value.quantity_of(
            factory_output.value,
            authen_policy_id,
            factory_auth_an,
          ) == 1
        expect Output { datum: InlineDatum(factory_out_raw_datum), .. } =
          factory_output
        expect factory_out_datum: FactoryDatum = factory_out_raw_datum
        expect [treasury_in] =
          list.filter(
            inputs,
            fn(input) {
              let Input {
                output: Output { address: out_addr, value: out_value, .. },
                ..
              } = input
              and {
                out_addr == factory_address,
                value.quantity_of(out_value, authen_policy_id, factory_auth_an) == 1,
              }
            },
          )
        expect Input {
          output: Output { datum: InlineDatum(treasury_datum_raw), .. },
          ..
        } = treasury_in
        expect treasury_datum: TreasuryDatum = treasury_datum_raw
        let TreasuryDatum { owner, total_liquidity, collected_fund, .. } =
          treasury_datum
        expect Address {
          payment_credential: VerificationKeyCredential(owner_pkh),
          ..
        } = owner
        and {
          builtin.less_than_bytearray(new_factory_head, new_factory_tail),
          factory_out_datum == FactoryDatum {
            head: new_factory_head,
            tail: new_factory_tail,
          },
          value.from_minted_value(mint) == validation.get_value_of_minting_treasury(
            authen_policy_id: authen_policy_id,
            treasury_policy_id: treasury_hash,
            step: factory_step,
          ),
          list.has(extra_signatories, owner_pkh),
          total_liquidity > 0,
          collected_fund == 0,
        }
      }
    }
  }
}
