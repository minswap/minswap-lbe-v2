use aiken/builtin
use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/list
use aiken/math
use aiken/transaction.{
  InlineDatum, Input, Output, OutputReference, ValidityRange,
}
use aiken/transaction/credential.{Address, ScriptCredential}
use aiken/transaction/value.{
  AssetName, PolicyId, Value, ada_asset_name, ada_policy_id, quantity_of,
}
use lb_v2/types.{
  ApplyOrderData, ApplyOrderParams, Asset, DatumMap, Deposit, OrderDatum,
  PoolDatum, RedeemLP, RedeemRaiseAsset, TreasuryDatum, TreasuryState,
  ValidatorHash,
}
use lb_v2/utils.{
  compute_lp_asset_name, factory_auth_an, sort_two_assets, treasury_auth_an,
}

pub fn validate_update_lbe(
  treasury_in_datum: TreasuryDatum,
  treasury_input: Input,
  treasury_output: Output,
  datums: DatumMap,
  validity_range: ValidityRange,
) -> Bool {
  expect Interval {
    upper_bound: IntervalBound { bound_type: Finite(end_valid_time_range), .. },
    ..
  } = validity_range
  let TreasuryDatum { base_asset, discovery_start_time, .. } = treasury_in_datum
  let Asset { policy_id: base_asset_pid, asset_name: base_asset_an } =
    base_asset
  let Input { output: Output { value: treasury_in_value, .. }, .. } =
    treasury_input
  let Output { value: treasury_out_value, datum: treasury_out_datum_raw, .. } =
    treasury_output
  expect treasury_out_datum: TreasuryDatum =
    when treasury_out_datum_raw is {
      InlineDatum(d) -> d
      _ -> utils.must_find_script_datum(datums, treasury_out_datum_raw)
    }
  let TreasuryDatum {
    reserve_base: new_reserve_base,
    minimum_raise: new_min_raise,
    maximum_raise: new_max_raise,
    ..
  } = treasury_out_datum
  and {
    end_valid_time_range < discovery_start_time,
    value.quantity_of(treasury_in_value, ada_policy_id, ada_asset_name) == value.quantity_of(
      treasury_out_value,
      ada_policy_id,
      ada_asset_name,
    ),
    value.quantity_of(treasury_out_value, base_asset_pid, base_asset_an) == new_reserve_base,
    treasury_out_datum == TreasuryDatum {
      ..treasury_in_datum,
      reserve_base: new_reserve_base,
      minimum_raise: new_min_raise,
      maximum_raise: new_max_raise,
    },
  }
}

pub fn validate_cancel_lbe(
  treasury_in_datum: TreasuryDatum,
  treasury_input: Input,
  treasury_output: Output,
  validity_range: ValidityRange,
  reference_inputs: List<Input>,
  amm_pool_validation_hash: ValidatorHash,
  amm_authen_policy_id: PolicyId,
  amm_pool_auth_asset_name: AssetName,
) -> Bool {
  let TreasuryDatum {
    base_asset,
    raise_asset,
    is_cancel,
    is_created_pool,
    minimum_raise,
    reserve_raise,
    discovery_end_time,
    ..
  } = treasury_in_datum
  let Input { output: Output { value: treasury_in_value, .. }, .. } =
    treasury_input
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(treasury_out_datum_raw),
    ..
  } = treasury_output
  expect treasury_out_datum: TreasuryDatum = treasury_out_datum_raw
  expect and {
      is_cancel == 0,
      is_created_pool == 0,
      treasury_in_value == treasury_out_value,
      treasury_out_datum == TreasuryDatum { ..treasury_in_datum, is_cancel: 1 },
    }
  let (asset_a, asset_b) = sort_two_assets(base_asset, raise_asset)
  let Asset { policy_id: asset_a_policy_id, asset_name: asset_a_asset_name } =
    asset_a
  let Asset { policy_id: asset_b_policy_id, asset_name: asset_b_asset_name } =
    asset_b
  let lp_asset_name =
    compute_lp_asset_name(
      asset_a_policy_id,
      asset_a_asset_name,
      asset_b_policy_id,
      asset_b_asset_name,
    )
  let dex_pool_inputs =
    list.filter(
      reference_inputs,
      fn(ref_input) {
        let Input {
          output: Output {
            address: Address { payment_credential, .. },
            value,
            ..
          },
          ..
        } = ref_input
        when payment_credential is {
          ScriptCredential(hash) -> and {
              hash == amm_pool_validation_hash,
              value.quantity_of(
                value,
                amm_authen_policy_id,
                amm_pool_auth_asset_name,
              ) == 1,
              value.quantity_of(value, amm_authen_policy_id, lp_asset_name) > 0,
            }
          _ -> False
        }
      },
    )
  when dex_pool_inputs is {
    [_] -> True
    _ -> {
      expect Some(min_raise) = minimum_raise
      expect Interval {
        lower_bound: IntervalBound {
          bound_type: Finite(start_valid_time_range),
          ..
        },
        ..
      } = validity_range
      and {
        reserve_raise < min_raise,
        discovery_end_time < start_valid_time_range,
      }
    }
  }
}

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
    is_cancel,
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
    base_asset != raise_asset,
    t_reserve_base > 0,
    t_order_hash == order_hash,
    total_liquidity == 0,
    reserve_raise == 0,
    is_cancel == 0,
  }
}

pub fn get_treasury_creation_expected_mint(
  authen_policy_id: PolicyId,
  lp_asset_name: AssetName,
) -> Value {
  value.zero()
    |> value.add(authen_policy_id, factory_auth_an, 1)
    |> value.add(authen_policy_id, treasury_auth_an, 1)
    |> value.add(authen_policy_id, lp_asset_name, 9223372036854775807)
}

pub fn get_treasury_input(
  inputs: List<Input>,
  self_out_ref: OutputReference,
  authen_policy_id: PolicyId,
  treasury_auth_an: AssetName,
) -> Input {
  expect [treasury_input] =
    list.filter(
      inputs,
      fn(input) {
        let Input { output: Output { value, .. }, .. } = input
        quantity_of(value, authen_policy_id, treasury_auth_an) == 1
      },
    )
  let Input { output_reference: out_ref, .. } = treasury_input
  expect out_ref == self_out_ref
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
        let Output { address, value, .. } = output
        and {
          address == treasury_address,
          value.quantity_of(value, authen_policy_id, treasury_auth_an) == 1,
        }
      },
    )
  treasury_output
}

pub fn get_amm_pool_datum(
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
        when payment_credential is {
          ScriptCredential(hash) -> and {
              hash == amm_pool_validation_hash,
              value.quantity_of(
                value,
                amm_authen_policy_id,
                amm_pool_auth_asset_name,
              ) == 1,
            }
          _ -> False
        }
      },
    )
  let Output { datum, .. } = amm_pool_output
  utils.must_find_script_datum(datums, datum)
}

pub fn validate_create_dex_pool(
  treasury_in_datum: TreasuryDatum,
  treasury_output: Output,
  all_outputs: List<Output>,
  datums: DatumMap,
  validity_range: ValidityRange,
  mint_value: Value,
  amm_authen_policy_id: PolicyId,
  amm_pool_auth_asset_name: AssetName,
  amm_pool_datum: PoolDatum,
) -> Bool {
  expect Interval {
    lower_bound: IntervalBound {
      bound_type: Finite(start_valid_time_range),
      ..
    },
    ..
  } = validity_range
  expect TreasuryDatum {
    base_asset,
    raise_asset,
    encounter_start_time,
    owner,
    minimum_raise,
    maximum_raise,
    reserve_base,
    reserve_raise,
    is_cancel: 0,
    is_created_pool: 0,
    ..
  } = treasury_in_datum
  expect and {
      when minimum_raise is {
        Some(m) -> reserve_raise >= m
        None -> True
      },
      start_valid_time_range >= encounter_start_time,
    } || when maximum_raise is {
      Some(m) -> reserve_raise >= m
      None -> False
    }
  let (asset_a, asset_b) = utils.sort_two_assets(base_asset, raise_asset)
  let (datum_in_reserve_a, datum_in_reserve_b) =
    when asset_a == base_asset is {
      True -> (reserve_base, reserve_raise)
      False -> (reserve_raise, reserve_base)
    }
  let Asset { policy_id: asset_a_policy_id, asset_name: asset_a_asset_name } =
    asset_a
  let Asset { policy_id: asset_b_policy_id, asset_name: asset_b_asset_name } =
    asset_b
  let lp_asset_name =
    utils.compute_lp_asset_name(
      asset_a_policy_id,
      asset_a_asset_name,
      asset_b_policy_id,
      asset_b_asset_name,
    )
  let PoolDatum {
    asset_a: pool_asset_a,
    asset_b: pool_asset_b,
    reserve_a: pool_reserve_a,
    reserve_b: pool_reserve_b,
    total_liquidity: pool_total_liquidity,
    ..
  } = amm_pool_datum
  let Output { value: treasury_out_value, datum: treasury_out_datum_raw, .. } =
    treasury_output
  expect treasury_out_datum: TreasuryDatum =
    when treasury_out_datum_raw is {
      InlineDatum(d) -> d
      _ -> utils.must_find_script_datum(datums, treasury_out_datum_raw)
    }
  expect TreasuryDatum {
    total_liquidity: out_datum_total_liquidity,
    is_created_pool: 0,
    ..
  } = treasury_out_datum
  expect [Output { value: owner_output_value, .. }] =
    list.filter(
      all_outputs,
      fn(output) {
        let Output { address, .. } = output
        address == owner
      },
    )
  let owner_total_liquidity =
    value.quantity_of(owner_output_value, amm_authen_policy_id, lp_asset_name)
  let treasury_total_liquidity =
    value.quantity_of(treasury_out_value, amm_authen_policy_id, lp_asset_name)
  and {
    value.quantity_of(
      mint_value,
      amm_authen_policy_id,
      amm_pool_auth_asset_name,
    ) == 1,
    asset_a == pool_asset_a,
    asset_b == pool_asset_b,
    datum_in_reserve_a == pool_reserve_a,
    datum_in_reserve_b == pool_reserve_b,
    out_datum_total_liquidity == treasury_total_liquidity,
    math.abs(
      treasury_total_liquidity + treasury_total_liquidity - pool_total_liquidity,
    ) <= 1,
    owner_total_liquidity == pool_total_liquidity - treasury_total_liquidity,
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
    let OrderDatum { step, expect_output_asset, owner, minimum_receive, .. } =
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

pub fn get_order_inputs_and_outputs(
  inputs: List<Input>,
  outputs: List<Output>,
  order_hash: ValidatorHash,
) -> (List<Input>, List<Output>) {
  let order_inputs =
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
  let order_outputs = list.take(outputs, list.length(order_inputs))
  expect utils.compare_list_length(order_inputs, order_outputs)
  (order_inputs, order_outputs)
}

pub fn get_order_datums(
  order_inputs: List<Input>,
  datums: DatumMap,
  lp_asset_name: AssetName,
  authen_policy_id: PolicyId,
  raise_asset: Asset,
  amm_authen_policy_id: PolicyId,
) -> List<OrderDatum> {
  list.map(
    order_inputs,
    fn(input) {
      let Input { output: Output { datum, .. }, .. } = input
      expect order_datum: OrderDatum =
        when datum is {
          InlineDatum(d) -> d
          _ -> utils.must_find_script_datum(datums, datum)
        }
      let OrderDatum {
        lp_asset_name: datum_lp_an,
        expect_output_asset,
        step,
        minimum_receive,
        ..
      } = order_datum
      expect minimum_receive > 0
      expect datum_lp_an == lp_asset_name
      let output_asset: Asset =
        when step is {
          Deposit ->
            Asset { policy_id: authen_policy_id, asset_name: lp_asset_name }
          RedeemRaiseAsset -> raise_asset
          RedeemLP ->
            Asset { policy_id: amm_authen_policy_id, asset_name: lp_asset_name }
        }
      expect expect_output_asset == output_asset
      order_datum
    },
  )
}

pub fn apply_deposit_order(params: ApplyOrderParams) -> TreasuryState {
  let ApplyOrderParams {
    in_value,
    out_value,
    expect_output_asset,
    minimum_receive,
    treasury_state,
    data: ApplyOrderData { raise_asset_policy_id, raise_asset_name, .. },
  } = params
  let amount_in =
    value.quantity_of(in_value, raise_asset_policy_id, raise_asset_name)
  let estimate_in =
    if utils.is_ada_asset(raise_asset_policy_id, raise_asset_name) {
      amount_in - 2000000
    } else {
      amount_in
    }
  let estimate_out = utils.quantity_of_asset(out_value, expect_output_asset)
  expect and {
      estimate_in == estimate_out,
      minimum_receive == estimate_out,
      value.quantity_of(out_value, ada_policy_id, ada_asset_name) >= 1500000,
    }
  let (
    datum_reserve_raise,
    value_reserve_raise,
    datum_total_liquidity,
    value_total_liquidity,
  ) = treasury_state
  (
    datum_reserve_raise + estimate_in,
    value_reserve_raise + estimate_in,
    datum_total_liquidity,
    value_total_liquidity,
  )
}

pub fn apply_redeem_raise_asset_order(params: ApplyOrderParams) -> TreasuryState {
  let ApplyOrderParams {
    in_value,
    out_value,
    minimum_receive,
    treasury_state,
    data: ApplyOrderData {
      raise_asset_policy_id,
      raise_asset_name,
      authen_policy_id,
      lp_asset_name,
      ..
    },
    ..
  } = params
  let estimate_in = value.quantity_of(in_value, authen_policy_id, lp_asset_name)
  let amount_out =
    value.quantity_of(out_value, raise_asset_policy_id, raise_asset_name)
  let estimate_out =
    if utils.is_ada_asset(raise_asset_policy_id, raise_asset_name) {
      amount_out - 1500000
    } else {
      amount_out
    }
  expect and {
      estimate_in == estimate_out,
      minimum_receive == estimate_out,
      value.quantity_of(out_value, ada_policy_id, ada_asset_name) >= 1500000,
    }
  let (
    datum_reserve_raise,
    value_reserve_raise,
    datum_total_liquidity,
    value_total_liquidity,
  ) = treasury_state
  (
    datum_reserve_raise - estimate_in,
    value_reserve_raise - estimate_in,
    datum_total_liquidity,
    value_total_liquidity,
  )
}

pub fn apply_redeem_lp(params: ApplyOrderParams) -> TreasuryState {
  let ApplyOrderParams {
    in_value,
    out_value,
    treasury_state,
    data: ApplyOrderData {
      authen_policy_id,
      lp_asset_name,
      amm_authen_policy_id,
      ..
    },
    ..
  } = params
  let estimate_in = value.quantity_of(in_value, authen_policy_id, lp_asset_name)
  let estimate_out =
    value.quantity_of(out_value, amm_authen_policy_id, lp_asset_name)
  let (
    datum_reserve_raise,
    value_reserve_raise,
    datum_total_liquidity,
    value_total_liquidity,
  ) = treasury_state
  expect and {
      datum_total_liquidity * estimate_in == datum_reserve_raise * estimate_out,
      value.quantity_of(out_value, ada_policy_id, ada_asset_name) >= 1500000,
    }
  (
    datum_reserve_raise,
    value_reserve_raise,
    datum_total_liquidity - estimate_out,
    value_total_liquidity - estimate_out,
  )
}

pub fn apply_orders(
  order_in_values: List<Value>,
  order_in_datums: List<OrderDatum>,
  order_outputs: List<Output>,
  treasury_state: TreasuryState,
  data: ApplyOrderData,
) -> TreasuryState {
  if order_in_values |> builtin.null_list {
    treasury_state
  } else {
    let OrderDatum { step, expect_output_asset, owner, minimum_receive, .. } =
      order_in_datums |> builtin.head_list
    let in_value = order_in_values |> builtin.head_list
    let Output { value: out_value, address: out_address, .. } =
      order_outputs |> builtin.head_list
    expect out_address == owner
    let params =
      ApplyOrderParams {
        in_value,
        out_value,
        expect_output_asset,
        minimum_receive,
        treasury_state,
        data,
      }

    let new_treasury_state =
      params
        |> when step is {
             Deposit -> apply_deposit_order
             RedeemRaiseAsset -> apply_redeem_raise_asset_order
             RedeemLP -> apply_redeem_lp
           }
    apply_orders(
      order_in_values |> builtin.tail_list,
      order_in_datums |> builtin.tail_list,
      order_outputs |> builtin.tail_list,
      new_treasury_state,
      data,
    )
  }
}

pub fn validate_apply_order(
  treasury_input: Input,
  treasury_output: Output,
  all_inputs: List<Input>,
  all_outputs: List<Output>,
  datums: DatumMap,
  validity_range: ValidityRange,
  authen_policy_id: PolicyId,
  amm_authen_policy_id: PolicyId,
  mint_value: Value,
) -> Bool {
  let Input {
    output: Output {
      value: treasury_in_value,
      datum: treasury_in_datum_raw,
      ..
    },
    ..
  } = treasury_input
  expect treasury_in_datum: TreasuryDatum =
    when treasury_in_datum_raw is {
      InlineDatum(d) -> d
      _ -> utils.must_find_script_datum(datums, treasury_in_datum_raw)
    }
  let TreasuryDatum {
    base_asset,
    raise_asset,
    order_hash,
    discovery_start_time,
    discovery_end_time,
    reserve_raise: in_datum_reserve_raise,
    total_liquidity: in_datum_total_liquidity,
    ..
  } = treasury_in_datum
  let Output { value: treasury_out_value, datum: treasury_out_datum_raw, .. } =
    treasury_output
  expect treasury_out_datum: TreasuryDatum =
    when treasury_out_datum_raw is {
      InlineDatum(d) -> d
      _ -> utils.must_find_script_datum(datums, treasury_out_datum_raw)
    }
  let TreasuryDatum {
    reserve_raise: out_datum_reserve_raise,
    total_liquidity: out_datum_total_liquidity,
    ..
  } = treasury_out_datum
  let (asset_a, asset_b) = utils.sort_two_assets(base_asset, raise_asset)
  let Asset { policy_id: asset_a_policy_id, asset_name: asset_a_asset_name } =
    asset_a
  let Asset { policy_id: asset_b_policy_id, asset_name: asset_b_asset_name } =
    asset_b
  let lp_asset_name =
    utils.compute_lp_asset_name(
      asset_a_policy_id,
      asset_a_asset_name,
      asset_b_policy_id,
      asset_b_asset_name,
    )
  let (order_inputs, order_outputs) =
    get_order_inputs_and_outputs(
      inputs: all_inputs,
      outputs: all_outputs,
      order_hash: order_hash,
    )
  let order_datums =
    get_order_datums(
      order_inputs: order_inputs,
      datums: datums,
      lp_asset_name: lp_asset_name,
      authen_policy_id: authen_policy_id,
      raise_asset: raise_asset,
      amm_authen_policy_id: amm_authen_policy_id,
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
  let pool_state_out: TreasuryState =
    (
      out_datum_reserve_raise,
      value.quantity_of(
        treasury_out_value,
        raise_asset_policy_id,
        raise_asset_name,
      ),
      out_datum_total_liquidity,
      value.quantity_of(treasury_out_value, amm_authen_policy_id, lp_asset_name),
    )
  let pool_state_in: TreasuryState =
    (
      in_datum_reserve_raise,
      value.quantity_of(
        treasury_in_value,
        raise_asset_policy_id,
        raise_asset_name,
      ),
      in_datum_total_liquidity,
      value.quantity_of(treasury_in_value, amm_authen_policy_id, lp_asset_name),
    )
  expect
    pool_state_out == apply_orders(
      order_in_values: order_in_values,
      order_in_datums: order_datums,
      order_outputs: order_outputs,
      treasury_state: pool_state_in,
      data: ApplyOrderData {
        raise_asset_policy_id,
        raise_asset_name,
        authen_policy_id,
        lp_asset_name,
        amm_authen_policy_id,
      },
    )
  and {
    validate_order_time(
      start_time: discovery_start_time,
      end_time: discovery_end_time,
      validity_range: validity_range,
      order_datums: order_datums,
    ),
    mint_value == value.zero(),
  }
}
