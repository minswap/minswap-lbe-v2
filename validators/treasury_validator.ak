use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Mint, Output, ScriptContext, Transaction,
}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{
  CreateSeller, CreateTreasury, InitTreasury, MintSeller, SellerDatum,
  TreasuryDatum, TreasuryRedeemer,
}
use lb_v2/utils.{seller_auth_an, treasury_auth_an}
use lb_v2/validation

validator(authen_policy_id: PolicyId) {
  fn validate_minting_treasury(
    redeemer: TreasuryRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext { purpose: Mint(treasury_policy_id), transaction } =
      context
    let Transaction { inputs, outputs, mint, validity_range, .. } = transaction
    expect MintSeller { step: mint_seller_step } = redeemer
    let ok =
      when mint_seller_step is {
        InitTreasury ->
          value.from_minted_value(mint) == validation.get_value_of_minting_treasury(
            authen_policy_id: authen_policy_id,
            treasury_policy_id: treasury_policy_id,
            step: CreateTreasury,
          )
        CreateSeller { amount: create_seller_amount } -> {
          // validate Spending Treasury and New Treasury
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
                  value.quantity_of(
                    out_value,
                    authen_policy_id,
                    treasury_auth_an,
                  ) == 1,
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
            seller_count,
            seller_hash,
            base_asset,
            raise_asset,
            end_time,
            ..
          } = treasury_in_datum
          // validate timing
          expect Interval {
            upper_bound: IntervalBound {
              bound_type: Finite(end_valid_time_range),
              ..
            },
            ..
          } = validity_range
          expect end_valid_time_range < end_time
          expect [treasury_out] =
            list.filter(
              outputs,
              fn(output) {
                let Output { address: out_addr, value: out_value, .. } = output
                let Address { payment_credential, .. } = out_addr
                and {
                  value.quantity_of(
                    out_value,
                    authen_policy_id,
                    treasury_auth_an,
                  ) == 1,
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
          expect and {
              treasury_in_value == treasury_out_value,
              treasury_out_datum == TreasuryDatum {
                ..treasury_in_datum,
                seller_count: seller_count + 1,
              },
            }
          // validating creating sellers
          let seller_outputs =
            list.filter(
              outputs,
              fn(output) {
                let Output { address: out_addr, value: out_value, .. } = output
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
            list.length(seller_outputs) == create_seller_amount,
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
            create_seller_amount > 0,
            value.from_minted_value(mint) == value.from_asset(
              treasury_policy_id,
              seller_auth_an,
              create_seller_amount,
            ),
          }
        }
        _ -> False
      }
    ok
  }
}
