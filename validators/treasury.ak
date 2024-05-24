use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Mint, Output, ScriptContext, Spend, Transaction,
  WithdrawFrom,
}
use aiken/transaction/credential.{Address, Inline, ScriptCredential}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{
  CancelLBE, CloseEvent, CollectManager, CollectOrders, CreateAmmPool, PoolDatum,
  RedeemOrders, TreasuryDatum, TreasuryRedeemer, UpdateLBE,
}
use lb_v2/utils.{factory_auth_an, treasury_auth_an}
use lb_v2/validation

validator(authen_policy_id: PolicyId) {
  fn validate_treasury_spending(
    treasury_in_datum: TreasuryDatum,
    redeemer: TreasuryRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext { purpose: Spend(out_ref), transaction } = context
    let Transaction {
      inputs,
      outputs,
      mint,
      validity_range,
      reference_inputs,
      extra_signatories,
      ..
    } = transaction
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
        bound_type: Finite(_start_valid_time_range),
        ..
      },
    } = validity_range
    // need to check all minting value to not burn manager auth beacause it forward logic to this contract
    // No order inputs, no manager inputs in unrelated redeemer
    let TreasuryDatum { seller_hash, order_hash, manager_hash, .. } =
      treasury_in_datum
    let order_inputs =
      validation.get_order_inputs(
        inputs: inputs,
        seller_policy_id: seller_hash,
        order_hash: order_hash,
      )
    let manager_inputs =
      validation.get_manager_inputs(
        inputs: inputs,
        treasury_policy_id: treasury_hash,
        manager_hash: manager_hash,
      )
    when redeemer is {
      // UpdateLBE before discovery phase
      UpdateLBE -> {
        let TreasuryDatum { base_asset, raise_asset, owner, start_time, .. } =
          treasury_in_datum
        let Address { payment_credential: owner_payment_credential, .. } = owner
        let treasury_output =
          validation.get_treasury_output(
            outputs,
            authen_policy_id,
            treasury_hash,
          )
        expect Output {
          value: treasury_out_value,
          datum: InlineDatum(raw_treasury_out_datum),
          ..
        } = treasury_output
        expect treasury_out_datum: TreasuryDatum = raw_treasury_out_datum
        and {
          // before discovery phase
          end_valid_time_range < start_time,
          // Authorize by owner
          validation.validate_authorize_by_owner(
            owner_payment_credential: owner_payment_credential,
            extra_signatories: extra_signatories,
            inputs: inputs,
          ),
          // create new one
          validation.validate_creating_treasury_out(
            treasury_out_value: treasury_out_value,
            treasury_out_datum: treasury_out_datum,
            base_asset: base_asset,
            raise_asset: raise_asset,
            manager_hash: manager_hash,
            seller_hash: seller_hash,
            order_hash: order_hash,
            authen_policy_id: authen_policy_id,
          ),
          // mint nothing
          mint_value == value.zero(),
          // no order inputs
          order_inputs == [],
          // no manager inputs
          manager_inputs == [],
        }
      }
      CollectManager -> {
        let treasury_output =
          validation.get_treasury_output(
            outputs,
            authen_policy_id,
            treasury_hash,
          )
        expect [manager_input] = manager_inputs
        and {
          validation.validate_collect_manager(
            treasury_output: treasury_output,
            treasury_in_datum: treasury_in_datum,
            manager_input: manager_input,
            mint_value: mint_value,
            treasury_hash: treasury_hash,
          ),
          // no order inputs
          order_inputs == [],
        }
      }
      CollectOrders -> {
        let order_outputs =
          validation.get_order_outputs(outputs, seller_hash, order_hash)
        let treasury_output =
          validation.get_treasury_output(
            outputs,
            authen_policy_id,
            treasury_hash,
          )
        and {
          validation.validate_collect_order(
            order_inputs: order_inputs,
            order_outputs: order_outputs,
            treasury_output: treasury_output,
            treasury_in_datum: treasury_in_datum,
            treasury_in_value: treasury_in_value,
            mint_value: mint_value,
          ),
          // no manager inputs
          manager_inputs == [],
        }
      }
      CloseEvent -> {
        // forward logic to factory with case 2 factory inputs
        expect [_, _] =
          list.filter(
            inputs,
            fn(input) {
              let Input { output, .. } = input
              let Output { value: out_value, .. } = output
              value.quantity_of(out_value, authen_policy_id, factory_auth_an) == 1
            },
          )
        and {
          // no order inputs
          order_inputs == [],
          // no manager inputs
          manager_inputs == [],
        }
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
        and {
          validation.validate_create_dex_pool(
            treasury_in_datum: treasury_in_datum,
            treasury_output: treasury_output,
            validity_range: validity_range,
            mint_value: mint_value,
            amm_pool_datum: amm_pool_datum,
          ),
          // no order inputs
          order_inputs == [],
          // no manager inputs
          manager_inputs == [],
        }
      }
      RedeemOrders -> {
        let TreasuryDatum { total_liquidity, .. } = treasury_in_datum
        let treasury_output =
          validation.get_treasury_output(
            outputs,
            authen_policy_id,
            treasury_hash,
          )

        and {
          if total_liquidity != 0 {
            validation.validate_redeem_lp(
              order_inputs: order_inputs,
              outputs: outputs,
              treasury_output: treasury_output,
              treasury_in_datum: treasury_in_datum,
              treasury_in_value: treasury_in_value,
              mint_value: mint_value,
            )
          } else {
            validation.validate_refund(
              order_inputs: order_inputs,
              outputs: outputs,
              treasury_output: treasury_output,
              treasury_in_datum: treasury_in_datum,
              treasury_in_value: treasury_in_value,
              mint_value: mint_value,
            )
          },
          // no manager inputs
          manager_inputs == [],
        }
      }
      CancelLBE -> {
        let treasury_output =
          validation.get_treasury_output(
            outputs,
            authen_policy_id,
            treasury_hash,
          )
        and {
          validation.validate_cancel_lbe(
            treasury_in_datum: treasury_in_datum,
            treasury_in_value: treasury_in_value,
            treasury_output: treasury_output,
            ref_inputs: reference_inputs,
          ),
          mint_value == value.zero(),
          // no order inputs
          order_inputs == [],
          // no manager inputs
          manager_inputs == [],
        }
      }
    }
  }

  fn validate_treasury_minting_or_withdrawal(
    _redeemer: Data,
    context: ScriptContext,
  ) {
    let ScriptContext { purpose, transaction } = context
    let Transaction { inputs, mint, .. } = transaction
    let mint_value = value.from_minted_value(mint)
    when purpose is {
      WithdrawFrom(stake_credential) -> {
        // collect orders -> forward logic to treasury spending
        // need to check order input of treasury
        expect Inline(ScriptCredential(script_hash)) = stake_credential
        // TODO: check oreder redeemer 
        validation.has_spend_treasury(inputs, authen_policy_id, script_hash)
      }
      Mint(treasury_policy_id) -> or {
          // create Treasury -> forward logic to factory
          value.quantity_of(mint_value, authen_policy_id, treasury_auth_an) == 1,
          // TODO: check order redeemer
          validation.has_spend_treasury(
            inputs,
            authen_policy_id,
            treasury_policy_id,
          ),
        }
      _ -> False
    }
  }
}
