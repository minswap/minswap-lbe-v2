use aiken/builtin
use aiken/bytearray
use aiken/dict
use aiken/hash
use aiken/transaction.{Datum, DatumHash, InlineDatum, NoDatum}
use aiken/transaction/value.{
  AssetName, PolicyId, Value, ada_asset_name, ada_policy_id,
}
use lb_v2/types.{Asset, DatumMap}

/// IMPORTANT: This block is code-gen. Please do not edit!
/// *******************************************
pub const amm_pool_auth_asset_name = #"4d5350"

pub const amm_authen_policy_id =
  #"de7c3d0ebf7e841678ae7d90467f4c12a34ded85cc876a6af5d25337"

pub const amm_pool_validation_hash =
  #"9eb0bf0d627d18a1a0ad751e8ecc004a58c58da05c44c212220eb420"

pub const default_burn_liquidity = 10

/// *******************************************
pub const treasury_auth_an = #"4d5350"

pub const factory_auth_an = #"4d53"

pub fn list_at_index(outputs: List<a>, payout_outputs_offset: Int) -> a {
  if payout_outputs_offset >= 10 {
    outputs
      |> skip_10_items
      |> list_at_index(payout_outputs_offset - 10)
  } else {
    list_at_index_step(outputs, payout_outputs_offset)
  }
}

fn list_at_index_step(outputs: List<a>, current_index: Int) -> a {
  if current_index <= 0 {
    expect [output, ..] = outputs
    output
  } else {
    outputs
      |> builtin.tail_list
      |> list_at_index_step(current_index - 1)
  }
}

/// Small utility to skip 10 items in a list.
/// Used by `list_at_index`.
pub fn skip_10_items(some_list: List<a>) -> List<a> {
  some_list
    |> builtin.tail_list
    |> builtin.tail_list
    |> builtin.tail_list
    |> builtin.tail_list
    |> builtin.tail_list
    |> builtin.tail_list
    |> builtin.tail_list
    |> builtin.tail_list
    |> builtin.tail_list
    |> builtin.tail_list
}

pub fn must_find_script_datum(datums: DatumMap, datum: Datum) -> Data {
  let datum_opt =
    when datum is {
      NoDatum -> None
      DatumHash(dh) ->
        datums
          |> dict.get(dh)
      InlineDatum(dat) -> Some(dat)
    }
  expect Some(datum) = datum_opt
  datum
}

pub fn quantity_of_asset(value: Value, asset: Asset) {
  let Asset { policy_id, asset_name } = asset
  value.quantity_of(value, policy_id, asset_name)
}

pub fn sorted_asset(asset_a: Asset, asset_b: Asset) -> Bool {
  let Asset { policy_id: asset_a_policy_id, asset_name: asset_a_asset_name } =
    asset_a
  let Asset { policy_id: asset_b_policy_id, asset_name: asset_b_asset_name } =
    asset_b
  if asset_a_policy_id == asset_b_policy_id {
    builtin.less_than_bytearray(asset_a_asset_name, asset_b_asset_name)
  } else {
    builtin.less_than_bytearray(asset_a_policy_id, asset_b_policy_id)
  }
}

pub fn sort_two_assets(asset_a: Asset, asset_b: Asset) -> (Asset, Asset) {
  let Asset { policy_id: asset_a_policy_id, asset_name: asset_a_asset_name } =
    asset_a
  let Asset { policy_id: asset_b_policy_id, asset_name: asset_b_asset_name } =
    asset_b
  if asset_a_policy_id == asset_b_policy_id {
    if builtin.less_than_bytearray(asset_a_asset_name, asset_b_asset_name) {
      (asset_a, asset_b)
    } else {
      (asset_b, asset_a)
    }
  } else {
    if builtin.less_than_bytearray(asset_a_policy_id, asset_b_policy_id) {
      (asset_a, asset_b)
    } else {
      (asset_b, asset_a)
    }
  }
}

test sort_two_assets_1() {
  let asset_a = Asset { policy_id: #"00", asset_name: #"01" }
  let asset_b = Asset { policy_id: #"00", asset_name: #"02" }
  let (a1, a2) = sort_two_assets(asset_a, asset_b)
  and {
    a1 == asset_a,
    a2 == asset_b,
  }
}

test sort_two_assets_2() {
  let asset_a = Asset { policy_id: #"00", asset_name: #"05" }
  let asset_b = Asset { policy_id: #"00", asset_name: #"02" }
  let (a1, a2) = sort_two_assets(asset_a, asset_b)
  and {
    a1 == asset_b,
    a2 == asset_a,
  }
}

test sort_two_assets_3() {
  let asset_a = Asset { policy_id: #"01", asset_name: #"05" }
  let asset_b = Asset { policy_id: #"00", asset_name: #"02" }
  let (a1, a2) = sort_two_assets(asset_a, asset_b)
  and {
    a1 == asset_b,
    a2 == asset_a,
  }
}

test sort_two_assets_4() {
  let asset_a = Asset { policy_id: #"01", asset_name: #"00" }
  let asset_b = Asset { policy_id: #"05", asset_name: #"02" }
  let (a1, a2) = sort_two_assets(asset_a, asset_b)
  and {
    a1 == asset_a,
    a2 == asset_b,
  }
}

pub fn compute_lp_asset_name(
  asset_a_policy_id: PolicyId,
  asset_a_asset_name: AssetName,
  asset_b_policy_id: PolicyId,
  asset_b_asset_name: AssetName,
) -> AssetName {
  let asset_a_ident =
    hash.sha3_256(bytearray.concat(asset_a_policy_id, asset_a_asset_name))
  let asset_b_ident =
    hash.sha3_256(bytearray.concat(asset_b_policy_id, asset_b_asset_name))
  let pair_ident = bytearray.concat(asset_a_ident, asset_b_ident)
  hash.sha3_256(pair_ident)
}

pub fn compare_list_length(arr1: List<a>, arr2: List<b>) -> Bool {
  when arr1 is {
    [] -> arr2 == []
    _ ->
      when arr2 is {
        [] -> False
        _ ->
          compare_list_length(
            arr1 |> builtin.tail_list,
            arr2 |> builtin.tail_list,
          )
      }
  }
}

pub fn is_ada_asset(pid: PolicyId, name: AssetName) -> Bool {
  pid == ada_policy_id && name == ada_asset_name
}
