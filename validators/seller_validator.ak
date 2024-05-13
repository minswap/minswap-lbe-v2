use aiken/builtin
use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Output, ScriptContext, Spend, Transaction,
}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value.{PolicyId, ada_asset_name, ada_policy_id}
use lb_v2/types.{
  Asset, OrderDatum, SellerDatum, SellerRedeemer, SpendCounting, SpendDeposit,
  SpendWithdraw, TreasuryDatum, ValidatorHash,
}
use lb_v2/utils.{
  fee_ada, minimum_ada, order_auth_an, seller_auth_an, treasury_auth_an,
}

validator(authen_policy_id: PolicyId, treasury_hash: ValidatorHash) {
  fn validate_seller(
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
          // penalty_config,
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
            expect [o_output] =
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
            } = o_output
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
          SpendWithdraw(_) ->
            // let order_inputs =
            //   list.filter(
            //     inputs,
            //     fn(output) {
            //       let Input {
            //         output: Output {
            //           address: Address { payment_credential, .. },
            //           ..
            //         },
            //         ..
            //       } = output
            //       payment_credential == ScriptCredential(order_hash)
            //     },
            //   )
            // (owners, acc_input_amount, acc_penalty)
            // let (_owners, _acc_input_amount, _acc_input_penalty) =
            //   list.foldl(
            //     order_inputs,
            //     ([], 0, 0),
            //     fn(order_input, acc) {
            //       let (owners, acc_amount, acc_penalty) = acc
            //       expect Input {
            //         output: Output {
            //           datum: InlineDatum(raw_o_datum),
            //           value: _o_out_value,
            //           ..
            //         },
            //         ..
            //       } = order_input
            //       expect OrderDatum {
            //         base_asset: _o_base_asset,
            //         raise_asset: _o_raise_asset,
            //         amount: o_amount,
            //         ..
            //       }: OrderDatum =
            //         // is_collected,
            //         // penalty_amount,
            //         // owner,
            //         raw_o_datum
            //       (
            //         // [owner, ..owners],
            //         owners,
            //         acc_amount + o_amount,
            //         acc_penalty + penalty_amount,
            //       )
            //     },
            //   )
            True
          _ -> True
        }
      }
    }
  }

  // fn validate_minting_order_nft_and_seller_withdrawal(
  //   raw_redeemer: Data,
  //   context: ScriptContext,
  // ) {
  //   let ScriptContext { purpose, transaction } = context
  //   when purpose is {
  //     WithdrawFrom(stake_credential) -> {
  //       let Transaction { outputs, inputs, reference_inputs, mint, .. } =
  //         transaction
  //       expect Inline(seller_hash_credential) = stake_credential
  //       expect ScriptCredential(seller_hash) = seller_hash_credential
  //       expect [treasury_ref_input] =
  //         list.filter(
  //           reference_inputs,
  //           fn(ref_input) {
  //             let Input { output: Output { value, .. }, .. } = ref_input
  //             value.quantity_of(value, authen_policy_id, treasury_auth_an) == 1
  //           },
  //         )
  //       let order_input =
  //         list.filter(
  //           inputs,
  //           fn(input) {
  //             let Input { output: Output { value, .. }, .. } = input
  //             value.quantity_of(value, seller_hash, order_auth_an) == 1
  //           },
  //         )
  //       let order_output =
  //         list.filter(
  //           outputs,
  //           fn(output) {
  //             let Output { value, .. } = output
  //             value.quantity_of(value, seller_hash, order_auth_an) == 1
  //           },
  //         )
  //       expect Input {
  //         output: Output { datum: InlineDatum(treasury_raw_datum), .. },
  //         ..
  //       } = treasury_ref_input
  //       expect treasury_datum: TreasuryDatum = treasury_raw_datum
  //       let TreasuryDatum {
  //         base_asset: t_base_asset,
  //         raise_asset: t_raise_asset,
  //         ..
  //       } = treasury_datum
  //       True
  //     }
  //     Mint(policy_id) -> True
  //     _ -> False
  //   }
  // }
}
