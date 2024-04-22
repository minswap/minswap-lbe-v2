use aiken/dict
use aiken/list
use aiken/transaction.{
  Input, Mint, Output, OutputReference, ScriptContext, Spend, Transaction,
  WithdrawFrom,
}
use aiken/transaction/credential.{
  Address, Inline, ScriptCredential, VerificationKeyCredential,
}
use aiken/transaction/value
use lb_v2/types.{
  ApplyOrder, AuthenRedeemer, Batching, CancelLBE, CancelOrder, CreatePool,
  CreateTreasury, InitialContract, OrderDatum, OrderRedeemer, PoolDatum,
  TreasuryDatum, TreasuryRedeemer, UpdateLBE,
}
use lb_v2/utils.{
  amm_authen_policy_id, amm_pool_auth_asset_name, amm_pool_validation_hash,
  factory_auth_an, treasury_auth_an,
}
use lb_v2/validation.{
  get_amm_pool_datum, get_treasury_input, get_treasury_output,
  validate_create_dex_pool,
}

validator(initial_out_ref: OutputReference) {
  fn validate_authen_and_order_spending(
    raw_redeemer: Data,
    context: ScriptContext,
  ) {
    let ScriptContext { transaction, purpose } = context
    when purpose is {
      Mint(script_hash) -> {
        expect redeemer: AuthenRedeemer = raw_redeemer
        when redeemer is {
          // The redeemer can be called once to initialize the whole LBE system
          InitialContract ->
            validation.validate_initial_contract(
              script_hash,
              transaction,
              initial_out_ref,
            )
          CreateTreasury ->
            validation.validate_create_treasury(script_hash, transaction)
        }
      }
      WithdrawFrom(stake_credential) -> {
        expect Inline(credential) = stake_credential
        expect ScriptCredential(script_hash) = credential
        let authen_policy_id = script_hash
        let Transaction { inputs, .. } = transaction
        // having only one treasury input
        expect [_] =
          list.filter(
            inputs,
            fn(input) {
              let Input { output: Output { value: out_value, .. }, .. } = input
              value.quantity_of(out_value, authen_policy_id, treasury_auth_an) == 1
            },
          )
        True
      }
      _ -> False
    }
  }

  fn validate_factory_treasury_order(
    raw_datum: Data,
    raw_redeemer: Data,
    context: ScriptContext,
  ) {
    let ScriptContext { transaction, purpose } = context
    expect Spend(script_ref) = purpose
    let Transaction {
      inputs,
      mint,
      outputs,
      validity_range,
      datums,
      reference_inputs,
      extra_signatories,
      ..
    } = transaction
    expect Some(own_input) =
      list.find(
        inputs,
        fn(input) {
          let Input { output_reference: out_ref, .. } = input
          out_ref == script_ref
        },
      )
    let Input { output: Output { address, value, .. }, .. } = own_input
    let Address { payment_credential: script_credential, .. } = address
    expect ScriptCredential(script_hash) = script_credential
    let authen_policy_id = script_hash
    if value.quantity_of(value, script_hash, factory_auth_an) == 1 {
      // factory utxo
      expect [policy_id] = value.policies(value.from_minted_value(mint))
      policy_id == authen_policy_id
    } else if value.quantity_of(value, script_hash, treasury_auth_an) == 1 {
      // treasury UTxO

      let treasury_input =
        get_treasury_input(
          inputs,
          script_ref,
          authen_policy_id,
          treasury_auth_an,
        )
      let Input { output: Output { address: treasury_address, .. }, .. } =
        treasury_input
      let treasury_output =
        get_treasury_output(
          outputs,
          treasury_address,
          authen_policy_id,
          treasury_auth_an,
        )
      let mint_value = value.from_minted_value(mint)
      expect redeemer: TreasuryRedeemer = raw_redeemer
      expect datum: TreasuryDatum = raw_datum
      when redeemer is {
        CreatePool -> {
          expect amm_pool_datum: PoolDatum = get_amm_pool_datum(outputs)
          let TreasuryDatum { order_hash, .. } = datum

          //* Should not spend any UTxOs associated with Order Script, as it could lead to unexpected behavior or loss of funds.
          expect [] =
            list.filter(
              inputs,
              fn(input) {
                let Input { output: out, .. } = input
                let Output { address: addr, .. } = out
                let Address { payment_credential: payment_cred, .. } = addr
                when payment_cred is {
                  ScriptCredential(hash) -> hash == order_hash
                  _ -> False
                }
              },
            )
          let owner_outputs =
            list.filter(outputs, fn(output) { output.address == datum.owner })
          validate_create_dex_pool(
            treasury_in_datum: datum,
            treasury_output: treasury_output,
            validity_range: validity_range,
            mint_value: mint_value,
            amm_pool_datum: amm_pool_datum,
            owner_outputs: owner_outputs,
          )
        }
        Batching ->
          validation.validate_apply_order(
            treasury_input: treasury_input,
            treasury_output: treasury_output,
            all_inputs: inputs,
            all_outputs: outputs,
            datums: datums,
            validity_range: validity_range,
            authen_policy_id: authen_policy_id,
            amm_authen_policy_id: amm_authen_policy_id,
            mint_value: mint_value,
          )
        CancelLBE ->
          validation.validate_cancel_lbe(
            treasury_in_datum: datum,
            treasury_input: treasury_input,
            treasury_output: treasury_output,
            validity_range: validity_range,
            reference_inputs: reference_inputs,
            amm_pool_validation_hash: amm_pool_validation_hash,
            amm_authen_policy_id: amm_authen_policy_id,
            amm_pool_auth_asset_name: amm_pool_auth_asset_name,
          )
        UpdateLBE -> {
          let TreasuryDatum { owner, .. } = datum
          expect Address {
            payment_credential: VerificationKeyCredential(owner_pkh),
            ..
          } = owner
          and {
            list.has(extra_signatories, owner_pkh),
            validation.validate_update_lbe(
              treasury_in_datum: datum,
              treasury_input: treasury_input,
              treasury_output: treasury_output,
              datums: datums,
              validity_range: validity_range,
            ),
          }
        }
      }
    } else {
      // order UTxO
      expect redeemer: OrderRedeemer = raw_redeemer
      when redeemer is {
        ApplyOrder -> {
          let Transaction { withdrawals, .. } = transaction
          dict.has_key(withdrawals, Inline(script_credential))
        }
        CancelOrder -> {
          let Transaction { extra_signatories, .. } = transaction
          expect order_datum: OrderDatum = raw_datum
          expect OrderDatum {
            owner: Address {
              payment_credential: VerificationKeyCredential(owner_pkh),
              ..
            },
            ..
          } = order_datum
          list.has(extra_signatories, owner_pkh)
        }
      }
    }
  }
}
