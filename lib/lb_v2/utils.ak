use aiken/builtin
use aiken/bytearray
use aiken/dict
use aiken/hash
use aiken/transaction.{Datum, DatumHash, InlineDatum, NoDatum}
use aiken/transaction/value.{AssetName, PolicyId}
use lb_v2/types.{Asset, DatumMap, FactoryDatum, TreasuryDatum}

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

pub fn must_parse_option(op: Option<a>) -> a {
  expect Some(t) = op
  t
}

pub fn must_find_factory_datum(datums: DatumMap, datum: Datum) -> FactoryDatum {
  expect factory_datum: FactoryDatum = must_find_script_datum(datums, datum)
  factory_datum
}

pub fn must_find_script_datum(datums: DatumMap, datum: Datum) -> Data {
  let datum_opt = find_script_datum(datums, datum)
  must_parse_option(datum_opt)
}

pub fn find_script_datum(datums: DatumMap, datum: Datum) -> Option<Data> {
  when datum is {
    NoDatum -> None
    DatumHash(dh) ->
      datums
        |> dict.get(dh)
    InlineDatum(dat) -> Some(dat)
  }
}

pub fn must_find_treasury_datum(datums: DatumMap, datum: Datum) -> TreasuryDatum {
  expect pool_datum: TreasuryDatum = must_find_script_datum(datums, datum)
  pool_datum
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
