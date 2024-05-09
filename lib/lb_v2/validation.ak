use aiken/transaction/value.{PolicyId, Value}
use lb_v2/types.{
  Asset, CreateTreasury, FactoryStep, Living, PenaltyConfig, RemoveTreasury,
  TreasuryDatum, ValidatorHash,
}
use lb_v2/utils.{
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
    status,
    base_asset: t_base_asset,
    raise_asset: t_raise_asset,
    discovery_start_time,
    discovery_end_time,
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
    status == Living,
    t_base_asset == base_asset,
    t_raise_asset == raise_asset,
    base_asset != raise_asset,
    value.without_lovelace(treasury_out_value) == expected_treasury_out_value,
    discovery_start_time > 0,
    discovery_start_time < discovery_end_time,
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
          penalty_start_time >= discovery_start_time,
          penalty_end_time > penalty_start_time,
          penalty_end_time <= discovery_end_time,
          percent > 0,
          percent < 100,
        }
      _ -> True
    },
    total_penalty == 0,
  }
}
