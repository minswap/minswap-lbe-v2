use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Mint, Output, ScriptContext, Spend, Transaction,
  WithdrawFrom,
}
use aiken/transaction/credential.{Address, Inline, ScriptCredential}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{
  AddSeller, CloseEvent, CollectOrders, CollectSeller, CreateAmmPool,
  CreateTreasury, InitTreasury, PoolDatum, RedeemLP, SellerDatum, TreasuryDatum,
  TreasuryRedeemer,
}
use lb_v2/utils.{factory_auth_an}
use lb_v2/validation

validator(authen_policy_id: PolicyId) {
  fn validate_treasury_spending(
    treasury_in_datum: TreasuryDatum,
    redeemer: TreasuryRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext { purpose: Spend(out_ref), transaction } = context
    let Transaction { inputs, outputs, mint, validity_range, .. } = transaction
    let treasury_input =
      validation.get_treasury_input_by_out_ref(
        inputs,
        authen_policy_id,
        out_ref,
      )
    expect Input {
      output: Output {
        address: Address {
          payment_credential: ScriptCredential(treasury_hash),
          ..
        },
        value: treasury_in_value,
        ..
      },
      ..
    } = treasury_input
    // Always spend exactly 1 Treasury UTxO
    expect [_] =
      list.filter(
        inputs,
        fn(input) {
          let Input {
            output: Output { address: Address { payment_credential, .. }, .. },
            ..
          } = input
          when payment_credential is {
            ScriptCredential(hash) -> hash == treasury_hash
            _ -> False
          }
        },
      )
    let mint_value = value.from_minted_value(mint)
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
    when redeemer is {
      AddSeller -> {
        let treasury_output =
          validation.get_treasury_output(
            outputs,
            authen_policy_id,
            treasury_hash,
          )
        let TreasuryDatum { seller_hash, base_asset, raise_asset, .. } =
          treasury_in_datum
        let seller_outputs =
          validation.get_seller_outputs(
            outputs: outputs,
            treasury_policy_id: treasury_hash,
            seller_hash: seller_hash,
            seller_datum: SellerDatum {
              base_asset,
              raise_asset,
              amount: 0,
              penalty_amount: 0,
            },
          )
        expect [] =
          validation.get_seller_inputs(
            inputs: inputs,
            treasury_policy_id: treasury_hash,
            seller_hash: seller_hash,
          )
        validation.validate_add_seller(
          treasury_output: treasury_output,
          treasury_in_datum: treasury_in_datum,
          treasury_in_value: treasury_in_value,
          mint_value: mint_value,
          treasury_hash: treasury_hash,
          seller_outputs: seller_outputs,
          end_valid_time_range: end_valid_time_range,
        )
      }
      CollectSeller -> {
        let treasury_output =
          validation.get_treasury_output(
            outputs,
            authen_policy_id,
            treasury_hash,
          )
        let TreasuryDatum { seller_hash, .. } = treasury_in_datum
        let seller_inputs =
          validation.get_seller_inputs(
            inputs: inputs,
            treasury_policy_id: treasury_hash,
            seller_hash: seller_hash,
          )
        validation.validate_collect_seller(
          treasury_output: treasury_output,
          treasury_in_datum: treasury_in_datum,
          mint_value: mint_value,
          treasury_hash: treasury_hash,
          seller_inputs: seller_inputs,
          start_valid_time_range: start_valid_time_range,
        )
      }
      CollectOrders -> {
        let TreasuryDatum { seller_hash, order_hash, .. } = treasury_in_datum
        let order_inputs =
          validation.get_order_inputs(inputs, seller_hash, order_hash)
        let order_outputs =
          validation.get_order_outputs(outputs, seller_hash, order_hash)
        let treasury_output =
          validation.get_treasury_output(
            outputs,
            authen_policy_id,
            treasury_hash,
          )
        validation.validate_collect_order(
          order_inputs: order_inputs,
          order_outputs: order_outputs,
          treasury_output: treasury_output,
          treasury_in_datum: treasury_in_datum,
          treasury_in_value: treasury_in_value,
          mint_value: mint_value,
        )
      }
      CloseEvent -> {
        let factory_inputs =
          list.filter(
            inputs,
            fn(input) {
              let Input { output, .. } = input
              let Output { value: out_value, .. } = output
              value.quantity_of(out_value, authen_policy_id, factory_auth_an) == 1
            },
          )
        list.length(factory_inputs) == 2
      }
      CreateAmmPool -> {
        let treasury_output =
          validation.get_treasury_output(
            outputs,
            authen_policy_id,
            treasury_hash,
          )
        let pool_output = validation.get_amm_pool_output(outputs)
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
      RedeemLP -> {
        let TreasuryDatum { seller_hash, order_hash, .. } = treasury_in_datum
        let order_inputs =
          validation.get_order_inputs(inputs, seller_hash, order_hash)
        let treasury_output =
          validation.get_treasury_output(
            outputs,
            authen_policy_id,
            treasury_hash,
          )

        validation.validate_redeem_lp(
          order_inputs: order_inputs,
          outputs: outputs,
          treasury_output: treasury_output,
          treasury_in_datum: treasury_in_datum,
          treasury_in_value: treasury_in_value,
          mint_value: mint_value,
        )
      }
      _ -> False
    }
  }

  fn validate_treasury_minting_or_withdrawal(
    redeemer: TreasuryRedeemer,
    context: ScriptContext,
  ) {
    let ScriptContext { purpose, transaction } = context
    let Transaction { inputs, mint, .. } = transaction
    let mint_value = value.from_minted_value(mint)
    when redeemer is {
      CollectOrders -> {
        expect WithdrawFrom(stake_credential) = purpose
        expect Inline(ScriptCredential(script_hash)) = stake_credential
        validation.has_spend_treasury(inputs, authen_policy_id, script_hash)
      }
      other_redeemer -> {
        expect Mint(treasury_policy_id) = purpose
        when other_redeemer is {
          InitTreasury ->
            mint_value == validation.get_value_of_minting_treasury(
              authen_policy_id: authen_policy_id,
              treasury_policy_id: treasury_policy_id,
              step: CreateTreasury,
            )
          AddSeller ->
            // foward logic to spending treasury
            validation.has_spend_treasury(
              inputs,
              authen_policy_id,
              treasury_policy_id,
            )
          CollectSeller ->
            // foward logic to spending treasury
            validation.has_spend_treasury(
              inputs,
              authen_policy_id,
              treasury_policy_id,
            )
          _ -> False
        }
      }
    }
  }
}
