// use aiken/builtin
// use aiken/bytearray
// use aiken/cbor
// use aiken/list
// use aiken/transaction.{
//   InlineDatum, Input, Mint, NoDatum, Output, OutputReference, ScriptContext,
//   ScriptPurpose, Transaction, TransactionId,
// }
// use aiken/transaction/credential
// use aiken/transaction/value.{AssetName, PolicyId}
// use lb_v2/types.{AuthenRedeemer, FactoryDatum, MintFactoryAuthen}
// use lb_v2/validation

// // AUTHEN_MINTING_POLICY_ID = @"h'ceee94bdc6c54c1d7361b3dd1a0d586188082f8a8ab55f1fa0e90352'"
// type AuthenValidatorParams {
//   out_ref: OutputReference,
//   factory_auth_an: AssetName,
//   treasury_auth_an: AssetName,
// }

// fn gen_authen_out_ref() -> OutputReference {
//   let tx_id =
//     @"h'f0e3bc6e7540b0597f69c5f007c644f07ddea2724feb91e6c0a64ebae3f00422'"
//   OutputReference {
//     transaction_id: TransactionId { hash: tx_id |> bytearray.from_string },
//     output_index: 0,
//   }
// }

// fn gen_authen_validator_params() -> AuthenValidatorParams {
//   let factory_auth_an: AssetName = @"FA" |> bytearray.from_string
//   let treasury_auth_an: AssetName = @"TA" |> bytearray.from_string
//   AuthenValidatorParams {
//     out_ref: gen_authen_out_ref(),
//     factory_auth_an,
//     treasury_auth_an,
//   }
// }

// // script context for transaction create factory
// fn gen_sc_create_factory() -> ScriptContext {
//   let AuthenValidatorParams { out_ref, factory_auth_an, .. } =
//     gen_authen_validator_params()

//   let policy_id: PolicyId =
//     @"h'ceee94bdc6c54c1d7361b3dd1a0d586188082f8a8ab55f1fa0e90352'"
//       |> bytearray.from_string
//   let purpose: ScriptPurpose = Mint(policy_id)
//   let output =
//     Output {
//       address: credential.from_verification_key(
//         @"h'09a9dd24b43ce6f22de361f2423e62a8a72a6ebb1e972a69ebb3bdcc'"
//           |> bytearray.from_string,
//       ),
//       value: value.from_lovelace(5000000),
//       datum: NoDatum,
//       reference_script: None,
//     }
//   let inputs: List<Input> =
//     [Input { output_reference: out_ref, output }]
//   let mint_value =
//     value.zero()
//       |> value.add(policy_id, factory_auth_an, 1)
//   let mint = mint_value |> value.to_minted_value
//   let factory_address =
//     @"h'6508d97458392cbc453922493dacb743c405c7a7c254ee8b85fa6af5'"
//       |> bytearray.from_string
//       |> credential.from_verification_key
//   let output_value =
//     value.from_lovelace(5000000) |> value.add(policy_id, factory_auth_an, 1)

//   // let factory_out_datum: FactoryDatum =
//   //   FactoryDatum {
//   //     asset_a: Asset { policy_id: #"", asset_name: #"" },
//   //     asset_b: Asset {
//   //       policy_id: @"h'e52964af4fffdb54504859875b1827b60ba679074996156461143dc1'"
//   //         |> bytearray.from_string,
//   //       asset_name: @"h'4f5054494d'",
//   //     },
//   //   }
//   let output =
//     Output {
//       address: factory_address,
//       value: output_value,
//       reference_script: None,
//       datum: InlineDatum(
//         FactoryDatum {
//           head: #"00",
//           tail: #"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00",
//         },
//       ),
//     }
//   let outputs: List<Output> =
//     [output]
//   let sc =
//     ScriptContext {
//       transaction: Transaction {
//         ..transaction.placeholder(),
//         inputs: inputs,
//         mint: mint,
//         outputs: outputs,
//       },
//       purpose,
//     }
//   sc
// }

// test test_1_v_a_mint_fa() {
//   let AuthenValidatorParams { out_ref, factory_auth_an, treasury_auth_an } =
//     gen_authen_validator_params()
//   let redeemer: AuthenRedeemer = MintFactoryAuthen
//   let context = gen_sc_create_factory()
//   validation.validate_authen(
//     out_ref,
//     factory_auth_an,
//     treasury_auth_an,
//     redeemer,
//     context,
//   )
// }
