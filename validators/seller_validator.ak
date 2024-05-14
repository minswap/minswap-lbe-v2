use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Mint, Output, ScriptContext, Spend, Transaction,
  WithdrawFrom,
}
use aiken/transaction/credential.{
  Address, Inline, ScriptCredential, VerificationKeyCredential,
}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{
  CollectOrderToken, CountingSeller, OrderDatum, SellerDatum, SellerRedeemer,
  TreasuryDatum, UsingSeller, ValidatorHash,
}
use lb_v2/utils.{
  calculate_penalty, get_order_value, order_auth_an, seller_auth_an,
}
use lb_v2/validation

validator(authen_policy_id: PolicyId, treasury_hash: ValidatorHash) {
  fn validate_seller_spending(
    seller_in_datum: SellerDatum,
    redeemer: SellerRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext { purpose: Spend(out_ref), transaction } = context
    let Transaction { mint, .. } = transaction
    let mint_value = value.from_minted_value(mint)
    when redeemer is {
      CountingSeller ->
        // foward logic to Treasury Minting
        value.quantity_of(mint_value, treasury_hash, seller_auth_an) < 0
      UsingSeller -> {
        let Transaction {
          inputs,
          reference_inputs,
          outputs,
          validity_range,
          extra_signatories,
          ..
        } = transaction
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
        // Validate always spend exactly 1 Seller UTxO
        let seller_input =
          validation.get_seller_input_by_out_ref(inputs, treasury_hash, out_ref)
        expect Input {
          output: Output {
            address: Address {
              payment_credential: ScriptCredential(seller_hash),
              ..
            },
            value: seller_in_value,
            ..
          },
          ..
        } = seller_input
        expect [_] =
          list.filter(
            inputs,
            fn(input) {
              let Input {
                output: Output {
                  address: Address { payment_credential, .. },
                  ..
                },
                ..
              } = input
              when payment_credential is {
                ScriptCredential(hash) -> hash == seller_hash
                _ -> False
              }
            },
          )
        // Validate always pay 1 Seller UTxO
        expect [
          Output {
            value: seller_out_value,
            datum: InlineDatum(seller_out_raw_datum),
            ..
          },
        ] = validation.get_seller_outputs(outputs, treasury_hash, seller_hash)
        expect seller_out_datum: SellerDatum = seller_out_raw_datum
        // Validate Datums
        let treasury_datum =
          validation.get_treasury_ref_input_datum(
            reference_inputs,
            authen_policy_id,
            treasury_hash,
          )

        let order_inputs =
          validation.get_order_inputs(
            inputs,
            seller_hash,
            treasury_datum.order_hash,
          )
        let (total_input_amount, total_input_penalty, order_input_count) =
          list.foldl(
            order_inputs,
            (0, 0, 0),
            fn(order_input, acc) {
              expect Input {
                output: Output {
                  datum: InlineDatum(raw_o_datum),
                  value: order_value,
                  ..
                },
                ..
              } = order_input
              let (acc_amount, acc_penalty, acc_order_amount) = acc
              expect OrderDatum {
                base_asset: o_base_asset,
                raise_asset: o_raise_asset,
                amount,
                is_collected,
                penalty_amount,
                owner,
              }: OrderDatum = raw_o_datum
              expect Address {
                payment_credential: VerificationKeyCredential(pub_key_hash),
                ..
              } = owner
              let expected_order =
                get_order_value(
                  amount: amount,
                  penalty_amount: penalty_amount,
                  seller_policy_id: seller_hash,
                  is_collected: False,
                  raise_asset: treasury_datum.raise_asset,
                )
              // validate orders
              expect and {
                  list.has(extra_signatories, pub_key_hash),
                  is_collected == is_collected,
                  o_base_asset == treasury_datum.base_asset,
                  o_raise_asset == treasury_datum.raise_asset,
                  expected_order == order_value,
                }
              (
                acc_amount + amount,
                acc_penalty + penalty_amount,
                acc_order_amount + 1,
              )
            },
          )
        let order_outputs =
          validation.get_order_outputs(
            outputs,
            seller_hash,
            treasury_datum.order_hash,
          )
        let (total_output_amount, total_output_penalty, order_output_count) =
          list.foldl(
            order_outputs,
            (0, 0, 0),
            fn(order_output, acc) {
              expect Output {
                datum: InlineDatum(raw_o_datum),
                value: order_value,
                ..
              } = order_output
              let (acc_amount, acc_penalty, acc_order_amount) = acc
              expect OrderDatum {
                base_asset: o_base_asset,
                raise_asset: o_raise_asset,
                amount,
                is_collected,
                penalty_amount,
                owner,
              }: OrderDatum = raw_o_datum
              expect Address {
                payment_credential: VerificationKeyCredential(pub_key_hash),
                ..
              } = owner
              let expected_order =
                get_order_value(
                  amount: amount,
                  penalty_amount: penalty_amount,
                  seller_policy_id: seller_hash,
                  is_collected: is_collected,
                  raise_asset: treasury_datum.raise_asset,
                )
              // validate orders
              expect and {
                  list.has(extra_signatories, pub_key_hash),
                  is_collected == False,
                  o_base_asset == treasury_datum.base_asset,
                  o_raise_asset == treasury_datum.raise_asset,
                  expected_order == order_value,
                }
              (
                acc_amount + amount,
                acc_penalty + penalty_amount,
                acc_order_amount + 1,
              )
            },
          )
        // penalty amount of this Tx
        let penalty =
          calculate_penalty(
            penalty_config: treasury_datum.penalty_config,
            start_valid_time_range: start_valid_time_range,
            end_valid_time_range: end_valid_time_range,
            total_input_amount: total_input_amount,
            total_output_amount: total_output_amount,
          )
        let is_valid_minting =
          if order_input_count == order_output_count {
            value.flatten(mint_value) == []
          } else {
            value.flatten(mint_value) == [
              (
                seller_hash,
                order_auth_an,
                order_output_count - order_input_count,
              ),
            ]
          }
        and {
          // validate LBE ID
          treasury_datum.base_asset == seller_in_datum.base_asset,
          treasury_datum.raise_asset == seller_in_datum.raise_asset,
          treasury_datum.base_asset == seller_out_datum.base_asset,
          treasury_datum.raise_asset == seller_out_datum.raise_asset,
          // validate time frame
          treasury_datum.start_time < start_valid_time_range,
          treasury_datum.end_time > end_valid_time_range,
          // validate seller value
          seller_in_value == seller_out_value,
          // validate seller datum after apply order
          //   - amount
          seller_out_datum.amount == seller_in_datum.amount - total_input_amount + total_output_amount,
          //   - penalty amount
          seller_out_datum.penalty_amount == seller_in_datum.penalty_amount - total_input_penalty + total_output_penalty,
          // validate penalty amount
          total_output_penalty - total_input_penalty == penalty,
          // validate minting
          is_valid_minting,
        }
      }
      _ -> False
    }
  }

  fn validate_seller_minting_or_withdraw(
    redeemer: SellerRedeemer,
    context: ScriptContext,
  ) {
    let ScriptContext { purpose, transaction: Transaction { inputs, .. } } =
      context
    when redeemer is {
      UsingSeller -> {
        let seller_policy_id =
          when purpose is {
            Mint(policy_id) -> policy_id
            WithdrawFrom(stake_credential) -> {
              expect Inline(ScriptCredential(script_hash)) = stake_credential
              script_hash
            }
            _ -> fail
          }
        validation.has_spend_seller(inputs, treasury_hash, seller_policy_id)
      }
      CollectOrderToken ->
        validation.has_spend_treasury(inputs, authen_policy_id, treasury_hash)
      _ -> False
    }
  }
}
