// use aiken/builtin
// use aiken/bytearray
// use aiken/dict
// use aiken/hash
// use aiken/transaction.{Datum, DatumHash, InlineDatum, NoDatum}
// use aiken/transaction/value.{
//   AssetName, PolicyId, Value, ada_asset_name, ada_policy_id,
// }
// use lb_v2/types.{
//   AmmPoolDatum, Asset, DatumMap, FactoryDatum, OrderDatum, TreasuryDatum,
// }

// pub fn list_at_index(outputs: List<a>, payout_outputs_offset: Int) -> a {
//   if payout_outputs_offset >= 10 {
//     outputs
//       |> skip_10_items
//       |> list_at_index(payout_outputs_offset - 10)
//   } else {
//     list_at_index_step(outputs, payout_outputs_offset)
//   }
// }

// fn list_at_index_step(outputs: List<a>, current_index: Int) -> a {
//   if current_index <= 0 {
//     expect [output, ..] = outputs
//     output
//   } else {
//     outputs
//       |> builtin.tail_list
//       |> list_at_index_step(current_index - 1)
//   }
// }

// /// Small utility to skip 10 items in a list.
// /// Used by `list_at_index`.
// pub fn skip_10_items(some_list: List<a>) -> List<a> {
//   some_list
//     |> builtin.tail_list
//     |> builtin.tail_list
//     |> builtin.tail_list
//     |> builtin.tail_list
//     |> builtin.tail_list
//     |> builtin.tail_list
//     |> builtin.tail_list
//     |> builtin.tail_list
//     |> builtin.tail_list
//     |> builtin.tail_list
// }

// pub fn must_parse_option(op: Option<a>) -> a {
//   expect Some(t) = op
//   t
// }

// pub fn must_find_factory_datum(datums: DatumMap, datum: Datum) -> FactoryDatum {
//   expect factory_datum: FactoryDatum = must_find_script_datum(datums, datum)
//   factory_datum
// }

// pub fn must_find_script_datum(datums: DatumMap, datum: Datum) -> Data {
//   let datum_opt = find_script_datum(datums, datum)
//   must_parse_option(datum_opt)
// }

// pub fn find_script_datum(datums: DatumMap, datum: Datum) -> Option<Data> {
//   when datum is {
//     NoDatum -> None
//     DatumHash(dh) ->
//       datums
//         |> dict.get(dh)
//     InlineDatum(dat) -> Some(dat)
//   }
// }

// pub fn must_find_treasury_datum(datums: DatumMap, datum: Datum) -> TreasuryDatum {
//   expect pool_datum: TreasuryDatum = must_find_script_datum(datums, datum)
//   pool_datum
// }

// pub fn must_find_amm_pool_datum(datums: DatumMap, datum: Datum) -> AmmPoolDatum {
//   expect amm_pool_datum: AmmPoolDatum = must_find_script_datum(datums, datum)
//   amm_pool_datum
// }

// pub fn must_find_order_datum(datums: DatumMap, datum: Datum) -> OrderDatum {
//   expect order_datum: OrderDatum = must_find_script_datum(datums, datum)
//   order_datum
// }

// pub fn quantity_of_asset(value: Value, asset: Asset) {
//   let Asset { policy_id, asset_name } = asset
//   value.quantity_of(value, policy_id, asset_name)
// }

// pub fn sorted_asset(asset_a: Asset, asset_b: Asset) -> Bool {
//   let Asset { policy_id: asset_a_policy_id, asset_name: asset_a_asset_name } =
//     asset_a
//   let Asset { policy_id: asset_b_policy_id, asset_name: asset_b_asset_name } =
//     asset_b
//   if asset_a_policy_id == asset_b_policy_id {
//     builtin.less_than_bytearray(asset_a_asset_name, asset_b_asset_name)
//   } else {
//     builtin.less_than_bytearray(asset_a_policy_id, asset_b_policy_id)
//   }
// }

// pub fn compute_lp_asset_name(
//   asset_a_policy_id: PolicyId,
//   asset_a_asset_name: AssetName,
//   asset_b_policy_id: PolicyId,
//   asset_b_asset_name: AssetName,
// ) -> AssetName {
//   let asset_a_ident =
//     hash.sha3_256(bytearray.concat(asset_a_policy_id, asset_a_asset_name))
//   let asset_b_ident =
//     hash.sha3_256(bytearray.concat(asset_b_policy_id, asset_b_asset_name))
//   let pair_ident = bytearray.concat(asset_a_ident, asset_b_ident)
//   hash.sha3_256(pair_ident)
// }

// pub fn compare_list_length(arr1: List<a>, arr2: List<b>) -> Bool {
//   when arr1 is {
//     [] -> arr2 == []
//     _ ->
//       when arr2 is {
//         [] -> False
//         _ ->
//           compare_list_length(
//             arr1 |> builtin.tail_list,
//             arr2 |> builtin.tail_list,
//           )
//       }
//   }
// }

// pub fn is_ada_asset(pid: PolicyId, name: AssetName) -> Bool {
//   pid == ada_policy_id && name == ada_asset_name
// }
