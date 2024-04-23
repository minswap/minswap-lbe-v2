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
              // make sure treasury must hold treasury authen
              value.quantity_of(out_value, authen_policy_id, treasury_auth_an) == 1
            },
          )
        //TODO: logic batch must be here
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
    //TODO: this logic make having O(n^2) complexity beacause each order of batching action run below logic
    expect Some(own_input) =
      list.find(
        inputs,
        fn(input) {
          let Input { output_reference: out_ref, .. } = input
          out_ref == script_ref
        },
      )
    let Input { output: Output { address: contract_address, value, .. }, .. } =
      own_input
    let Address { payment_credential: script_credential, .. } = contract_address
    expect ScriptCredential(script_hash) = script_credential
    let authen_policy_id = script_hash
    if value.quantity_of(value, script_hash, factory_auth_an) == 1 {
      // factory utxo
      expect [policy_id] = value.policies(value.from_minted_value(mint))
      policy_id == authen_policy_id
    } else if value.quantity_of(value, script_hash, treasury_auth_an) == 1 {
      // treasury UTxO
      // re-find treasury input to make sure tx having only 1 treasury UTxO
      let treasury_input =
        get_treasury_input(
          inputs,
          script_ref,
          authen_policy_id,
          treasury_auth_an,
        )
      // already validate Treasury Auth and Addr inside(not validate datum yet)
      let treasury_output =
        get_treasury_output(
          outputs,
          contract_address,
          authen_policy_id,
          treasury_auth_an,
        )
      let mint_value = value.from_minted_value(mint)
      expect redeemer: TreasuryRedeemer = raw_redeemer
      expect datum: TreasuryDatum = raw_datum
      let contract_input =
        list.filter(
          inputs,
          fn(input) {
            let Input { output: out, .. } = input
            let Output { address: addr, .. } = out
            let Address { payment_credential: payment_cred, .. } = addr
            script_credential == payment_cred
          },
        )
      when redeemer is {
        CreatePool -> {
          expect amm_pool_datum: PoolDatum = get_amm_pool_datum(outputs)

          // Having one contract UTxO(don't contain order and Factory UTxO)
          expect [_] = contract_input
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
            script_credential: script_credential,
          )
        CancelLBE -> {
          // Having one contract UTxO(don't contain order and Factory UTxO)
          expect [_] = contract_input
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
        }
        UpdateLBE -> {
          let TreasuryDatum { owner, .. } = datum
          expect Address {
            payment_credential: VerificationKeyCredential(owner_pkh),
            ..
          } = owner
          // Having one contract UTxO(don't contain order and Factory UTxO)
          expect [_] = contract_input
          and {
            list.has(extra_signatories, owner_pkh),
            validation.validate_update_lbe(
              treasury_in_datum: datum,
              treasury_input: treasury_input,
              treasury_output: treasury_output,
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
