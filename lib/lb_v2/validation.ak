// use aiken/builtin
// use aiken/bytearray
// use aiken/cbor
// use aiken/dict
// use aiken/interval.{Finite, Interval, IntervalBound}
// use aiken/list
// use aiken/math
// use aiken/transaction.{
//   Input, Mint, Output, OutputReference, ScriptContext, Spend, Transaction,
//   ValidityRange,
// }
// use aiken/transaction/credential.{Address, ScriptCredential}
// use aiken/transaction/value.{
//   AssetName, PolicyId, Value, ada_asset_name, ada_policy_id, quantity_of,
// }
// use lb_v2/types.{
//   Asset, AuthenRedeemer, CreateTreasury, DatumMap, Deposit, FactoryDatum,
//   FactoryRedeemer, MintFactoryAuthen, OrderDatum, PoolDatum, RedeemLP,
//   RedeemRaiseAsset, TreasuryDatum, ValidatorHash,
// }
// use lb_v2/utils

// pub fn validate_authen(
//   out_ref: OutputReference,
//   factory_auth_an: AssetName,
//   treasury_auth_an: AssetName,
//   redeemer: AuthenRedeemer,
//   context: ScriptContext,
// ) -> Bool {
//   let ScriptContext { transaction, purpose } = context
//   expect Mint(authen_policy_id) = purpose
//   when redeemer is {
//     MintFactoryAuthen -> {
//       let Transaction { inputs, mint, outputs, datums, .. } = transaction

//       // Transaction must has @out_ref in the input to make sure that this redeemer can only be executed once
//       expect
//         list.any(
//           inputs,
//           fn(input) {
//             let Input { output_reference, .. } = input
//             output_reference == out_ref
//           },
//         )
//       let mint_value = value.from_minted_value(mint)
//       expect [(minted_pid, minted_an, minted_amount)] =
//         value.flatten(mint_value)
//       // Transaction must mint only 1 Factory Auth Asset
//       expect and {
//           minted_pid == authen_policy_id,
//           minted_an == factory_auth_an,
//           minted_amount == 1,
//         }
//       expect [factory_output] =
//         list.filter(
//           outputs,
//           fn(output) {
//             let Output { value: out_value, .. } = output
//             value.quantity_of(out_value, authen_policy_id, factory_auth_an) == 1
//           },
//         )
//       let Output { datum: factory_raw_datum, .. } = factory_output
//       let FactoryDatum { head, tail } =
//         utils.must_find_factory_datum(datums, factory_raw_datum)
//       and {
//         head == #"00",
//         tail == #"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
//       }
//     }
//     CreateTreasury -> {
//       let Transaction { inputs, mint, redeemers, .. } = transaction
//       // validate that there's a single Factory UTxO in the Transaction Inputs. 
//       // Factory UTxO must contain Factory NFT Token in the value
//       expect [factory_input] =
//         list.filter(
//           inputs,
//           fn(input) {
//             let Input { output, .. } = input
//             let Output { value: out_value, .. } = output
//             value.quantity_of(out_value, authen_policy_id, factory_auth_an) == 1
//           },
//         )
//       let Input { output_reference: factory_input_ref, .. } = factory_input
//       let redeemer_list = dict.to_list(redeemers)
//       expect [(_, raw_factory_redeemer)] =
//         list.filter(
//           redeemer_list,
//           fn(r) {
//             let (p, _) = r
//             when p is {
//               Spend(ref) -> factory_input_ref == ref
//               _ -> False
//             }
//           },
//         )
//       expect factory_redeemer: FactoryRedeemer = raw_factory_redeemer
//       let FactoryRedeemer { asset_a, asset_b } = factory_redeemer
//       let Asset { policy_id: asset_a_policy_id, asset_name: asset_a_asset_name } =
//         asset_a
//       let Asset { policy_id: asset_b_policy_id, asset_name: asset_b_asset_name } =
//         asset_b
//       expect utils.sorted_asset(asset_a, asset_b)
//       let lp_asset_name =
//         utils.compute_lp_asset_name(
//           asset_a_policy_id,
//           asset_a_asset_name,
//           asset_b_policy_id,
//           asset_b_asset_name,
//         )
//       value.from_minted_value(mint) == get_treasury_creation_expected_mint(
//         authen_policy_id: authen_policy_id,
//         factory_auth_an: factory_auth_an,
//         treasury_auth_an: treasury_auth_an,
//         lp_asset_name: lp_asset_name,
//       )
//     }
//   }
// }

// pub fn validate_factory(
//   authen_policy_id: PolicyId,
//   treasury_hash: ValidatorHash,
//   order_hash: ValidatorHash,
//   factory_auth_an: AssetName,
//   treasury_auth_an: AssetName,
//   datum: FactoryDatum,
//   redeemer: FactoryRedeemer,
//   context: ScriptContext,
// ) -> Bool {
//   let ScriptContext { transaction, purpose } = context
//   expect Spend(factory_ref) = purpose
//   let Transaction { inputs, mint, outputs, datums, .. } = transaction
//   let FactoryRedeemer { asset_a, asset_b } = redeemer
//   let FactoryDatum { head: current_head, tail: current_tail } = datum
//   let Asset { policy_id: asset_a_policy_id, asset_name: asset_a_asset_name } =
//     asset_a
//   let Asset { policy_id: asset_b_policy_id, asset_name: asset_b_asset_name } =
//     asset_b
//   // validate that Asset A and Asset B must be sorted
//   expect utils.sorted_asset(asset_a, asset_b)
//   let lp_asset_name =
//     utils.compute_lp_asset_name(
//       asset_a_policy_id,
//       asset_a_asset_name,
//       asset_b_policy_id,
//       asset_b_asset_name,
//     )
//   expect Some(factory_input) =
//     list.find(
//       inputs,
//       fn(input) {
//         let Input { output_reference: out_ref, .. } = input
//         out_ref == factory_ref
//       },
//     )
//   let Input {
//     output: Output { value: factory_input_value, address: factory_address, .. },
//     ..
//   } = factory_input
//   let Address { payment_credential: factory_payment_credential, .. } =
//     factory_address
//   expect [_] =
//     list.filter(
//       inputs,
//       fn(input) {
//         let Input {
//           output: Output {
//             address: Address { payment_credential: payment_cred, .. },
//             ..
//           },
//           ..
//         } = input
//         factory_payment_credential == payment_cred
//       },
//     )
//   // Transaction must have a Factory Asset in the Spending Script
//   expect
//     value.quantity_of(factory_input_value, authen_policy_id, factory_auth_an) == 1
//   expect [factory_output_1, factory_output_2] =
//     list.filter(
//       outputs,
//       fn(output) {
//         let Output { address: out_addr, value: out_value, .. } = output
//         out_addr == factory_address && value.quantity_of(
//           out_value,
//           authen_policy_id,
//           factory_auth_an,
//         ) == 1
//       },
//     )
//   let Output { datum: factory_output_1_raw_datum, .. } = factory_output_1
//   let Output { datum: factory_output_2_raw_datum, .. } = factory_output_2
//   let FactoryDatum { head: new_head_1, tail: new_tail_1 } =
//     utils.must_find_factory_datum(datums, factory_output_1_raw_datum)
//   let FactoryDatum { head: new_head_2, tail: new_tail_2 } =
//     utils.must_find_factory_datum(datums, factory_output_2_raw_datum)
//   // validate that new Factory UTxO datum must be followed by Linked List rule
//   // (old head, old tail) -> (old head, Pool LP Token Name) and (Pool LP Token Name, old tail)
//   // old head < Pool LP Token Name < old tail
//   expect and {
//       builtin.less_than_bytearray(new_head_1, new_tail_1),
//       builtin.less_than_bytearray(new_head_2, new_tail_2),
//       new_head_1 == current_head,
//       new_tail_2 == current_tail,
//       lp_asset_name == new_tail_1,
//       lp_asset_name == new_head_2,
//     }
//   expect [treasury_output] =
//     list.filter(
//       outputs,
//       fn(output) {
//         let Output { address: out_addr, value: out_value, .. } = output
//         let Address { payment_credential: out_addr_payment_credential, .. } =
//           out_addr
//         when out_addr_payment_credential is {
//           ScriptCredential(hash) ->
//             treasury_hash == hash && value.quantity_of(
//               out_value,
//               authen_policy_id,
//               treasury_auth_an,
//             ) == 1
//           _ -> False
//         }
//       },
//     )
//   let Output {
//     value: treasury_output_value,
//     datum: treasury_output_raw_datum,
//     ..
//   } = treasury_output
//   let amount_a =
//     value.quantity_of(
//       treasury_output_value,
//       asset_a_policy_id,
//       asset_a_asset_name,
//     )
//   let TreasuryDatum {
//     asset_a: treasury_datum_asset_a,
//     asset_b: treasury_datum_asset_b,
//     reserve_a: treasury_datum_reserve_a,
//     order_hash: treasury_datum_order_hash,
//     ..
//   } = utils.must_find_treasury_datum(datums, treasury_output_raw_datum)
//   let expected_treasury_out_value =
//     value.zero()
//       |> value.add(ada_policy_id, ada_asset_name, 3000000)
//       |> value.add(authen_policy_id, lp_asset_name, 9223372036854775807)
//       |> value.add(authen_policy_id, treasury_auth_an, 1)
//   and {
//     // asset_a and asset_b must be the same with Factory Redeemer
//     treasury_datum_asset_a == asset_a,
//     treasury_datum_asset_b == asset_b,
//     treasury_datum_reserve_a == amount_a,
//     // Order Hash in Pool Datum must be matched with Order Hash in parameters
//     treasury_datum_order_hash == order_hash,
//     value.from_minted_value(mint) == get_treasury_creation_expected_mint(
//       authen_policy_id: authen_policy_id,
//       factory_auth_an: factory_auth_an,
//       treasury_auth_an: treasury_auth_an,
//       lp_asset_name: lp_asset_name,
//     ),
//     expected_treasury_out_value == treasury_output_value,
//   }
// }

// pub fn validate_create_dex_pool_time(
//   start_time: Int,
//   validity_range: ValidityRange,
// ) -> Bool {
//   let Interval { lower_bound: IntervalBound { bound_type, .. }, .. } =
//     validity_range
//   expect Finite(start_valid_time) = bound_type
//   start_valid_time > start_time
// }

// pub fn get_treasury_creation_expected_mint(
//   authen_policy_id: PolicyId,
//   factory_auth_an: AssetName,
//   treasury_auth_an: AssetName,
//   lp_asset_name: AssetName,
// ) -> Value {
//   value.zero()
//     |> value.add(authen_policy_id, factory_auth_an, 1)
//     |> value.add(authen_policy_id, treasury_auth_an, 1)
//     |> value.add(authen_policy_id, lp_asset_name, 9223372036854775807)
// }

// pub fn get_order_inputs(
//   all_inputs: List<Input>,
//   order_hash: ValidatorHash,
// ) -> List<Input> {
//   list.filter(
//     all_inputs,
//     fn(input) {
//       let Input { output: out, .. } = input
//       let Output { address: addr, .. } = out
//       let Address { payment_credential: payment_cred, .. } = addr
//       when payment_cred is {
//         ScriptCredential(hash) -> hash == order_hash
//         _ -> False
//       }
//     },
//   )
// }

// pub fn get_treasury_input(
//   context: ScriptContext,
//   authen_policy_id: PolicyId,
//   treasury_auth_an: AssetName,
// ) -> Input {
//   expect ScriptContext {
//     transaction: Transaction { inputs, .. },
//     purpose: Spend(self_out_ref),
//   } = context
//   // for sure Authen Token appear
//   expect Some(treasury_input) =
//     list.find(
//       inputs,
//       fn(input) {
//         let Input { output_reference: out_ref, output: Output { value, .. } } =
//           input
//         and {
//           out_ref == self_out_ref,
//           quantity_of(value, authen_policy_id, treasury_auth_an) == 1,
//         }
//       },
//     )
//   let Input {
//     output: Output {
//       address: Address { payment_credential: treasury_payment_credential, .. },
//       ..
//     },
//     ..
//   } = treasury_input
//   // For sure spend only 1 Treasury Input
//   expect [_] =
//     list.filter(
//       inputs,
//       fn(input) {
//         let Input {
//           output: Output {
//             address: Address { payment_credential: payment_cred, .. },
//             ..
//           },
//           ..
//         } = input
//         treasury_payment_credential == payment_cred
//       },
//     )
//   treasury_input
// }

// pub fn get_treasury_output(
//   outputs: List<Output>,
//   treasury_address: Address,
//   authen_policy_id: PolicyId,
//   treasury_auth_an: AssetName,
// ) -> Output {
//   expect [treasury_output] =
//     list.filter(
//       outputs,
//       fn(output) {
//         let Output { address, value, .. } = output
//         expect quantity_of(value, authen_policy_id, treasury_auth_an) == 1
//         address == treasury_address
//       },
//     )
//   treasury_output
// }

// pub fn get_amm_pool_raw_datum(
//   outputs: List<Output>,
//   datums: DatumMap,
//   amm_authen_policy_id: PolicyId,
//   amm_pool_auth_asset_name: AssetName,
//   amm_pool_validation_hash: ValidatorHash,
// ) -> Data {
//   expect [amm_pool_output] =
//     list.filter(
//       outputs,
//       fn(output) {
//         let Output { address: Address { payment_credential, .. }, value, .. } =
//           output
//         expect
//           quantity_of(value, amm_authen_policy_id, amm_pool_auth_asset_name) == 1
//         when payment_credential is {
//           ScriptCredential(hash) -> hash == amm_pool_validation_hash
//           _ -> False
//         }
//       },
//     )
//   let Output { datum, .. } = amm_pool_output
//   utils.must_find_script_datum(datums, datum)
// }

// pub fn validate_create_dex_pool(
//   treasury_in_datum: TreasuryDatum,
//   treasury_out_value: Value,
//   treasury_out_datum: TreasuryDatum,
//   amm_pool_raw_datum: Data,
//   mint_value: Value,
//   amm_authen_policy_id: PolicyId,
//   amm_pool_auth_asset_name: AssetName,
//   validity_range: ValidityRange,
//   all_outputs: List<Output>,
//   all_inputs: List<Input>,
// ) -> Bool {
//   let TreasuryDatum {
//     asset_a: treasury_in_asset_a,
//     asset_b: treasury_in_asset_b,
//     reserve_a: treasury_in_reserve_a,
//     reserve_b: treasury_in_reserve_b,
//     create_pool_time,
//     lp_asset_name,
//     lbe_owner,
//     order_hash,
//     ..
//   } = treasury_in_datum
//   let TreasuryDatum { total_liquidity: treasury_out_total_liquidity, .. } =
//     treasury_out_datum
//   expect amm_pool_datum: PoolDatum = amm_pool_raw_datum
//   let PoolDatum {
//     asset_a: pool_asset_a,
//     asset_b: pool_asset_b,
//     reserve_a: pool_reserve_a,
//     reserve_b: pool_reserve_b,
//     total_liquidity: pool_total_liquidity,
//     ..
//   } = amm_pool_datum
//   expect [Output { value: lbe_owner_value, .. }] =
//     list.filter(
//       all_outputs,
//       fn(output) {
//         let Output { address, .. } = output
//         address == lbe_owner
//       },
//     )
//   and {
//     // for sure it's time to create pool
//     validate_create_dex_pool_time(create_pool_time, validity_range),
//     // for sure mint amm pool auth token
//     quantity_of(mint_value, amm_authen_policy_id, amm_pool_auth_asset_name) == 1,
//     // for sure the same asset_a, asset_b
//     treasury_in_asset_a == pool_asset_a,
//     treasury_in_asset_b == pool_asset_b,
//     // for sure the same reserve_a, reserve_b
//     treasury_in_reserve_a == pool_reserve_a,
//     treasury_in_reserve_b == pool_reserve_b,
//     // for sure 50% quantity LP Asset for treasury output
//     quantity_of(treasury_out_value, amm_authen_policy_id, lp_asset_name) == treasury_out_total_liquidity,
//     math.abs(
//       treasury_out_total_liquidity + treasury_out_total_liquidity - pool_total_liquidity,
//     ) <= 1,
//     // for sure 50% quantity LP Asset for lbe's owner
//     quantity_of(lbe_owner_value, amm_authen_policy_id, lp_asset_name) == pool_total_liquidity - treasury_out_total_liquidity,
//     // for sure treasury output datum
//     treasury_out_datum == TreasuryDatum {
//       ..treasury_in_datum,
//       total_liquidity: treasury_out_total_liquidity,
//     },
//     // for sure no order's input
//     get_order_inputs(all_inputs, order_hash) |> builtin.null_list,
//   }
// }

// fn validate_order(
//   order_input: Input,
//   order_output: Output,
//   datums: DatumMap,
// ) -> Bool {
//   let Input { output: Output { datum: in_datum_raw, .. }, .. } = order_input
//   let Output { value: out_value, address: out_address, .. } = order_output
//   let OrderDatum { owner, expect_output_asset, minimum_receive, .. } =
//     utils.must_find_order_datum(datums, in_datum_raw)
//   and {
//     // for sure output to owner
//     out_address == owner,
//     // for sure output has correct value
//     utils.quantity_of_asset(out_value, expect_output_asset) == minimum_receive,
//   }
// }

// fn apply_orders(
//   order_inputs: List<Input>,
//   order_outputs: List<Output>,
//   datums: DatumMap,
// ) -> Bool {
//   when order_inputs is {
//     [] ->
//       when order_outputs is {
//         [] -> True
//         _ -> False
//       }
//     [input, ..inputs] ->
//       when order_outputs is {
//         [] -> fail
//         [output, ..outputs] ->
//           validate_order(input, output, datums) && apply_orders(
//             inputs,
//             outputs,
//             datums,
//           )
//       }
//   }
// }

// pub fn validate_order_time(
//   start_time: Int,
//   end_time: Int,
//   validity_range: ValidityRange,
//   order_datums: List<OrderDatum>,
// ) -> Bool {
//   let Interval {
//     lower_bound: IntervalBound { bound_type: lower_bound_type, .. },
//     upper_bound: IntervalBound { bound_type: upper_bound_type, .. },
//   } = validity_range
//   expect Finite(start_valid_time_range) = lower_bound_type
//   expect Finite(end_valid_time_range) = upper_bound_type
//   list.map(
//     order_datums,
//     fn(od) {
//       let OrderDatum { step, .. } = od
//       step
//     },
//   )
//     |> list.unique
//     |> list.reduce(True, fn(acc, step) { and {
//              acc,
//              when step is {
//                RedeemLP -> start_valid_time_range >= end_time
//                _ -> and {
//                    start_time <= start_valid_time_range,
//                    end_valid_time_range <= end_time,
//                  }
//              },
//            } })
// }

// fn validate_batching_treasury_datum(
//   in_datum: TreasuryDatum,
//   out_datum: TreasuryDatum,
// ) -> Bool {
//   let TreasuryDatum {
//     raise_asset: in_raise_asset,
//     asset_a: in_asset_a,
//     asset_b: in_asset_b,
//     lbe_owner: in_lbe_owner,
//     start_time: in_start_time,
//     end_time: in_end_time,
//     create_pool_time: in_create_pool_time,
//     order_hash: in_order_hash,
//     lp_asset_name: in_lp_asset_name,
//     reserve_a: in_reserve_a,
//     reserve_b: in_reserve_b,
//     ..
//   } = in_datum
//   let TreasuryDatum {
//     raise_asset: out_raise_asset,
//     asset_a: out_asset_a,
//     asset_b: out_asset_b,
//     lbe_owner: out_lbe_owner,
//     start_time: out_start_time,
//     end_time: out_end_time,
//     create_pool_time: out_create_pool_time,
//     order_hash: out_order_hash,
//     lp_asset_name: out_lp_asset_name,
//     reserve_a: out_reserve_a,
//     reserve_b: out_reserve_b,
//     ..
//   } = out_datum
//   let check_reserve_from =
//     if in_raise_asset == in_asset_a {
//       in_reserve_b == out_reserve_b
//     } else {
//       in_reserve_a == out_reserve_a
//     }
//   and {
//     in_raise_asset == out_raise_asset,
//     in_asset_a == out_asset_a,
//     in_asset_b == out_asset_b,
//     in_lbe_owner == out_lbe_owner,
//     in_start_time == out_start_time,
//     in_end_time == out_end_time,
//     in_create_pool_time == out_create_pool_time,
//     in_order_hash == out_order_hash,
//     in_lp_asset_name == out_lp_asset_name,
//     check_reserve_from,
//   }
// }

// fn apply_deposit_orders(
//   order_in_values: List<Value>,
//   order_in_datums: List<OrderDatum>,
//   order_outputs: List<Output>,
//   raise_asset_policy_id: PolicyId,
//   raise_asset_name: AssetName,
// ) -> Int {
//   if order_in_values |> builtin.null_list {
//     0
//   } else {
//     let OrderDatum { step, expect_output_asset, owner, minimum_receive } =
//       order_in_datums |> builtin.head_list
//     if step == Deposit {
//       let in_value = order_in_values |> builtin.head_list
//       let amount_in =
//         quantity_of(in_value, raise_asset_policy_id, raise_asset_name)
//       let estimate_in =
//         if utils.is_ada_asset(raise_asset_policy_id, raise_asset_name) {
//           amount_in - 2000000
//         } else {
//           amount_in
//         }
//       let Output { value: out_value, address: out_address, .. } =
//         order_outputs |> builtin.head_list
//       let estimate_out = utils.quantity_of_asset(out_value, expect_output_asset)
//       expect and {
//           estimate_in == estimate_out,
//           minimum_receive == estimate_out,
//           out_address == owner,
//         }
//       estimate_out + apply_deposit_orders(
//         order_in_values |> builtin.tail_list,
//         order_in_datums |> builtin.tail_list,
//         order_outputs |> builtin.tail_list,
//         raise_asset_policy_id,
//         raise_asset_name,
//       )
//     } else {
//       apply_deposit_orders(
//         order_in_values |> builtin.tail_list,
//         order_in_datums |> builtin.tail_list,
//         order_outputs |> builtin.tail_list,
//         raise_asset_policy_id,
//         raise_asset_name,
//       )
//     }
//   }
// }

// fn apply_redeem_raise_asset_orders(
//   order_in_values: List<Value>,
//   order_in_datums: List<OrderDatum>,
//   order_outputs: List<Output>,
//   raise_asset_policy_id: PolicyId,
//   raise_asset_name: AssetName,
//   authen_policy_id: PolicyId,
//   lp_asset_name: AssetName,
// ) -> Int {
//   if order_in_values |> builtin.null_list {
//     0
//   } else {
//     let OrderDatum { step, expect_output_asset, owner, minimum_receive } =
//       order_in_datums |> builtin.head_list
//     if step == RedeemRaiseAsset {
//       let in_value = order_in_values |> builtin.head_list
//       let estimate_in = quantity_of(in_value, authen_policy_id, lp_asset_name)
//       expect value.lovelace_of(in_value) >= 2000000
//       let Output { value: out_value, address: out_address, .. } =
//         order_outputs |> builtin.head_list
//       let amount_out = utils.quantity_of_asset(out_value, expect_output_asset)
//       let estimate_out =
//         if utils.is_ada_asset(raise_asset_policy_id, raise_asset_name) {
//           amount_out - 1500000
//         } else {
//           amount_out
//         }
//       expect and {
//           estimate_in == estimate_out,
//           minimum_receive == estimate_out,
//           out_address == owner,
//         }
//       estimate_out + apply_redeem_raise_asset_orders(
//         order_in_values |> builtin.tail_list,
//         order_in_datums |> builtin.tail_list,
//         order_outputs |> builtin.tail_list,
//         raise_asset_policy_id,
//         raise_asset_name,
//         authen_policy_id,
//         lp_asset_name,
//       )
//     } else {
//       apply_redeem_raise_asset_orders(
//         order_in_values |> builtin.tail_list,
//         order_in_datums |> builtin.tail_list,
//         order_outputs |> builtin.tail_list,
//         raise_asset_policy_id,
//         raise_asset_name,
//         authen_policy_id,
//         lp_asset_name,
//       )
//     }
//   }
// }

// fn apply_redeem_lp_orders(
//   order_in_values: List<Value>,
//   order_in_datums: List<OrderDatum>,
//   order_outputs: List<Output>,
//   raise_asset_policy_id: PolicyId,
//   raise_asset_name: AssetName,
//   authen_policy_id: PolicyId,
//   lp_asset_name: AssetName,
//   total_liquidity: Int,
//   total_raise_amount: Int,
// ) -> Int {
//   if order_in_values |> builtin.null_list {
//     0
//   } else {
//     let OrderDatum { step, expect_output_asset, owner, minimum_receive } =
//       order_in_datums |> builtin.head_list
//     if step == RedeemRaiseAsset {
//       let in_value = order_in_values |> builtin.head_list
//       let estimate_in = quantity_of(in_value, authen_policy_id, lp_asset_name)
//       expect value.lovelace_of(in_value) >= 2000000
//       let Output { value: out_value, address: out_address, .. } =
//         order_outputs |> builtin.head_list
//       let estimate_out = utils.quantity_of_asset(out_value, expect_output_asset)
//       expect and {
//           minimum_receive == estimate_out,
//           out_address == owner,
//           estimate_out * total_raise_amount == estimate_in * total_liquidity,
//         }
//       estimate_out + apply_redeem_lp_orders(
//         order_in_values |> builtin.tail_list,
//         order_in_datums |> builtin.tail_list,
//         order_outputs |> builtin.tail_list,
//         raise_asset_policy_id,
//         raise_asset_name,
//         authen_policy_id,
//         lp_asset_name,
//         total_liquidity,
//         total_raise_amount,
//       )
//     } else {
//       apply_redeem_lp_orders(
//         order_in_values |> builtin.tail_list,
//         order_in_datums |> builtin.tail_list,
//         order_outputs |> builtin.tail_list,
//         raise_asset_policy_id,
//         raise_asset_name,
//         authen_policy_id,
//         lp_asset_name,
//         total_liquidity,
//         total_raise_amount,
//       )
//     }
//   }
// }

// // deposit -> authen_policy_id, lp_asset_name
// // RedeemRaiseAsset -> raise_asset
// // redeemLP -> amm_authen_policy_id, lp_asset
// fn validate_expect_out_assets(
//   order_datums: List<OrderDatum>,
//   authen_policy_id: PolicyId,
//   lp_asset_name: AssetName,
//   amm_authen_policy_id: PolicyId,
//   raise_asset: Asset,
// ) -> Bool {
//   if order_datums |> builtin.null_list {
//     True
//   } else {
//     let OrderDatum { step, expect_output_asset, .. } =
//       order_datums |> builtin.head_list
//     when step is {
//       Deposit ->
//         expect_output_asset == Asset {
//           policy_id: authen_policy_id,
//           asset_name: lp_asset_name,
//         }
//       RedeemRaiseAsset -> expect_output_asset == raise_asset
//       RedeemLP ->
//         expect_output_asset == Asset {
//           policy_id: amm_authen_policy_id,
//           asset_name: lp_asset_name,
//         }
//     } && validate_expect_out_assets(
//       order_datums |> builtin.tail_list,
//       authen_policy_id,
//       lp_asset_name,
//       amm_authen_policy_id,
//       raise_asset,
//     )
//   }
// }

// pub fn validate_apply_order(
//   treasury_in_datum: TreasuryDatum,
//   treasury_out_datum: TreasuryDatum,
//   treasury_out_value: Value,
//   all_inputs: List<Input>,
//   all_outputs: List<Output>,
//   datums: DatumMap,
//   validity_range: ValidityRange,
//   authen_policy_id: PolicyId,
//   amm_authen_policy_id: PolicyId,
// ) -> Bool {
//   let TreasuryDatum {
//     order_hash,
//     start_time,
//     end_time,
//     lp_asset_name,
//     raise_asset,
//     asset_a,
//     asset_b,
//     reserve_a: in_reserve_a,
//     reserve_b: in_reserve_b,
//     ..
//   } = treasury_in_datum
//   let order_inputs = get_order_inputs(all_inputs, order_hash)
//   let order_outputs = list.take(all_outputs, list.length(order_inputs))
//   expect utils.compare_list_length(order_inputs, order_outputs)
//   let order_datums =
//     list.map(
//       order_inputs,
//       fn(input) {
//         let Input { output: Output { datum, .. }, .. } = input
//         let order_datum = utils.must_find_order_datum(datums, datum)
//         order_datum
//       },
//     )
//   let order_in_values =
//     list.map(
//       order_inputs,
//       fn(input) {
//         let Input { output: Output { value, .. }, .. } = input
//         value
//       },
//     )
//   let Asset { policy_id: raise_asset_policy_id, asset_name: raise_asset_name } =
//     raise_asset
//   expect
//     validate_expect_out_assets(
//       order_datums,
//       authen_policy_id,
//       lp_asset_name,
//       amm_authen_policy_id,
//       raise_asset,
//     )
//   let reserve_raise =
//     apply_deposit_orders(
//       order_in_values,
//       order_datums,
//       order_outputs,
//       raise_asset_policy_id,
//       raise_asset_name,
//     )
//   let reserve_redeem_raise_asset =
//     apply_redeem_raise_asset_orders(
//       order_in_values,
//       order_datums,
//       order_outputs,
//       raise_asset_policy_id,
//       raise_asset_name,
//       authen_policy_id,
//       lp_asset_name,
//     )
//   let TreasuryDatum {
//     reserve_a: out_reserve_a,
//     reserve_b: out_reserve_b,
//     total_liquidity,
//     ..
//   } = treasury_out_datum
//   let (raise_amount_in, raise_amount_out) =
//     if raise_asset == asset_a {
//       (in_reserve_a, out_reserve_a)
//     } else {
//       (in_reserve_b, out_reserve_b)
//     }
//   let (base_asset, base_amount) =
//     if raise_asset == asset_a {
//       (asset_b, in_reserve_b)
//     } else {
//       (asset_a, in_reserve_a)
//     }
//   let new_total_liquidity =
//     apply_redeem_lp_orders(
//       order_in_values,
//       order_datums,
//       order_outputs,
//       raise_asset_policy_id,
//       raise_asset_name,
//       authen_policy_id,
//       lp_asset_name,
//       total_liquidity,
//       raise_amount_in,
//     )
//   and {
//     validate_batching_treasury_datum(treasury_in_datum, treasury_out_datum),
//     validate_order_time(start_time, end_time, validity_range, order_datums),
//     raise_amount_in + reserve_raise - reserve_redeem_raise_asset == raise_amount_out,
//     quantity_of(treasury_out_value, raise_asset_policy_id, raise_asset_name) == raise_amount_out,
//     utils.quantity_of_asset(treasury_out_value, base_asset) == base_amount,
//     new_total_liquidity == total_liquidity,
//   }
// }
