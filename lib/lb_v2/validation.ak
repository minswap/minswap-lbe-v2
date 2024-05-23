use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Output, OutputReference, ValidityRange,
}
use aiken/transaction/credential.{
  Address, PaymentCredential, ScriptCredential, VerificationKeyCredential,
}
use aiken/transaction/value.{
  AssetName, PolicyId, Value, ada_asset_name, ada_policy_id,
}
use lb_v2/types.{
  Asset, ManagerDatum, OrderDatum, PenaltyConfig, PoolDatum, PubKeyHash,
  SellerDatum, TreasuryDatum, ValidatorHash,
}
use lb_v2/utils.{
  amm_authen_policy_id, amm_factory_auth_asset_name, amm_pool_auth_asset_name,
  amm_pool_validation_hash, calculate_penalty,
  compute_asset_name_from_base_and_raise, default_burn_liquidity,
  default_number_seller, factory_auth_an, fee_ada, get_order_value,
  manager_auth_an, minimum_ada, order_auth_an, seller_auth_an, treasury_auth_an,
}

pub fn get_value_of_minting_treasury(
  authen_policy_id: PolicyId,
  treasury_policy_id: PolicyId,
  manager_policy_id: PolicyId,
  is_create_treasury: Bool,
) -> Value {
  if is_create_treasury {
    value.from_asset(authen_policy_id, factory_auth_an, 1)
      |> value.add(authen_policy_id, treasury_auth_an, 1)
      |> value.add(treasury_policy_id, manager_auth_an, 1)
      |> value.add(manager_policy_id, seller_auth_an, default_number_seller)
  } else {
    value.from_asset(authen_policy_id, factory_auth_an, -1)
      |> value.add(authen_policy_id, treasury_auth_an, -1)
  }
}

pub fn validate_creating_treasury_out(
  treasury_out_value: Value,
  treasury_out_datum: TreasuryDatum,
  base_asset: Asset,
  raise_asset: Asset,
  manager_hash: ValidatorHash,
  seller_hash: ValidatorHash,
  order_hash: ValidatorHash,
  authen_policy_id: PolicyId,
) -> Bool {
  // check all field except owner
  let TreasuryDatum {
    manager_hash: t_manager_hash,
    seller_hash: t_seller_hash,
    order_hash: t_order_hash,
    collected_fund,
    base_asset: t_base_asset,
    raise_asset: t_raise_asset,
    start_time,
    end_time,
    minimum_raise,
    maximum_raise,
    reserve_base,
    reserve_raise,
    total_liquidity,
    penalty_config,
    total_penalty,
    is_cancelled,
    is_manager_collected,
    ..
  } = treasury_out_datum
  let Asset { policy_id: base_asset_pid, asset_name: base_asset_an } =
    base_asset
  // base_asset must be not ada(already validate in factory)
  let expected_treasury_out_value =
    value.zero()
      |> value.add(authen_policy_id, treasury_auth_an, 1)
      |> value.add(base_asset_pid, base_asset_an, reserve_base)
  and {
    // treasury datum
    manager_hash == t_manager_hash,
    seller_hash == t_seller_hash,
    order_hash == t_order_hash,
    collected_fund == 0,
    t_base_asset == base_asset,
    t_raise_asset == raise_asset,
    start_time > 0,
    start_time < end_time,
    when minimum_raise is {
      Some(minn) ->
        when maximum_raise is {
          Some(maxx) -> minn < maxx
          _ -> True
        } && minn > 0
      _ ->
        when maximum_raise is {
          Some(maxx) -> maxx > 0
          _ -> True
        }
    },
    reserve_base > 0,
    reserve_raise == 0,
    total_liquidity == 0,
    when penalty_config is {
      Some(PenaltyConfig { penalty_start_time, penalty_end_time, percent }) ->
        and {
          penalty_start_time >= start_time,
          penalty_end_time > penalty_start_time,
          penalty_end_time <= end_time,
          percent > 0,
          percent < 100,
        }
      _ -> True
    },
    total_penalty == 0,
    is_cancelled == False,
    is_manager_collected == False,
    // treasury value
    value.without_lovelace(treasury_out_value) == expected_treasury_out_value,
  }
}

pub fn validate_creating_manager_out(
  base_asset: Asset,
  raise_asset: Asset,
  manager_out_value: Value,
  manager_out_datum: ManagerDatum,
  treasury_hash: ValidatorHash,
  seller_hash: ValidatorHash,
  order_hash: ValidatorHash,
) -> Bool {
  let ManagerDatum {
    seller_hash: sm_seller_hash,
    order_hash: sm_order_hash,
    base_asset: sm_base_asset,
    raise_asset: sm_raise_asset,
    seller_count,
    reserve_raise,
    total_penalty,
  } = manager_out_datum
  and {
    // manager datum
    sm_seller_hash == seller_hash,
    sm_order_hash == order_hash,
    sm_base_asset == base_asset,
    sm_raise_asset == raise_asset,
    seller_count == default_number_seller,
    reserve_raise == 0,
    total_penalty == 0,
    // manager treasury
    value.flatten(value.without_lovelace(manager_out_value)) == [
      (treasury_hash, manager_auth_an, 1),
    ],
  }
}

// TODO: validate this logic
pub fn validate_create_dex_pool(
  treasury_in_datum: TreasuryDatum,
  treasury_output: Output,
  validity_range: ValidityRange,
  mint_value: Value,
  amm_pool_datum: PoolDatum,
) -> Bool {
  let TreasuryDatum {
    collected_fund,
    base_asset,
    raise_asset,
    end_time,
    minimum_raise,
    maximum_raise,
    reserve_base,
    reserve_raise,
    total_penalty,
    is_cancelled,
    is_manager_collected,
    ..
  } = treasury_in_datum
  // vaidate timing when create amm pool
  expect Interval {
    lower_bound: IntervalBound {
      bound_type: Finite(start_valid_time_range),
      ..
    },
    ..
  } = validity_range
  let final_reserve_raise =
    when maximum_raise is {
      Some(maxx) ->
        when reserve_raise + total_penalty > maxx is {
          True -> maxx
          False -> reserve_raise + total_penalty
        }
      None -> reserve_raise + total_penalty
    }
  // validate LBE status
  expect and {
      start_valid_time_range > end_time,
      collected_fund == reserve_raise + total_penalty,
      when minimum_raise is {
        Some(minn) -> final_reserve_raise >= minn
        None -> True
      },
      is_cancelled == False,
      is_manager_collected == True,
    }
  let (asset_a, asset_b) = utils.sort_two_assets(base_asset, raise_asset)
  let (datum_in_reserve_a, datum_in_reserve_b) =
    when asset_a == base_asset is {
      True -> (reserve_base, final_reserve_raise)
      False -> (final_reserve_raise, reserve_base)
    }
  let Asset { policy_id: asset_a_policy_id, asset_name: asset_a_asset_name } =
    asset_a
  let Asset { policy_id: asset_b_policy_id, asset_name: asset_b_asset_name } =
    asset_b
  let PoolDatum {
    asset_a: pool_asset_a,
    asset_b: pool_asset_b,
    reserve_a: pool_reserve_a,
    reserve_b: pool_reserve_b,
    total_liquidity: pool_total_liquidity,
    ..
  } = amm_pool_datum
  let lp_asset_name =
    utils.compute_lp_asset_name(
      asset_a_policy_id,
      asset_a_asset_name,
      asset_b_policy_id,
      asset_b_asset_name,
    )
  expect and {
      // check mint value of this redeemer to make sure tx not burn manager token or mint/burn order tokens,...
      mint_value == (
        value.zero()
          |> value.add(amm_authen_policy_id, amm_factory_auth_asset_name, 1)
          |> value.add(amm_authen_policy_id, amm_pool_auth_asset_name, 1)
          |> value.add(amm_authen_policy_id, lp_asset_name, 9223372036854775807)
      ),
      asset_a == pool_asset_a,
      asset_b == pool_asset_b,
      datum_in_reserve_a == pool_reserve_a,
      datum_in_reserve_b == pool_reserve_b,
    }
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(treasury_out_datum_raw),
    ..
  } = treasury_output
  let treasury_total_liquidity =
    value.quantity_of(treasury_out_value, amm_authen_policy_id, lp_asset_name)
  expect treasury_out_datum: TreasuryDatum = treasury_out_datum_raw
  and {
    pool_total_liquidity - default_burn_liquidity == treasury_total_liquidity,
    treasury_out_datum == TreasuryDatum {
      ..treasury_in_datum,
      total_liquidity: treasury_total_liquidity,
    },
  }
}

pub fn has_spend_treasury(
  inputs: List<Input>,
  authen_policy_id: PolicyId,
  treasury_hash: ValidatorHash,
) -> Bool {
  expect [_] =
    list.filter(
      inputs,
      fn(input) {
        let Input {
          output: Output { address: in_addr, value: in_value, .. },
          ..
        } = input
        let Address { payment_credential, .. } = in_addr
        and {
          value.quantity_of(in_value, authen_policy_id, treasury_auth_an) == 1,
          when payment_credential is {
            ScriptCredential(hash) -> treasury_hash == hash
            _ -> False
          },
        }
      },
    )
  True
}

pub fn has_spend_manager(
  inputs: List<Input>,
  treasury_policy_id: PolicyId,
  manager_hash: ValidatorHash,
) -> Bool {
  expect [_] =
    list.filter(
      inputs,
      fn(input) {
        let Input {
          output: Output { address: Address { payment_credential, .. }, value: in_value, .. },
          ..
        } = input
        and {
          value.quantity_of(in_value, treasury_policy_id, manager_auth_an) == 1,
          payment_credential == ScriptCredential(manager_hash),
        }
      },
    )
  True
}

pub fn has_spend_seller(
  inputs: List<Input>,
  manager_policy_id: PolicyId,
  seller_hash: ValidatorHash,
) -> Bool {
  expect [_] =
    list.filter(
      inputs,
      fn(input) {
        let Input {
          output: Output { address: in_addr, value: in_value, .. },
          ..
        } = input
        let Address { payment_credential, .. } = in_addr
        and {
          value.quantity_of(in_value, manager_policy_id, seller_auth_an) == 1,
          when payment_credential is {
            ScriptCredential(hash) -> seller_hash == hash
            _ -> False
          },
        }
      },
    )
  True
}

pub fn get_seller_inputs(
  inputs: List<Input>,
  manager_policy_id: PolicyId,
  seller_hash: ValidatorHash,
) -> List<Input> {
  list.filter(
    inputs,
    fn(input) {
      let Input { output: Output { address: in_addr, value: in_value, .. }, .. } =
        input
      let Address { payment_credential, .. } = in_addr
      and {
        value.quantity_of(in_value, manager_policy_id, seller_auth_an) == 1,
        when payment_credential is {
          ScriptCredential(hash) -> seller_hash == hash
          _ -> False
        },
      }
    },
  )
}

pub fn get_order_inputs(
  inputs: List<Input>,
  seller_policy_id: PolicyId,
  order_hash: ValidatorHash,
) -> List<Input> {
  list.filter(
    inputs,
    fn(input) {
      let Input { output: Output { address: in_addr, value: in_value, .. }, .. } =
        input
      let Address { payment_credential, .. } = in_addr
      and {
        value.quantity_of(in_value, seller_policy_id, order_auth_an) == 1,
        payment_credential == ScriptCredential(order_hash),
      }
    },
  )
}

pub fn get_manager_inputs(
  inputs: List<Input>,
  treasury_policy_id: PolicyId,
  manager_hash: ValidatorHash,
) -> List<Input> {
  list.filter(
    inputs,
    fn(input) {
      let Input { output: Output { address: in_addr, value: in_value, .. }, .. } =
        input
      let Address { payment_credential, .. } = in_addr
      and {
        value.quantity_of(in_value, treasury_policy_id, manager_auth_an) == 1,
        payment_credential == ScriptCredential(manager_hash),
      }
    },
  )
}

pub fn get_treasury_ref_inputs(
  ref_inputs: List<Input>,
  authen_policy_id: PolicyId,
  treasury_hash: ValidatorHash,
) -> List<Input> {
  list.filter(
    ref_inputs,
    fn(input) {
      let Input {
        output: Output {
          address: Address { payment_credential, .. },
          value: in_value,
          ..
        },
        ..
      } = input
      and {
        value.quantity_of(in_value, authen_policy_id, treasury_auth_an) == 1,
        payment_credential == ScriptCredential(treasury_hash),
      }
    },
  )
}

pub fn get_treasury_input_by_out_ref(
  inputs: List<Input>,
  authen_policy_id: PolicyId,
  out_ref: OutputReference,
) -> Input {
  expect [treasury_input] =
    list.filter(
      inputs,
      fn(input) {
        let Input { output_reference, output: Output { value: out_value, .. } } =
          input
        and {
          value.quantity_of(out_value, authen_policy_id, treasury_auth_an) == 1,
          output_reference == out_ref,
        }
      },
    )
  treasury_input
}

pub fn get_seller_input_by_out_ref(
  inputs: List<Input>,
  treasury_policy_id: PolicyId,
  out_ref: OutputReference,
) -> Input {
  expect [seller_input] =
    list.filter(
      inputs,
      fn(input) {
        let Input { output_reference, output: Output { value: out_value, .. } } =
          input
        and {
          value.quantity_of(out_value, treasury_policy_id, seller_auth_an) == 1,
          output_reference == out_ref,
        }
      },
    )
  seller_input
}

pub fn get_amm_pool_output(outputs: List<Output>) -> Output {
  expect [pool_output] =
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
  pool_output
}

pub fn get_amm_pool_ref_inputs(ref_inputs: List<Input>) -> List<Input> {
  let pool_ref_inputs =
    list.filter(
      ref_inputs,
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
            }
          _ -> False
        }
      },
    )
  pool_ref_inputs
}

pub fn get_treasury_output(
  outputs: List<Output>,
  authen_policy_id: PolicyId,
  treasury_hash: ValidatorHash,
) -> Output {
  expect [treasury_output] =
    list.filter(
      outputs,
      fn(output) {
        let Output {
          address: Address { payment_credential, .. },
          value: out_value,
          ..
        } = output
        and {
          value.quantity_of(out_value, authen_policy_id, treasury_auth_an) == 1,
          when payment_credential is {
            ScriptCredential(hash) -> hash == treasury_hash
            _ -> False
          },
        }
      },
    )
  treasury_output
}

pub fn get_seller_outputs(
  outputs: List<Output>,
  manager_policy_id: PolicyId,
  seller_hash: ValidatorHash,
  seller_datum: Data,
) -> List<Output> {
  let seller_outputs =
    list.filter(
      outputs,
      fn(output) {
        let Output { address: Address { payment_credential, .. }, .. } = output
        payment_credential == ScriptCredential(seller_hash)
      },
    )
  expect
    list.all(
      seller_outputs,
      fn(output) {
        let Output { value: out_value, datum: out_datum, .. } = output
        and {
          value.quantity_of(out_value, manager_policy_id, seller_auth_an) == 1,
          InlineDatum(seller_datum) == out_datum,
        }
      },
    )
  seller_outputs
}

pub fn get_order_outputs(
  outputs: List<Output>,
  seller_policy_id: PolicyId,
  order_hash: ValidatorHash,
) -> List<Output> {
  list.filter(
    outputs,
    fn(output) {
      let Output {
        address: Address { payment_credential, .. },
        value: out_value,
        ..
      } = output
      and {
        value.quantity_of(out_value, seller_policy_id, order_auth_an) == 1,
        payment_credential == ScriptCredential(order_hash),
      }
    },
  )
}

pub fn validate_collect_manager(
  treasury_output: Output,
  treasury_in_datum: TreasuryDatum,
  manager_input: Input,
  mint_value: Value,
  treasury_hash: ValidatorHash,
) -> Bool {
  let TreasuryDatum { base_asset, raise_asset, is_manager_collected, .. } =
    treasury_in_datum
  expect Output { datum: InlineDatum(treasury_out_raw_datum), .. } =
    treasury_output
  expect treasury_out_datum: TreasuryDatum = treasury_out_raw_datum

  expect Input {
    output: Output { datum: InlineDatum(raw_manager_datum), .. },
    ..
  } = manager_input
  expect ManagerDatum {
    base_asset: sm_base_asset,
    raise_asset: sm_raise_asset,
    seller_count,
    reserve_raise,
    total_penalty,
    ..
  }: ManagerDatum = raw_manager_datum
  and {
    is_manager_collected == False,
    // validate Mint Amount
    mint_value == value.from_asset(treasury_hash, manager_auth_an, -1),
    // validate seller manager datum 
    sm_base_asset == base_asset,
    sm_raise_asset == raise_asset,
    // seller_count == 0 that mean LBE is already cancelled or finish
    seller_count == 0,
    // validate treasury output
    treasury_out_datum == TreasuryDatum {
      ..treasury_in_datum,
      reserve_raise: reserve_raise,
      total_penalty: total_penalty,
      is_manager_collected: True,
    },
  }
}

pub fn validate_using_seller(
  treasury_hash: ValidatorHash,
  out_ref: OutputReference,
  seller_in_datum: SellerDatum,
  inputs: List<Input>,
  reference_inputs: List<Input>,
  outputs: List<Output>,
  validity_range: ValidityRange,
  extra_signatories: List<PubKeyHash>,
  mint_value: Value,
  authen_policy_id: PolicyId,
  manager_hash: ValidatorHash,
) -> Bool {
  expect Interval {
    upper_bound: IntervalBound { bound_type: Finite(end_valid_time_range), .. },
    lower_bound: IntervalBound {
      bound_type: Finite(start_valid_time_range),
      ..
    },
  } = validity_range
  // Validate always spend exactly 1 Seller UTxO
  let seller_input = get_seller_input_by_out_ref(inputs, treasury_hash, out_ref)
  expect Input {
    output: Output {
      address: Address { payment_credential: ScriptCredential(seller_hash), .. },
      ..
    },
    ..
  } = seller_input
  expect [_] =
    list.filter(
      inputs,
      fn(input) {
        let Input {
          output: Output { address: Address { payment_credential, .. }, .. },
          ..
        } = input
        when payment_credential is {
          ScriptCredential(hash) -> hash == seller_hash
          _ -> False
        }
      },
    )
  // Validate Datums
  expect [treasury_ref_input] =
    get_treasury_ref_inputs(reference_inputs, authen_policy_id, treasury_hash)
  expect Input {
    output: Output { datum: InlineDatum(raw_treasury_datum), .. },
    ..
  } = treasury_ref_input
  expect TreasuryDatum {
    base_asset,
    raise_asset,
    order_hash,
    penalty_config,
    start_time,
    end_time,
    ..
  }: TreasuryDatum = raw_treasury_datum
  let order_inputs = get_order_inputs(inputs, seller_hash, order_hash)
  let order_outputs = get_order_outputs(outputs, seller_hash, order_hash)
  let (delta_amount, delta_penalty) =
    apply_order(
      order_inputs: order_inputs,
      order_outputs: order_outputs,
      penalty_config: penalty_config,
      start_valid_time_range: start_valid_time_range,
      end_valid_time_range: end_valid_time_range,
      seller_hash: seller_hash,
      base_asset: base_asset,
      raise_asset: base_asset,
      extra_signatories: extra_signatories,
      inputs: inputs,
    )
  let order_input_count = list.length(order_inputs)
  let order_output_count = list.length(order_outputs)
  let is_valid_minting =
    if order_input_count == order_output_count {
      value.flatten(mint_value) == []
    } else {
      value.flatten(mint_value) == [
        (seller_hash, order_auth_an, order_output_count - order_input_count),
      ]
    }
  expect [_] =
    get_seller_outputs(
      outputs: outputs,
      manager_policy_id: manager_hash,
      seller_hash: seller_hash,
      seller_datum: SellerDatum {
        base_asset,
        raise_asset,
        amount: seller_in_datum.amount + delta_amount,
        penalty_amount: seller_in_datum.penalty_amount + delta_penalty,
      },
    )
  and {
    // validate LBE ID
    base_asset == seller_in_datum.base_asset,
    raise_asset == seller_in_datum.raise_asset,
    // validate time frame
    start_time < start_valid_time_range,
    end_time > end_valid_time_range,
    // validate minting
    is_valid_minting,
  }
}

pub fn apply_order(
  order_inputs: List<Input>,
  order_outputs: List<Output>,
  penalty_config: Option<PenaltyConfig>,
  start_valid_time_range: Int,
  end_valid_time_range: Int,
  seller_hash: ValidatorHash,
  base_asset: Asset,
  raise_asset: Asset,
  extra_signatories: List<ByteArray>,
  inputs: List<Input>,
) -> (Int, Int) {
  let (total_input_amount, total_input_penalty) =
    list.foldl(
      order_inputs,
      (0, 0),
      fn(order_input, acc) {
        expect Input {
          output: Output {
            datum: InlineDatum(raw_o_datum),
            value: order_value,
            ..
          },
          ..
        } = order_input
        let (acc_amount, acc_penalty) = acc
        expect OrderDatum {
          base_asset: o_base_asset,
          raise_asset: o_raise_asset,
          amount,
          is_collected,
          penalty_amount,
          owner,
        }: OrderDatum = raw_o_datum
        let Address { payment_credential: owner_payment_credential, .. } = owner
        let expected_order =
          get_order_value(
            amount: amount,
            penalty_amount: penalty_amount,
            seller_policy_id: seller_hash,
            raise_asset: raise_asset,
          )
        // validate orders
        expect and {
            validate_authorize_by_owner(
              owner_payment_credential: owner_payment_credential,
              extra_signatories: extra_signatories,
              inputs: inputs,
            ),
            is_collected == False,
            o_base_asset == base_asset,
            o_raise_asset == raise_asset,
            expected_order == order_value,
          }
        (acc_amount + amount, acc_penalty + penalty_amount)
      },
    )
  let (total_output_amount, total_output_penalty) =
    list.foldl(
      order_outputs,
      (0, 0),
      fn(order_output, acc) {
        expect Output {
          datum: InlineDatum(raw_o_datum),
          value: order_value,
          ..
        } = order_output
        let (acc_amount, acc_penalty) = acc
        expect OrderDatum {
          base_asset: o_base_asset,
          raise_asset: o_raise_asset,
          amount,
          is_collected,
          penalty_amount,
          ..
        }: OrderDatum = raw_o_datum
        let expected_order =
          get_order_value(
            amount: amount,
            penalty_amount: penalty_amount,
            seller_policy_id: seller_hash,
            raise_asset: raise_asset,
          )
        // validate orders
        expect and {
            is_collected == False,
            o_base_asset == base_asset,
            o_raise_asset == raise_asset,
            expected_order == order_value,
          }
        (acc_amount + amount, acc_penalty + penalty_amount)
      },
    )
  // penalty of this tx
  let penalty =
    calculate_penalty(
      penalty_config: penalty_config,
      start_valid_time_range: start_valid_time_range,
      end_valid_time_range: end_valid_time_range,
      total_input_amount: total_input_amount,
      total_output_amount: total_output_amount,
    )
  expect total_output_penalty - total_input_penalty == penalty

  (
    total_output_amount - total_input_amount,
    total_output_penalty - total_input_penalty,
  )
}

pub fn validate_collect_order(
  order_inputs: List<Input>,
  order_outputs: List<Output>,
  treasury_output: Output,
  treasury_in_datum: TreasuryDatum,
  treasury_in_value: Value,
  mint_value: Value,
) -> Bool {
  let TreasuryDatum {
    seller_hash,
    collected_fund,
    base_asset,
    raise_asset,
    is_cancelled,
    is_manager_collected,
    reserve_raise,
    total_penalty,
    minimum_raise,
    ..
  } = treasury_in_datum
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(raw_treasury_out_datum),
    ..
  } = treasury_output
  expect treasury_out_datum: TreasuryDatum = raw_treasury_out_datum
  // 1. validate orders. 
  //    - each order validate
  //      - order datum 
  //        - order_in.is_collected = False
  //        - order_out.is_collected = True
  //        - other field: no change
  //      - order value
  //        - value_out =  minimum_ada+1fee
  //    - calculate acc amount and penalty of all order
  //    - order length > 0 && order_ins.length ==order_outs.length
  let delta_fund =
    apply_collecting_orders(
      order_inputs: order_inputs,
      order_outputs: order_outputs,
      base_asset: base_asset,
      raise_asset: raise_asset,
      seller_hash: seller_hash,
    )
  let Asset { policy_id: raise_asset_pid, asset_name: raise_asset_an } =
    raise_asset
  and {
    // 2. validate treasury
    //    - treasury_datum
    //      - collected_fund: 
    //            datum_out.collected_fund = datum_in.collected_fund + delta_fund
    //      - other field: nothing change
    //    - treasury_value: t_value_out = t_value_in + (raise_asset, delta_fund)
    TreasuryDatum {
      ..treasury_in_datum,
      collected_fund: collected_fund + delta_fund,
    } == treasury_out_datum,
    treasury_out_value == (
      treasury_in_value
        |> value.add(raise_asset_pid, raise_asset_an, delta_fund)
    ),
    // 3. validate time range(no need to check because It must collect seller first)
    //    - datum.end_time < start_valid_time_range
    // 4. collect manager
    is_manager_collected == True,
    // 5. Mint nothing
    value.flatten(mint_value) == [],
    // 6. Not cancel yet
    is_cancelled == False,
    // 7. Collected manager
    is_manager_collected == True,
    // 8. Reach min raise
    when minimum_raise is {
      None -> True
      Some(min) -> reserve_raise + total_penalty >= min
    },
  }
}

// return (total_amount+total_penalty) of orders
pub fn apply_collecting_orders(
  order_inputs: List<Input>,
  order_outputs: List<Output>,
  base_asset: Asset,
  raise_asset: Asset,
  seller_hash: ValidatorHash,
) -> Int {
  expect [order_input, ..remaining_order_inputs] = order_inputs
  expect Input {
    output: Output { datum: InlineDatum(raw_order_in_datum), .. },
    ..
  } = order_input
  expect order_in_datum: OrderDatum = raw_order_in_datum
  expect [order_output, ..remaining_order_outputs] = order_outputs
  let fund_amount =
    apply_collecting_order(
      order_in_datum,
      order_output,
      base_asset,
      raise_asset,
      seller_hash: seller_hash,
    )
  if remaining_order_inputs == [] {
    expect remaining_order_outputs == []
    fund_amount
  } else {
    let acc_fund =
      apply_collecting_orders(
        remaining_order_inputs,
        remaining_order_outputs,
        base_asset,
        raise_asset,
        seller_hash,
      )
    acc_fund + fund_amount
  }
}

pub fn apply_collecting_order(
  order_in_datum: OrderDatum,
  order_output: Output,
  base_asset: Asset,
  raise_asset: Asset,
  seller_hash: ValidatorHash,
) -> Int {
  let OrderDatum {
    base_asset: o_base_asset,
    raise_asset: o_raise_asset,
    amount,
    is_collected,
    penalty_amount,
    ..
  } = order_in_datum
  expect Output {
    datum: InlineDatum(raw_order_out_datum),
    value: order_out_value,
    ..
  } = order_output
  expect order_out_datum: OrderDatum = raw_order_out_datum
  // validate
  expect and {
      order_out_value == (
        value.zero() // fee for redeemLP
          |> value.add(ada_policy_id, ada_asset_name, fee_ada + minimum_ada)
          |> value.add(seller_hash, order_auth_an, 1)
      ),
      o_base_asset == base_asset,
      o_raise_asset == raise_asset,
      is_collected == False,
      OrderDatum { ..order_in_datum, is_collected: True } == order_out_datum,
    }
  amount + penalty_amount
}

pub fn validate_redeem_lp(
  order_inputs: List<Input>,
  outputs: List<Output>,
  treasury_output: Output,
  treasury_in_datum: TreasuryDatum,
  treasury_in_value: Value,
  mint_value: Value,
) -> Bool {
  let TreasuryDatum {
    collected_fund,
    base_asset,
    raise_asset,
    reserve_raise,
    total_liquidity,
    maximum_raise,
    total_penalty,
    seller_hash,
    ..
  } = treasury_in_datum
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(raw_treasury_out_datum),
    ..
  } = treasury_output
  expect treasury_out_datum: TreasuryDatum = raw_treasury_out_datum
  let lp_asset_name =
    compute_asset_name_from_base_and_raise(base_asset, raise_asset)

  let total_remaining_raise =
    when maximum_raise is {
      Some(maxx) ->
        when reserve_raise + total_penalty > maxx is {
          True -> reserve_raise + total_penalty - maxx
          False -> 0
        }
      None -> 0
    }
  let Asset { policy_id: raise_asset_pid, asset_name: raise_asset_an } =
    raise_asset
  // 1. validate orders. 
  //    - each order validate(n first output is n output of order)
  //      - check id of order input
  //      - order output 
  //        - value_out =  minimum_ada+ LP + remaining raise asset depend on how much they provided
  //        - address = owner of order input datum
  //    - calculate acc amount and penalty of all order(from input datum) and total LP and remaining raise asset that users redeemed
  let (total_o_fund, total_o_lp, total_o_remaining_raise) =
    apply_redeeming_lp_orders(
      order_inputs: order_inputs,
      outputs: outputs,
      base_asset: base_asset,
      raise_asset: raise_asset,
      total_lp: total_liquidity,
      reserve_raise: reserve_raise,
      remaing_raise: total_remaining_raise,
      lp_asset_name: lp_asset_name,
    )

  and {
    // 2. validate treasury.
    //    - treasury_datum
    //      - collected_fund: 
    //            total_o_fund = amount+penalty(of all orders)
    //            datum_out.collected_fund = datum_in.collected_fund - delta_fund
    //      - other field: nothing change
    //    - treasury_value: t_value_out = t_value_in - ((totalLP+raise asset) user redeem in this tx)
    treasury_out_datum == TreasuryDatum {
      ..treasury_in_datum,
      collected_fund: collected_fund - total_o_fund,
    },
    treasury_out_value == (
      treasury_in_value
        |> value.add(amm_authen_policy_id, lp_asset_name, -total_o_lp)
        |> value.add(raise_asset_pid, raise_asset_an, -total_o_remaining_raise)
    ),
    // 3. Mint: burn order NFT
    value.flatten(mint_value) == [
      (seller_hash, order_auth_an, -list.length(order_inputs)),
    ],
  }
  // this function dont need to check collected beacause treasury must collect before create pool
}

// return (total fund(amount and penalty) of orders, total lp that users redeemed, total raise asset that user redeem)
pub fn apply_redeeming_lp_orders(
  order_inputs: List<Input>,
  outputs: List<Output>,
  base_asset: Asset,
  raise_asset: Asset,
  total_lp: Int,
  reserve_raise: Int,
  remaing_raise: Int,
  lp_asset_name: AssetName,
) -> (Int, Int, Int) {
  expect [order_input, ..remaining_order_inputs] = order_inputs
  expect Input {
    output: Output { datum: InlineDatum(raw_order_in_datum), .. },
    ..
  } = order_input
  expect order_in_datum: OrderDatum = raw_order_in_datum
  expect [order_output, ..remaining_outputs] = outputs
  let (o_fund, o_lp_amount, o_remaining_raise_amount) =
    apply_redeeming_lp_order(
      order_in_datum,
      order_output,
      base_asset,
      raise_asset,
      total_lp,
      reserve_raise,
      remaing_raise,
      lp_asset_name,
    )
  if remaining_order_inputs == [] {
    (o_fund, o_lp_amount, o_remaining_raise_amount)
  } else {
    let (acc_fund, acc_lp, acc_raise) =
      apply_redeeming_lp_orders(
        remaining_order_inputs,
        remaining_outputs,
        base_asset,
        raise_asset,
        total_lp,
        reserve_raise,
        remaing_raise,
        lp_asset_name,
      )
    (
      acc_fund + o_fund,
      acc_lp + o_lp_amount,
      acc_raise + o_remaining_raise_amount,
    )
  }
}

fn apply_redeeming_lp_order(
  order_in_datum: OrderDatum,
  order_output: Output,
  base_asset: Asset,
  raise_asset: Asset,
  total_lp: Int,
  reserve_raise: Int,
  remaing_raise: Int,
  lp_asset_name: AssetName,
) -> (Int, Int, Int) {
  let OrderDatum {
    base_asset: o_base_asset,
    raise_asset: o_raise_asset,
    owner,
    amount,
    penalty_amount,
    ..
  } = order_in_datum
  let o_lp_amount = total_lp * amount / reserve_raise
  let o_remaining_raise_amount = remaing_raise * amount / reserve_raise

  let Asset { policy_id: raise_asset_pid, asset_name: raise_asset_an } =
    raise_asset
  let expected_order_out_value =
    value.zero()
      |> value.add(ada_policy_id, ada_asset_name, minimum_ada)
      |> value.add(raise_asset_pid, raise_asset_an, o_remaining_raise_amount)
      |> value.add(amm_authen_policy_id, lp_asset_name, o_lp_amount)
  let Output { address: owner_address, value: order_out_value, .. } =
    order_output
  expect and {
      base_asset == o_base_asset,
      raise_asset == o_raise_asset,
      owner_address == owner,
      expected_order_out_value == order_out_value,
    }
  (amount + penalty_amount, o_lp_amount, o_remaining_raise_amount)
}

// TODO: support cancel before discovery by owner
pub fn validate_cancel_lbe(
  treasury_in_datum: TreasuryDatum,
  treasury_in_value: Value,
  treasury_output: Output,
  ref_inputs: List<Input>,
) -> Bool {
  let TreasuryDatum {
    collected_fund,
    base_asset,
    raise_asset,
    reserve_raise,
    minimum_raise,
    total_penalty,
    is_cancelled,
    ..
  } = treasury_in_datum
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(raw_treasury_out_datum),
    ..
  } = treasury_output
  expect treasury_out_datum: TreasuryDatum = raw_treasury_out_datum
  let min_raise =
    when minimum_raise is {
      None -> 1
      Some(min_raise) -> min_raise
    }
  and {
    // 1. collected_fund == reserve_raise+penalty(collected all orders) 
    //          && seller == 0(because when collected_fund == reserve_raise+penalty == 0, it can be Counting phase when trreasury havent collected any seller)
    collected_fund == reserve_raise + total_penalty,
    // 2. reason
    if collected_fund < min_raise {
      True
    } else {
      expect [pool_ref_input] = get_amm_pool_ref_inputs(ref_inputs)
      expect Input {
        output: Output { datum: InlineDatum(raw_pool_datum), .. },
        ..
      } = pool_ref_input
      expect PoolDatum { asset_a, asset_b, .. }: PoolDatum = raw_pool_datum
      utils.sort_two_assets(base_asset, raise_asset) == (asset_a, asset_b)
    },
    // 3. Treasury
    //    - Datum: 
    //      - is_cancelled: 
    //        - Input: False
    //        - Output: True
    //      - other field no changes
    is_cancelled == False,
    treasury_out_datum == TreasuryDatum {
      ..treasury_in_datum,
      is_cancelled: True,
    },
    //    - Value: no change
    treasury_in_value == treasury_out_value,
  }
}

pub fn validate_refund(
  order_inputs: List<Input>,
  outputs: List<Output>,
  treasury_output: Output,
  treasury_in_datum: TreasuryDatum,
  treasury_in_value: Value,
  mint_value: Value,
) -> Bool {
  let TreasuryDatum {
    collected_fund,
    base_asset,
    raise_asset,
    seller_hash,
    is_cancelled,
    reserve_raise,
    total_penalty,
    is_manager_collected,
    ..
  } = treasury_in_datum
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(raw_treasury_out_datum),
    ..
  } = treasury_output
  expect treasury_out_datum: TreasuryDatum = raw_treasury_out_datum

  let Asset { policy_id: raise_asset_pid, asset_name: raise_asset_an } =
    raise_asset
  // 1. validate orders. 
  //    - each order validate(n first output is n output of order)
  //      - check lbe id of order input
  //      - order output 
  //        - value_out =  minimum_ada+ refund_amount(refund_amount= amount+penalty )
  //        - address = owner of order input datum
  //    - calculate all order fund
  let (total_orders_collected_fund, total_orders_amount, total_orders_penalty) =
    apply_refund_orders(
      order_inputs: order_inputs,
      outputs: outputs,
      base_asset: base_asset,
      raise_asset: raise_asset,
    )

  and {
    // 2. validate treasury.
    //    - treasury_datum
    //      - is_cancelled = True
    //      - collected_fund: 
    //            datum_out.collected_fund: datum_in.collected_fund - total_orders_collected_fund
    //            datum_out.reserve_raise: datum_in.reserve_raise - total_orders_amount
    //            datum_out.total_penalty: datum_in.total_penalty - total_orders_penalty
    //      - other field: nothing change
    //    - treasury_value: t_value_out = t_value_in - (total_orders_collected_fund)
    is_cancelled == True,
    treasury_out_datum == TreasuryDatum {
      ..treasury_in_datum,
      collected_fund: collected_fund - total_orders_collected_fund,
      reserve_raise: reserve_raise - total_orders_amount,
      total_penalty: total_penalty - total_orders_penalty,
    },
    treasury_out_value == (
      treasury_in_value
        |> value.add(raise_asset_pid, raise_asset_an, -total_orders_collected_fund)
    ),
    // 3. Mint: burn order NFT
    value.flatten(mint_value) == [
      (seller_hash, order_auth_an, -list.length(order_inputs)),
    ],
    is_manager_collected == True,
  }
}

// return (total fund(amount and penalty) of orders, total lp that users redeemed, total raise asset that user redeem)
// (total_collected_fund, total_amount, total_penalty)
pub fn apply_refund_orders(
  order_inputs: List<Input>,
  outputs: List<Output>,
  base_asset: Asset,
  raise_asset: Asset,
) -> (Int, Int, Int) {
  expect [order_input, ..remaining_order_inputs] = order_inputs
  expect Input {
    output: Output { datum: InlineDatum(raw_order_in_datum), .. },
    ..
  } = order_input
  expect order_in_datum: OrderDatum = raw_order_in_datum
  expect [order_output, ..remaining_outputs] = outputs
  let (collected_fund, amount, penalty_amount) =
    apply_refund_order(order_in_datum, order_output, base_asset, raise_asset)
  if remaining_order_inputs == [] {
    (collected_fund, amount, penalty_amount)
  } else {
    let (acc_collected_fund, acc_amount, acc_penalty) =
      apply_refund_orders(
        remaining_order_inputs,
        remaining_outputs,
        base_asset,
        raise_asset,
      )
    (
      acc_collected_fund + collected_fund,
      acc_amount + amount,
      acc_penalty + penalty_amount,
    )
  }
}

fn apply_refund_order(
  order_in_datum: OrderDatum,
  order_output: Output,
  base_asset: Asset,
  raise_asset: Asset,
) -> (Int, Int, Int) {
  let OrderDatum {
    base_asset: o_base_asset,
    raise_asset: o_raise_asset,
    owner,
    amount,
    penalty_amount,
    is_collected,
  } = order_in_datum

  let Asset { policy_id: raise_asset_pid, asset_name: raise_asset_an } =
    raise_asset
  let order_out_base_ada_amount =
    if is_collected {
      minimum_ada
    } else {
      minimum_ada + fee_ada
    }
  let expected_order_out_value =
    value.zero()
      |> value.add(ada_policy_id, ada_asset_name, order_out_base_ada_amount)
      |> value.add(raise_asset_pid, raise_asset_an, amount + penalty_amount)
  let Output { address: owner_address, value: order_out_value, .. } =
    order_output
  expect and {
      base_asset == o_base_asset,
      raise_asset == o_raise_asset,
      owner_address == owner,
      expected_order_out_value == order_out_value,
    }
  (
    if is_collected {
      amount + penalty_amount
    } else {
      0
    },
    amount,
    penalty_amount,
  )
}

pub fn validate_manage_seller(
  manager_hash: ValidatorHash,
  // manager_in_value: Value,
  manager_in_datum: ManagerDatum,
  manager_out: Output,
  validity_range: ValidityRange,
  // treasury_ref_input: Input,
  mint_value: Value,
  treasury_datum: TreasuryDatum,
  seller_inputs: List<Input>,
  seller_outputs: List<Output>,
) -> Bool {
  expect Interval {
    upper_bound: IntervalBound { bound_type: Finite(end_valid_time_range), .. },
    lower_bound: IntervalBound {
      bound_type: Finite(start_valid_time_range),
      ..
    },
  } = validity_range
  let TreasuryDatum { base_asset, raise_asset, end_time, is_cancelled, .. } =
    treasury_datum
  let ManagerDatum {
    base_asset: sm_base_asset,
    raise_asset: sm_raise_asset,
    seller_count,
    reserve_raise,
    total_penalty,
    ..
  } = manager_in_datum
  // validate LBE ID
  expect and {
      sm_base_asset == base_asset,
      sm_raise_asset == raise_asset,
    }
  expect Output { datum: InlineDatum(raw_manager_out_datum), .. } = manager_out
  expect manager_out_datum: ManagerDatum = raw_manager_out_datum
  if and {
    end_valid_time_range < end_time,
    is_cancelled == False,
  } {
    let addition_seller = list.length(seller_outputs)
    // add seller
    and {
      // mint value
      mint_value == value.from_asset(
        manager_hash,
        seller_auth_an,
        addition_seller,
      ),
      // no input
      list.length(seller_inputs) == 0,
      // update datum
      manager_out_datum == ManagerDatum {
        ..manager_in_datum,
        seller_count: seller_count + addition_seller,
      },
    }
  } else if or {
    start_valid_time_range > end_time,
    is_cancelled == True,
  } {
    // total amount and penalty
    // -> update manager datum
    expect [total_reserve_raise, total_penalty_input, seller_input_count] =
      list.foldl(
        seller_inputs,
        [0, 0, 0],
        fn(seller_input, acc) {
          expect [acc_reserve_raise, acc_total_penalty, acc_seller_count] = acc
          expect Input {
            output: Output { datum: InlineDatum(seller_raw_datum), .. },
            ..
          } = seller_input
          expect seller_datum: SellerDatum = seller_raw_datum
          let SellerDatum {
            base_asset: s_base_asset,
            raise_asset: s_raise_asset,
            amount,
            penalty_amount,
          } = seller_datum
          expect and {
              s_base_asset == base_asset,
              s_raise_asset == raise_asset,
            }
          [
            acc_reserve_raise + amount,
            acc_total_penalty + penalty_amount,
            acc_seller_count + 1,
          ]
        },
      )
    and {
      // no seller outputs
      list.length(seller_outputs) == 0,
      // mint value
      value.flatten(mint_value) == [
        (manager_hash, seller_auth_an, -seller_input_count),
      ],
      // update datum
      manager_out_datum == ManagerDatum {
        ..manager_in_datum,
        seller_count: seller_count - seller_input_count,
        reserve_raise: reserve_raise + total_reserve_raise,
        total_penalty: total_penalty + total_penalty_input,
      },
    }
  } else {
    False
  }
}

pub fn validate_authorize_by_owner(
  owner_payment_credential: PaymentCredential,
  extra_signatories: List<PubKeyHash>,
  inputs: List<Input>,
) -> Bool {
  when owner_payment_credential is {
    VerificationKeyCredential(owner_pkh) ->
      // Verify transaction must be signed by Owner
      list.has(extra_signatories, owner_pkh)
    ScriptCredential(_) -> {
      // In case owner is script address, this script will require at least 1 owner UTxO in input
      // If owner UTxO has enough condition to unlock itself, it can unlock this script as well
      let has_owner_script_in_inputs =
        list.any(
          inputs,
          fn(input) {
            let Input { output, .. } = input
            let Output { address: out_address, .. } = output
            let Address { payment_credential: out_payment_credential, .. } =
              out_address
            out_payment_credential == owner_payment_credential
          },
        )
      has_owner_script_in_inputs
    }
  }
}
