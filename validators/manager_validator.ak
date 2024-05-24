use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Mint, Output, ScriptContext, Spend, Transaction,
}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{
  ManageSeller, ManagerDatum, ManagerRedeemer, SellerDatum, SpendManager,
  TreasuryDatum, ValidatorHash,
}
use lb_v2/utils.{factory_auth_an, manager_auth_an}
use lb_v2/validation

validator(authen_policy_id: PolicyId, treasury_hash: ValidatorHash) {
  fn validate_manager_spending(
    manager_in_datum: ManagerDatum,
    redeemer: ManagerRedeemer,
    context: ScriptContext,
  ) {
    expect ScriptContext { purpose: Spend(manager_out_ref), transaction } =
      context
    let Transaction {
      mint,
      reference_inputs,
      validity_range,
      inputs,
      outputs,
      ..
    } = transaction
    let mint_value = value.from_minted_value(mint)
    // need to check no orders input+mint value beacause 
    //      ` OrderSpending(UpdateOrder) -> SellerWithdrawal -> SellerSpending(CountingSeller) -> Manager Minting -> Manager Spending`
    //   or `                      SellerMinting             -> SellerSpending(CountingSeller) -> Manager Minting -> Manager Spending`
    let ManagerDatum { seller_hash, order_hash, .. } = manager_in_datum
    expect [] =
      validation.get_order_inputs(
        inputs: inputs,
        seller_policy_id: seller_hash,
        order_hash: order_hash,
      )
    when redeemer is {
      ManageSeller -> {
        expect Some(Input {
          output: Output {
            address: Address {
              payment_credential: ScriptCredential(manager_hash),
              ..
            },
            ..
          },
          ..
        }) =
          list.find(
            inputs,
            fn(input) {
              let Input {
                output_reference: out_ref,
                output: Output { value: sm_in_value, .. },
              } = input
              and {
                out_ref == manager_out_ref,
                value.quantity_of(sm_in_value, treasury_hash, manager_auth_an) == 1,
              }
            },
          )
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
              payment_credential == ScriptCredential(manager_hash)
            },
          )
        expect [manager_out] =
          list.filter(
            outputs,
            fn(output) {
              let Output {
                address: Address { payment_credential, .. },
                value: sm_in_value,
                ..
              } = output
              payment_credential == ScriptCredential(manager_hash) && value.quantity_of(
                sm_in_value,
                treasury_hash,
                manager_auth_an,
              ) == 1
            },
          )
        expect [treasury_ref_input] =
          validation.get_treasury_ref_inputs(
            ref_inputs: reference_inputs,
            authen_policy_id: authen_policy_id,
            treasury_hash: treasury_hash,
          )

        expect Input {
          output: Output { datum: InlineDatum(raw_treasury_datum), .. },
          ..
        } = treasury_ref_input
        expect treasury_datum: TreasuryDatum = raw_treasury_datum
        let TreasuryDatum { seller_hash, base_asset, raise_asset, .. } =
          treasury_datum
        let seller_inputs =
          validation.get_seller_inputs(
            inputs: inputs,
            manager_policy_id: manager_hash,
            seller_hash: seller_hash,
          )
        let seller_outputs =
          validation.get_seller_outputs(
            outputs: outputs,
            manager_policy_id: manager_hash,
            seller_hash: seller_hash,
            seller_datum: SellerDatum {
              base_asset,
              raise_asset,
              amount: 0,
              penalty_amount: 0,
            },
          )
        validation.validate_manage_seller(
          manager_hash: manager_hash,
          // manager_in_value: manager_in_value,
          manager_in_datum: manager_in_datum,
          manager_out: manager_out,
          // treasury_ref_input: treasury_ref_input,
          validity_range: validity_range,
          mint_value: mint_value,
          treasury_datum: treasury_datum,
          seller_inputs: seller_inputs,
          seller_outputs: seller_outputs,
        )
      }
      SpendManager ->
        // this line forward logic to treasury minting
        // + make sure dont mint any seller
        value.flatten(mint_value) == [(treasury_hash, manager_auth_an, -1)]
    }
  }

  fn validate_manager_minting(_: Data, context: ScriptContext) {
    expect ScriptContext {
      purpose: Mint(policy_id),
      transaction: Transaction { inputs, mint, .. },
    } = context
    let mint_value = value.from_minted_value(mint)
    or {
      // TODO: check manager redeemer
      validation.has_spend_manager(
        inputs: inputs,
        treasury_policy_id: treasury_hash,
        manager_hash: policy_id,
      ),
      // Create Treasury: forward logic -> Minting Authen -> Factory Authen(this contract will validate this minting)
      value.quantity_of(mint_value, authen_policy_id, factory_auth_an) == 1,
    }
  }
}
