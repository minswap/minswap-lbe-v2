use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Mint, Output, ScriptContext, Spend, Transaction,
}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{
  CreateAmmPool, CreateTreasury, InitTreasury, MintSeller, PoolDatum,
  SellerDatum, SpendSeller, TreasuryDatum, TreasuryRedeemer,
}
use lb_v2/utils.{
  amm_authen_policy_id, amm_pool_auth_asset_name, amm_pool_validation_hash,
  seller_auth_an, treasury_auth_an,
}
use lb_v2/validation

validator(authen_policy_id: PolicyId) {
  fn spending_treasury(
    _: Data,
    redeemer: TreasuryRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext { purpose: Spend(out_ref), transaction } = context
    let Transaction { inputs, outputs, mint, validity_range, .. } = transaction
    expect [treasury_input] =
      list.filter(
        inputs,
        fn(input) {
          let Input {
            output_reference,
            output: Output { value: out_value, .. },
          } = input
          and {
            value.quantity_of(out_value, authen_policy_id, treasury_auth_an) == 1,
            output_reference == out_ref,
          }
        },
      )
    let Input { output: Output { address: treasury_address, .. }, .. } =
      treasury_input
    expect [_] =
      list.filter(
        inputs,
        fn(input) {
          let Input { output: Output { address, .. }, .. } = input
          address == treasury_address
        },
      )
    expect Input {
      output: Output { datum: InlineDatum(treasury_in_raw_datum), .. },
      ..
    } = treasury_input
    expect treasury_in_datum: TreasuryDatum = treasury_in_raw_datum
    when redeemer is {
      CreateAmmPool -> {
        expect [treasury_output] =
          list.filter(
            outputs,
            fn(output) {
              let Output { address, value: out_value, .. } = output
              and {
                address == treasury_address,
                value.quantity_of(out_value, authen_policy_id, treasury_auth_an) == 1,
              }
            },
          )
        let mint_value = value.from_minted_value(mint)
        expect [pool_output] =
          list.filter(
            outputs,
            fn(output) {
              let Output {
                address: Address { payment_credential, .. },
                value,
                ..
              } = output
              when payment_credential is {
                ScriptCredential(hash) -> and {
                    hash == amm_pool_validation_hash,
                    value.quantity_of(
                      value,
                      amm_authen_policy_id,
                      amm_pool_auth_asset_name,
                    ) == 1,
                  }
                _ -> False
              }
            },
          )
        expect Output { datum: InlineDatum(pool_raw_datum), .. } = pool_output
        expect amm_pool_datum: PoolDatum = pool_raw_datum
        validation.validate_create_dex_pool(
          treasury_in_datum: treasury_in_datum,
          treasury_output: treasury_output,
          validity_range: validity_range,
          mint_value: mint_value,
          amm_pool_datum: amm_pool_datum,
        )
      }
      SpendSeller -> False
      _ -> False
    }
  }

  fn minting_treasury(redeemer: TreasuryRedeemer, context: ScriptContext) {
    expect ScriptContext { purpose: Mint(treasury_policy_id), transaction } =
      context
    let Transaction { inputs, outputs, mint, validity_range, .. } = transaction
    when redeemer is {
      InitTreasury -> {
        let mint_value = value.from_minted_value(mint)
        mint_value == validation.get_value_of_minting_treasury(
          authen_policy_id: authen_policy_id,
          treasury_policy_id: treasury_policy_id,
          step: CreateTreasury,
        )
      }
      MintSeller { amount: mint_seller_amount } -> {
        expect [treasury_input] =
          list.filter(
            inputs,
            fn(input) {
              let Input {
                output: Output { address: out_addr, value: out_value, .. },
                ..
              } = input
              let Address { payment_credential, .. } = out_addr
              and {
                value.quantity_of(out_value, authen_policy_id, treasury_auth_an) == 1,
                when payment_credential is {
                  ScriptCredential(hash) -> treasury_policy_id == hash
                  _ -> False
                },
              }
            },
          )
        expect Input {
          output: Output {
            value: treasury_in_value,
            datum: InlineDatum(treasury_in_raw_datum),
            ..
          },
          ..
        } = treasury_input
        expect treasury_in_datum: TreasuryDatum = treasury_in_raw_datum
        let TreasuryDatum {
          seller_hash,
          end_time,
          seller_count,
          base_asset,
          raise_asset,
          ..
        } = treasury_in_datum
        expect Interval {
          upper_bound: IntervalBound {
            bound_type: Finite(end_valid_time_range),
            ..
          },
          lower_bound: IntervalBound {
            bound_type: Finite(start_valid_time_range),
            ..
          },
        } = validity_range
        expect [treasury_out] =
          list.filter(
            outputs,
            fn(output) {
              let Output { address: out_addr, value: out_value, .. } = output
              let Address { payment_credential, .. } = out_addr
              and {
                value.quantity_of(out_value, authen_policy_id, treasury_auth_an) == 1,
                when payment_credential is {
                  ScriptCredential(hash) -> treasury_policy_id == hash
                  _ -> False
                },
              }
            },
          )
        expect Output {
          value: treasury_out_value,
          datum: InlineDatum(treasury_out_raw_datum),
          ..
        } = treasury_out
        expect treasury_out_datum: TreasuryDatum = treasury_out_raw_datum

        when mint_seller_amount > 0 is {
          True -> {
            let seller_outputs =
              list.filter(
                outputs,
                fn(output) {
                  let Output { address: out_addr, value: out_value, .. } =
                    output
                  let Address { payment_credential, .. } = out_addr
                  and {
                    value.quantity_of(
                      out_value,
                      treasury_policy_id,
                      seller_auth_an,
                    ) == 1,
                    when payment_credential is {
                      ScriptCredential(hash) -> seller_hash == hash
                      _ -> False
                    },
                  }
                },
              )
            and {
              end_valid_time_range < end_time,
              treasury_in_value == treasury_out_value,
              treasury_out_datum == TreasuryDatum {
                ..treasury_in_datum,
                seller_count: seller_count + mint_seller_amount,
              },
              list.length(seller_outputs) == mint_seller_amount,
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
              ),
              mint_seller_amount > 0,
              value.from_minted_value(mint) == value.from_asset(
                treasury_policy_id,
                seller_auth_an,
                mint_seller_amount,
              ),
            }
          }
          False -> {
            expect [] =
              list.filter(
                outputs,
                fn(output) {
                  let Output { address: out_addr, .. } = output
                  let Address { payment_credential, .. } = out_addr
                  when payment_credential is {
                    ScriptCredential(hash) -> seller_hash == hash
                    _ -> False
                  }
                },
              )
            let seller_inputs =
              list.filter(
                inputs,
                fn(input) {
                  let Input {
                    output: Output { address: out_addr, value: out_value, .. },
                    ..
                  } = input
                  let Address { payment_credential, .. } = out_addr
                  and {
                    value.quantity_of(
                      out_value,
                      treasury_policy_id,
                      seller_auth_an,
                    ) == 1,
                    when payment_credential is {
                      ScriptCredential(hash) -> seller_hash == hash
                      _ -> False
                    },
                  }
                },
              )
            expect [reserve_raise, total_penalty] =
              list.foldl(
                seller_inputs,
                [0, 0],
                fn(seller_input, acc) {
                  expect [acc_reserve_raise, acc_total_penalty] = acc
                  expect Input {
                    output: Output { datum: InlineDatum(seller_raw_datum), .. },
                    ..
                  } = seller_input
                  expect seller_datum: SellerDatum = seller_raw_datum
                  let SellerDatum {
                    base_asset: s_base_asset,
                    raise_asset: s_raise_asset,
                    amount,
                    penalty_amount,
                  } = seller_datum
                  expect and {
                      s_base_asset == base_asset,
                      s_raise_asset == raise_asset,
                    }
                  [
                    acc_reserve_raise + amount,
                    acc_total_penalty + penalty_amount,
                  ]
                },
              )
            let new_treasury_value =
              value.add(
                treasury_in_value,
                raise_asset.policy_id,
                raise_asset.asset_name,
                reserve_raise + total_penalty,
              )
            and {
              start_valid_time_range > end_time,
              treasury_out_value == new_treasury_value,
              treasury_out_datum == TreasuryDatum {
                ..treasury_in_datum,
                seller_count: seller_count - mint_seller_amount,
                reserve_raise: treasury_in_datum.reserve_raise + reserve_raise,
                total_penalty: treasury_in_datum.total_penalty + total_penalty,
              },
              list.length(seller_inputs) == mint_seller_amount,
              value.from_minted_value(mint) == value.from_asset(
                treasury_policy_id,
                seller_auth_an,
                mint_seller_amount,
              ),
            }
          }
        }
      }
      _ -> False
    }
  }
}
