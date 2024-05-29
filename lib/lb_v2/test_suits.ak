use aiken/builtin
use aiken/fuzz
use aiken/transaction.{
  InlineDatum, Input, Output, OutputReference, TransactionId,
}
use aiken/transaction/credential.{Address, VerificationKeyCredential}
use aiken/transaction/value.{ada_asset_name, ada_policy_id}
use lb_v2/types.{
  Asset, FactoryDatum, OrderDatum, PenaltyConfig, UsingSeller, ValidatorHash,
}
use lb_v2/utils.{
  calculate_penalty, fee_ada, make_wrapper_redeemer, minimum_ada, order_auth_an,
  sort_two_consecutive_factory_datum,
}
use lb_v2/validation.{apply_collecting_orders}

test test_sort_two_consecutive_factory_datum() {
  let datum_a = FactoryDatum { head: #"00", tail: #"646174756d5f62" }
  let datum_b =
    FactoryDatum { head: #"646174756d5f62", tail: #"ffffffffffffff00" }

  let (d1, d2) = sort_two_consecutive_factory_datum(datum_b, datum_a)
  and {
    builtin.serialise_data(d1) == builtin.serialise_data(datum_a),
    builtin.serialise_data(d2) == builtin.serialise_data(datum_b),
  }
}

fn calculate_penalty_params() -> Fuzzer<(Int, Int, Int)> {
  fuzz.map3(
    fuzz_0: fuzz.int(),
    fuzz_1: fuzz.int(),
    fuzz_2: fuzz.int_between(1, 99),
    f: fn(x0, x1, x2) { (x0, x1, x2) },
  )
}

test test_calculate_penalty(total_amount via calculate_penalty_params()) {
  let (total_input_amount, total_output_amount, percent) = total_amount
  let penalty_amount =
    calculate_penalty(
      penalty_config: Some(PenaltyConfig { penalty_start_time: 200, percent }),
      end_valid_time_range: 200,
      total_input_amount: total_input_amount,
      total_output_amount: total_output_amount,
    )
  let expect_pen_amount =
    if total_input_amount > total_output_amount {
      ( total_input_amount - total_output_amount ) * percent / 100
    } else {
      0
    }
  penalty_amount == expect_pen_amount
}

test test_apply_collecting_orders() {
  let base_asset =
    Asset {
      policy_id: #"4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c2693a70",
      asset_name: #"68696869",
    }
  let raise_asset =
    Asset { policy_id: ada_policy_id, asset_name: ada_asset_name }
  let factory_policy_id =
    #"4ad61bf61971298e1aba4e71ce34cac02cddf8030b6fce35c2693a70"
  //total_amount+total_penalty
  let amount =
    apply_collecting_orders(
      order_inputs: [
        generate_order_input(
          123,
          12,
          False,
          factory_policy_id,
          base_asset,
          raise_asset,
        ),
        generate_order_input(
          122223,
          2222,
          False,
          factory_policy_id,
          base_asset,
          raise_asset,
        ),
      ],
      order_outputs: [
        generate_order_output(
          123,
          12,
          True,
          factory_policy_id,
          base_asset,
          raise_asset,
        ),
        generate_order_output(
          122223,
          2222,
          True,
          factory_policy_id,
          base_asset,
          raise_asset,
        ),
      ],
      base_asset: base_asset,
      raise_asset: raise_asset,
      factory_policy_id: factory_policy_id,
    )
  amount == 124580
}

fn generate_order_input(
  amount: Int,
  penalty: Int,
  is_collected: Bool,
  seller_hash: ValidatorHash,
  base_asset: Asset,
  raise_asset: Asset,
) -> Input {
  Input {
    output_reference: OutputReference {
      transaction_id: TransactionId(
        #"4ad61bf61971298e1aba4e71ce34cac02cddf8030b6fce35c2693a70",
      ),
      output_index: 1,
    },
    output: generate_order_output(
      amount,
      penalty,
      is_collected,
      seller_hash,
      base_asset,
      raise_asset,
    ),
  }
}

fn generate_order_output(
  amount: Int,
  penalty: Int,
  is_collected: Bool,
  seller_hash: ValidatorHash,
  base_asset: Asset,
  raise_asset: Asset,
) -> Output {
  let owner =
    Address {
      payment_credential: VerificationKeyCredential(
        #"4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c2693a70",
      ),
      stake_credential: None,
    }
  let order_datum =
    OrderDatum {
      factory_policy_id: seller_hash,
      base_asset,
      raise_asset,
      owner,
      is_collected,
      amount,
      penalty_amount: penalty,
    }
  let Asset { policy_id: raise_pid, asset_name: raise_an } = raise_asset
  Output {
    address: Address {
      payment_credential: VerificationKeyCredential(
        #"4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c2693a70",
      ),
      stake_credential: None,
    },
    value: value.zero()
      |> value.add(seller_hash, order_auth_an, 1)
      |> value.add(
          raise_pid,
          raise_an,
          if is_collected {
            0
          } else {
            amount + penalty
          },
        )
      |> value.add(
          ada_policy_id,
          ada_asset_name,
          if is_collected {
            minimum_ada + fee_ada
          } else {
            minimum_ada + 2 * fee_ada
          },
        ),
    datum: InlineDatum(order_datum),
    reference_script: None,
  }
}

test test_make_wrapper_redeemer() {
  let redeemer_wrapper = make_wrapper_redeemer(UsingSeller)
  builtin.serialise_data(redeemer_wrapper) == #"d87a9fd87980ff"
}
