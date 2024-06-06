use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Output, ScriptContext, Spend, Transaction,
}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value
use lb_v2/cancel_validation.{validate_cancel_lbe}
use lb_v2/order_validation.{
  validate_collect_orders, validate_redeem, validate_refund,
}
use lb_v2/treasury_validation.{
  validate_create_dex_pool, validate_creating_treasury_out,
}
use lb_v2/types.{
  CancelLBE, CloseEvent, CollectManager, CollectOrders, CreateAmmPool, PoolDatum,
  RedeemOrders, TreasuryDatum, TreasuryRedeemer, UpdateLBE,
}
use lb_v2/utils.{
  assert, factory_auth_an, must_get_end_validity, treasury_auth_an,
}
use lb_v2/validation

validator {
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
    expect Some(treasury_input) =
      list.find(
        inputs,
        fn(input) {
          let Input { output_reference, .. } = input
          output_reference == out_ref
        },
      )
    // Extract some necessary data.
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
    let TreasuryDatum {
      factory_policy_id,
      manager_hash,
      order_hash,
      is_cancelled,
      ..
    } = treasury_in_datum
    let mint_value = value.from_minted_value(mint)
    let end_valid_time_range = must_get_end_validity(validity_range)
    expect and {
        assert(
          value.quantity_of(
            treasury_in_value,
            factory_policy_id,
            treasury_auth_an,
          ) == 1,
          @"Treasury Input must contains 1 Treasury Token",
        ),
        assert(
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
              payment_credential == ScriptCredential(treasury_hash)
            },
          ) == [treasury_input],
          @"Always spend exactly 1 Treasury Input!",
        ),
      }
    when redeemer is {
      // UpdateLBE before discovery phase
      UpdateLBE -> {
        let TreasuryDatum {
          base_asset,
          raise_asset,
          owner,
          start_time,
          seller_hash,
          ..
        } = treasury_in_datum
        let Address { payment_credential: owner_payment_credential, .. } = owner
        let treasury_output =
          validation.get_treasury_output(
            outputs,
            factory_policy_id,
            treasury_hash,
          )
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
          validate_creating_treasury_out(
            treasury_out: treasury_output,
            base_asset: base_asset,
            raise_asset: raise_asset,
            manager_hash: manager_hash,
            seller_hash: seller_hash,
            order_hash: order_hash,
            factory_policy_id: factory_policy_id,
            end_valid_time_range: end_valid_time_range,
          ),
          // mint nothing
          mint_value == value.zero(),
        }
      }
      CollectManager ->
        validation.validate_collect_manager(
          inputs: inputs,
          outputs: outputs,
          treasury_in_value: treasury_in_value,
          treasury_in_datum: treasury_in_datum,
          mint_value: mint_value,
          factory_policy_id: factory_policy_id,
          manager_hash: manager_hash,
          treasury_hash: treasury_hash,
        )
      CollectOrders ->
        validate_collect_orders(
          inputs: inputs,
          outputs: outputs,
          treasury_in_datum: treasury_in_datum,
          treasury_in_value: treasury_in_value,
          mint_value: mint_value,
          treasury_hash: treasury_hash,
        )
      CloseEvent -> {
        // forward logic to factory with case 2 factory inputs
        expect [_, _] =
          list.filter(
            inputs,
            fn(input) {
              let Input {
                output: Output {
                  address: Address { payment_credential, .. },
                  value: out_value,
                  ..
                },
                ..
              } = input
              and {
                payment_credential == ScriptCredential(factory_policy_id),
                value.quantity_of(out_value, factory_policy_id, factory_auth_an) == 1,
              }
            },
          )
        True
      }
      CreateAmmPool -> {
        let treasury_output =
          validation.get_treasury_output(
            outputs,
            factory_policy_id,
            treasury_hash,
          )
        let pool_output = validation.get_amm_pool_output(outputs)
        expect Output { datum: InlineDatum(pool_raw_datum), .. } = pool_output
        expect amm_pool_datum: PoolDatum = pool_raw_datum
        let TreasuryDatum { owner: project_owner, .. } = treasury_in_datum
        let owner_outputs =
          list.filter(
            outputs,
            fn(output) {
              let Output { address, .. } = output
              address == project_owner
            },
          )
        validate_create_dex_pool(
          treasury_in_datum: treasury_in_datum,
          treasury_output: treasury_output,
          mint_value: mint_value,
          amm_pool_datum: amm_pool_datum,
          factory_policy_id: factory_policy_id,
          project_owner_outputs: owner_outputs,
        )
      }
      RedeemOrders ->
        when is_cancelled is {
          True ->
            validate_refund(
              inputs: inputs,
              outputs: outputs,
              treasury_in_datum: treasury_in_datum,
              treasury_in_value: treasury_in_value,
              mint_value: mint_value,
              treasury_hash: treasury_hash,
            )
          False ->
            validate_redeem(
              inputs: inputs,
              outputs: outputs,
              treasury_in_datum: treasury_in_datum,
              treasury_in_value: treasury_in_value,
              mint_value: mint_value,
              treasury_hash: treasury_hash,
            )
        }
      CancelLBE(reason) -> {
        // finding exactly 1 Legit Treasury Output
        let treasury_output =
          validation.get_treasury_output(
            outputs,
            factory_policy_id,
            treasury_hash,
          )
        validate_cancel_lbe(
          treasury_in_datum: treasury_in_datum,
          treasury_in_value: treasury_in_value,
          treasury_output: treasury_output,
          ref_inputs: reference_inputs,
          inputs: inputs,
          extra_signatories: extra_signatories,
          end_valid_time_range: end_valid_time_range,
          cancel_reason: reason,
          mint_value: mint_value,
        )
      }
    }
  }
}
