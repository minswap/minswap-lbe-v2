use aiken/bytearray
use aiken/dict
use aiken/list
use aiken/transaction.{
  Input, Output, ScriptContext, Spend, Transaction, WithdrawFrom,
}
use aiken/transaction/credential.{
  Address, ScriptCredential, StakeCredential, VerificationKeyCredential,
}
use lb_v2/test_suits
use lb_v2/types.{
  ApplyOrder, Asset, CancelOrder, Deposit, OrderBatchingRedeemer, OrderDatum,
  OrderRedeemer, ValidatorHash,
}
use lb_v2/utils

validator(stake_credential: StakeCredential) {
  fn validate_order(raw_datum: Data, raw_redeemer: Data, context: ScriptContext) {
    expect ScriptContext { transaction, purpose: Spend(_) } = context
    expect redeemer: OrderRedeemer = raw_redeemer
    when redeemer is {
      ApplyOrder -> {
        let Transaction { withdrawals, .. } = transaction
        dict.has_key(withdrawals, stake_credential)
      }
      CancelOrder -> {
        let Transaction { inputs, extra_signatories, .. } = transaction
        expect order_datum: OrderDatum = raw_datum
        let OrderDatum {
          owner: Address { payment_credential: owner_payment_credential, .. },
          ..
        } = order_datum
        // validate that the transaction has _sender_'s signature or _sender_ script UTxO in the Transaction Inputs
        when owner_payment_credential is {
          VerificationKeyCredential(owner_pkh) ->
            // Verify transaction must be signed by Owner
            list.has(extra_signatories, owner_pkh)
          ScriptCredential(_) ->
            // In case owner is script address, this script will require at least 1 owner UTxO in input
            // If owner UTxO has enough condition to unlock itself, it can unlock this script as well
            list.length(
              list.filter(
                inputs,
                fn(input) {
                  let Input { output, .. } = input
                  let Output { address: out_address, .. } = output
                  let Address { payment_credential: out_payment_credential, .. } =
                    out_address
                  out_payment_credential == owner_payment_credential
                },
              ),
            ) > 0
        }
      }
    }
  }
}

validator(treasury_hash: ValidatorHash) {
  fn validate_order_spending_in_batching(
    redeemer: OrderBatchingRedeemer,
    context: ScriptContext,
  ) -> Bool {
    expect ScriptContext { transaction, purpose: WithdrawFrom(_) } = context
    let OrderBatchingRedeemer { treasury_input_index } = redeemer

    let Transaction { inputs, .. } = transaction
    let Input {
      output: Output { address: Address { payment_credential, .. }, .. },
      ..
    } = utils.list_at_index(inputs, treasury_input_index)
    expect ScriptCredential(hash) = payment_credential
    treasury_hash == hash
  }
}

test test_validate_batching_order() {
  let treasury_hash = test_suits.gen_treasury_hash()
  let order_batching_stake_credential =
    test_suits.gen_order_batching_stake_credential()

  let treasury_input =
    Input {
      output_reference: test_suits.gen_dummy_output_ref(),
      output: test_suits.gen_dummy_treasury_out(),
    }
  let purpose = WithdrawFrom(order_batching_stake_credential)
  let sc =
    ScriptContext {
      transaction: Transaction {
        ..transaction.placeholder(),
        inputs: [treasury_input],
      },
      purpose,
    }
  let redeemer = OrderBatchingRedeemer { treasury_input_index: 0 }
  validate_order_spending_in_batching(treasury_hash, redeemer, sc)
}

test test_validate_order() {
  let order_batching_stake_credential =
    test_suits.gen_order_batching_stake_credential()
  let purpose = Spend(test_suits.gen_dummy_output_ref())
  let withdrawals =
    dict.new()
      |> dict.insert(
           order_batching_stake_credential,
           0,
           test_suits.compare_stake_credential,
         )
  let sc =
    ScriptContext {
      transaction: Transaction {
        ..transaction.placeholder(),
        withdrawals: withdrawals,
      },
      purpose,
    }
  let datum =
    OrderDatum {
      owner: credential.from_verification_key(
        @"h'6508d97458392cbc453922493dacb743c405c7a7c254ee8b85fa6af5'"
          |> bytearray.from_string,
      ),
      expect_output_asset: Asset { policy_id: #"", asset_name: #"" },
      minimum_receive: 10000000,
      step: Deposit,
    }
  let redeemer = ApplyOrder
  validate_order(order_batching_stake_credential, datum, redeemer, sc)
}
