use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/transaction.{InlineDatum, Output, ValidityRange}
use aiken/transaction/value.{PolicyId, Value}
use lb_v2/types.{
  Asset, CreateTreasury, FactoryStep, PenaltyConfig, PoolDatum, RemoveTreasury,
  TreasuryDatum, ValidatorHash,
}
use lb_v2/utils.{
  amm_authen_policy_id, amm_pool_auth_asset_name, default_burn_liquidity,
  default_number_seller, factory_auth_an, seller_auth_an, treasury_auth_an,
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
