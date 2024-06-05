use aiken/builtin
use aiken/bytearray
use aiken/fuzz
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Output, OutputReference, TransactionId,
}
use aiken/transaction/credential.{Address, VerificationKeyCredential}
use aiken/transaction/value.{PolicyId, Value, ada_asset_name, ada_policy_id}
use lb_v2/types.{Asset, FactoryDatum, OrderDatum, PenaltyConfig, UsingSeller}
use lb_v2/utils.{
  calculate_penalty, fee_ada, make_wrapper_redeemer, order_auth_an,
  order_minimum_ada, sort_two_consecutive_factory_datum,
}
use lb_v2/validation.{apply_collecting_orders}

type DummyObject {
  owner: Address,
  base_asset: Asset,
  raise_asset: Asset,
  factory_policy_id: PolicyId,
  order_input: Input,
  order_datum: OrderDatum,
  order_value: Value,
}

fn gen_dummy_object() -> DummyObject {
  let factory_policy_id =
    #"4ad61bf61971298e1aba4e71ce34cac02cddf8030b6fce35c2693a70"
  let base_asset =
    Asset {
      policy_id: #"4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c2693a70",
      asset_name: #"68696869",
    }
  let raise_asset = Asset { policy_id: #"", asset_name: #"" }
  let owner =
    Address {
      payment_credential: VerificationKeyCredential(
        #"4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c2693a70",
      ),
      stake_credential: None,
    }
  let order_datum =
    OrderDatum {
      factory_policy_id,
      base_asset,
      raise_asset,
      owner,
      is_collected: False,
      amount: 100_000_000,
      penalty_amount: 20_000_000,
    }
  let order_value =
    value.from_asset(factory_policy_id, order_auth_an, 1)
      |> value.add(raise_asset.policy_id, raise_asset.asset_name, 104_000_000)
  DummyObject {
    owner,
    base_asset,
    raise_asset,
    factory_policy_id,
    order_datum,
    order_value,
    order_input: Input {
      output_reference: OutputReference {
        transaction_id: TransactionId(
          #"4ad61bf61971298e1aba4e71ce34cac02cddf8030b6fce35c2693a70",
        ),
        output_index: 1,
      },
      output: Output {
        address: owner,
        value: order_value,
        datum: InlineDatum(order_datum),
        reference_script: None,
      },
    },
  }
}

fn custom_factory_node() -> Fuzzer<ByteArray> {
  let head = fuzz.bytearray()
  let tail = fuzz.bytearray()
  fuzz.map2(head, tail, fn(h, t) { builtin.append_bytearray(h, t) })
}

fn factory_params() -> Fuzzer<(ByteArray, ByteArray, ByteArray)> {
  fuzz.map3(
    fuzz_0: custom_factory_node(),
    fuzz_1: custom_factory_node(),
    fuzz_2: custom_factory_node(),
    f: fn(x0, x1, x2) { (x0, x1, x2) },
  )
}

test test_sort_two_consecutive_factory_datum_1(
  factory_node via factory_params(),
) {
  let (a, b, c) = factory_node
  expect [x, y, z] = list.sort([a, b, c], bytearray.compare)
  if and {
    x != y,
    y != z,
  } {
    let datum_a = FactoryDatum { head: x, tail: y }
    let datum_b = FactoryDatum { head: y, tail: z }
    let (d1, d2) = sort_two_consecutive_factory_datum(datum_b, datum_a)
    and {
      builtin.serialise_data(d1) == builtin.serialise_data(datum_a),
      builtin.serialise_data(d2) == builtin.serialise_data(datum_b),
    }
  } else {
    True
  }
}

test test_sort_two_consecutive_factory_datum_2(
  factory_node via factory_params(),
) {
  let (a, b, _) = factory_node
  expect [x, y] = list.sort([a, b], bytearray.compare)
  if x != y {
    // datum_a.head == initial head
    let datum_a = FactoryDatum { head: #"00", tail: x }
    let datum_b = FactoryDatum { head: x, tail: y }
    let (d1, d2) = sort_two_consecutive_factory_datum(datum_b, datum_a)
    expect and {
        builtin.serialise_data(d1) == builtin.serialise_data(datum_a),
        builtin.serialise_data(d2) == builtin.serialise_data(datum_b),
      }

    // datum_b.tail == initial tail
    let datum_a = FactoryDatum { head: x, tail: y }
    let datum_b =
      FactoryDatum {
        head: y,
        tail: #"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
      }
    let (d1, d2) = sort_two_consecutive_factory_datum(datum_b, datum_a)
    expect and {
        builtin.serialise_data(d1) == builtin.serialise_data(datum_a),
        builtin.serialise_data(d2) == builtin.serialise_data(datum_b),
      }
    True
  } else {
    True
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

// order inputs is empty
test test_apply_collecting_orders_1() fail {
  let dummy = gen_dummy_object()
  apply_collecting_orders(
    order_inputs: [],
    order_outputs: [],
    base_asset: dummy.base_asset,
    raise_asset: dummy.raise_asset,
    factory_policy_id: dummy.factory_policy_id,
    acc_collect_amount: 0,
  ) == 0
}

// order_inputs.length != order_outputs.length
test test_apply_collecting_orders_2() fail {
  let dummy = gen_dummy_object()
  apply_collecting_orders(
    order_inputs: [dummy.order_input],
    order_outputs: [],
    base_asset: dummy.base_asset,
    raise_asset: dummy.raise_asset,
    factory_policy_id: dummy.factory_policy_id,
    acc_collect_amount: 0,
  ) == 0
}

// happy case
test test_apply_collecting_orders_3() {
  let dummy = gen_dummy_object()
  let collect_amount =
    dummy.order_datum.amount + dummy.order_datum.penalty_amount
  let order_out_datum = OrderDatum { ..dummy.order_datum, is_collected: True }
  let order_out_value =
    value.from_asset(dummy.factory_policy_id, order_auth_an, 1)
      |> value.add(ada_policy_id, ada_asset_name, order_minimum_ada + fee_ada)
  let order_out =
    Output {
      address: dummy.order_input.output.address,
      value: order_out_value,
      datum: InlineDatum(order_out_datum),
      reference_script: None,
    }
  apply_collecting_orders(
    order_inputs: [dummy.order_input],
    order_outputs: [order_out],
    base_asset: dummy.base_asset,
    raise_asset: dummy.raise_asset,
    factory_policy_id: dummy.factory_policy_id,
    acc_collect_amount: 0,
  ) == collect_amount
}

test test_apply_collecting_orders_4() {
  let dummy = gen_dummy_object()
  let collect_amount =
    dummy.order_datum.amount + dummy.order_datum.penalty_amount
  let order_out_datum = OrderDatum { ..dummy.order_datum, is_collected: True }
  let order_out_value =
    value.from_asset(dummy.factory_policy_id, order_auth_an, 1)
      |> value.add(ada_policy_id, ada_asset_name, order_minimum_ada + fee_ada)
  let order_out =
    Output {
      address: dummy.order_input.output.address,
      value: order_out_value,
      datum: InlineDatum(order_out_datum),
      reference_script: None,
    }
  apply_collecting_orders(
    order_inputs: [dummy.order_input, dummy.order_input, dummy.order_input],
    order_outputs: [order_out, order_out, order_out],
    base_asset: dummy.base_asset,
    raise_asset: dummy.raise_asset,
    factory_policy_id: dummy.factory_policy_id,
    acc_collect_amount: 0,
  ) == collect_amount * 3
}

test test_make_wrapper_redeemer() {
  let redeemer_wrapper = make_wrapper_redeemer(UsingSeller)
  builtin.serialise_data(redeemer_wrapper) == #"d87a9fd87980ff"
}
