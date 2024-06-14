use aiken/builtin
use aiken/dict
use aiken/hash
use aiken/transaction.{InlineDatum, Output}
use aiken/transaction/value.{
  AssetName, PolicyId, Value, ada_asset_name, ada_policy_id,
}
use lb_v2/types.{
  Asset, CustomDatumHash, DatumMap, PenaltyConfig, PoolDatum, TreasuryDatum,
  ValidatorHash,
}
use lb_v2/utils.{
  amm_authen_policy_id, amm_factory_auth_asset_name, amm_pool_auth_asset_name,
  create_pool_comission, default_burn_liquidity, max_base_fee_numerator,
  max_penalty, min_base_fee_numerator, min_pool_allocation, treasury_auth_an,
  treasury_minimum_ada, two_day_ms,
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
  datums: DatumMap,
) -> Bool {
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(treasury_out_raw_datum),
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
    receiver_datum_hash,
    pool_allocation,
    minimum_order_raise,
    minimum_raise,
    maximum_raise,
    reserve_base,
    reserve_raise,
    total_liquidity,
    penalty_config,
    pool_base_fee,
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
      |> value.add(
          ada_policy_id,
          ada_asset_name,
          treasury_minimum_ada + create_pool_comission,
        )
  and {
    // treasury datum
    base_asset != raise_asset,
    base_asset != Asset { policy_id: ada_policy_id, asset_name: ada_asset_name },
    factory_policy_id == t_factory_policy_id,
    manager_hash == t_manager_hash,
    seller_hash == t_seller_hash,
    order_hash == t_order_hash,
    collected_fund == 0,
    t_base_asset == base_asset,
    t_raise_asset == raise_asset,
    start_time > end_valid_time_range,
    start_time < end_time,
    // Make sure that datum with datum_hash has appeared on the blockchain, \
    // later we can use methods such as db_sync, kupo to rebuild the datum.
    when receiver_datum_hash is {
      Some(datum_hash) -> dict.has_key(datums, datum_hash)
      _ -> True
    },
    pool_allocation >= min_pool_allocation,
    pool_allocation <= 100,
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
          percent <= max_penalty,
        }
      _ -> True
    },
    min_base_fee_numerator <= pool_base_fee,
    pool_base_fee <= max_base_fee_numerator,
    total_penalty == 0,
    is_cancelled == False,
    is_manager_collected == False,
    // treasury value
    treasury_out_value == expected_treasury_out_value,
  }
}

// Assertion:
// - Not cancelled yet
// - Collected all orders
// - 1 Treasury Input
// - 1 Legit Treasury Output
// - 1 Legit AMM Pool Output
// - Exactly Minting Value
// - validate owner Outputs
pub fn validate_create_dex_pool(
  treasury_in_datum: TreasuryDatum,
  treasury_output: Output,
  mint_value: Value,
  amm_pool_datum: PoolDatum,
  factory_policy_id: PolicyId,
  receiver_output: Output,
) -> Bool {
  let TreasuryDatum {
    collected_fund,
    base_asset,
    raise_asset,
    receiver,
    receiver_datum_hash,
    pool_allocation,
    minimum_raise,
    maximum_raise,
    reserve_base,
    reserve_raise,
    total_penalty,
    is_cancelled,
    is_manager_collected,
    pool_base_fee,
    ..
  } = treasury_in_datum
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
      // - Not cancelled yet
      is_cancelled == False,
      // - All Order have been collected.
      collected_fund == reserve_raise + total_penalty,
      // Manager, Sellers have been collected.
      is_manager_collected == True,
      when minimum_raise is {
        Some(minn) -> final_reserve_raise >= minn
        None -> True
      },
    }
  let (asset_a, asset_b) = utils.sort_two_assets(base_asset, raise_asset)
  let (lbe_reserve_a, lbe_reserve_b) =
    when asset_a == base_asset is {
      True -> (reserve_base, final_reserve_raise)
      False -> (final_reserve_raise, reserve_base)
    }
  let PoolDatum {
    asset_a: pool_asset_a,
    asset_b: pool_asset_b,
    reserve_a: pool_reserve_a,
    reserve_b: pool_reserve_b,
    base_fee_a_numerator,
    total_liquidity: pool_total_liquidity,
    ..
  } = amm_pool_datum
  let (
    expected_datum_reserve_a,
    expected_datum_reserve_b,
    treasury_lp_amount,
    expected_receiver_value,
    lp_asset_name,
  ) =
    calculate_allocation(
      lbe_reserve_a: lbe_reserve_a,
      lbe_reserve_b: lbe_reserve_b,
      pool_allocation: pool_allocation,
      pool_total_liquidity: pool_total_liquidity,
      asset_a: asset_a,
      asset_b: asset_b,
      amm_authen_policy_id: amm_authen_policy_id,
    )
  expect and {
      // only mint AMM tokens related.
      mint_value == (
        value.zero()
          |> value.add(amm_authen_policy_id, amm_factory_auth_asset_name, 1)
          |> value.add(amm_authen_policy_id, amm_pool_auth_asset_name, 1)
          |> value.add(amm_authen_policy_id, lp_asset_name, 9223372036854775807)
      ),
      // create pool with correct asset_a, asset_b
      asset_a == pool_asset_a,
      asset_b == pool_asset_b,
      // create pool with correct reserve
      pool_reserve_a == expected_datum_reserve_a,
      pool_reserve_b == expected_datum_reserve_b,
      // create pool with Base Fee correctly!
      pool_base_fee == base_fee_a_numerator,
    }
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(treasury_out_datum_raw),
    ..
  } = treasury_output
  expect treasury_out_datum: TreasuryDatum = treasury_out_datum_raw
  let Output {
    value: receiver_value,
    datum: receiver_datum,
    address: receiver_address_out,
    ..
  } = receiver_output
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
    value.without_lovelace(expected_receiver_value) == value.without_lovelace(
      receiver_value,
    ),
    value.lovelace_of(expected_receiver_value) <= value.lovelace_of(
      receiver_value,
    ),
    when receiver_datum_hash is {
      Some(datum_hash) -> {
        expect InlineDatum(receiver_datum_raw) = receiver_datum
        let out_datum_hash: CustomDatumHash =
          receiver_datum_raw
            |> builtin.serialise_data
            |> hash.blake2b_256
        out_datum_hash == datum_hash
      }
      _ -> True
    },
    receiver_address_out == receiver,
  }
}

// return (
//   Allocation Data:
//   - pool datum reserve a 
//   - pool datum reserve b
//   - lp asset amount for treasury(to distrubute to users)
//   - receiver value
//   Bonus data
//   - lp asset name(calculating lp an in this function is more convenient)
// )
pub fn calculate_allocation(
  lbe_reserve_a: Int,
  lbe_reserve_b: Int,
  pool_allocation: Int,
  pool_total_liquidity: Int,
  asset_a: Asset,
  asset_b: Asset,
  amm_authen_policy_id: PolicyId,
) -> (Int, Int, Int, Value, AssetName) {
  let datum_reserve_a = lbe_reserve_a * pool_allocation / 100
  let datum_reserve_b = lbe_reserve_b * pool_allocation / 100

  let Asset(asset_a_pid, asset_a_tn) = asset_a
  let Asset(asset_b_pid, asset_b_tn) = asset_b

  let lp_asset_name =
    utils.compute_lp_asset_name(
      asset_a_pid,
      asset_a_tn,
      asset_b_pid,
      asset_b_tn,
    )
  let total_lbe_lp = pool_total_liquidity - default_burn_liquidity
  let expected_receiver_lp_tokens =
    total_lbe_lp * ( pool_allocation - 50 ) / pool_allocation
  let treasury_lp_amount = total_lbe_lp - expected_receiver_lp_tokens

  let expected_receiver_value =
    value.from_asset(asset_a_pid, asset_a_tn, lbe_reserve_a - datum_reserve_a)
      |> value.add(asset_b_pid, asset_b_tn, lbe_reserve_b - datum_reserve_b)
      |> value.add(
          amm_authen_policy_id,
          lp_asset_name,
          expected_receiver_lp_tokens,
        )
  (
    datum_reserve_a,
    datum_reserve_b,
    treasury_lp_amount,
    expected_receiver_value,
    lp_asset_name,
  )
}
