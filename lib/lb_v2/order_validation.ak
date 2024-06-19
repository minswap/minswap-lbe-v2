use aiken/list
use aiken/transaction.{InlineDatum, Input, Output}
use aiken/transaction/value.{AssetName, Value, ada_asset_name, ada_policy_id}
use lb_v2/types.{Asset, OrderDatum, TreasuryDatum, ValidatorHash}
use lb_v2/utils.{
  amm_authen_policy_id, compute_asset_name_from_base_and_raise,
  minimum_order_collected, minimum_order_redeemed, order_auth_an,
  order_minimum_ada,
}
use lb_v2/validation.{
  build_default_collected_order_value, get_order_inputs, get_order_outputs,
  get_treasury_output,
}

// Assertions:
// - All Sellers, Manager have been collected.
// - All Inputs and Outputs must be legitimate by containing an Auth Token.
// - Treasury Input, Order Inputs must share the same LBE ID.
// - Paying Treasury Output correctly!
// - Paying Order Outputs correctly!
// - Collect at least 1 Order.
// - The length of Order Inputs equals the length of Order Outputs.
// - Transaction mint nothing.
// Notes:
// - Order Outputs should correspond to Order Inputs.
// - Collecting orders and cancelling LBE are independent operations.
// - There's no need to check the time range since it should collect sellers first.
pub fn validate_collect_orders(
  inputs: List<Input>,
  outputs: List<Output>,
  treasury_in_datum: TreasuryDatum,
  treasury_in_value: Value,
  mint_value: Value,
  treasury_hash: ValidatorHash,
) -> Bool {
  let TreasuryDatum {
    factory_policy_id,
    order_hash,
    collected_fund,
    base_asset,
    raise_asset,
    reserve_raise,
    total_penalty,
    is_manager_collected,
    ..
  } = treasury_in_datum
  let order_inputs =
    get_order_inputs(
      inputs: inputs,
      factory_policy_id: factory_policy_id,
      order_hash: order_hash,
    )
  let order_outputs = get_order_outputs(outputs, order_hash)
  let treasury_output =
    get_treasury_output(outputs, factory_policy_id, treasury_hash)
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(raw_treasury_out_datum),
    ..
  } = treasury_output
  expect treasury_out_datum: TreasuryDatum = raw_treasury_out_datum
  let collect_amount =
    apply_collecting_orders(
      order_inputs: order_inputs,
      order_outputs: order_outputs,
      base_asset: base_asset,
      raise_asset: raise_asset,
      acc_collect_amount: 0,
      default_order_output_value: build_default_collected_order_value(
        factory_policy_id,
      ),
    )
  let Asset { policy_id: raise_asset_pid, asset_name: raise_asset_an } =
    raise_asset
  and {
    // Treasury Out Datum should update correctly!
    TreasuryDatum {
      ..treasury_in_datum,
      collected_fund: collected_fund + collect_amount,
    } == treasury_out_datum,
    // Accumulate Treasury Out Value with the `collect_amount` of `raise_asset` Token.
    treasury_out_value == (
      treasury_in_value
        |> value.add(raise_asset_pid, raise_asset_an, collect_amount)
    ),
    // Transaction mint nothing.
    value.flatten(mint_value) == [],
    // All Sellers, Manager have been collected.
    is_manager_collected == True,
    or {
      // prevent spamming by setting minimum for orders collected 
      //  if this tx is not the last collect action
      list.length(order_inputs) >= minimum_order_collected,
      // the last collecting
      collected_fund + collect_amount == reserve_raise + total_penalty,
    },
  }
}

// Transaction must collects at least 1 order.
// return Sum(amount + penalty_amount) of orders
pub fn apply_collecting_orders(
  order_inputs: List<Input>,
  order_outputs: List<Output>,
  base_asset: Asset,
  raise_asset: Asset,
  acc_collect_amount: Int,
  default_order_output_value: Value,
) -> Int {
  expect [input, ..inputs] = order_inputs
  expect [output, ..outputs] = order_outputs
  expect Input { output: Output { datum: InlineDatum(in_datum_raw), .. }, .. } =
    input
  expect in_datum: OrderDatum = in_datum_raw
  expect Output { value: out_value, datum: InlineDatum(out_datum_raw), .. } =
    output
  expect out_datum: OrderDatum = out_datum_raw
  expect and {
      // Order, Treasury must share the same LBE ID
      in_datum == OrderDatum {
        ..in_datum,
        base_asset: base_asset,
        raise_asset: raise_asset,
      },
      // Out Datum only changes: {is_collected: True } compare to In Datum
      out_datum == OrderDatum { ..in_datum, is_collected: True },
      // Out Value should be correct!
      out_value == default_order_output_value,
    }
  let OrderDatum { amount, penalty_amount, .. } = in_datum
  let collect_amount = acc_collect_amount + amount + penalty_amount
  when inputs is {
    [] -> {
      // Ensure order_inputs.length == order_outputs.length
      expect outputs == []
      collect_amount
    }
    _ ->
      apply_collecting_orders(
        order_inputs: inputs,
        order_outputs: outputs,
        base_asset: base_asset,
        raise_asset: raise_asset,
        acc_collect_amount: collect_amount,
        default_order_output_value: default_order_output_value,
      )
  }
}

// Assertions:
// - All Sellers, Manager, Orders have been collected.
// - All Inputs and Treasury Output must be legitimate by containing an Auth Token.
// - Treasury Input, Order Inputs must share the same LBE ID.
// - Paying Treasury Output correctly!
// - Paying User Outputs correctly!
// - Redeem at least 1 Order.
// - The length of Order Inputs equals the length of User Outputs.
// - Transaction burn Order Tokens correctly!
// Notes:
// - AMM Pool create successfully!
// - User will receive: 
//  + `order_minimum_ada` lovelace
//  + `total_lp * amount / reserve_raise` LP Token
//  + `(reserve_raise + total_penalty - maximum_raise) * amount / reserve_raise) Raise Token if exceed soft-cap
// - Transaction Outputs = [...(User Outputs correspond to Order Inputs), Treasury Output]
pub fn validate_redeem(
  inputs: List<Input>,
  outputs: List<Output>,
  treasury_in_datum: TreasuryDatum,
  treasury_in_value: Value,
  mint_value: Value,
  treasury_hash: ValidatorHash,
) -> Bool {
  let TreasuryDatum {
    factory_policy_id,
    order_hash,
    collected_fund,
    base_asset,
    raise_asset,
    reserve_raise,
    total_liquidity,
    maximum_raise,
    total_penalty,
    ..
  } = treasury_in_datum
  let order_inputs =
    get_order_inputs(
      inputs: inputs,
      factory_policy_id: factory_policy_id,
      order_hash: order_hash,
    )
  let treasury_output =
    get_treasury_output(outputs, factory_policy_id, treasury_hash)
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(raw_treasury_out_datum),
    ..
  } = treasury_output
  expect treasury_out_datum: TreasuryDatum = raw_treasury_out_datum
  let lp_asset_name =
    compute_asset_name_from_base_and_raise(base_asset, raise_asset)
  let remaining_raise =
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
  let (total_fund, total_lp, total_raise) =
    apply_redeem_orders(
      order_inputs: order_inputs,
      outputs: outputs,
      base_asset: base_asset,
      raise_asset: raise_asset,
      total_lp: total_liquidity,
      reserve_raise: reserve_raise,
      remaining_raise: remaining_raise,
      lp_asset_name: lp_asset_name,
      acc_fund: 0,
      acc_lp: 0,
      acc_raise: 0,
    )
  and {
    // Check AMM Pool create successfully!
    total_liquidity > 0,
    // Paying Treasury Output correctly!
    treasury_out_datum == TreasuryDatum {
      ..treasury_in_datum,
      collected_fund: collected_fund - total_fund,
    },
    treasury_out_value == (
      treasury_in_value
        |> value.add(amm_authen_policy_id, lp_asset_name, -total_lp)
        |> value.add(raise_asset_pid, raise_asset_an, -total_raise)
    ),
    // Transaction burn Order Tokens correctly!
    value.flatten(mint_value) == [
      (factory_policy_id, order_auth_an, -list.length(order_inputs)),
    ],
    or {
      // prevent spamming by setting minimum for orders redeemed 
      //  if this tx is not the last redeemed action
      list.length(order_inputs) >= minimum_order_redeemed,
      // the last redeeming
      collected_fund == total_fund,
    },
  }
}

// return (total fund(amount and penalty) of orders, total lp that users redeemed, total raise asset that user redeem)
pub fn apply_redeem_orders(
  order_inputs: List<Input>,
  outputs: List<Output>,
  base_asset: Asset,
  raise_asset: Asset,
  total_lp: Int,
  reserve_raise: Int,
  remaining_raise: Int,
  lp_asset_name: AssetName,
  acc_fund: Int,
  acc_lp: Int,
  acc_raise: Int,
) -> (Int, Int, Int) {
  expect [order_input, ..remaining_order_inputs] = order_inputs
  expect [user_output, ..remaining_outputs] = outputs
  expect Input {
    output: Output { datum: InlineDatum(raw_order_in_datum), .. },
    ..
  } = order_input
  expect order_in_datum: OrderDatum = raw_order_in_datum
  let OrderDatum {
    owner,
    base_asset: o_base_asset,
    raise_asset: o_raise_asset,
    amount,
    penalty_amount,
    ..
  } = order_in_datum
  let Output { address: user_address, value: user_value, .. } = user_output
  let Asset { policy_id: raise_asset_pid, asset_name: raise_asset_an } =
    raise_asset
  // amount LP Token user will receive
  let user_lp = total_lp * amount / reserve_raise
  // accumulate LP token amount
  let lp_amount = acc_lp + user_lp
  // bonus fund user will receive
  let fund_amount = acc_fund + amount + penalty_amount
  // accumulate Raise Asset amount
  let raise_bonus = remaining_raise * amount / reserve_raise
  // Amount of order
  let raise_amount = acc_raise + raise_bonus
  let expect_user_value =
    value.from_asset(amm_authen_policy_id, lp_asset_name, user_lp)
      |> value.add(raise_asset_pid, raise_asset_an, raise_bonus)
      |> value.add(ada_policy_id, ada_asset_name, order_minimum_ada)
  expect and {
      base_asset == o_base_asset,
      raise_asset == o_raise_asset,
      user_address == owner,
      expect_user_value == user_value,
    }
  when remaining_order_inputs is {
    [] -> (fund_amount, lp_amount, raise_amount)
    _ ->
      apply_redeem_orders(
        order_inputs: remaining_order_inputs,
        outputs: remaining_outputs,
        base_asset: base_asset,
        raise_asset: raise_asset,
        total_lp: total_lp,
        reserve_raise: reserve_raise,
        remaining_raise: remaining_raise,
        lp_asset_name: lp_asset_name,
        acc_fund: fund_amount,
        acc_lp: lp_amount,
        acc_raise: raise_amount,
      )
  }
}

// Assertions:
// - All Sellers, Manager, Orders have been collected.
// - All Inputs and Treasury Output must be legitimate by containing an Auth Token.
// - Treasury Input, Order Inputs must share the same LBE ID.
// - Paying Treasury Output correctly!
// - Paying User Outputs correctly!
// - Refund at least 1 Order.
// - The length of Order Inputs equals the length of User Outputs.
// - Transaction burn Order Tokens correctly!
// Notes:
// - The LBE is cancelled
// - User will receive `order_minimum_ada` + (amount + penalty_amount) Raise Asset.
// - Transaction Outputs = [...(User Outputs correspond to Order Inputs), Treasury Output]
pub fn validate_refund(
  inputs: List<Input>,
  outputs: List<Output>,
  treasury_in_datum: TreasuryDatum,
  treasury_in_value: Value,
  mint_value: Value,
  treasury_hash: ValidatorHash,
) -> Bool {
  let TreasuryDatum {
    factory_policy_id,
    order_hash,
    collected_fund,
    base_asset,
    raise_asset,
    reserve_raise,
    total_penalty,
    is_manager_collected,
    ..
  } = treasury_in_datum
  let order_inputs =
    get_order_inputs(
      inputs: inputs,
      factory_policy_id: factory_policy_id,
      order_hash: order_hash,
    )
  let treasury_output =
    get_treasury_output(outputs, factory_policy_id, treasury_hash)
  expect Output {
    value: treasury_out_value,
    datum: InlineDatum(raw_treasury_out_datum),
    ..
  } = treasury_output
  expect treasury_out_datum: TreasuryDatum = raw_treasury_out_datum
  let Asset { policy_id: raise_asset_pid, asset_name: raise_asset_an } =
    raise_asset
  let (total_orders_amount, total_orders_penalty) =
    apply_refund_orders(
      order_inputs: order_inputs,
      outputs: outputs,
      base_asset: base_asset,
      raise_asset: raise_asset,
      acc_amount: 0,
      acc_penalty: 0,
    )
  let refund_amount = total_orders_amount + total_orders_penalty
  and {
    // All Sellers, Manager, Orders have been collected.
    is_manager_collected == True,
    collected_fund == reserve_raise + total_penalty,
    // Paying Treasury Output correctly!
    treasury_out_datum == TreasuryDatum {
      ..treasury_in_datum,
      collected_fund: collected_fund - refund_amount,
      reserve_raise: reserve_raise - total_orders_amount,
      total_penalty: total_penalty - total_orders_penalty,
    },
    treasury_out_value == (
      treasury_in_value
        |> value.add(raise_asset_pid, raise_asset_an, -refund_amount)
    ),
    // Transaction burn Order Tokens correctly!
    value.flatten(mint_value) == [
      (factory_policy_id, order_auth_an, -list.length(order_inputs)),
    ],
    or {
      // prevent spamming by setting minimum for orders redeemed 
      //  if this tx is not the last redeemed action
      list.length(order_inputs) >= minimum_order_redeemed,
      // the last redeeming
      collected_fund == refund_amount,
    },
  }
}

// Refund at least 1 Order.
// User Outputs appear at the start of Transaction Outputs.
// return (acc_amount, acc_penalty)
pub fn apply_refund_orders(
  order_inputs: List<Input>,
  outputs: List<Output>,
  base_asset: Asset,
  raise_asset: Asset,
  acc_amount: Int,
  acc_penalty: Int,
) -> (Int, Int) {
  expect [order_input, ..remaining_order_inputs] = order_inputs
  expect [user_output, ..remaining_outputs] = outputs
  expect Input {
    output: Output { datum: InlineDatum(order_raw_datum), .. },
    ..
  } = order_input
  expect order_datum: OrderDatum = order_raw_datum
  let OrderDatum { owner, amount, penalty_amount, base_asset: o_base_asset, raise_asset: o_raise_asset, .. } = order_datum
  let Output { address: user_address, value: user_value, .. } = user_output
  expect and {
      // Order, Treasury must share the same LBE ID
      o_base_asset == base_asset,
      o_raise_asset==raise_asset,
      // Paying User Output correctly!
      user_address == owner,
      value.flatten(user_value) == if
      raise_asset == Asset(ada_policy_id, ada_asset_name){
      
        [
          (
            ada_policy_id,
            ada_asset_name,
            order_minimum_ada + amount + penalty_amount,
          ),
        ]
      } else {
        let Asset { policy_id: raise_asset_pid, asset_name: raise_asset_an } =
          raise_asset
        [
          (ada_policy_id, ada_asset_name, order_minimum_ada),
          // ensure amount+penalty_amount > 0
          (raise_asset_pid, raise_asset_an, amount + penalty_amount),
        ]
      },
    }
  let refund_amount = acc_amount + amount
  let refund_penalty = acc_penalty + penalty_amount
  when remaining_order_inputs is {
    [] -> (refund_amount, refund_penalty)
    _ ->
      apply_refund_orders(
        order_inputs: remaining_order_inputs,
        outputs: remaining_outputs,
        base_asset: base_asset,
        raise_asset: raise_asset,
        acc_amount: refund_amount,
        acc_penalty: refund_penalty,
      )
  }
}
