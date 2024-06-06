use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/list
use aiken/transaction.{InlineDatum, Output, ValidityRange}
use aiken/transaction/value.{PolicyId, Value, ada_asset_name, ada_policy_id}
use lb_v2/types.{Asset, PenaltyConfig, PoolDatum, TreasuryDatum, ValidatorHash}
use lb_v2/utils.{
  amm_authen_policy_id, amm_factory_auth_asset_name, amm_pool_auth_asset_name,
  default_burn_liquidity, treasury_auth_an, treasury_minimum_ada, two_day_ms,
}

pub fn validate_creating_treasury_out(
  treasury_out: Output,
  base_asset: Asset,
  raise_asset: Asset,
  manager_hash: ValidatorHash,
  seller_hash: ValidatorHash,
  order_hash: ValidatorHash,
  factory_policy_id: PolicyId,
  end_valid_time_range: Int,
) -> Bool {
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(treasury_out_raw_datum),
    reference_script,
    ..
  } = treasury_out
  expect treasury_out_datum: TreasuryDatum = treasury_out_raw_datum
  let TreasuryDatum {
    factory_policy_id: t_factory_policy_id,
    manager_hash: t_manager_hash,
    seller_hash: t_seller_hash,
    order_hash: t_order_hash,
    collected_fund,
    base_asset: t_base_asset,
    raise_asset: t_raise_asset,
    start_time,
    end_time,
    minimum_order_raise,
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
  let expected_treasury_out_value =
    value.zero()
      |> value.add(factory_policy_id, treasury_auth_an, 1)
      |> value.add(base_asset_pid, base_asset_an, reserve_base)
      |> value.add(ada_policy_id, ada_asset_name, treasury_minimum_ada)
  and {
    // treasury datum
    base_asset != raise_asset,
    base_asset_pid != ada_policy_id,
    base_asset_an != ada_asset_name,
    factory_policy_id == t_factory_policy_id,
    manager_hash == t_manager_hash,
    seller_hash == t_seller_hash,
    order_hash == t_order_hash,
    collected_fund == 0,
    t_base_asset == base_asset,
    t_raise_asset == raise_asset,
    start_time > end_valid_time_range,
    start_time < end_time,
    when minimum_order_raise is {
      Some(min_order) -> min_order > 0
      _ -> True
    },
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
      Some(PenaltyConfig { penalty_start_time, percent }) -> and {
          penalty_start_time > start_time,
          penalty_start_time < end_time,
          // Business requires a maximum penalty period of 2 final days
          penalty_start_time >= end_time - two_day_ms,
          percent > 0,
          // Business requires maximum penalty rate is 25 percent
          percent <= 25,
        }
      _ -> True
    },
    total_penalty == 0,
    is_cancelled == False,
    is_manager_collected == False,
    // treasury value
    treasury_out_value == expected_treasury_out_value,
    // reference_script
    reference_script == None,
  }
}

pub fn validate_create_dex_pool(
  treasury_in_datum: TreasuryDatum,
  treasury_output: Output,
  validity_range: ValidityRange,
  mint_value: Value,
  amm_pool_datum: PoolDatum,
  factory_policy_id: PolicyId,
  project_owner_outputs: List<Output>,
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
  let Asset { policy_id: raise_pid, asset_name: raise_an } = raise_asset
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
  let total_lbe_lp = pool_total_liquidity - default_burn_liquidity
  let expected_owner_lp_outputs = total_lbe_lp / 2
  let treasury_lp_amount = total_lbe_lp - expected_owner_lp_outputs
  expect treasury_out_datum: TreasuryDatum = treasury_out_datum_raw
  let owner_lp_amount =
    list.foldl(
      project_owner_outputs,
      0,
      fn(output, acc) {
        let Output { value, .. } = output
        acc + value.quantity_of(value, amm_authen_policy_id, lp_asset_name)
      },
    )
  and {
    treasury_out_value == (
      value.zero()
        |> value.add(factory_policy_id, treasury_auth_an, 1)
        |> value.add(ada_policy_id, ada_asset_name, treasury_minimum_ada)
        |> value.add(amm_authen_policy_id, lp_asset_name, treasury_lp_amount)
        |> value.add(raise_pid, raise_an, collected_fund - final_reserve_raise)
    ),
    treasury_out_datum == TreasuryDatum {
      ..treasury_in_datum,
      total_liquidity: treasury_lp_amount,
    },
    owner_lp_amount == expected_owner_lp_outputs,
  }
}
