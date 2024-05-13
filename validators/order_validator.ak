use aiken/dict
use aiken/list
use aiken/transaction.{Input, Output, ScriptContext, Spend, Transaction}
use aiken/transaction/credential.{Address, ScriptCredential}
use lb_v2/types.{
  OrderRedeemer, SellerRedeemer, SpendOrder, SpendWithdraw, TreasuryRedeemer,
  ValidatorHash, WithdrawOrder,
}

// use aiken/transaction/value.{PolicyId}

validator(
  // // The PolicyID of Authen Minting Policy
  // authen_policy_id: PolicyId,
  // ValidatorHash of Treasury Contract
  treasury_hash: ValidatorHash,
  // ValidatorHash of Saller Contract
  seller_hash: ValidatorHash,
) {
  fn validate_order(
    _raw_order_datum: Data,
    redeemer: OrderRedeemer,
    context: ScriptContext,
  ) {
    let ScriptContext { transaction, .. } = context
    let Transaction { inputs, redeemers, .. } = transaction
    when redeemer is {
      WithdrawOrder -> {
        expect [seller_input] =
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
              payment_credential == ScriptCredential(seller_hash)
            },
          )
        let Input { output_reference, .. } = seller_input
        let seller_purpose = Spend(output_reference)
        expect Some(seller_redeemer) = dict.get(redeemers, seller_purpose)
        expect SpendWithdraw(_): SellerRedeemer = seller_redeemer
        True
      }
      // CollectOrder
      // RedeemOrder
      // having 1 treasury UTxO
      _other_redeemer -> {
        expect [treasury_input] =
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
          )
        let Input { output_reference, .. } = treasury_input
        let treasury_purpose = Spend(output_reference)
        expect Some(raw_treasury_redeemer) =
          dict.get(redeemers, treasury_purpose)
        expect treasury_redeemer: TreasuryRedeemer = raw_treasury_redeemer
        treasury_redeemer == SpendOrder
      }
    }
  }
}
