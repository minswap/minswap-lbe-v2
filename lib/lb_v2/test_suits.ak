use aiken/builtin
use aiken/bytearray
use aiken/interval.{Finite, Interval, IntervalBound}
use aiken/transaction.{
  InlineDatum, Input, NoDatum, Output, OutputReference, ScriptPurpose,
  TransactionId, ValidityRange,
}
use aiken/transaction/credential.{
  Address, Inline, ScriptCredential, StakeCredential,
}
use aiken/transaction/value.{AssetName, PolicyId, ada_asset_name, ada_policy_id}
use lb_v2/types.{
  Asset, Deposit, DiscoveryPhase, EncouterPhase, FactoryDatum, OrderDatum,
  RedeemLP, RedeemRaiseAsset, TreasuryDatum, ValidatorHash,
}
use lb_v2/utils
use lb_v2/validation.{validate_order_time}

// AUTHEN_MINTING_POLICY_ID = @"h'ceee94bdc6c54c1d7361b3dd1a0d586188082f8a8ab55f1fa0e90352'"
pub type AuthenValidatorParams {
  out_ref: OutputReference,
  factory_auth_an: AssetName,
  treasury_auth_an: AssetName,
}

pub fn gen_authen_minting_policy_id() -> PolicyId {
  @"h'ceee94bdc6c54c1d7361b3dd1a0d586188082f8a8ab55f1fa0e90352'"
    |> bytearray.from_string
}

pub fn gen_treasury_hash() -> ValidatorHash {
  @"h'4b8b522aad66f628817c8c423dfb05f729d1cc918765c268f4754155'"
    |> bytearray.from_string
}

pub fn gen_order_batch_hash() -> ValidatorHash {
  @"h'ffdc2b056dd138f44b536d38e8c67277cb082c00fb7dcdc68bb85009'"
    |> bytearray.from_string
}

pub fn gen_order_hash() -> ValidatorHash {
  @"h'229863ae8694da16da002e889a1d19bcc82c581225b6dcca95fd6969'"
    |> bytearray.from_string
}

pub fn gen_factory_address() -> Address {
  @"h'6508d97458392cbc453922493dacb743c405c7a7c254ee8b85fa6af5'"
    |> bytearray.from_string
    |> credential.from_script
}

pub fn gen_treasury_address() -> Address {
  @"h'4b8b522aad66f628817c8c423dfb05f729d1cc918765c268f4754155'"
    |> bytearray.from_string
    |> credential.from_script
}

pub fn gen_order_batching_address() -> Address {
  @"h'ffdc2b056dd138f44b536d38e8c67277cb082c00fb7dcdc68bb85009'"
    |> bytearray.from_string
    |> credential.from_script
}

pub fn gen_order_batching_stake_credential() -> StakeCredential {
  Inline(ScriptCredential(gen_order_batch_hash()))
}

pub fn gen_dummy_output_ref() -> OutputReference {
  let tx_id =
    @"h'f0e3bc6e7540b0597f69c5f007c644f07ddea2724feb91e6c0a64ebae3f00422'"
  OutputReference {
    transaction_id: TransactionId { hash: tx_id |> bytearray.from_string },
    output_index: 1,
  }
}

pub fn gen_dummy_ouput() -> Output {
  let address =
    @"h'6508d97458392cbc453922493dacb743c405c7a7c254ee8b85fa6af5'"
      |> bytearray.from_string
      |> credential.from_verification_key
  Output {
    address,
    value: value.zero() |> value.add(ada_policy_id, ada_asset_name, 10000000),
    datum: NoDatum,
    reference_script: None,
  }
}

pub fn gen_authen_validator_params() -> AuthenValidatorParams {
  let factory_auth_an: AssetName = @"FA" |> bytearray.from_string
  let treasury_auth_an: AssetName = @"TA" |> bytearray.from_string
  AuthenValidatorParams {
    out_ref: gen_authen_out_ref(),
    factory_auth_an,
    treasury_auth_an,
  }
}

// has FA token
pub fn gen_factory_input() -> Input {
  let authen_policy_id = gen_authen_minting_policy_id()
  let factory_auth_an: AssetName = @"FA" |> bytearray.from_string
  let output_value =
    value.zero()
      |> value.add(ada_policy_id, ada_asset_name, 10000000)
      |> value.add(authen_policy_id, factory_auth_an, 1)
  let output_reference: OutputReference =
    OutputReference {
      transaction_id: TransactionId {
        hash: @"h'5aaefababc3d6c5661c0e7dbcb02f5bfa12b93e0881e9861dd8d23245aa263b9'"
          |> bytearray.from_string,
      },
      output_index: 0,
    }
  Input {
    output_reference,
    output: Output {
      address: gen_factory_address(),
      value: output_value,
      datum: InlineDatum(
        FactoryDatum {
          head: #"00",
          tail: #"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
        },
      ),
      reference_script: None,
    },
  }
}

// base, raise, lp asset
pub fn gen_lbe_assets() -> List<Asset> {
  let base_asset =
    Asset {
      policy_id: @"h'd67261e2bd37085ec0a91d4a5f2dde07a0dff4a58f563f6bee8b7e51'"
        |> bytearray.from_string,
      asset_name: @"h'42415345'" |> bytearray.from_string,
    }
  let raise_asset = Asset { policy_id: #"", asset_name: #"" }
  let lp_asset_name =
    utils.compute_lp_asset_name(
      raise_asset.policy_id,
      raise_asset.asset_name,
      base_asset.policy_id,
      base_asset.asset_name,
    )
  let lp_asset =
    Asset {
      policy_id: @"h'ceee94bdc6c54c1d7361b3dd1a0d586188082f8a8ab55f1fa0e90352'"
        |> bytearray.from_string,
      asset_name: lp_asset_name,
    }
  [base_asset, raise_asset, lp_asset]
}

pub fn compare_script_purpose(s1: ScriptPurpose, s2: ScriptPurpose) -> Ordering {
  let b1 = s1 |> builtin.serialise_data
  let b2 = s2 |> builtin.serialise_data
  bytearray.compare(b1, b2)
}

pub fn compare_stake_credential(
  s1: StakeCredential,
  s2: StakeCredential,
) -> Ordering {
  let b1 = s1 |> builtin.serialise_data
  let b2 = s2 |> builtin.serialise_data
  bytearray.compare(b1, b2)
}

pub fn gen_dummy_treasury_out() -> Output {
  let address = gen_treasury_address()
  let base_asset =
    Asset {
      policy_id: @"h'd67261e2bd37085ec0a91d4a5f2dde07a0dff4a58f563f6bee8b7e51'"
        |> bytearray.from_string,
      asset_name: @"h'42415345'" |> bytearray.from_string,
    }
  let raise_asset = Asset { policy_id: #"", asset_name: #"" }
  let lp_asset_name =
    utils.compute_lp_asset_name(
      raise_asset.policy_id,
      raise_asset.asset_name,
      base_asset.policy_id,
      base_asset.asset_name,
    )
  let lp_asset =
    Asset {
      policy_id: @"h'ceee94bdc6c54c1d7361b3dd1a0d586188082f8a8ab55f1fa0e90352'"
        |> bytearray.from_string,
      asset_name: lp_asset_name,
    }
  let value =
    value.zero()
      |> value.add(ada_policy_id, ada_asset_name, 10000000)
      |> value.add(lp_asset.policy_id, @"TA" |> bytearray.from_string, 1)
      |> value.add(base_asset.policy_id, base_asset.asset_name, 100000000) // 100 * 1e6
      |> value.add(lp_asset.policy_id, lp_asset.asset_name, 9223372036854775807)
  let treasury_datum: TreasuryDatum =
    TreasuryDatum {
      base_asset,
      raise_asset,
      lp_alloc_points: [],
      raise_alloc_points: [],
      discovery_phase: DiscoveryPhase {
        start_time: 1701405708,
        end_time: 1702615308,
      },
      encounter_phase: EncouterPhase { start_time: 1702701708, end_time: None },
      minimum_raise: None,
      maximum_raise: None,
      order_hash: gen_order_hash(),
      reserve_base: 100000000,
      reserve_raise: 0,
      total_liquidity: 0,
    }
  Output {
    address,
    value,
    datum: InlineDatum(treasury_datum),
    reference_script: None,
  }
}

// fn gen_dummy_assets() -> List<Asset> {
//   let base_asset =
//     Asset {
//       policy_id: @"h'd67261e2bd37085ec0a91d4a5f2dde07a0dff4a58f563f6bee8b7e51'"
//         |> bytearray.from_string,
//       asset_name: @"h'42415345'" |> bytearray.from_string,
//     }
//   let raise_asset = Asset { policy_id: #"", asset_name: #"" }
//   [base_asset, raise_asset]
// }

// fn gen_dummy_value() -> Value {
//   expect [base_asset, raise_asset] = gen_dummy_assets()
//   value.zero()
//     |> value.add(raise_asset.policy_id, raise_asset.asset_name, 1000000000)
//     |> value.add(base_asset.policy_id, base_asset.asset_name, 1000000000)
// }

// test test_dummy() {
//   let value = gen_dummy_value()
//   value == value.zero()
// }

pub fn gen_dummy_amm_params() -> (PolicyId, (AssetName, ValidatorHash)) {
  let amm_auth_policy_id: PolicyId =
    @"h'c9281d64953f9531304e57e4ff15111f0c5445167c0b413f70fcd50c'"
      |> bytearray.from_string
  let amm_pool_auth_an: AssetName = @"MA" |> bytearray.from_string
  let amm_pool_validation_hash: ValidatorHash =
    @"h'557fb2fa1a4d61d5ffc613f9f1211a5b22f5c2c3244589adc3168f3d'"
      |> bytearray.from_string
  (amm_auth_policy_id, (amm_pool_auth_an, amm_pool_validation_hash))
}

fn gen_authen_out_ref() -> OutputReference {
  let tx_id =
    @"h'f0e3bc6e7540b0597f69c5f007c644f07ddea2724feb91e6c0a64ebae3f00422'"
  OutputReference {
    transaction_id: TransactionId { hash: tx_id |> bytearray.from_string },
    output_index: 0,
  }
}

test test_validate_order_time() {
  let start_time = 100
  let end_time = 500
  let validity_range: ValidityRange =
    Interval {
      lower_bound: IntervalBound {
        is_inclusive: False,
        bound_type: Finite(150),
      },
      upper_bound: IntervalBound {
        is_inclusive: False,
        bound_type: Finite(200),
      },
    }
  let address =
    @"h'6508d97458392cbc453922493dacb743c405c7a7c254ee8b85fa6af5'"
      |> bytearray.from_string
      |> credential.from_verification_key
  let order_datum =
    OrderDatum {
      owner: address,
      expect_output_asset: Asset {
        policy_id: ada_policy_id,
        asset_name: ada_asset_name,
      },
      minimum_receive: 100,
      step: Deposit,
      lp_asset_name: #"",
    }
  let order_datums =
    [order_datum, OrderDatum { ..order_datum, step: RedeemRaiseAsset }]
  validate_order_time(start_time, end_time, validity_range, order_datums)
}

test test_validate_order_time_failed() fail {
  let start_time = 100
  let end_time = 500
  let validity_range: ValidityRange =
    Interval {
      lower_bound: IntervalBound {
        is_inclusive: False,
        bound_type: Finite(150),
      },
      upper_bound: IntervalBound {
        is_inclusive: False,
        bound_type: Finite(200),
      },
    }
  let address =
    @"h'6508d97458392cbc453922493dacb743c405c7a7c254ee8b85fa6af5'"
      |> bytearray.from_string
      |> credential.from_verification_key
  let order_datum =
    OrderDatum {
      owner: address,
      expect_output_asset: Asset {
        policy_id: ada_policy_id,
        asset_name: ada_asset_name,
      },
      minimum_receive: 100,
      step: Deposit,
      lp_asset_name: #"",
    }

  let order_datums =
    [order_datum, OrderDatum { ..order_datum, step: RedeemLP }]
  expect validate_order_time(start_time, end_time, validity_range, order_datums)
  True
}
