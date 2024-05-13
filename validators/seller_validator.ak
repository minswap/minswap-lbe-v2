use aiken/builtin
use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Mint, Output, ScriptContext, Spend, Transaction,
}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value.{PolicyId, ada_asset_name, ada_policy_id}
use lb_v2/types.{
  Asset, MintCounting, MintDeposit, MintWithdraw, OrderDatum, PenaltyConfig,
  SellerDatum, SellerRedeemer, SpendCounting, SpendDeposit, SpendWithdraw,
  TreasuryDatum, ValidatorHash,
}
use lb_v2/utils.{
  fee_ada, minimum_ada, order_auth_an, seller_auth_an, treasury_auth_an,
}
use lb_v2/validation

validator(authen_policy_id: PolicyId, treasury_hash: ValidatorHash) {
  fn validate_seller_spending(
    datum: SellerDatum,
    redeemer: SellerRedeemer,
    context: ScriptContext,
  ) {
    let ScriptContext { purpose, transaction } = context
    let Transaction {
      inputs,
      reference_inputs,
      outputs,
      validity_range,
      mint,
      ..
    } = transaction

    when redeemer is {
      // treasury counting raise asset(burn Seller)
      // TODO:
      SpendCounting -> True
      // communicate with order(SpendDeposit,SpendWithdraw)
      other_redeemer -> {
        let SellerDatum {
          base_asset: s_in_base_asset,
          raise_asset: s_in_raise_asset,
          amount: s_in_amount,
          penalty_amount: s_in_penalty_amount,
        } = datum
        expect Spend(seller_out_ref) = purpose
        let seller_input =
          list.filter(
            inputs,
            fn(input) {
              let Input { output_reference, .. } = input
              output_reference == seller_out_ref
            },
          )
            |> builtin.head_list
        let Input {
          output: Output { value: seller_in_value, address: seller_address, .. },
          ..
        } = seller_input
        //1. 1 seller input
        expect [_] =
          list.filter(
            inputs,
            fn(input) {
              let Input { output: Output { address, .. }, .. } = input
              address == seller_address
            },
          )
        //2. 1 seller output
        expect [seller_output] =
          list.filter(
            outputs,
            fn(output) {
              let Output { address, .. } = output
              address == seller_address
            },
          )
        expect Output {
          value: seller_out_value,
          datum: InlineDatum(raw_seller_out_datum),
          ..
        } = seller_output
        expect SellerDatum {
          base_asset: s_out_base_asset,
          raise_asset: s_out_raise_asset,
          amount: s_out_amount,
          penalty_amount: s_out_penalty_amount,
        }: SellerDatum = raw_seller_out_datum
        expect [treasury_ref_input] =
          list.filter(
            reference_inputs,
            fn(input) {
              let Input {
                output: Output {
                  address: Address { payment_credential, .. },
                  ..
                },
                ..
              } = input
              payment_credential == ScriptCredential(treasury_hash)
            },
          )
        expect Input {
          output: Output {
            value: treasury_value,
            datum: InlineDatum(raw_treasury_datum),
            ..
          },
          ..
        } = treasury_ref_input
        expect TreasuryDatum {
          base_asset: t_base_asset,
          raise_asset: t_raise_asset,
          start_time,
          end_time,
          penalty_config,
          order_hash,
          ..
        }: TreasuryDatum = raw_treasury_datum

        expect Interval {
          lower_bound: IntervalBound { bound_type: Finite(lower_bound), .. },
          upper_bound: IntervalBound { bound_type: Finite(upper_bound), .. },
        } = validity_range
        expect and {
            // 3. validdate that LBE is Live
            start_time <= lower_bound,
            upper_bound <= end_time,
            // 4. validate LBE ID(base, raise asset)
            t_base_asset == s_in_base_asset,
            t_base_asset == s_out_base_asset,
            t_raise_asset == s_in_raise_asset,
            t_raise_asset == s_out_raise_asset,
            // 5. treasury contain treasury authen
            value.quantity_of(
              treasury_value,
              authen_policy_id,
              treasury_auth_an,
            ) == 1,
            // 6. seller input contain 1 seller authen
            value.quantity_of(seller_in_value, treasury_hash, seller_auth_an) == 1,
            // 7. seller input and output no change
            seller_in_value == seller_out_value,
          }
        // more info for below flow
        let mint_value = value.flatten(value.from_minted_value(mint))
        expect Address { payment_credential: ScriptCredential(seller_hash), .. } =
          seller_address
        when other_redeemer is {
          SpendDeposit(amount) -> {
            expect [order_output] =
              list.filter(
                outputs,
                fn(output) {
                  let Output { address: Address { payment_credential, .. }, .. } =
                    output
                  payment_credential == ScriptCredential(order_hash)
                },
              )
            expect Output {
              value: o_out_value,
              datum: InlineDatum(raw_o_out_datum),
              ..
            } = order_output
            expect OrderDatum {
              base_asset: o_base_asset,
              raise_asset: o_raise_asset,
              amount: o_amount,
              is_collected,
              penalty_amount,
              ..
            }: OrderDatum = raw_o_out_datum
            let Asset { policy_id: raise_pid, asset_name: raise_an } =
              t_raise_asset
            let expected_o_out_value =
              value.zero()
                |> value.add(
                    ada_policy_id,
                    ada_asset_name,
                    // 1 fee_ada for collect order tx, 1 fee_ada for redeem order tx
                    minimum_ada + fee_ada * 2,
                  )
                |> value.add(seller_hash, order_auth_an, 1)
                |> value.add(raise_pid, raise_an, amount)
            and {
              // mint value
              mint_value == [(seller_hash, order_auth_an, 1)],
              // seller amount+ penalty amount
              s_out_amount == s_in_amount + amount,
              s_out_penalty_amount == s_in_penalty_amount,
              // order datum
              o_base_asset == t_base_asset,
              o_raise_asset == t_raise_asset,
              o_amount == amount,
              is_collected == False,
              penalty_amount == 0,
              // order value
              expected_o_out_value == o_out_value,
            }
          }
          // cancel or udpate order
          SpendWithdraw(_) -> {
            // (owners, acc_input_amount, acc_penalty) and validate orders
            let (owners, acc_input_amount, acc_input_penalty) =
              list.foldl(
                inputs,
                ([], 0, 0),
                fn(order_input, acc) {
                  expect Input {
                    output: Output {
                      datum: InlineDatum(raw_o_datum),
                      value: o_out_value,
                      address: Address { payment_credential, .. },
                      ..
                    },
                    ..
                  } = order_input
                  if payment_credential == ScriptCredential(order_hash) {
                    let (owners, acc_amount, acc_penalty) = acc
                    expect OrderDatum {
                      base_asset: o_base_asset,
                      raise_asset: o_raise_asset,
                      amount,
                      is_collected,
                      penalty_amount,
                      owner,
                    }: OrderDatum = raw_o_datum
                    // validate orders
                    expect and {
                        is_collected == False,
                        o_base_asset == t_base_asset,
                        o_raise_asset == t_raise_asset,
                        value.quantity_of(
                          o_out_value,
                          seller_hash,
                          order_auth_an,
                        ) == 1,
                      }
                    (
                      [owner, ..owners],
                      acc_amount + amount,
                      acc_penalty + penalty_amount,
                    )
                  } else {
                    acc
                  }
                },
              )
            let order_in_amount = list.length(owners)
            let (acc_output_amount, acc_output_penalty, order_out_amount) =
              list.foldl(
                outputs,
                (0, 0, 0),
                fn(output, acc) {
                  expect Output {
                    datum: InlineDatum(raw_o_datum),
                    value: o_out_value,
                    address: Address { payment_credential, .. },
                    ..
                  } = output
                  if payment_credential == ScriptCredential(order_hash) {
                    let (acc_amount, acc_penalty, order_amount) = acc
                    expect OrderDatum {
                      base_asset: o_base_asset,
                      raise_asset: o_raise_asset,
                      amount,
                      is_collected,
                      penalty_amount,
                      ..
                    }: OrderDatum = raw_o_datum
                    // validate orders
                    expect and {
                        is_collected == False,
                        o_base_asset == t_base_asset,
                        o_raise_asset == t_raise_asset,
                        value.quantity_of(
                          o_out_value,
                          seller_hash,
                          order_auth_an,
                        ) == 1,
                      }
                    (
                      acc_amount + amount,
                      acc_penalty + penalty_amount,
                      order_amount + 1,
                    )
                  } else {
                    acc
                  }
                },
              )
            let penalty =
              when penalty_config is {
                None -> 0
                Some(PenaltyConfig {
                  penalty_start_time,
                  penalty_end_time,
                  percent,
                }) ->
                  if
                  upper_bound < penalty_start_time || lower_bound > penalty_end_time{
                  
                    0
                  } else {
                    let withdrawal_amount =
                      if acc_input_amount > acc_output_amount {
                        acc_input_amount - acc_output_amount
                      } else {
                        0
                      }
                    withdrawal_amount * percent / 100
                  }
              }

            let is_valid_mint =
              if order_in_amount == order_out_amount {
                mint_value == []
              } else {
                mint_value == [
                  (
                    seller_hash,
                    order_auth_an,
                    order_out_amount - order_in_amount,
                  ),
                ]
              }
            // TODO: uniq owner and verify they signature
            and {
              is_valid_mint,
              // valid acc penalty of input and output
              acc_output_penalty == acc_input_penalty + penalty,
              // seller datum(amount+ penalty)
              s_out_amount == s_in_amount - acc_input_amount + acc_output_amount,
              s_out_penalty_amount == s_in_penalty_amount - acc_input_penalty + acc_output_penalty,
            }
          }
          _ -> False
        }
      }
    }
  }

  fn validate_seller_minting(redeemer: SellerRedeemer, context: ScriptContext) {
    let ScriptContext { purpose, transaction } = context
    let Transaction { inputs, mint, .. } = transaction
    expect Mint(seller_policy_id) = purpose
    when redeemer is {
      MintDeposit -> and {
          value.from_minted_value(mint) == value.from_asset(
            seller_policy_id,
            order_auth_an,
            1,
          ),
          validation.has_spend_seller(inputs, treasury_hash, seller_policy_id),
        }
      MintWithdraw -> and {
          value.from_minted_value(mint) == value.from_asset(
            seller_policy_id,
            order_auth_an,
            -1,
          ),
          validation.has_spend_seller(inputs, treasury_hash, seller_policy_id),
        }
      MintCounting ->
        validation.has_spend_treasury(inputs, authen_policy_id, treasury_hash)
      _ -> False
    }
  }
}
