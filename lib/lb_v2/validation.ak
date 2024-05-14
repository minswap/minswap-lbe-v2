use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/list
use aiken/transaction.{
  InlineDatum, Input, Output, OutputReference, ValidityRange,
}
use aiken/transaction/credential.{
  Address, ScriptCredential, VerificationKeyCredential,
}
use aiken/transaction/value.{PolicyId, Value}
use lb_v2/types.{
  Asset, CreateTreasury, FactoryStep, OrderDatum, PenaltyConfig, PoolDatum,
  RemoveTreasury, SellerDatum, TreasuryDatum, ValidatorHash,
}
use lb_v2/utils.{
  amm_authen_policy_id, amm_pool_auth_asset_name, amm_pool_validation_hash,
  calculate_penalty, default_burn_liquidity, default_number_seller,
  factory_auth_an, get_order_value, order_auth_an, seller_auth_an,
  treasury_auth_an,
}

pub fn get_value_of_minting_treasury(
  authen_policy_id: PolicyId,
  treasury_policy_id: PolicyId,
  step: FactoryStep,
) -> Value {
  when step is {
    CreateTreasury ->
      value.from_asset(authen_policy_id, factory_auth_an, 1)
        |> value.add(authen_policy_id, treasury_auth_an, 1)
        |> value.add(treasury_policy_id, seller_auth_an, default_number_seller)
    RemoveTreasury ->
      value.from_asset(authen_policy_id, factory_auth_an, -1)
        |> value.add(authen_policy_id, treasury_auth_an, -1)
  }
}

pub fn get_mint_value_of_add_sellers(
  treasury_policy_id: PolicyId,
  add_seller_count: Int,
) -> Value {
  expect add_seller_count > 0
  value.from_asset(treasury_policy_id, seller_auth_an, add_seller_count)
}

pub fn get_mint_value_of_collect_sellers(
  treasury_policy_id: PolicyId,
  collect_seller_count: Int,
) -> Value {
  expect collect_seller_count > 0
  value.from_asset(
    treasury_policy_id,
    seller_auth_an,
    -1 * collect_seller_count,
  )
}

pub fn validate_creating_treasury_out(
  treasury_out_value: Value,
  treasury_out_datum: TreasuryDatum,
  base_asset: Asset,
  raise_asset: Asset,
  order_hash: ValidatorHash,
  seller_hash: ValidatorHash,
  authen_policy_id: PolicyId,
) -> Bool {
  let TreasuryDatum {
    seller_hash: t_seller_hash,
    order_hash: t_order_hash,
    seller_count,
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
    ..
  } = treasury_out_datum
  let Asset { policy_id: base_asset_pid, asset_name: base_asset_an } =
    base_asset
  let expected_treasury_out_value =
    value.zero()
      |> value.add(authen_policy_id, treasury_auth_an, 1)
      |> value.add(base_asset_pid, base_asset_an, reserve_base)
  and {
    seller_hash == t_seller_hash,
    order_hash == t_order_hash,
    seller_count == default_number_seller,
    collected_fund == 0,
    t_base_asset == base_asset,
    t_raise_asset == raise_asset,
    base_asset != raise_asset,
    value.without_lovelace(treasury_out_value) == expected_treasury_out_value,
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
  }
}

pub fn validate_create_dex_pool(
  treasury_in_datum: TreasuryDatum,
  treasury_output: Output,
  validity_range: ValidityRange,
  mint_value: Value,
  amm_pool_datum: PoolDatum,
) -> Bool {
  let TreasuryDatum {
    seller_count,
    collected_fund,
    base_asset,
    raise_asset,
    end_time,
    minimum_raise,
    maximum_raise,
    reserve_base,
    reserve_raise,
    total_penalty,
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
  expect and {
      start_valid_time_range > end_time,
      collected_fund == final_reserve_raise,
      seller_count == 0,
      when minimum_raise is {
        Some(minn) -> final_reserve_raise >= minn
        None -> True
      },
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
  expect and {
      value.quantity_of(
        mint_value,
        amm_authen_policy_id,
        amm_pool_auth_asset_name,
      ) == 1,
      asset_a == pool_asset_a,
      asset_b == pool_asset_b,
      datum_in_reserve_a == pool_reserve_a,
      datum_in_reserve_b == pool_reserve_b,
    }
  let lp_asset_name =
    utils.compute_lp_asset_name(
      asset_a_policy_id,
      asset_a_asset_name,
      asset_b_policy_id,
      asset_b_asset_name,
    )
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

pub fn has_spend_seller(
  inputs: List<Input>,
  treasury_policy_id: PolicyId,
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
          value.quantity_of(in_value, treasury_policy_id, seller_auth_an) == 1,
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
  treasury_policy_id: PolicyId,
  seller_hash: ValidatorHash,
) -> List<Input> {
  list.filter(
    inputs,
    fn(input) {
      let Input { output: Output { address: in_addr, value: in_value, .. }, .. } =
        input
      let Address { payment_credential, .. } = in_addr
      and {
        value.quantity_of(in_value, treasury_policy_id, seller_auth_an) == 1,
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

pub fn get_treasury_ref_input_datum(
  reference_inputs: List<Input>,
  authen_policy_id: PolicyId,
  treasury_hash: ValidatorHash,
) -> TreasuryDatum {
  expect [treasury_ref_input] =
    list.filter(
      reference_inputs,
      fn(input) {
        let Input {
          output: Output {
            address: Address { payment_credential, .. },
            value: out_value,
            ..
          },
          ..
        } = input
        and {
          value.quantity_of(out_value, authen_policy_id, treasury_auth_an) == 1,
          payment_credential == ScriptCredential(treasury_hash),
        }
      },
    )
  expect Input {
    output: Output { datum: InlineDatum(raw_treasury_datum), .. },
    ..
  } = treasury_ref_input
  expect treasury_datum: TreasuryDatum = raw_treasury_datum
  treasury_datum
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
  treasury_policy_id: PolicyId,
  seller_hash: ValidatorHash,
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
        value.quantity_of(out_value, treasury_policy_id, seller_auth_an) == 1,
        when payment_credential is {
          ScriptCredential(hash) -> hash == seller_hash
          _ -> False
        },
      }
    },
  )
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

pub fn validate_add_seller(
  add_seller_count: Int,
  treasury_output: Output,
  treasury_in_datum: TreasuryDatum,
  treasury_in_value: Value,
  mint_value: Value,
  treasury_hash: ValidatorHash,
  seller_outputs: List<Output>,
  end_valid_time_range: Int,
) -> Bool {
  let TreasuryDatum { base_asset, raise_asset, seller_count, end_time, .. } =
    treasury_in_datum
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(treasury_out_raw_datum),
    ..
  } = treasury_output
  expect treasury_out_datum: TreasuryDatum = treasury_out_raw_datum
  and {
    // validate time frame
    end_valid_time_range < end_time,
    // validate Mint Amount
    mint_value == get_mint_value_of_add_sellers(treasury_hash, add_seller_count),
    // validate seller outputs
    list.length(seller_outputs) == add_seller_count,
    list.all(
      seller_outputs,
      fn(output) {
        expect Output { datum: InlineDatum(seller_raw_datum), .. } = output
        expect seller_datum: SellerDatum = seller_raw_datum
        let SellerDatum {
          base_asset: s_base_asset,
          raise_asset: s_raise_asset,
          amount: s_amount,
          penalty_amount: s_penalty_amount,
        } = seller_datum
        and {
          s_base_asset == base_asset,
          s_raise_asset == raise_asset,
          s_amount == 0,
          s_penalty_amount == 0,
        }
      },
    ),
    // validate treasury output
    treasury_in_value == treasury_out_value,
    treasury_out_datum == TreasuryDatum {
      ..treasury_in_datum,
      seller_count: seller_count + add_seller_count,
    },
  }
}

pub fn validate_collect_seller(
  collect_seller_count: Int,
  treasury_output: Output,
  treasury_in_datum: TreasuryDatum,
  treasury_in_value: Value,
  seller_inputs: List<Input>,
  start_valid_time_range: Int,
  mint_value: Value,
  treasury_hash: ValidatorHash,
) -> Bool {
  let TreasuryDatum {
    base_asset,
    raise_asset,
    seller_count,
    end_time,
    reserve_raise: in_reserve_raise,
    total_penalty: in_total_penalty,
    ..
  } = treasury_in_datum
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(treasury_out_raw_datum),
    ..
  } = treasury_output
  expect treasury_out_datum: TreasuryDatum = treasury_out_raw_datum
  // Apply sellers
  expect [reserve_raise, total_penalty] =
    list.foldl(
      seller_inputs,
      [0, 0],
      fn(seller_input, acc) {
        expect [acc_reserve_raise, acc_total_penalty] = acc
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
        [acc_reserve_raise + amount, acc_total_penalty + penalty_amount]
      },
    )
  let new_treasury_value =
    value.add(
      treasury_in_value,
      raise_asset.policy_id,
      raise_asset.asset_name,
      reserve_raise + total_penalty,
    )
  and {
    // validate time frame
    start_valid_time_range > end_time,
    // validate Mint Amount
    mint_value == get_mint_value_of_collect_sellers(
      treasury_hash,
      collect_seller_count,
    ),
    // validate Seller Inputs
    list.length(seller_inputs) == collect_seller_count,
    // validate treasury output
    treasury_out_value == new_treasury_value,
    treasury_out_datum == TreasuryDatum {
      ..treasury_in_datum,
      seller_count: seller_count - collect_seller_count,
      reserve_raise: in_reserve_raise + reserve_raise,
      total_penalty: in_total_penalty + total_penalty,
    },
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
        expect Address {
          payment_credential: VerificationKeyCredential(pub_key_hash),
          ..
        } = owner
        let expected_order =
          get_order_value(
            amount: amount,
            penalty_amount: penalty_amount,
            seller_policy_id: seller_hash,
            raise_asset: raise_asset,
          )
        // validate orders
        expect and {
            list.has(extra_signatories, pub_key_hash),
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
          owner,
        }: OrderDatum = raw_o_datum
        expect Address {
          payment_credential: VerificationKeyCredential(pub_key_hash),
          ..
        } = owner
        let expected_order =
          get_order_value(
            amount: amount,
            penalty_amount: penalty_amount,
            seller_policy_id: seller_hash,
            raise_asset: raise_asset,
          )
        // validate orders
        expect and {
            list.has(extra_signatories, pub_key_hash),
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
// pub fn validate_collect_order(
//   order_inputs: List<Input>,
//   order_outputs: List<Output>,
//   treasury_output: Output,
//   treasury_in_datum: TreasuryDatum,
//   treasury_in_value: Value,
//   mint_value: Value,
// ) -> Bool {
//   // 1. validate orders. 
//   //    - order_in_count == order_out_count
//   //    - each order validate
//   //      - order datum 
//   //        - order_in.is_collected = False
//   //        - order_out.is_collected = True
//   //        - other field: no change
//   //      - order value
//   //        - value_out =  value_in - (raise_asset, amount+penalty) - fee_ada
//   // 2. validate treasury
//   //    - treasury_datum
//   //      - reserve_raise: 
//   //            datum_out.reserve_raise = datum_in.reserve_raise + (total_raise + total_penalty)
//   //      - total_penalty: 
//   //            datum_out.total_penalty = datum_in.total_penalty + total_penalty
//   //      - other field: nothing change
//   //    - treasury_value: t_value_out = t_value_in + (raise_asset, total_raise + total_penalty)
//   // 3. validate time range
//   //    - datum.end_time < start_valid_time_range
//   // 4. no seller
//   //    - datum.seller_count == 0
//   // 5. Mint nothing
//   todo
// }
