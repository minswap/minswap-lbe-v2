use aiken/builtin
// use aiken/bytearray
// use aiken/cbor
use aiken/dict
use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/list
use aiken/math
use aiken/transaction.{
  InlineDatum, Input, Mint, Output, OutputReference, ScriptContext, Spend,
  Transaction, ValidityRange,
}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value.{
  AssetName, PolicyId, Value, ada_asset_name, ada_policy_id, quantity_of,
}
use lb_v2/types.{
  Asset, AuthenRedeemer, CreateTreasury, DatumMap, Deposit, FactoryDatum,
  FactoryRedeemer, MintFactoryAuthen, OrderDatum, PoolDatum, RedeemLP,
  RedeemRaiseAsset, TreasuryDatum, ValidatorHash,
}
use lb_v2/utils

pub fn validate_creating_treasury_out(
  treasury_out_value: Value,
  treasury_out_datum: TreasuryDatum,
  base_asset: Asset,
  raise_asset: Asset,
  order_hash: ValidatorHash,
  authen_policy_id: PolicyId,
  treasury_auth_an: AssetName,
  lp_asset_name: AssetName,
) -> Bool {
  let TreasuryDatum {
    base_asset: t_base_asset,
    raise_asset: t_raise_asset,
    order_hash: t_order_hash,
    reserve_base: t_reserve_base,
    reserve_raise,
    total_liquidity,
    ..
  } = treasury_out_datum
  let Asset { policy_id: base_asset_pid, asset_name: base_asset_an } =
    base_asset
  let expected_treasury_out_value =
    value.zero()
      |> value.add(ada_policy_id, ada_asset_name, 10000000) // TODO: consider minimum ada for treasury output
      |> value.add(authen_policy_id, treasury_auth_an, 1)
      |> value.add(authen_policy_id, lp_asset_name, 9223372036854775807)
      |> value.add(base_asset_pid, base_asset_an, t_reserve_base)
  and {
    treasury_out_value == expected_treasury_out_value,
    t_base_asset == base_asset,
    t_raise_asset == raise_asset,
    t_order_hash == order_hash,
    total_liquidity == 0,
    reserve_raise == 0,
  }
}

pub fn validate_create_dex_pool_time(
  start_time: Int,
  validity_range: ValidityRange,
) -> Bool {
  let Interval { lower_bound: IntervalBound { bound_type, .. }, .. } =
    validity_range
  expect Finite(start_valid_time) = bound_type
  start_valid_time > start_time
}

pub fn get_treasury_creation_expected_mint(
  authen_policy_id: PolicyId,
  factory_auth_an: AssetName,
  treasury_auth_an: AssetName,
  lp_asset_name: AssetName,
) -> Value {
  value.zero()
    |> value.add(authen_policy_id, factory_auth_an, 1)
    |> value.add(authen_policy_id, treasury_auth_an, 1)
    |> value.add(authen_policy_id, lp_asset_name, 9223372036854775807)
}

pub fn get_order_inputs(
  all_inputs: List<Input>,
  order_hash: ValidatorHash,
) -> List<Input> {
  list.filter(
    all_inputs,
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
}

pub fn get_treasury_input(
  context: ScriptContext,
  authen_policy_id: PolicyId,
  treasury_auth_an: AssetName,
) -> Input {
  expect ScriptContext {
    transaction: Transaction { inputs, .. },
    purpose: Spend(self_out_ref),
  } = context
  // for sure Authen Token appear
  expect Some(treasury_input) =
    list.find(
      inputs,
      fn(input) {
        let Input { output_reference: out_ref, output: Output { value, .. } } =
          input
        and {
          out_ref == self_out_ref,
          quantity_of(value, authen_policy_id, treasury_auth_an) == 1,
        }
      },
    )
  let Input {
    output: Output {
      address: Address { payment_credential: treasury_payment_credential, .. },
      ..
    },
    ..
  } = treasury_input
  // For sure spend only 1 Treasury Input
  expect [_] =
    list.filter(
      inputs,
      fn(input) {
        let Input {
          output: Output {
            address: Address { payment_credential: payment_cred, .. },
            ..
          },
          ..
        } = input
        treasury_payment_credential == payment_cred
      },
    )
  treasury_input
}

pub fn get_treasury_output(
  outputs: List<Output>,
  treasury_address: Address,
  authen_policy_id: PolicyId,
  treasury_auth_an: AssetName,
) -> Output {
  expect [treasury_output] =
    list.filter(
      outputs,
      fn(output) {
        let Output { address, .. } = output
        address == treasury_address
      },
    )
  let Output { value, .. } = treasury_output
  expect value.quantity_of(value, authen_policy_id, treasury_auth_an) == 1
  treasury_output
}

pub fn get_amm_pool_raw_datum(
  outputs: List<Output>,
  datums: DatumMap,
  amm_authen_policy_id: PolicyId,
  amm_pool_auth_asset_name: AssetName,
  amm_pool_validation_hash: ValidatorHash,
) -> Data {
  expect [amm_pool_output] =
    list.filter(
      outputs,
      fn(output) {
        let Output { address: Address { payment_credential, .. }, value, .. } =
          output
        expect
          quantity_of(value, amm_authen_policy_id, amm_pool_auth_asset_name) == 1
        when payment_credential is {
          ScriptCredential(hash) -> hash == amm_pool_validation_hash
          _ -> False
        }
      },
    )
  let Output { datum, .. } = amm_pool_output
  utils.must_find_script_datum(datums, datum)
}

pub fn validate_create_dex_pool(
  treasury_in_datum: TreasuryDatum,
  treasury_out_value: Value,
  treasury_out_datum: TreasuryDatum,
  amm_pool_raw_datum: Data,
  mint_value: Value,
  amm_authen_policy_id: PolicyId,
  amm_pool_auth_asset_name: AssetName,
  validity_range: ValidityRange,
  all_outputs: List<Output>,
  all_inputs: List<Input>,
) -> Bool {
  True
  // let TreasuryDatum {
  //   asset_a: treasury_in_asset_a,
  //   asset_b: treasury_in_asset_b,
  //   reserve_a: treasury_in_reserve_a,
  //   reserve_b: treasury_in_reserve_b,
  //   create_pool_time,
  //   lp_asset_name,
  //   order_hash,
  //   ..
  // } = treasury_in_datum
  // let TreasuryDatum { total_liquidity: treasury_out_total_liquidity, .. } =
  //   treasury_out_datum
  // expect amm_pool_datum: PoolDatum = amm_pool_raw_datum
  // let PoolDatum {
  //   asset_a: pool_asset_a,
  //   asset_b: pool_asset_b,
  //   reserve_a: pool_reserve_a,
  //   reserve_b: pool_reserve_b,
  //   total_liquidity: pool_total_liquidity,
  //   ..
  // } = amm_pool_datum
  // // expect [Output { value: lbe_owner_value, .. }] =
  // //   list.filter(
  // //     all_outputs,
  // //     fn(output) {
  // //       let Output { address, .. } = output
  // //       address == lbe_owner
  // //     },
  // //   )
  // and {
  //   // for sure it's time to create pool
  //   validate_create_dex_pool_time(create_pool_time, validity_range),
  //   // for sure mint amm pool auth token
  //   quantity_of(mint_value, amm_authen_policy_id, amm_pool_auth_asset_name) == 1,
  //   // for sure the same asset_a, asset_b
  //   treasury_in_asset_a == pool_asset_a,
  //   treasury_in_asset_b == pool_asset_b,
  //   // for sure the same reserve_a, reserve_b
  //   treasury_in_reserve_a == pool_reserve_a,
  //   treasury_in_reserve_b == pool_reserve_b,
  //   // for sure 50% quantity LP Asset for treasury output
  //   quantity_of(treasury_out_value, amm_authen_policy_id, lp_asset_name) == treasury_out_total_liquidity,
  //   math.abs(
  //     treasury_out_total_liquidity + treasury_out_total_liquidity - pool_total_liquidity,
  //   ) <= 1,
  //   // for sure 50% quantity LP Asset for lbe's owner
  //   // quantity_of(lbe_owner_value, amm_authen_policy_id, lp_asset_name) == pool_total_liquidity - treasury_out_total_liquidity,
  //   // for sure treasury output datum
  //   treasury_out_datum == TreasuryDatum {
  //     ..treasury_in_datum,
  //     total_liquidity: treasury_out_total_liquidity,
  //   },
  //   // for sure no order's input
  //   get_order_inputs(all_inputs, order_hash) |> builtin.null_list,
  // }
}

fn validate_order(
  order_input: Input,
  order_output: Output,
  datums: DatumMap,
) -> Bool {
  let Input { output: Output { datum: in_datum_raw, .. }, .. } = order_input
  let Output { value: out_value, address: out_address, .. } = order_output
  expect order_datum: OrderDatum =
    when in_datum_raw is {
      InlineDatum(d) -> d
      _ -> utils.must_find_script_datum(datums, in_datum_raw)
    }
  let OrderDatum { owner, expect_output_asset, minimum_receive, .. } =
    order_datum
  and {
    // for sure output to owner
    out_address == owner,
    // for sure output has correct value
    utils.quantity_of_asset(out_value, expect_output_asset) == minimum_receive,
  }
}

fn apply_orders(
  order_inputs: List<Input>,
  order_outputs: List<Output>,
  datums: DatumMap,
) -> Bool {
  when order_inputs is {
    [] ->
      when order_outputs is {
        [] -> True
        _ -> False
      }
    [input, ..inputs] ->
      when order_outputs is {
        [] -> fail
        [output, ..outputs] ->
          validate_order(input, output, datums) && apply_orders(
            inputs,
            outputs,
            datums,
          )
      }
  }
}

pub fn validate_order_time(
  start_time: Int,
  end_time: Int,
  validity_range: ValidityRange,
  order_datums: List<OrderDatum>,
) -> Bool {
  let Interval {
    lower_bound: IntervalBound { bound_type: lower_bound_type, .. },
    upper_bound: IntervalBound { bound_type: upper_bound_type, .. },
  } = validity_range
  expect Finite(start_valid_time_range) = lower_bound_type
  expect Finite(end_valid_time_range) = upper_bound_type
  list.map(
    order_datums,
    fn(od) {
      let OrderDatum { step, .. } = od
      step
    },
  )
    |> list.unique
    |> list.reduce(True, fn(acc, step) { and {
             acc,
             when step is {
               RedeemLP -> start_valid_time_range >= end_time
               _ -> and {
                   start_time <= start_valid_time_range,
                   end_valid_time_range <= end_time,
                 }
             },
           } })
}

fn validate_batching_treasury_datum(
  in_datum: TreasuryDatum,
  out_datum: TreasuryDatum,
) -> Bool {
  in_datum == out_datum
}

fn apply_deposit_orders(
  order_in_values: List<Value>,
  order_in_datums: List<OrderDatum>,
  order_outputs: List<Output>,
  raise_asset_policy_id: PolicyId,
  raise_asset_name: AssetName,
) -> Int {
  if order_in_values |> builtin.null_list {
    0
  } else {
    let OrderDatum { step, expect_output_asset, owner, minimum_receive } =
      order_in_datums |> builtin.head_list
    if step == Deposit {
      let in_value = order_in_values |> builtin.head_list
      let amount_in =
        quantity_of(in_value, raise_asset_policy_id, raise_asset_name)
      let estimate_in =
        if utils.is_ada_asset(raise_asset_policy_id, raise_asset_name) {
          amount_in - 2000000
        } else {
          amount_in
        }
      let Output { value: out_value, address: out_address, .. } =
        order_outputs |> builtin.head_list
      let estimate_out = utils.quantity_of_asset(out_value, expect_output_asset)
      expect and {
          estimate_in == estimate_out,
          minimum_receive == estimate_out,
          out_address == owner,
        }
      estimate_out + apply_deposit_orders(
        order_in_values |> builtin.tail_list,
        order_in_datums |> builtin.tail_list,
        order_outputs |> builtin.tail_list,
        raise_asset_policy_id,
        raise_asset_name,
      )
    } else {
      apply_deposit_orders(
        order_in_values |> builtin.tail_list,
        order_in_datums |> builtin.tail_list,
        order_outputs |> builtin.tail_list,
        raise_asset_policy_id,
        raise_asset_name,
      )
    }
  }
}

fn apply_redeem_raise_asset_orders(
  order_in_values: List<Value>,
  order_in_datums: List<OrderDatum>,
  order_outputs: List<Output>,
  raise_asset_policy_id: PolicyId,
  raise_asset_name: AssetName,
  authen_policy_id: PolicyId,
  lp_asset_name: AssetName,
) -> Int {
  if order_in_values |> builtin.null_list {
    0
  } else {
    let OrderDatum { step, expect_output_asset, owner, minimum_receive } =
      order_in_datums |> builtin.head_list
    if step == RedeemRaiseAsset {
      let in_value = order_in_values |> builtin.head_list
      let estimate_in = quantity_of(in_value, authen_policy_id, lp_asset_name)
      expect value.lovelace_of(in_value) >= 2000000
      let Output { value: out_value, address: out_address, .. } =
        order_outputs |> builtin.head_list
      let amount_out = utils.quantity_of_asset(out_value, expect_output_asset)
      let estimate_out =
        if utils.is_ada_asset(raise_asset_policy_id, raise_asset_name) {
          amount_out - 1500000
        } else {
          amount_out
        }
      expect and {
          estimate_in == estimate_out,
          minimum_receive == estimate_out,
          out_address == owner,
        }
      estimate_out + apply_redeem_raise_asset_orders(
        order_in_values |> builtin.tail_list,
        order_in_datums |> builtin.tail_list,
        order_outputs |> builtin.tail_list,
        raise_asset_policy_id,
        raise_asset_name,
        authen_policy_id,
        lp_asset_name,
      )
    } else {
      apply_redeem_raise_asset_orders(
        order_in_values |> builtin.tail_list,
        order_in_datums |> builtin.tail_list,
        order_outputs |> builtin.tail_list,
        raise_asset_policy_id,
        raise_asset_name,
        authen_policy_id,
        lp_asset_name,
      )
    }
  }
}

fn apply_redeem_lp_orders(
  order_in_values: List<Value>,
  order_in_datums: List<OrderDatum>,
  order_outputs: List<Output>,
  raise_asset_policy_id: PolicyId,
  raise_asset_name: AssetName,
  authen_policy_id: PolicyId,
  lp_asset_name: AssetName,
  total_liquidity: Int,
  total_raise_amount: Int,
) -> Int {
  if order_in_values |> builtin.null_list {
    0
  } else {
    let OrderDatum { step, expect_output_asset, owner, minimum_receive } =
      order_in_datums |> builtin.head_list
    if step == RedeemRaiseAsset {
      let in_value = order_in_values |> builtin.head_list
      let estimate_in = quantity_of(in_value, authen_policy_id, lp_asset_name)
      expect value.lovelace_of(in_value) >= 2000000
      let Output { value: out_value, address: out_address, .. } =
        order_outputs |> builtin.head_list
      let estimate_out = utils.quantity_of_asset(out_value, expect_output_asset)
      expect and {
          minimum_receive == estimate_out,
          out_address == owner,
          estimate_out * total_raise_amount == estimate_in * total_liquidity,
        }
      estimate_out + apply_redeem_lp_orders(
        order_in_values |> builtin.tail_list,
        order_in_datums |> builtin.tail_list,
        order_outputs |> builtin.tail_list,
        raise_asset_policy_id,
        raise_asset_name,
        authen_policy_id,
        lp_asset_name,
        total_liquidity,
        total_raise_amount,
      )
    } else {
      apply_redeem_lp_orders(
        order_in_values |> builtin.tail_list,
        order_in_datums |> builtin.tail_list,
        order_outputs |> builtin.tail_list,
        raise_asset_policy_id,
        raise_asset_name,
        authen_policy_id,
        lp_asset_name,
        total_liquidity,
        total_raise_amount,
      )
    }
  }
}

// deposit -> authen_policy_id, lp_asset_name
// RedeemRaiseAsset -> raise_asset
// redeemLP -> amm_authen_policy_id, lp_asset
fn validate_expect_out_assets(
  order_datums: List<OrderDatum>,
  authen_policy_id: PolicyId,
  lp_asset_name: AssetName,
  amm_authen_policy_id: PolicyId,
  raise_asset: Asset,
) -> Bool {
  if order_datums |> builtin.null_list {
    True
  } else {
    let OrderDatum { step, expect_output_asset, .. } =
      order_datums |> builtin.head_list
    when step is {
      Deposit ->
        expect_output_asset == Asset {
          policy_id: authen_policy_id,
          asset_name: lp_asset_name,
        }
      RedeemRaiseAsset -> expect_output_asset == raise_asset
      RedeemLP ->
        expect_output_asset == Asset {
          policy_id: amm_authen_policy_id,
          asset_name: lp_asset_name,
        }
    } && validate_expect_out_assets(
      order_datums |> builtin.tail_list,
      authen_policy_id,
      lp_asset_name,
      amm_authen_policy_id,
      raise_asset,
    )
  }
}

pub fn validate_apply_order(
  treasury_in_datum: TreasuryDatum,
  treasury_out_datum: TreasuryDatum,
  treasury_out_value: Value,
  all_inputs: List<Input>,
  all_outputs: List<Output>,
  datums: DatumMap,
  validity_range: ValidityRange,
  authen_policy_id: PolicyId,
  amm_authen_policy_id: PolicyId,
  mint_value: Value,
) -> Bool {
  let TreasuryDatum {
    order_hash,
    start_time,
    end_time,
    lp_asset_name,
    raise_asset,
    asset_a,
    asset_b,
    reserve_a: in_reserve_a,
    reserve_b: in_reserve_b,
    ..
  } = treasury_in_datum
  let order_inputs = get_order_inputs(all_inputs, order_hash)
  let order_outputs = list.take(all_outputs, list.length(order_inputs))
  expect utils.compare_list_length(order_inputs, order_outputs)
  let order_datums =
    list.map(
      order_inputs,
      fn(input) {
        let Input { output: Output { datum, .. }, .. } = input
        expect order_datum: OrderDatum =
          utils.must_find_script_datum(datums, datum)
        order_datum
      },
    )
  let order_in_values =
    list.map(
      order_inputs,
      fn(input) {
        let Input { output: Output { value, .. }, .. } = input
        value
      },
    )
  let Asset { policy_id: raise_asset_policy_id, asset_name: raise_asset_name } =
    raise_asset
  expect
    validate_expect_out_assets(
      order_datums,
      authen_policy_id,
      lp_asset_name,
      amm_authen_policy_id,
      raise_asset,
    )
  let reserve_raise =
    apply_deposit_orders(
      order_in_values,
      order_datums,
      order_outputs,
      raise_asset_policy_id,
      raise_asset_name,
    )
  let reserve_redeem_raise_asset =
    apply_redeem_raise_asset_orders(
      order_in_values,
      order_datums,
      order_outputs,
      raise_asset_policy_id,
      raise_asset_name,
      authen_policy_id,
      lp_asset_name,
    )
  let TreasuryDatum {
    reserve_a: out_reserve_a,
    reserve_b: out_reserve_b,
    total_liquidity,
    ..
  } = treasury_out_datum
  let (raise_amount_in, raise_amount_out) =
    if raise_asset == asset_a {
      (in_reserve_a, out_reserve_a)
    } else {
      (in_reserve_b, out_reserve_b)
    }
  let (base_asset, base_amount) =
    if raise_asset == asset_a {
      (asset_b, in_reserve_b)
    } else {
      (asset_a, in_reserve_a)
    }
  let new_total_liquidity =
    apply_redeem_lp_orders(
      order_in_values,
      order_datums,
      order_outputs,
      raise_asset_policy_id,
      raise_asset_name,
      authen_policy_id,
      lp_asset_name,
      total_liquidity,
      raise_amount_in,
    )
  and {
    validate_batching_treasury_datum(treasury_in_datum, treasury_out_datum),
    validate_order_time(start_time, end_time, validity_range, order_datums),
    raise_amount_in + reserve_raise - reserve_redeem_raise_asset == raise_amount_out,
    quantity_of(treasury_out_value, raise_asset_policy_id, raise_asset_name) == raise_amount_out,
    utils.quantity_of_asset(treasury_out_value, base_asset) == base_amount,
    new_total_liquidity == total_liquidity,
    mint_value == value.zero(),
  }
}
