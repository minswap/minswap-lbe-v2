use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Mint, Output, ScriptContext, Spend, Transaction,
  WithdrawFrom,
}
use aiken/transaction/credential.{Address, Inline, ScriptCredential}
use aiken/transaction/value.{PolicyId}
use lb_v2/types.{
  CollectOrderToken, CountingSeller, SellerDatum, SellerRedeemer, TreasuryDatum,
  UsingSeller, ValidatorHash,
}
use lb_v2/utils.{seller_auth_an}
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
        }
      }

      // input: 1 seller
      // output: 1 seller
      // ref_input: 1 treasury
      // validate LBE ID
      // validate time frame
      // validate seller in, out value
      // validate apply orders
      // validate minting
      // validate seller in, out datum
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
