import {
  applyParamsToScript,
  Data,
  type Validator,
} from "@minswap/translucent";

export interface AuthenMintingPolicyValidateAuthen {
  new (outRef: {
    transactionId: { hash: string };
    outputIndex: bigint;
  }): Validator;
  redeemer:
    | "MintFactory"
    | { MintTreasury: { step: "CreateTreasury" | "RemoveTreasury" } };
}

export const AuthenMintingPolicyValidateAuthen = Object.assign(
  function (outRef: { transactionId: { hash: string }; outputIndex: bigint }) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "590408010000323232323232322232323225333007323232533300a3007300b37540022646464a66601a6014601c6ea802c4c8c8c8c94ccc050c05ccc014dd6180b002119baf30173014375400202226464a66602c60320042646464a66602ca66602c66e3cdd7180d8020060a99980b19b8f002488107666163746f7279001301200114a029404c8c94ccc06cc0780084c94ccc064cdc3a400860346ea80044c94ccc068c05cc06cdd5000899191919299981098120010a99980f19b8f003488101000013371e00291121ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000014a02c6eb8c088004c088008dd71810000980e1baa00116301e301b37540022c603a603c603c60346ea800458c070004cc02801c8c04cccc030dd5980e180e980c9baa00100d488107666163746f72790016375a603460360046eb8c064004c06400458dd6180b8009919800800991980080080191299980b8008a5eb7bdb1804c8c8c8c94ccc060cdc7a44100002100313301c337606ea4008dd3000998030030019bab3019003375c602e0046036004603200244a66602c002297ae0132333222323300100100322533301c00110031323301e374e6603c6ea4018cc078dd49bae301b0013301e37506eb4c0700052f5c0660060066040004603c0026eb8c054004dd5980b00099801801980d001180c0008b1bab3015301630160023758602800260286028002601e6ea80144c94ccc038c02cc03cdd5180998081baa00c1300a00113370e002900219918008009129998090008a4000266e0120023300200230150013300137586024601e6ea80148c028ccc00cdd59809980a18081baa301330143010375400200891107666163746f72790022323300100100322533301300114bd70099192999809180280109980b00119802002000899802002000980b801180a800911192999807980598081baa0011480004dd6980a18089baa00132533300f300b30103754002298103d87a8000132330010013756602a60246ea8008894ccc050004530103d87a8000132323253330143371e00e6eb8c05400c4cdd2a4000660306ea00052f5c026600a00a0046eb4c054008c060008c058004c8cc004004010894ccc04c004530103d87a8000132323253330133371e00e6eb8c05000c4cdd2a40006602e6e980052f5c026600a00a0046eacc050008c05c008c054004dd7180798061baa00116300e300f002300d0013009375400229309b2b19299980318018008a99980498041baa00414985854ccc018c0080044c8c94ccc02cc0380084c92632533300930060011533300c300b37540042930b0a99980498028008a99980618059baa00214985858c024dd50008b180600098041baa00416300637540066e1d2002370e90002b9a5573aaae7955cfaba05742ae881",
        [outRef],
        {
          dataType: "list",
          items: [
            {
              title: "OutputReference",
              description:
                "An `OutputReference` is a unique reference to an output on-chain. The `output_index`\n corresponds to the position in the output list of the transaction (identified by its id)\n that produced that output",
              anyOf: [
                {
                  title: "OutputReference",
                  dataType: "constructor",
                  index: 0,
                  fields: [
                    {
                      title: "transactionId",
                      description:
                        "A unique transaction identifier, as the hash of a transaction body. Note that the transaction id\n isn't a direct hash of the `Transaction` as visible on-chain. Rather, they correspond to hash\n digests of transaction body as they are serialized on the network.",
                      anyOf: [
                        {
                          title: "TransactionId",
                          dataType: "constructor",
                          index: 0,
                          fields: [{ dataType: "bytes", title: "hash" }],
                        },
                      ],
                    },
                    { dataType: "integer", title: "outputIndex" },
                  ],
                },
              ],
            },
          ],
        } as any,
      ),
    };
  },

  {
    redeemer: {
      title: "AuthenRedeemer",
      anyOf: [
        { title: "MintFactory", dataType: "constructor", index: 0, fields: [] },
        {
          title: "MintTreasury",
          dataType: "constructor",
          index: 1,
          fields: [
            {
              title: "step",
              anyOf: [
                {
                  title: "CreateTreasury",
                  dataType: "constructor",
                  index: 0,
                  fields: [],
                },
                {
                  title: "RemoveTreasury",
                  dataType: "constructor",
                  index: 1,
                  fields: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },
) as unknown as AuthenMintingPolicyValidateAuthen;

export interface ExampleValidateSpending {
  new (): Validator;
  _: Data;
  redeemer: { wrapper: "Spending1" | "Minting2" };
}

export const ExampleValidateSpending = Object.assign(
  function () {
    return {
      type: "PlutusV2",
      script:
        "58ea0100003232323232322253232333005300230063754006264a66600ca66600c6006600e6ea8c028c02cc020dd50020a999803180118039baa00514a2294058526136563253330063003001153330093008375400a2930b0a99980318010008a99980498041baa00514985858c018dd500209919129998042999804180218049baa300c300d300a37540022a666010600a60126ea800c5288a501614984d958c94ccc01cc01000454ccc028c024dd50010a4c2c2a66600e60060022a66601460126ea80085261616300737540026012600e6ea800cdc3a40046e1d20005734aae7555cf2ab9f5742ae881",
    };
  },
  { _: { title: "Data", description: "Any Plutus data." } },
  {
    redeemer: {
      title: "Wrapped Redeemer",
      description:
        "A redeemer wrapped in an extra constructor to make multi-validator detection possible on-chain.",
      anyOf: [
        {
          dataType: "constructor",
          index: 1,
          fields: [
            {
              anyOf: [
                {
                  title: "Spending1",
                  dataType: "constructor",
                  index: 0,
                  fields: [],
                },
                {
                  title: "Minting2",
                  dataType: "constructor",
                  index: 1,
                  fields: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },
) as unknown as ExampleValidateSpending;

export interface ExampleValidateMinting {
  new (): Validator;
  redeemer: "Spending1" | "Minting2";
}

export const ExampleValidateMinting = Object.assign(
  function () {
    return {
      type: "PlutusV2",
      script:
        "58ea0100003232323232322253232333005300230063754006264a66600ca66600c6006600e6ea8c028c02cc020dd50020a999803180118039baa00514a2294058526136563253330063003001153330093008375400a2930b0a99980318010008a99980498041baa00514985858c018dd500209919129998042999804180218049baa300c300d300a37540022a666010600a60126ea800c5288a501614984d958c94ccc01cc01000454ccc028c024dd50010a4c2c2a66600e60060022a66601460126ea80085261616300737540026012600e6ea800cdc3a40046e1d20005734aae7555cf2ab9f5742ae881",
    };
  },

  {
    redeemer: {
      title: "Redeemer",
      anyOf: [
        { title: "Spending1", dataType: "constructor", index: 0, fields: [] },
        { title: "Minting2", dataType: "constructor", index: 1, fields: [] },
      ],
    },
  },
) as unknown as ExampleValidateMinting;

export interface FactoryValidatorValidateFactory {
  new (
    authenPolicyId: string,
    treasuryHash: string,
    orderHash: string,
    sellerHash: string,
  ): Validator;
  datum: { head: string; tail: string };
  redeemer: {
    baseAsset: { policyId: string; assetName: string };
    raiseAsset: { policyId: string; assetName: string };
    step: "CreateTreasury" | "RemoveTreasury";
  };
}

export const FactoryValidatorValidateFactory = Object.assign(
  function (
    authenPolicyId: string,
    treasuryHash: string,
    orderHash: string,
    sellerHash: string,
  ) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "590106010000323232323232232232232232232322322533300f4a229309b2b192999807180218079baa0021323232323232533301730190021323232498c94ccc05cc03400454ccc068c064dd50020a4c2c2a66602e66e1d20020011533301a301937540082930b0b180b9baa003300800430070051630170013017002301500130150023013001301037540042c4a66601c6008601e6ea80044c8c8c8c94ccc054c05c00852616375c602a002602a0046eb8c04c004c040dd50008b2999805980098061baa00213232323253330123014002149858dd7180900098090011bae3010001300d37540042c6e1d2000375c0026eb8004dd70009bae0015734aae7555cf2ab9f5742ae89",
        [authenPolicyId, treasuryHash, orderHash, sellerHash],
        {
          dataType: "list",
          items: [
            { dataType: "bytes" },
            { dataType: "bytes" },
            { dataType: "bytes" },
            { dataType: "bytes" },
          ],
        } as any,
      ),
    };
  },
  {
    datum: {
      title: "FactoryDatum",
      anyOf: [
        {
          title: "FactoryDatum",
          dataType: "constructor",
          index: 0,
          fields: [
            { dataType: "bytes", title: "head" },
            { dataType: "bytes", title: "tail" },
          ],
        },
      ],
    },
  },
  {
    redeemer: {
      title: "FactoryRedeemer",
      anyOf: [
        {
          title: "FactoryRedeemer",
          dataType: "constructor",
          index: 0,
          fields: [
            {
              title: "baseAsset",
              anyOf: [
                {
                  title: "Asset",
                  dataType: "constructor",
                  index: 0,
                  fields: [
                    { dataType: "bytes", title: "policyId" },
                    { dataType: "bytes", title: "assetName" },
                  ],
                },
              ],
            },
            {
              title: "raiseAsset",
              anyOf: [
                {
                  title: "Asset",
                  dataType: "constructor",
                  index: 0,
                  fields: [
                    { dataType: "bytes", title: "policyId" },
                    { dataType: "bytes", title: "assetName" },
                  ],
                },
              ],
            },
            {
              title: "step",
              anyOf: [
                {
                  title: "CreateTreasury",
                  dataType: "constructor",
                  index: 0,
                  fields: [],
                },
                {
                  title: "RemoveTreasury",
                  dataType: "constructor",
                  index: 1,
                  fields: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },
) as unknown as FactoryValidatorValidateFactory;

export interface OrderValidatorFeedTypeOrder {
  new (): Validator;
  _datum: {
    baseAsset: { policyId: string; assetName: string };
    raiseAsset: { policyId: string; assetName: string };
    owner: {
      paymentCredential:
        | { VerificationKeyCredential: [string] }
        | { ScriptCredential: [string] };
      stakeCredential:
        | {
            Inline: [
              | { VerificationKeyCredential: [string] }
              | { ScriptCredential: [string] },
            ];
          }
        | {
            Pointer: {
              slotNumber: bigint;
              transactionIndex: bigint;
              certificateIndex: bigint;
            };
          }
        | null;
    };
    amount: bigint;
    isCollected: boolean;
    penaltyAmount: bigint;
  };
  _redeemer: "UpdateOrder" | "WithdrawOrder" | "CollectOrder" | "RedeemOrder";
}

export const OrderValidatorFeedTypeOrder = Object.assign(
  function () {
    return {
      type: "PlutusV2",
      script:
        "59023f0100003232323232322323232232253330084a029309b2b19299980398028008a99980518049baa00214985854ccc01cc01000454ccc028c024dd50010a4c2c2a66600e66e1d20040011533300a300937540042930b0a99980399b874801800454ccc028c024dd50010a4c2c2c600e6ea8004c8c94ccc018c010c01cdd50028991919191919191919191919299980a980b801099191924ca6660286024602a6ea80244c8c8c8c94ccc06cc0740084c8c92632533301a301800113232533301f3021002132498c94ccc074c06c0044c8c94ccc088c0900084c926301b001163022001301f37540042a66603a60340022646464646464a66604c60500042930b1bad30260013026002375a604800260480046eb4c088004c07cdd50010b180e9baa00116301f001301c37540062a666034602e0022a66603a60386ea800c5261616301a375400460280062c603600260360046032002602c6ea802458c038028c03402c58dd6980a800980a80119299980998090008a999808180698088008a5115333010300e301100114a02c2c6ea8c04c004c04c008dd6980880098088011807800980780118068009806801180580098041baa0051625333006300430073754002264646464a66601a601e0042930b1bae300d001300d002375c601600260106ea8004588c94ccc018c0100044c8c94ccc02cc03400852616375c601600260106ea800854ccc018c00c0044c8c94ccc02cc03400852616375c601600260106ea800858c018dd50009b8748008dc3a4000ae6955ceaab9e5573eae855d101",
    };
  },
  {
    _datum: {
      title: "OrderDatum",
      anyOf: [
        {
          title: "OrderDatum",
          dataType: "constructor",
          index: 0,
          fields: [
            {
              title: "baseAsset",
              anyOf: [
                {
                  title: "Asset",
                  dataType: "constructor",
                  index: 0,
                  fields: [
                    { dataType: "bytes", title: "policyId" },
                    { dataType: "bytes", title: "assetName" },
                  ],
                },
              ],
            },
            {
              title: "raiseAsset",
              anyOf: [
                {
                  title: "Asset",
                  dataType: "constructor",
                  index: 0,
                  fields: [
                    { dataType: "bytes", title: "policyId" },
                    { dataType: "bytes", title: "assetName" },
                  ],
                },
              ],
            },
            {
              title: "owner",
              description:
                "A Cardano `Address` typically holding one or two credential references.\n\n Note that legacy bootstrap addresses (a.k.a. 'Byron addresses') are\n completely excluded from Plutus contexts. Thus, from an on-chain\n perspective only exists addresses of type 00, 01, ..., 07 as detailed\n in [CIP-0019 :: Shelley Addresses](https://github.com/cardano-foundation/CIPs/tree/master/CIP-0019/#shelley-addresses).",
              anyOf: [
                {
                  title: "Address",
                  dataType: "constructor",
                  index: 0,
                  fields: [
                    {
                      title: "paymentCredential",
                      description:
                        "A general structure for representing an on-chain `Credential`.\n\n Credentials are always one of two kinds: a direct public/private key\n pair, or a script (native or Plutus).",
                      anyOf: [
                        {
                          title: "VerificationKeyCredential",
                          dataType: "constructor",
                          index: 0,
                          fields: [{ dataType: "bytes" }],
                        },
                        {
                          title: "ScriptCredential",
                          dataType: "constructor",
                          index: 1,
                          fields: [{ dataType: "bytes" }],
                        },
                      ],
                    },
                    {
                      title: "stakeCredential",
                      anyOf: [
                        {
                          title: "Some",
                          description: "An optional value.",
                          dataType: "constructor",
                          index: 0,
                          fields: [
                            {
                              description:
                                "Represent a type of object that can be represented either inline (by hash)\n or via a reference (i.e. a pointer to an on-chain location).\n\n This is mainly use for capturing pointers to a stake credential\n registration certificate in the case of so-called pointer addresses.",
                              anyOf: [
                                {
                                  title: "Inline",
                                  dataType: "constructor",
                                  index: 0,
                                  fields: [
                                    {
                                      description:
                                        "A general structure for representing an on-chain `Credential`.\n\n Credentials are always one of two kinds: a direct public/private key\n pair, or a script (native or Plutus).",
                                      anyOf: [
                                        {
                                          title: "VerificationKeyCredential",
                                          dataType: "constructor",
                                          index: 0,
                                          fields: [{ dataType: "bytes" }],
                                        },
                                        {
                                          title: "ScriptCredential",
                                          dataType: "constructor",
                                          index: 1,
                                          fields: [{ dataType: "bytes" }],
                                        },
                                      ],
                                    },
                                  ],
                                },
                                {
                                  title: "Pointer",
                                  dataType: "constructor",
                                  index: 1,
                                  fields: [
                                    {
                                      dataType: "integer",
                                      title: "slotNumber",
                                    },
                                    {
                                      dataType: "integer",
                                      title: "transactionIndex",
                                    },
                                    {
                                      dataType: "integer",
                                      title: "certificateIndex",
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                        {
                          title: "None",
                          description: "Nothing.",
                          dataType: "constructor",
                          index: 1,
                          fields: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            { dataType: "integer", title: "amount" },
            {
              title: "isCollected",
              anyOf: [
                {
                  title: "False",
                  dataType: "constructor",
                  index: 0,
                  fields: [],
                },
                {
                  title: "True",
                  dataType: "constructor",
                  index: 1,
                  fields: [],
                },
              ],
            },
            { dataType: "integer", title: "penaltyAmount" },
          ],
        },
      ],
    },
  },
  {
    _redeemer: {
      title: "OrderRedeemer",
      anyOf: [
        { title: "UpdateOrder", dataType: "constructor", index: 0, fields: [] },
        {
          title: "WithdrawOrder",
          dataType: "constructor",
          index: 1,
          fields: [],
        },
        {
          title: "CollectOrder",
          dataType: "constructor",
          index: 2,
          fields: [],
        },
        { title: "RedeemOrder", dataType: "constructor", index: 3, fields: [] },
      ],
    },
  },
) as unknown as OrderValidatorFeedTypeOrder;

export interface OrderValidatorValidateOrder {
  new (treasuryHash: string, sellerHash: string): Validator;
  _rawDatum: Data;
  rawRedeemer: Data;
}

export const OrderValidatorValidateOrder = Object.assign(
  function (treasuryHash: string, sellerHash: string) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "5902760100003232323232323223223222253330083232323253323300d3001300e37546024602600a26464646464a666024600c008266e20ccc004c00c020039221056f7264657200480004c94ccc04ccdc3a400800a26600201060066602e66e95200233017375202297ae04bd700a99980999b87480000144cc004020c00ccc05ccdd2a40046602e6ea403d2f5c097ae0133710666004600801201e9101056f72646572004800088c8cc00400400c894ccc064004528099299980b99baf0043018301c00214a2266006006002603800244464a66602a6012602c6ea8004520001375a6034602e6ea8004c94ccc054c024c058dd50008a6103d87a8000132330010013756603660306ea8008894ccc068004530103d87a80001323232533301a3371e00e6eb8c06c00c4c028cc078dd4000a5eb804cc014014008dd6980d801180f001180e000991980080080211299980c8008a6103d87a8000132323253330193371e00e6eb8c06800c4c024cc074dd3000a5eb804cc014014008dd5980d001180e801180d8009ba5480008c8cc004004008894ccc05400452f5bded8c0264646464a66602c66e3d220100002100313301a337606ea4008dd3000998030030019bab3017003375c602a0046032004602e002601e6ea8020c94ccc038cdc3a40000022a66602260206ea8020526161533300e300200115333011301037540102930b0a99980719b874801000454ccc044c040dd50040a4c2c2a66601c66e1d200600115333011301037540102930b0b18071baa007370e90010b1bab3010301130110023756601e002601e601e601e601e60166ea8c038004c028dd50008a4c26cac6eb8004dd7000ab9a5573aaae7955cfaba05742ae89",
        [treasuryHash, sellerHash],
        {
          dataType: "list",
          items: [{ dataType: "bytes" }, { dataType: "bytes" }],
        } as any,
      ),
    };
  },
  { _rawDatum: { title: "Data", description: "Any Plutus data." } },
  { rawRedeemer: { title: "Data", description: "Any Plutus data." } },
) as unknown as OrderValidatorValidateOrder;

export interface SellerValidatorValidateSellerSpending {
  new (authenPolicyId: string, treasuryHash: string): Validator;
  sellerInDatum: {
    baseAsset: { policyId: string; assetName: string };
    raiseAsset: { policyId: string; assetName: string };
    amount: bigint;
    penaltyAmount: bigint;
  };
  redeemer: { wrapper: "UsingSeller" | "CountingSeller" | "CollectOrderToken" };
}

export const SellerValidatorValidateSellerSpending = Object.assign(
  function (authenPolicyId: string, treasuryHash: string) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "5912a0010000323232323232322322322253232323233300b3001300c375400a264a666018646464646464a6660246010006264a66602c60326600600a46464a66602c601c66600a6eacc06cc07000804922010673656c6c65720015333016300e30173754002266e3c010dd7180d980c1baa00114a02940c068c05cdd5180d000980b1baa3019301a30163754002294458c94ccc04cc0240044dd7180c180a9baa00615333013300a0011325333014300a30153754002264a66602a601a602c6ea80044dd7180d180b9baa001163019301637540022c6030602a6ea801858c04cdd50028a99980918048018a99980a980c1980100211919299980a98069998021bab301a301b0020134890874726561737572790015333015300d30163754002266e3c044dd7180d180b9baa00114a02940c064c058dd5180c800980a9baa301830193015375400229445852811119299980a9806980b1baa0011480004dd6980d180b9baa001325333015300d30163754002298103d87a8000132330010013756603660306ea8008894ccc068004530103d87a80001323232533301a3371e00e6eb8c06c00c4c04ccc078dd4000a5eb804cc014014008dd6980d801180f001180e000991980080080211299980c8008a6103d87a8000132323253330193371e00e6eb8c06800c4c048cc074dd3000a5eb804cc014014008dd5980d001180e801180d80091191980080080191299980b8008a5eb804c8c94ccc058c0140084cc068008cc0100100044cc010010004c06c008c064004c040dd50051bac301330103754602600460246026002601c6ea80185261365632533300c30020011533300f300e375400e2930b0a99980618020008a99980798071baa00714985854ccc030c00c00454ccc03cc038dd50038a4c2c2c60186ea80184cc8c8c88c894ccc044c8c8c94ccc050c030c054dd5000899191919299980c1808001099b8833300100301448810673656c6c6572004800054ccc060c0380084c8c8c8c8c8c8c8c8c8c8c94ccc08cc06cc090dd5000899192999812980e98131baa00113232323232533302a3022302b3754002264a66605c60626600a024464a66605a604a605c6ea80044cdc79bae3032302f37540020062940c0c4c0b8dd5181898171baa30313032302e375400226464a66606060660042646464a666060604e60626ea80044c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc10ccdd7980518229baa00e30093045375407c264a66608866ebcc004c118dd5007980718231baa03f153330443375e6016608c6ea803cc028c118dd500a0a99982219baf30013046375401e601c608c6ea805054ccc110cdc41bad3049304a304a304a304a304a304a3046375401e0422a66608866e2007cdd69824982518251825182518251825182518231baa00f153330443375e6e98070dd300b0a9998221919b87375a6002608e6ea8054cdc01bad30013047375408001246094609660960022a6660886466e1cdd6980098239baa015337006eb4c004c11cdd50200041182518259825982580088010a5014a029405280a5014a0294052811824982518251825182518250008a503253330433370e006004266ebcdd39800817260101800013375e6e9cc0040b8dd3998239ba73304737520326608e980106456f726465720033047375066e0400800d2f5c097ae02323300100100222533304800114bd7009919991119198008008019129998270008801899198281ba733050375200c660a06ea4dd71826800998281ba8375a609c00297ae03300300330520023050001375c608e0026eacc120004cc00c00cc130008c128004c008024c004024c004004894ccc10c0045200013370090011980100118230009bad303f002375a607a0026666464646464444646464646464a66609266e1ccdc08008022999824982098251baa0091480004c8c8c8c94ccc1354ccc134cdc40141bad305200414a2266e200080a8520001533304d3371000c012266e0ccdc119b81009006001483200452000375a60a260a40046eb4c140004c140004c12cdd5182718259baa0091337606ea0cdc08010029ba8337020020082c6eb4c128008dd6982400099980480725ef6c610100000101000022323232533304b3042304c37540022646464a66609c6088609e6ea800c4c8c8c8c8c8c8c8c8c8c8c8c94ccc174c1800084c8c8c8c94ccc178c150c17cdd5000899299982fa99982f998100201bae3064306137540042a6660bea6660be01029404ccc17d282504a22a6660be66ebc04007854ccc17ccdd780700e899baf374c0026e980585280a5014a029404cdd81ba8337000260146ea0cdc00090030b199981000480281a00e0b1831182f9baa00a3029009305000a304f00b16375a60bc00260bc00464a6660b660b40022a6660b060a060b2002294454ccc160c138c1640045280b0b1baa305c001305c002375a60b400260b400460b000260b000460ac00260ac00460a800260a06ea800c58dd698278031bad304d0053050304d37540022c609e60a00046eacc138004c138c128dd50011bad3047002375a608a00266600c01897bdb18101000001010000223232325333048303f304937540022646464a666096608260986ea800c4c8c8c8c8c8c8c8c8c8c8c8c94ccc168c1740084c8c8c8c94ccc16cc144c170dd5000899299982e299982e1980e81e9bae3061305e37540042a6660b8a6660b801029404ccc171282504a22a6660b866ebc04006c54ccc170cdd780700d099baf374c0026e980585280a5014a029404cdd81ba8337000260146ea0cdc00090030b199980e80480281880c8b182f982e1baa00a3026009304d00a304c00b16375a60b600260b600464a6660b060ae0022a6660aa609a60ac002294454ccc154c12cc1580045280b0b1baa30590013059002375a60ae00260ae00460aa00260aa00460a600260a600460a2002609a6ea800c58dd698260031bad304a005304d304a37540022c6098609a0046eacc12c004c12cc11cdd51825182598239baa00222323300100100322533304600114a0264a66608866e3cdd718248010020a51133003003001304900122223333006333300633330064bd6f7b6302441004881005333042337109000002099b80482026fb808cdc12410112f490020a410125e8026eb8c020c110dd50009bae300c3044375400266e0001000c0092201056f726465720048008888c8ccc00400401000c8894ccc11800840044ccc00c00cc124008cc010c12000800488894ccc100c0d800440104c8c8cc004004018894ccc1180044cc11ccdd81ba9006374c00697adef6c6013232323253330473375e66018014004980103d879800013304b337606ea4028dd30038028a99982399b8f00a0021325333048303e3049375400226609866ec0dd4805982698251baa0010041004325333048533304b00114a229405300103d87a8000130413304c374c00297ae0323300100100222533304c00113304d337606ea402cdd400525eb7bdb1804c8c8c8c94ccc134cdd79980900780126103d8798000133051337606ea403cdd40070028a99982699b8f00f002132533304e3044304f37540022660a466ec0dd4808182998281baa001004100432533304e304400114c103d87a80001304733052375000297ae03370000201c2660a266ec0dd48011ba800133006006003375a609c0066eb8c130008c140008c1380044cc12ccdd81ba9002374c0026600c00c0066eacc12000cdd7182300118250011824000991900119198008008011129998230008a4c264a66608e002293099192999823181e18239baa3300b375c608e60960086eb8c11c0084cc014014cc12800800458c12c008c124004c124004cc110cdd81ba9002375000297adef6c6022533303d337200040022980103d87980001533303d3371e0040022980103d87a800014c103d87b8000304030413041304130413041304130413041304130413041304130413041303d375400c6004607a6ea8018c008c0f4dd5003118200009181f9820182018201820000991980980e11919299981e181a1998129bab304130420020124881056f726465720013375e0026010660806ea40112f5c02940c100c0f4dd51820000981e1baa001375c600460746ea800cc8cc04807c8c8c94ccc0ecc0ccccc090dd598201820801008a45056f726465720013375e002600e6607e6ea40112f5c02940c0fcc0f0dd5181f800981d9baa303e303f303b37540026eb8c004c0e4dd50011181e181e800991919299981d981f001099299981c9818181d1baa00113232002533303a3030303b375400226464646464646464646464646464646464646464646464646464646464646464a6660ba60c0004264646464646493192999830182b000899192999832983400109924ca6660c460b060c66ea80044c8c8c8c8c8c94ccc1acc1b800852616375a60d800260d80046eb4c1a8004c1a8008dd6983400098321baa00116163066001306237540122a6660c060b00022a6660c660c46ea8024526161630603754010605201e6050020605202260a002c609e02e2c6eb4c178004c178008c170004c170008dd6982d000982d0011bad30580013058002375a60ac00260ac00460a800260a800460a400260a400460a000260a00046eb4c138004c138008dd69826000982600118250009825001182400098240011bad30460013046002375a608800260880046eb8c108004c108008dd71820000981e1baa00116303e303b37540022c607a607c607c60746ea8c0f4c0f8c0e8dd50008b181e0009980800d91919299981c98189998111bab303e303f00203748810874726561737572790013375e002600a6607a6ea40d52f5c02940c0f4c0e8dd5181e800981c9baa303c303d30393754002464a66606e605a00226464a666078607e0042930b1bad303d001303937540042a66606e605e0022a66607460726ea80085261616303737540026e95200225333034302a30353754002264646464a666076607c004264649319299981d181800089919299981f982100109924c64a66607a606600226464a666084608a0042649318068008b1821800981f9baa0021533303d3035001132323232323253330463049002149858dd6982380098238011bad30450013045002375a6086002607e6ea800858c0f4dd50008b1820000981e1baa0031533303a30320011533303d303c37540062930b0b181d1baa002300600316303c001303c002303a001303637540022c464a666068605400226464a66607260780042930b1bae303a001303637540042a666068605800226464a66607260780042930b1bae303a001303637540042c60686ea8004c094004c0d4c0c8dd50008b181a181a8011bab30330013033302f37540022c60620026600a01c46464a66605c604c66602e6eacc0ccc0d00080a92210673656c6c6572001533302e3026302f3754002266e3cdd7181998181baa00100414a02940c0c8c0bcdd5181900098171baa00116375c605e60586ea800458c0b8c0acdd518170011bab302d302e001302937546058605a60526ea8c8c94ccc0b0c0bc008400458c0b4004cc0040388c8c94ccc0a8c088ccc04cdd59817981818161baa302f30300020264890673656c6c65720013375e00202c2940c0b8004c0a8dd50009119198008008019129998168008a5eb804c8c94ccc0b0c0140084cc0c0008cc0100100044cc010010004c0c4008c0bc004dd6981518139baa001163029302637540066eb4c0a0c094dd50008b181398121baa30270023026302700130223754604a0046eb0c090c094004c090c090c090c090c090008dd6181100098110011bac302000130200023758603c00260346ea801852811119299980d9809980e1baa0011480004dd69810180e9baa00132533301b3013301c3754002298103d87a80001323300100137566042603c6ea8008894ccc080004530103d87a8000132323253330203371e00e6eb8c08400c4c064cc090dd4000a5eb804cc014014008dd6981080118120011811000991980080080211299980f8008a6103d87a80001323232533301f3371e00e6eb8c08000c4c060cc08cdd3000a5eb804cc014014008dd5981000118118011810800980b9baa008323300100137566036603860386038603860306ea8010894ccc06800452f5bded8c0264646464a66603666e3d22100002100313301f337606ea4008dd3000998030030019bab301c003375c6034004603c00460380026032602c6ea800458c060c064008c05c004c04cdd50008a4c26cac64a666020600c0022a66602660246ea80085261615333010300800115333013301237540042930b0a99980818038008a99980998091baa00214985858c040dd5000980080412999806980198071baa001132323232323232325333018301b00213232498c02c018c02801c58dd6980c800980c8011bad30170013017002301500130150023013001300f37540022c4a6660186004601a6ea80044c8c8c8c94ccc04cc05800852616375c602800260280046eb8c048004c038dd50008b180818069baa005370e90001b8748010dc3a40046e952000375c0026eb80055cd2ab9d5573caae7d5d02ba15745",
        [authenPolicyId, treasuryHash],
        {
          dataType: "list",
          items: [{ dataType: "bytes" }, { dataType: "bytes" }],
        } as any,
      ),
    };
  },
  {
    sellerInDatum: {
      title: "SellerDatum",
      anyOf: [
        {
          title: "SellerDatum",
          dataType: "constructor",
          index: 0,
          fields: [
            {
              title: "baseAsset",
              anyOf: [
                {
                  title: "Asset",
                  dataType: "constructor",
                  index: 0,
                  fields: [
                    { dataType: "bytes", title: "policyId" },
                    { dataType: "bytes", title: "assetName" },
                  ],
                },
              ],
            },
            {
              title: "raiseAsset",
              anyOf: [
                {
                  title: "Asset",
                  dataType: "constructor",
                  index: 0,
                  fields: [
                    { dataType: "bytes", title: "policyId" },
                    { dataType: "bytes", title: "assetName" },
                  ],
                },
              ],
            },
            { dataType: "integer", title: "amount" },
            { dataType: "integer", title: "penaltyAmount" },
          ],
        },
      ],
    },
  },
  {
    redeemer: {
      title: "Wrapped Redeemer",
      description:
        "A redeemer wrapped in an extra constructor to make multi-validator detection possible on-chain.",
      anyOf: [
        {
          dataType: "constructor",
          index: 1,
          fields: [
            {
              anyOf: [
                {
                  title: "UsingSeller",
                  dataType: "constructor",
                  index: 0,
                  fields: [],
                },
                {
                  title: "CountingSeller",
                  dataType: "constructor",
                  index: 1,
                  fields: [],
                },
                {
                  title: "CollectOrderToken",
                  dataType: "constructor",
                  index: 2,
                  fields: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },
) as unknown as SellerValidatorValidateSellerSpending;

export interface SellerValidatorValidateSellerMintingOrWithdraw {
  new (authenPolicyId: string, treasuryHash: string): Validator;
  redeemer: "UsingSeller" | "CountingSeller" | "CollectOrderToken";
}

export const SellerValidatorValidateSellerMintingOrWithdraw = Object.assign(
  function (authenPolicyId: string, treasuryHash: string) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "5912a0010000323232323232322322322253232323233300b3001300c375400a264a666018646464646464a6660246010006264a66602c60326600600a46464a66602c601c66600a6eacc06cc07000804922010673656c6c65720015333016300e30173754002266e3c010dd7180d980c1baa00114a02940c068c05cdd5180d000980b1baa3019301a30163754002294458c94ccc04cc0240044dd7180c180a9baa00615333013300a0011325333014300a30153754002264a66602a601a602c6ea80044dd7180d180b9baa001163019301637540022c6030602a6ea801858c04cdd50028a99980918048018a99980a980c1980100211919299980a98069998021bab301a301b0020134890874726561737572790015333015300d30163754002266e3c044dd7180d180b9baa00114a02940c064c058dd5180c800980a9baa301830193015375400229445852811119299980a9806980b1baa0011480004dd6980d180b9baa001325333015300d30163754002298103d87a8000132330010013756603660306ea8008894ccc068004530103d87a80001323232533301a3371e00e6eb8c06c00c4c04ccc078dd4000a5eb804cc014014008dd6980d801180f001180e000991980080080211299980c8008a6103d87a8000132323253330193371e00e6eb8c06800c4c048cc074dd3000a5eb804cc014014008dd5980d001180e801180d80091191980080080191299980b8008a5eb804c8c94ccc058c0140084cc068008cc0100100044cc010010004c06c008c064004c040dd50051bac301330103754602600460246026002601c6ea80185261365632533300c30020011533300f300e375400e2930b0a99980618020008a99980798071baa00714985854ccc030c00c00454ccc03cc038dd50038a4c2c2c60186ea80184cc8c8c88c894ccc044c8c8c94ccc050c030c054dd5000899191919299980c1808001099b8833300100301448810673656c6c6572004800054ccc060c0380084c8c8c8c8c8c8c8c8c8c8c94ccc08cc06cc090dd5000899192999812980e98131baa00113232323232533302a3022302b3754002264a66605c60626600a024464a66605a604a605c6ea80044cdc79bae3032302f37540020062940c0c4c0b8dd5181898171baa30313032302e375400226464a66606060660042646464a666060604e60626ea80044c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc10ccdd7980518229baa00e30093045375407c264a66608866ebcc004c118dd5007980718231baa03f153330443375e6016608c6ea803cc028c118dd500a0a99982219baf30013046375401e601c608c6ea805054ccc110cdc41bad3049304a304a304a304a304a304a3046375401e0422a66608866e2007cdd69824982518251825182518251825182518231baa00f153330443375e6e98070dd300b0a9998221919b87375a6002608e6ea8054cdc01bad30013047375408001246094609660960022a6660886466e1cdd6980098239baa015337006eb4c004c11cdd50200041182518259825982580088010a5014a029405280a5014a0294052811824982518251825182518250008a503253330433370e006004266ebcdd39800817260101800013375e6e9cc0040b8dd3998239ba73304737520326608e980106456f726465720033047375066e0400800d2f5c097ae02323300100100222533304800114bd7009919991119198008008019129998270008801899198281ba733050375200c660a06ea4dd71826800998281ba8375a609c00297ae03300300330520023050001375c608e0026eacc120004cc00c00cc130008c128004c008024c004024c004004894ccc10c0045200013370090011980100118230009bad303f002375a607a0026666464646464444646464646464a66609266e1ccdc08008022999824982098251baa0091480004c8c8c8c94ccc1354ccc134cdc40141bad305200414a2266e200080a8520001533304d3371000c012266e0ccdc119b81009006001483200452000375a60a260a40046eb4c140004c140004c12cdd5182718259baa0091337606ea0cdc08010029ba8337020020082c6eb4c128008dd6982400099980480725ef6c610100000101000022323232533304b3042304c37540022646464a66609c6088609e6ea800c4c8c8c8c8c8c8c8c8c8c8c8c94ccc174c1800084c8c8c8c94ccc178c150c17cdd5000899299982fa99982f998100201bae3064306137540042a6660bea6660be01029404ccc17d282504a22a6660be66ebc04007854ccc17ccdd780700e899baf374c0026e980585280a5014a029404cdd81ba8337000260146ea0cdc00090030b199981000480281a00e0b1831182f9baa00a3029009305000a304f00b16375a60bc00260bc00464a6660b660b40022a6660b060a060b2002294454ccc160c138c1640045280b0b1baa305c001305c002375a60b400260b400460b000260b000460ac00260ac00460a800260a06ea800c58dd698278031bad304d0053050304d37540022c609e60a00046eacc138004c138c128dd50011bad3047002375a608a00266600c01897bdb18101000001010000223232325333048303f304937540022646464a666096608260986ea800c4c8c8c8c8c8c8c8c8c8c8c8c94ccc168c1740084c8c8c8c94ccc16cc144c170dd5000899299982e299982e1980e81e9bae3061305e37540042a6660b8a6660b801029404ccc171282504a22a6660b866ebc04006c54ccc170cdd780700d099baf374c0026e980585280a5014a029404cdd81ba8337000260146ea0cdc00090030b199980e80480281880c8b182f982e1baa00a3026009304d00a304c00b16375a60b600260b600464a6660b060ae0022a6660aa609a60ac002294454ccc154c12cc1580045280b0b1baa30590013059002375a60ae00260ae00460aa00260aa00460a600260a600460a2002609a6ea800c58dd698260031bad304a005304d304a37540022c6098609a0046eacc12c004c12cc11cdd51825182598239baa00222323300100100322533304600114a0264a66608866e3cdd718248010020a51133003003001304900122223333006333300633330064bd6f7b6302441004881005333042337109000002099b80482026fb808cdc12410112f490020a410125e8026eb8c020c110dd50009bae300c3044375400266e0001000c0092201056f726465720048008888c8ccc00400401000c8894ccc11800840044ccc00c00cc124008cc010c12000800488894ccc100c0d800440104c8c8cc004004018894ccc1180044cc11ccdd81ba9006374c00697adef6c6013232323253330473375e66018014004980103d879800013304b337606ea4028dd30038028a99982399b8f00a0021325333048303e3049375400226609866ec0dd4805982698251baa0010041004325333048533304b00114a229405300103d87a8000130413304c374c00297ae0323300100100222533304c00113304d337606ea402cdd400525eb7bdb1804c8c8c8c94ccc134cdd79980900780126103d8798000133051337606ea403cdd40070028a99982699b8f00f002132533304e3044304f37540022660a466ec0dd4808182998281baa001004100432533304e304400114c103d87a80001304733052375000297ae03370000201c2660a266ec0dd48011ba800133006006003375a609c0066eb8c130008c140008c1380044cc12ccdd81ba9002374c0026600c00c0066eacc12000cdd7182300118250011824000991900119198008008011129998230008a4c264a66608e002293099192999823181e18239baa3300b375c608e60960086eb8c11c0084cc014014cc12800800458c12c008c124004c124004cc110cdd81ba9002375000297adef6c6022533303d337200040022980103d87980001533303d3371e0040022980103d87a800014c103d87b8000304030413041304130413041304130413041304130413041304130413041303d375400c6004607a6ea8018c008c0f4dd5003118200009181f9820182018201820000991980980e11919299981e181a1998129bab304130420020124881056f726465720013375e0026010660806ea40112f5c02940c100c0f4dd51820000981e1baa001375c600460746ea800cc8cc04807c8c8c94ccc0ecc0ccccc090dd598201820801008a45056f726465720013375e002600e6607e6ea40112f5c02940c0fcc0f0dd5181f800981d9baa303e303f303b37540026eb8c004c0e4dd50011181e181e800991919299981d981f001099299981c9818181d1baa00113232002533303a3030303b375400226464646464646464646464646464646464646464646464646464646464646464a6660ba60c0004264646464646493192999830182b000899192999832983400109924ca6660c460b060c66ea80044c8c8c8c8c8c94ccc1acc1b800852616375a60d800260d80046eb4c1a8004c1a8008dd6983400098321baa00116163066001306237540122a6660c060b00022a6660c660c46ea8024526161630603754010605201e6050020605202260a002c609e02e2c6eb4c178004c178008c170004c170008dd6982d000982d0011bad30580013058002375a60ac00260ac00460a800260a800460a400260a400460a000260a00046eb4c138004c138008dd69826000982600118250009825001182400098240011bad30460013046002375a608800260880046eb8c108004c108008dd71820000981e1baa00116303e303b37540022c607a607c607c60746ea8c0f4c0f8c0e8dd50008b181e0009980800d91919299981c98189998111bab303e303f00203748810874726561737572790013375e002600a6607a6ea40d52f5c02940c0f4c0e8dd5181e800981c9baa303c303d30393754002464a66606e605a00226464a666078607e0042930b1bad303d001303937540042a66606e605e0022a66607460726ea80085261616303737540026e95200225333034302a30353754002264646464a666076607c004264649319299981d181800089919299981f982100109924c64a66607a606600226464a666084608a0042649318068008b1821800981f9baa0021533303d3035001132323232323253330463049002149858dd6982380098238011bad30450013045002375a6086002607e6ea800858c0f4dd50008b1820000981e1baa0031533303a30320011533303d303c37540062930b0b181d1baa002300600316303c001303c002303a001303637540022c464a666068605400226464a66607260780042930b1bae303a001303637540042a666068605800226464a66607260780042930b1bae303a001303637540042c60686ea8004c094004c0d4c0c8dd50008b181a181a8011bab30330013033302f37540022c60620026600a01c46464a66605c604c66602e6eacc0ccc0d00080a92210673656c6c6572001533302e3026302f3754002266e3cdd7181998181baa00100414a02940c0c8c0bcdd5181900098171baa00116375c605e60586ea800458c0b8c0acdd518170011bab302d302e001302937546058605a60526ea8c8c94ccc0b0c0bc008400458c0b4004cc0040388c8c94ccc0a8c088ccc04cdd59817981818161baa302f30300020264890673656c6c65720013375e00202c2940c0b8004c0a8dd50009119198008008019129998168008a5eb804c8c94ccc0b0c0140084cc0c0008cc0100100044cc010010004c0c4008c0bc004dd6981518139baa001163029302637540066eb4c0a0c094dd50008b181398121baa30270023026302700130223754604a0046eb0c090c094004c090c090c090c090c090008dd6181100098110011bac302000130200023758603c00260346ea801852811119299980d9809980e1baa0011480004dd69810180e9baa00132533301b3013301c3754002298103d87a80001323300100137566042603c6ea8008894ccc080004530103d87a8000132323253330203371e00e6eb8c08400c4c064cc090dd4000a5eb804cc014014008dd6981080118120011811000991980080080211299980f8008a6103d87a80001323232533301f3371e00e6eb8c08000c4c060cc08cdd3000a5eb804cc014014008dd5981000118118011810800980b9baa008323300100137566036603860386038603860306ea8010894ccc06800452f5bded8c0264646464a66603666e3d22100002100313301f337606ea4008dd3000998030030019bab301c003375c6034004603c00460380026032602c6ea800458c060c064008c05c004c04cdd50008a4c26cac64a666020600c0022a66602660246ea80085261615333010300800115333013301237540042930b0a99980818038008a99980998091baa00214985858c040dd5000980080412999806980198071baa001132323232323232325333018301b00213232498c02c018c02801c58dd6980c800980c8011bad30170013017002301500130150023013001300f37540022c4a6660186004601a6ea80044c8c8c8c94ccc04cc05800852616375c602800260280046eb8c048004c038dd50008b180818069baa005370e90001b8748010dc3a40046e952000375c0026eb80055cd2ab9d5573caae7d5d02ba15745",
        [authenPolicyId, treasuryHash],
        {
          dataType: "list",
          items: [{ dataType: "bytes" }, { dataType: "bytes" }],
        } as any,
      ),
    };
  },

  {
    redeemer: {
      title: "SellerRedeemer",
      anyOf: [
        { title: "UsingSeller", dataType: "constructor", index: 0, fields: [] },
        {
          title: "CountingSeller",
          dataType: "constructor",
          index: 1,
          fields: [],
        },
        {
          title: "CollectOrderToken",
          dataType: "constructor",
          index: 2,
          fields: [],
        },
      ],
    },
  },
) as unknown as SellerValidatorValidateSellerMintingOrWithdraw;

export interface TreasuryValidatorValidateTreasurySpending {
  new (authenPolicyId: string): Validator;
  treasuryInDatum: {
    sellerHash: string;
    orderHash: string;
    sellerCount: bigint;
    collectedFund: bigint;
    baseAsset: { policyId: string; assetName: string };
    raiseAsset: { policyId: string; assetName: string };
    startTime: bigint;
    endTime: bigint;
    owner: {
      paymentCredential:
        | { VerificationKeyCredential: [string] }
        | { ScriptCredential: [string] };
      stakeCredential:
        | {
            Inline: [
              | { VerificationKeyCredential: [string] }
              | { ScriptCredential: [string] },
            ];
          }
        | {
            Pointer: {
              slotNumber: bigint;
              transactionIndex: bigint;
              certificateIndex: bigint;
            };
          }
        | null;
    };
    minimumRaise: bigint | null;
    maximumRaise: bigint | null;
    reserveBase: bigint;
    reserveRaise: bigint;
    totalLiquidity: bigint;
    penaltyConfig: {
      penaltyStartTime: bigint;
      penaltyEndTime: bigint;
      percent: bigint;
    } | null;
    totalPenalty: bigint;
  };
  redeemer: {
    wrapper:
      | "InitTreasury"
      | { AddSeller: { amount: bigint } }
      | { CollectSeller: { amount: bigint } }
      | "CollectOrders"
      | "CreateAmmPool"
      | "RedeemLP"
      | "CloseEvent";
  };
}

export const TreasuryValidatorValidateTreasurySpending = Object.assign(
  function (authenPolicyId: string) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "592272010000323232323232322322253232323232323232323233300f300230103754016264a666020646464646464a66602c601a602e6ea804c54ccc058c038c05cdd5002899299980b9805180c1baa0011325333018300a30193754002266600600a02c6eb8c074c068dd50008b180e180c9baa00116301b3018375400a2c2a66602c6012602e6ea80144c8c8c8c94c8ccc06cc0380104c004dd319299980e1807980e9baa4c103d879800013333001333300133300301a488107666163746f727900480080692201087472656173757279004800801922010673656c6c657200480a04cccc004ccc00c069220107666163746f727900480040692201087472656173757279004800488894ccc07cc04800440104c8c8cc004004018894ccc0940044cc098cdd81ba9006374c00697adef6c60132323232533302630203300e00a00213302a337606ea4028dd30038028a99981319b8f00a0021325333027301a3028375400226605666ec0dd4805981618149baa0010041004325333027533302a00114a229405300103d87a8000130203302b374c00297ae0323300100100222533302b00113302c337606ea402cdd400525eb7bdb1804c8c8c8c94ccc0b0c098cc05003c0084cc0c0cdd81ba900f375001c00a2a66605866e3c03c0084c94ccc0b4c080c0b8dd500089981899bb037520206064605e6ea80040104010c94ccc0b4c0800045300103d87a80001302633031375000297ae03370000201c26606066ec0dd48011ba800133006006003375a605a0066eb8c0ac008c0bc008c0b40044cc0a8cdd81ba9002374c0026600c00c0066eacc09c00cdd7181280118148011813800991900119198008008011129998128008a4c264a66604c002293099192999812980c18131baa3300d375c604c60540086eb8c0980084cc014014cc0a400800458c0a8008c0a0004c0a0004cc08ccdd81ba9002375000297adef6c601533301b300d0041533301b3001374c64a666038602e002266600600c91010673656c6c65720000116375a6040603a6ea80604ccc0180200640145280a99980d98098020a99980d98009ba632533301c3017001133300300648810673656c6c6572003370490008008b1bad3020301d3754030266600c01003200a29405281baf374c00c444a666038601e002297adef6c6013232330010014bd6f7b63011299981100089981199bb0375200c6e9800d2f5bded8c0264646464a666046603a6601601400426604e66ec0dd48051ba6007005153330233371e01400426604e66ec0dd48051ba6007003133027337606ea4008dd3000998030030019bab3024003375c6044004604c0046048002646600200297adef6c60225333021001133022337606ea4010dd4001a5eb7bdb1804c8c8c8c94ccc088c070cc0280200084cc098cdd81ba9008375000e00a2a66604466e3c0200084cc098cdd81ba9008375000e00626604c66ec0dd48011ba800133006006003375a60460066eb8c084008c094008c08c004894ccc068cdc80010008a60103d87980001533301a3371e0040022980103d87a800014c103d87b8000301837540286eb8c06cc060dd50028b111299980d980f191980080080211299980e8008a5eb804c8c94ccc070c8c94ccc078c040c94ccc07cc044c080dd50008a400026eb4c090c084dd500099299980f980898101baa00114c103d87a8000132330010013756604a60446ea8008894ccc090004530103d87a8000132323253330243371e91108747265617375727900375c604a0062603a660506ea00052f5c026600a00a0046eb4c094008c0a0008c098004c8cc004004dd5981218128019129998118008a6103d87a8000132323253330233371e01a6eb8c09000c4c070cc09cdd3000a5eb804cc014014008dd59812001181380118128008a99980f1808180f9baa00113371e00e6eb8c08cc080dd50008a5014a06044603e6ea8c088004c078dd518109811180f1baa002133020002330040040011330040040013021002301f00114a22c64660020026eacc068c06cc06cc06cc06c00c894ccc06400452f5bded8c0264646464a66603466e3d22100002100313301e337606ea4008dd3000998030030019bab301b003375c6032004603a00460360026eb0c060004c050dd5180b801180b180b80098091baa00c14984d958c94ccc040c00c00454ccc04cc048dd50068a4c2c2a666020600400226464a66602a60300042930b1bad30160013012375401a2a666020601000226464a66602a60300042930b1bad30160013012375401a2a666020600e0022a66602660246ea803452616153330103006001153330133012375401a2930b0a99980818028008a99980998091baa00d14985854ccc040c01000454ccc04cc048dd50068a4c2c2c60206ea80304cc8c8c8c8c8c8c88c894ccc064c8c8c94ccc070c038c074dd500089919191919191919191919192999814180d18149baa001132533302c302f3300500c232533302b301d302c3754002266e3cdd7181818169baa00100314a0605e60586ea8c0bcc0b0dd51817981818161baa001132323232533302d301f302e375400226464a66605e604260606ea80044c8c8c8c8c8c8c8c8c94ccc0e0c0a80204c8c8c8c94ccc0fcccc02c07c0500084c8c8c8c8c8c8c8c8c8c94ccc118c0f8c11cdd500089919299982419b88019006153330483375e6e9807cdd32999824182180809998088102450673656c6c65720001016153330483370e602801a0202a666090646600200201c44a66609a00229444c94ccc12cc94ccc130c110c134dd500089919191919191919299982a19baf3059006015153330543375e0080262a6660a8608e0042608e00229405280a50375a60b060b20046eb4c15c004c15c008c154004c154004c140dd5001180c000982898271baa00116305030513051304d375460a00042660060060022940c14000454ccc120cdd79ba6022374c008266ebc008c8c8c10ccc138c13c008cc138c13c004cc138dd419b8000d01230503050001304f001304a375408a29405280a5014a02940c0cc004c12cc120dd50008b182518258011bab30490013049304537540146eb4c11cc120c120008c118004c118008c110004c110c110008dd6982100098211821181f1baa039163301701c23232533303e303033301b37566086608800402c9110673656c6c6572001533303e3030303f3754002266e3cdd7182198201baa00100414a02940c108c0fcdd51821000981f1baa001375c607e60786ea80dcccc01c0680dc044dd6981e981d1baa02215333038303000813332223232323232323232323232325333047303f304837540022646464646464a6660a060a60042a66609a66e2002c08054ccc134cdd79ba6024374ca66609a609002a266602c04a91010673656c6c65720033704900080a8b0a99982699b87301901301513375e00c64646464646464646464646460a4660ba60bc018660ba60bc016660ba6ea0cdc080e8109982e982f0051982e982f0049982e982f0041982e982f0039982e982f0031982e982f0029982e982f0021982e982f0019982e982f0011982e9ba83370002a01e660ba60bc002660ba60bc60be002660ba6ea0cdc000a006a5eb80c178c178004c174004c170004c16c004c168004c164004c160004c15c004c158004c154c154004c150004c13cdd50250a5014a0294058dd6982880098288011bad304f001323330010010104bd7081010000810100001112999827801080089998018019829001191919192999829982b0010992999828982498291baa00113232323232323232533305953330593375e60bc00c036266ebc01006452809982e9ba833700018004660ba6ea0cdc0005000a5eb8058dd6982e982f0011bad305c001305c002305a001305a00130553754004603a00260ac60a66ea800458c154c158c158c148dd5182a982b18291baa00416375a60a800260a80066eb4c148008c144008c0d0004c130c124dd50008b18259826182618241baa00d375a60946096609660960046eb4c124004c124c124c124c124c124008dd6982380098239823801182280098228011821800982198218011bad304100130413041303d37540706eb4c0f4c0e8dd501119980300c81b00819980380d8081bae303d303a375406a264646464a6466607a606801a2646464664464646464646464646464a6660986088609a6ea80044c8c8c8c8c8c94ccc148cdd799191918271982c982d0019982c982d0011982c982d0009982c9ba83370002000e60b660b600260b400260b200260a86ea813c01854ccc148cdd79ba6008374c66660300580040020082a6660a4608a01e2602c6e9cc0640a45280a5014a06eb8c158c15c008dd7182a80098289baa0073233300100100f00e22232325333053304b30543754002264646464a6660ae60366e9c01854ccc15cc06cdd380108008b099b803330090090060020013232323232323232323232325333062305a3063375400226464a6660c8a6660c866ebcdd30021ba6333302a4bd6f7b63024410048810033700904044bd2410137dc042a6660c866ebc03407454ccc190cdd780580e0a99983229998320038a5013330644a094128899baf3232323230613306c306d0043306c306d0033306c306d0023306c306d0013306c3330684a2980103d87a80004c0103d8798000306e306e001306d001306c001306b0013066375402200429405280a5014a0266e0002401858c0a0004c19cc190dd50008b183318338011bab306500130653061375460c801e6eb4c18cc190008c160c178dd5183100098310011bad306000130603060002305e001305e002305c0013058375400660b600a603200260b060aa6ea800458c15cc160c160c150dd5182b982c182a1baa3057003305700230390013051304e37540022c60a060a20046eacc13c004c13cc12cdd519980b81502381098269827001182600098260011bad304a001304a002375a60900026090609060886ea80fcccc02008c008004cc0700848c8c94ccc10cc0d4ccc080dd598241824801002a441056f726465720013375e00266e95200233047375200897ae014a0608e60886ea8c11c004c10cdd50009bae30443045002375c6086002607e6ea80e854ccc0f4c0c40344c0d4c024cc0640808c0c0ccc06cdd59821982218201baa304330443040375400207891107666163746f72790013232323253330413037011132325333043303b30443754002264646464646464646464646464646464646464646464a6660b2609660b46ea80044c94ccc1694ccc168cdc40061bad305f305c37540042a6660b466e1c04800454ccc168c13405054ccc168c134c16cdd5005099b89375a60be60b86ea80280045288a5014a029404c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc1bd4ccc1bcc184ccc1301192211c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70004881034d5350001533306f3375e0280102a6660de66ebc04c01854ccc1bccdc3808801099b8701000114a029405280a501323232325333073306b307437540022646464a6660ec66e1ccdc0005a4026004266ebc00cc8c8c8c8c8c8c8c8c8c8c8c8c8c1f0cc21c04c22004034cc21c04c22004030cc21c04c2200402ccc21c04c22004028cc21c04c22004024cc21c04c22004020cc21c04c2200401ccc21c04c22004018cc21c04c22004014cc21c04c22004010cc21c04c2200400ccc21c04c22004008cc21c04c22004004cc21c04dd4007984480984480800984400800984380800984300800984280800984200800984180800984100800984080800984000800983f800983f000983e800983c1baa07314a060c20046660a200691011c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70000053078307537540022c60ee60f00046eacc1d8004c1d8c1c8dd501799998178070068058050b1bad30733074002375a60e400260e40046eb4c1c0004c1c0008c1b8004c1b8008c1b0004c1b0c1a0dd50119bae306a306b002375c60d200260ca6ea801cdd7183398340011bae30660013062375400a6eb4c184008dd6982f800a99982e99baf0020131337606ea0024dd4002099bb037500086ea0024c178008c170004cc074040038594c8ccc168c134c16cdd5004099299982d99b8800100210011002375a60be60b86ea80204004cdc00018010b182e982d1baa305d305a375406c6eb4c170c174c174c174008dd6982d800982d8011bad3059001305900230570013057002305500130553055002375a60a600260a660a600460a200260a2004609e002609e0046eb4c134004c134008dd698258009825982598239baa042533304430373045375400226464646464646464646464646464646464646464a6660b660bc0042646464649318240031824808982400918240098b19299982d982d0008a99982c1825182c8008a5115333058304b305900114a02c2c6ea8c170004c170008c168004c168008dd6982c000982c0011bad30560013056002375a60a800260a80046eb4c148004c148008dd6982800098280011827000982700118260009826001182500098231baa001163048304537540022c608e6090609060886ea8c8c94ccc11cc128008400458c120004cc07808c8c8c8c94ccc118c0e0c11cdd50008a99982319b8f375c609660906ea800522011c295cd9f0691f9a09c13e38b475142042edbd78680af336a5c3e4afcb001303833302300248811c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70004881034d53500014a02940c128c11cdd518250011bab3049304a0013045375400266601e04407e0322a666082606c02226464646464646464646464646464646464646464a6660aa609a60ac6ea80044c8c8c8c8c8c8c8c8c8c94ccc17ccdd7805191919182d998331833801998331833801198331833800998331ba8337020386eb4c19c01cc1a0c1a0004c19c004c198004c184dd502e0a9991983019baf374c01a6e98cccc098cccc0980e922011c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70000093001003007006300100213375e6e9cc09c0dcdd3998321ba7330643752038660c898106456f72646572003306437506002605803c97ae04bd701b81480005280a50375a60c660c80046eb4c188004c188004c8c8ccc00400406c0f8888c8c94ccc184c164c188dd500089919191919191919299983498169ba700a13306d3750008660da6ea0008cc1b4dd4000a5eb804c8c8cc1bcdd419b80375a60e000400c660de6ea0cdc01bad30700010043306f375066e00dd698381838800801a5eb80c1c0004ccc034034028018dd6983698370011bad306c001306c002375a60d400264646464646464646464646464a6660e2a6660e266ebc0a4c1d803454ccc1c4cdd78138058a99983899baf00200913375e6e98010dd30008a5014a029404cc1d4dd419b80007006330754c01010000330754c10100004bd700b1bab3075307600230740013070375460e602066660666666066666606697adef6c6048900488100482026fb808dd718390009bae307230730013370666e0804800c07d2211c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70000163370666e0807400c07cc1b8dd50111bad307030713071002375a60de00260de00460da00260da00460d600260d600260cc6ea800cc1a4014c09c004c198c18cdd50008b18329833183318311baa306530663062375460ca00660ca004a6660b6609c60b86ea803c4c94ccc170cdc400099b8000e00b13370266e0003802c00452000375a60c060ba6ea803c52000375c60be60c00046eb8c178004c168dd5007191919199980d1bae305f002375c60be60c00046eb8c17c004dd7182f9830000982d9baa305b002305a375460b20026603401e01a608400260b460ae6ea800458c164c168008dd5982c000982c182a1baa33302003305002a375a60ac60ae60ae0046eb4c154004c154008dd698298009829982980118288009828982898289828982880118278009827801182680098268011bad304b001304b304b304b002375c6092002608a6ea8100ccc028094dd718238009bae304730480013043375407c29408888c018cc014c018cc01401000cc018cc01400800488cdc500100091b930012232323232323253330453371e00a0042a66608a66e400100044cdd8004003899bb0007008153330453372000a004266ec002001c4cdd80038041bae3049304a002375c609000260886ea8010dd7182318238011bae3045001304137540046ebd3010180002533303c302f303d37540022646464646464646464646464a666096609c004264646493181c004981c005181b8058b1bad304c001304c0023253330493048001153330463038304700114a22a66608c6072608e00229405858dd5182500098250011bad3048001304800230460013046002304400130440023042001303e37540022c4444a66607c60620022008264646600200200c44a66608800226608a66ec0dd48031ba60034bd6f7b6300991919192999822981f9980780500109982499bb037520146e9801c01454ccc114cdc78050010992999823181c98239baa00113304a337606ea402cc12cc120dd5000802080219299982329998248008a5114a02980103d87a80001303f3304a374c00297ae0323300100100222533304a00113304b337606ea402cdd400525eb7bdb1804c8c8c8c94ccc12cc114cc05403c0084cc13ccdd81ba900f375001c00a2a66609666e3c03c0084c94ccc130c0fcc134dd500089982819bb0375202060a2609c6ea80040104010c94ccc130c0fc0045300103d87a80001304533050375000297ae03370000201c26609e66ec0dd48011ba800133006006003375a60980066eb8c128008c138008c1300044cc124cdd81ba9002374c0026600c00c0066eacc11800cdd7182200118240011823000991900119198008008011129998220008a4c264a66608a002293099192999822181b98229baa3300e375c608a60920086eb8c1140084cc014014cc12000800458c124008c11c004c11c004cc108cdd81ba9002375000297adef6c602323300100100222533303f00114bd7009919991119198008008019129998228008801899198239ba733047375200c6608e6ea4dd71822000998239ba8375a608a00297ae03300300330490023047001375c607c0026eacc0fc004cc00c00cc10c008c104004888cc05c00c8c8c94ccc0f8c0c0ccc06cdd598219822001002a45056f726465720013375e00266e95200233042375200897ae014a06084607e6ea8c108004c0f8dd518209821181f1baa001222533303a302d00114bd6f7b6300991919800800a5eb7bdb180894ccc1000044cc104cdd81ba9006374c00697adef6c601323232325333041303b3300b00a002133045337606ea4028dd30038028a99982099b8f00a002133045337606ea4028dd300380189982299bb037520046e98004cc01801800cdd598210019bae30400023044002304200132330010014bd6f7b63011299981f80089982019bb037520086ea000d2f5bded8c0264646464a66608060746601401000426608866ec0dd48041ba8007005153330403371e01000426608866ec0dd48041ba8007003133044337606ea4008dd4000998030030019bad3041003375c607e0046086004608200244a66607066e400080045300103d8798000153330383371e0040022980103d87a800014c103d87b80002533303630293037375400226464646464646464a66608260880042646493181700318168038b1bad30420013042002375a60800026080004607c002607c004607800260706ea800458c004004894ccc0e000452000133700900119801001181d8009111919299981d181e80108008b181d8009980880191919299981c181519980a9bab303d303e00200548810874726561737572790015333038302a30393754002266e3cdd7181e981d1baa00100414a02940c0f0c0e4dd5181e000981c1baa00122233010003232325333037302933301437566078607a00400a91010673656c6c65720015333037302930383754002266e3c010dd7181e181c9baa00114a02940c0ecc0e0dd5181d800981b9baa303a303b3037375400260626ea8068dd6981a18189baa001163033303037540066eb4c0c8c0bcdd50008b181898171baa303100230303031001302c3754010646600200201244a66605c002297adef6c60132323232533302f3371e911000021003133033337606ea4008dd3000998030030019bab3030003375c605c004606400460600022c6eb8c0b4c0a8dd50008b181618149baa302c002375660566058002604e6ea8c0a8c0acc09cdd51919192999815981700108008b181600099801004919192999814980d9998031bab302e302f302b3754605c605e00404e91010874726561737572790013375e0020082940c0b4004c0a4dd5000981518139baa00a22323300100100322533302b00114bd7009919299981518028010998170011980200200089980200200098178011816800911192999813980c98141baa0011480004dd6981618149baa001325333027301930283754002298103d87a8000132330010013756605a60546ea8008894ccc0b0004530103d87a80001323232533302c3371e00e6eb8c0b400c4c094cc0c0dd4000a5eb804cc014014008dd698168011818001181700099198008008021129998158008a6103d87a80001323232533302b3371e00e6eb8c0b000c4c090cc0bcdd3000a5eb804cc014014008dd598160011817801181680098139814181418140011bab30260013026302600237586048002604860480046eb0c088004c078dd50010b18101810801180f800980d9baa00114984d958c94ccc060c02c00454ccc06cc068dd50010a4c2c2a666030601400226464a66603a60400042930b1bad301e001301a37540042a666030602000226464a66603a60400042930b1bad301e001301a37540042a666030601e0022a66603660346ea80085261615333018300e0011533301b301a37540042930b0a99980c18068008a99980d980d1baa00214985854ccc060c03000454ccc06cc068dd50010a4c2c2c60306ea8004c00404894ccc054c020c058dd500089919191919191919191919191919191919191919191919191919191919191919299981c181d801099191919191924c64a666076605c00226464a666080608600426493299981e9818181f1baa001132323232323253330463049002149858dd6982380098238011bad30450013045002375a6086002607e6ea80045858c104004c0f4dd50048a99981d98168008a99981f181e9baa00914985858c0ecdd5004181300798128081812808981280b181200b8b1bad3039001303900230370013037002375a606a002606a0046eb4c0cc004c0cc008dd6981880098188011817800981780118168009816801181580098158011bad30290013029002375a604e002604e004604a002604a004604600260460046eb4c084004c084008dd6980f800980f8011bae301d001301d002375c6036002602e6ea8004588c94ccc054c0200044c8c94ccc068c07400852616375a6036002602e6ea800854ccc054c01c00454ccc060c05cdd50010a4c2c2c602a6ea800494ccc04cc018c050dd5000899191919299980d180e8010991924c64a666032601800226464a66603c60420042649318058008b180f800980d9baa00315333019300b0011533301c301b37540062930b0b180c9baa002300800316301b001301b0023019001301537540022c4a666024600a60266ea80044c8c8c8c94ccc064c07000852616375c603400260340046eb8c060004c050dd50008b1192999809180280089919299980b980d00109924c600a0022c603000260286ea800854ccc048c0100044c8c8c8c8c8c94ccc06cc07800852616375a603800260380046eb4c068004c068008dd6980c000980a1baa0021630123754002464a666022600800226464a66602c60320042930b1bae3017001301337540042a666022600600226464a66602c60320042930b1bae3017001301337540042c60226ea8004c050c044dd50059b8748008dc3a40006e1d200c370e90051b8748020dc3a400c6e1d2004374a90001baf4c0103d8798000371090001bae0015734aae7555cf2ab9f5740ae855d101",
        [authenPolicyId],
        { dataType: "list", items: [{ dataType: "bytes" }] } as any,
      ),
    };
  },
  {
    treasuryInDatum: {
      title: "TreasuryDatum",
      anyOf: [
        {
          title: "TreasuryDatum",
          dataType: "constructor",
          index: 0,
          fields: [
            { dataType: "bytes", title: "sellerHash" },
            { dataType: "bytes", title: "orderHash" },
            { dataType: "integer", title: "sellerCount" },
            { dataType: "integer", title: "collectedFund" },
            {
              title: "baseAsset",
              anyOf: [
                {
                  title: "Asset",
                  dataType: "constructor",
                  index: 0,
                  fields: [
                    { dataType: "bytes", title: "policyId" },
                    { dataType: "bytes", title: "assetName" },
                  ],
                },
              ],
            },
            {
              title: "raiseAsset",
              anyOf: [
                {
                  title: "Asset",
                  dataType: "constructor",
                  index: 0,
                  fields: [
                    { dataType: "bytes", title: "policyId" },
                    { dataType: "bytes", title: "assetName" },
                  ],
                },
              ],
            },
            { dataType: "integer", title: "startTime" },
            { dataType: "integer", title: "endTime" },
            {
              title: "owner",
              description:
                "A Cardano `Address` typically holding one or two credential references.\n\n Note that legacy bootstrap addresses (a.k.a. 'Byron addresses') are\n completely excluded from Plutus contexts. Thus, from an on-chain\n perspective only exists addresses of type 00, 01, ..., 07 as detailed\n in [CIP-0019 :: Shelley Addresses](https://github.com/cardano-foundation/CIPs/tree/master/CIP-0019/#shelley-addresses).",
              anyOf: [
                {
                  title: "Address",
                  dataType: "constructor",
                  index: 0,
                  fields: [
                    {
                      title: "paymentCredential",
                      description:
                        "A general structure for representing an on-chain `Credential`.\n\n Credentials are always one of two kinds: a direct public/private key\n pair, or a script (native or Plutus).",
                      anyOf: [
                        {
                          title: "VerificationKeyCredential",
                          dataType: "constructor",
                          index: 0,
                          fields: [{ dataType: "bytes" }],
                        },
                        {
                          title: "ScriptCredential",
                          dataType: "constructor",
                          index: 1,
                          fields: [{ dataType: "bytes" }],
                        },
                      ],
                    },
                    {
                      title: "stakeCredential",
                      anyOf: [
                        {
                          title: "Some",
                          description: "An optional value.",
                          dataType: "constructor",
                          index: 0,
                          fields: [
                            {
                              description:
                                "Represent a type of object that can be represented either inline (by hash)\n or via a reference (i.e. a pointer to an on-chain location).\n\n This is mainly use for capturing pointers to a stake credential\n registration certificate in the case of so-called pointer addresses.",
                              anyOf: [
                                {
                                  title: "Inline",
                                  dataType: "constructor",
                                  index: 0,
                                  fields: [
                                    {
                                      description:
                                        "A general structure for representing an on-chain `Credential`.\n\n Credentials are always one of two kinds: a direct public/private key\n pair, or a script (native or Plutus).",
                                      anyOf: [
                                        {
                                          title: "VerificationKeyCredential",
                                          dataType: "constructor",
                                          index: 0,
                                          fields: [{ dataType: "bytes" }],
                                        },
                                        {
                                          title: "ScriptCredential",
                                          dataType: "constructor",
                                          index: 1,
                                          fields: [{ dataType: "bytes" }],
                                        },
                                      ],
                                    },
                                  ],
                                },
                                {
                                  title: "Pointer",
                                  dataType: "constructor",
                                  index: 1,
                                  fields: [
                                    {
                                      dataType: "integer",
                                      title: "slotNumber",
                                    },
                                    {
                                      dataType: "integer",
                                      title: "transactionIndex",
                                    },
                                    {
                                      dataType: "integer",
                                      title: "certificateIndex",
                                    },
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                        {
                          title: "None",
                          description: "Nothing.",
                          dataType: "constructor",
                          index: 1,
                          fields: [],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            {
              title: "minimumRaise",
              anyOf: [
                {
                  title: "Some",
                  description: "An optional value.",
                  dataType: "constructor",
                  index: 0,
                  fields: [{ dataType: "integer" }],
                },
                {
                  title: "None",
                  description: "Nothing.",
                  dataType: "constructor",
                  index: 1,
                  fields: [],
                },
              ],
            },
            {
              title: "maximumRaise",
              anyOf: [
                {
                  title: "Some",
                  description: "An optional value.",
                  dataType: "constructor",
                  index: 0,
                  fields: [{ dataType: "integer" }],
                },
                {
                  title: "None",
                  description: "Nothing.",
                  dataType: "constructor",
                  index: 1,
                  fields: [],
                },
              ],
            },
            { dataType: "integer", title: "reserveBase" },
            { dataType: "integer", title: "reserveRaise" },
            { dataType: "integer", title: "totalLiquidity" },
            {
              title: "penaltyConfig",
              anyOf: [
                {
                  title: "Some",
                  description: "An optional value.",
                  dataType: "constructor",
                  index: 0,
                  fields: [
                    {
                      anyOf: [
                        {
                          title: "PenaltyConfig",
                          dataType: "constructor",
                          index: 0,
                          fields: [
                            { dataType: "integer", title: "penaltyStartTime" },
                            { dataType: "integer", title: "penaltyEndTime" },
                            { dataType: "integer", title: "percent" },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  title: "None",
                  description: "Nothing.",
                  dataType: "constructor",
                  index: 1,
                  fields: [],
                },
              ],
            },
            { dataType: "integer", title: "totalPenalty" },
          ],
        },
      ],
    },
  },
  {
    redeemer: {
      title: "Wrapped Redeemer",
      description:
        "A redeemer wrapped in an extra constructor to make multi-validator detection possible on-chain.",
      anyOf: [
        {
          dataType: "constructor",
          index: 1,
          fields: [
            {
              anyOf: [
                {
                  title: "InitTreasury",
                  dataType: "constructor",
                  index: 0,
                  fields: [],
                },
                {
                  title: "AddSeller",
                  dataType: "constructor",
                  index: 1,
                  fields: [{ dataType: "integer", title: "amount" }],
                },
                {
                  title: "CollectSeller",
                  dataType: "constructor",
                  index: 2,
                  fields: [{ dataType: "integer", title: "amount" }],
                },
                {
                  title: "CollectOrders",
                  dataType: "constructor",
                  index: 3,
                  fields: [],
                },
                {
                  title: "CreateAmmPool",
                  dataType: "constructor",
                  index: 4,
                  fields: [],
                },
                {
                  title: "RedeemLP",
                  dataType: "constructor",
                  index: 5,
                  fields: [],
                },
                {
                  title: "CloseEvent",
                  dataType: "constructor",
                  index: 6,
                  fields: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },
) as unknown as TreasuryValidatorValidateTreasurySpending;

export interface TreasuryValidatorValidateTreasuryMintingOrWithdrawal {
  new (authenPolicyId: string): Validator;
  redeemer:
    | "InitTreasury"
    | { AddSeller: { amount: bigint } }
    | { CollectSeller: { amount: bigint } }
    | "CollectOrders"
    | "CreateAmmPool"
    | "RedeemLP"
    | "CloseEvent";
}

export const TreasuryValidatorValidateTreasuryMintingOrWithdrawal =
  Object.assign(
    function (authenPolicyId: string) {
      return {
        type: "PlutusV2",
        script: applyParamsToScript(
          "592272010000323232323232322322253232323232323232323233300f300230103754016264a666020646464646464a66602c601a602e6ea804c54ccc058c038c05cdd5002899299980b9805180c1baa0011325333018300a30193754002266600600a02c6eb8c074c068dd50008b180e180c9baa00116301b3018375400a2c2a66602c6012602e6ea80144c8c8c8c94c8ccc06cc0380104c004dd319299980e1807980e9baa4c103d879800013333001333300133300301a488107666163746f727900480080692201087472656173757279004800801922010673656c6c657200480a04cccc004ccc00c069220107666163746f727900480040692201087472656173757279004800488894ccc07cc04800440104c8c8cc004004018894ccc0940044cc098cdd81ba9006374c00697adef6c60132323232533302630203300e00a00213302a337606ea4028dd30038028a99981319b8f00a0021325333027301a3028375400226605666ec0dd4805981618149baa0010041004325333027533302a00114a229405300103d87a8000130203302b374c00297ae0323300100100222533302b00113302c337606ea402cdd400525eb7bdb1804c8c8c8c94ccc0b0c098cc05003c0084cc0c0cdd81ba900f375001c00a2a66605866e3c03c0084c94ccc0b4c080c0b8dd500089981899bb037520206064605e6ea80040104010c94ccc0b4c0800045300103d87a80001302633031375000297ae03370000201c26606066ec0dd48011ba800133006006003375a605a0066eb8c0ac008c0bc008c0b40044cc0a8cdd81ba9002374c0026600c00c0066eacc09c00cdd7181280118148011813800991900119198008008011129998128008a4c264a66604c002293099192999812980c18131baa3300d375c604c60540086eb8c0980084cc014014cc0a400800458c0a8008c0a0004c0a0004cc08ccdd81ba9002375000297adef6c601533301b300d0041533301b3001374c64a666038602e002266600600c91010673656c6c65720000116375a6040603a6ea80604ccc0180200640145280a99980d98098020a99980d98009ba632533301c3017001133300300648810673656c6c6572003370490008008b1bad3020301d3754030266600c01003200a29405281baf374c00c444a666038601e002297adef6c6013232330010014bd6f7b63011299981100089981199bb0375200c6e9800d2f5bded8c0264646464a666046603a6601601400426604e66ec0dd48051ba6007005153330233371e01400426604e66ec0dd48051ba6007003133027337606ea4008dd3000998030030019bab3024003375c6044004604c0046048002646600200297adef6c60225333021001133022337606ea4010dd4001a5eb7bdb1804c8c8c8c94ccc088c070cc0280200084cc098cdd81ba9008375000e00a2a66604466e3c0200084cc098cdd81ba9008375000e00626604c66ec0dd48011ba800133006006003375a60460066eb8c084008c094008c08c004894ccc068cdc80010008a60103d87980001533301a3371e0040022980103d87a800014c103d87b8000301837540286eb8c06cc060dd50028b111299980d980f191980080080211299980e8008a5eb804c8c94ccc070c8c94ccc078c040c94ccc07cc044c080dd50008a400026eb4c090c084dd500099299980f980898101baa00114c103d87a8000132330010013756604a60446ea8008894ccc090004530103d87a8000132323253330243371e91108747265617375727900375c604a0062603a660506ea00052f5c026600a00a0046eb4c094008c0a0008c098004c8cc004004dd5981218128019129998118008a6103d87a8000132323253330233371e01a6eb8c09000c4c070cc09cdd3000a5eb804cc014014008dd59812001181380118128008a99980f1808180f9baa00113371e00e6eb8c08cc080dd50008a5014a06044603e6ea8c088004c078dd518109811180f1baa002133020002330040040011330040040013021002301f00114a22c64660020026eacc068c06cc06cc06cc06c00c894ccc06400452f5bded8c0264646464a66603466e3d22100002100313301e337606ea4008dd3000998030030019bab301b003375c6032004603a00460360026eb0c060004c050dd5180b801180b180b80098091baa00c14984d958c94ccc040c00c00454ccc04cc048dd50068a4c2c2a666020600400226464a66602a60300042930b1bad30160013012375401a2a666020601000226464a66602a60300042930b1bad30160013012375401a2a666020600e0022a66602660246ea803452616153330103006001153330133012375401a2930b0a99980818028008a99980998091baa00d14985854ccc040c01000454ccc04cc048dd50068a4c2c2c60206ea80304cc8c8c8c8c8c8c88c894ccc064c8c8c94ccc070c038c074dd500089919191919191919191919192999814180d18149baa001132533302c302f3300500c232533302b301d302c3754002266e3cdd7181818169baa00100314a0605e60586ea8c0bcc0b0dd51817981818161baa001132323232533302d301f302e375400226464a66605e604260606ea80044c8c8c8c8c8c8c8c8c94ccc0e0c0a80204c8c8c8c94ccc0fcccc02c07c0500084c8c8c8c8c8c8c8c8c8c94ccc118c0f8c11cdd500089919299982419b88019006153330483375e6e9807cdd32999824182180809998088102450673656c6c65720001016153330483370e602801a0202a666090646600200201c44a66609a00229444c94ccc12cc94ccc130c110c134dd500089919191919191919299982a19baf3059006015153330543375e0080262a6660a8608e0042608e00229405280a50375a60b060b20046eb4c15c004c15c008c154004c154004c140dd5001180c000982898271baa00116305030513051304d375460a00042660060060022940c14000454ccc120cdd79ba6022374c008266ebc008c8c8c10ccc138c13c008cc138c13c004cc138dd419b8000d01230503050001304f001304a375408a29405280a5014a02940c0cc004c12cc120dd50008b182518258011bab30490013049304537540146eb4c11cc120c120008c118004c118008c110004c110c110008dd6982100098211821181f1baa039163301701c23232533303e303033301b37566086608800402c9110673656c6c6572001533303e3030303f3754002266e3cdd7182198201baa00100414a02940c108c0fcdd51821000981f1baa001375c607e60786ea80dcccc01c0680dc044dd6981e981d1baa02215333038303000813332223232323232323232323232325333047303f304837540022646464646464a6660a060a60042a66609a66e2002c08054ccc134cdd79ba6024374ca66609a609002a266602c04a91010673656c6c65720033704900080a8b0a99982699b87301901301513375e00c64646464646464646464646460a4660ba60bc018660ba60bc016660ba6ea0cdc080e8109982e982f0051982e982f0049982e982f0041982e982f0039982e982f0031982e982f0029982e982f0021982e982f0019982e982f0011982e9ba83370002a01e660ba60bc002660ba60bc60be002660ba6ea0cdc000a006a5eb80c178c178004c174004c170004c16c004c168004c164004c160004c15c004c158004c154c154004c150004c13cdd50250a5014a0294058dd6982880098288011bad304f001323330010010104bd7081010000810100001112999827801080089998018019829001191919192999829982b0010992999828982498291baa00113232323232323232533305953330593375e60bc00c036266ebc01006452809982e9ba833700018004660ba6ea0cdc0005000a5eb8058dd6982e982f0011bad305c001305c002305a001305a00130553754004603a00260ac60a66ea800458c154c158c158c148dd5182a982b18291baa00416375a60a800260a80066eb4c148008c144008c0d0004c130c124dd50008b18259826182618241baa00d375a60946096609660960046eb4c124004c124c124c124c124c124008dd6982380098239823801182280098228011821800982198218011bad304100130413041303d37540706eb4c0f4c0e8dd501119980300c81b00819980380d8081bae303d303a375406a264646464a6466607a606801a2646464664464646464646464646464a6660986088609a6ea80044c8c8c8c8c8c94ccc148cdd799191918271982c982d0019982c982d0011982c982d0009982c9ba83370002000e60b660b600260b400260b200260a86ea813c01854ccc148cdd79ba6008374c66660300580040020082a6660a4608a01e2602c6e9cc0640a45280a5014a06eb8c158c15c008dd7182a80098289baa0073233300100100f00e22232325333053304b30543754002264646464a6660ae60366e9c01854ccc15cc06cdd380108008b099b803330090090060020013232323232323232323232325333062305a3063375400226464a6660c8a6660c866ebcdd30021ba6333302a4bd6f7b63024410048810033700904044bd2410137dc042a6660c866ebc03407454ccc190cdd780580e0a99983229998320038a5013330644a094128899baf3232323230613306c306d0043306c306d0033306c306d0023306c306d0013306c3330684a2980103d87a80004c0103d8798000306e306e001306d001306c001306b0013066375402200429405280a5014a0266e0002401858c0a0004c19cc190dd50008b183318338011bab306500130653061375460c801e6eb4c18cc190008c160c178dd5183100098310011bad306000130603060002305e001305e002305c0013058375400660b600a603200260b060aa6ea800458c15cc160c160c150dd5182b982c182a1baa3057003305700230390013051304e37540022c60a060a20046eacc13c004c13cc12cdd519980b81502381098269827001182600098260011bad304a001304a002375a60900026090609060886ea80fcccc02008c008004cc0700848c8c94ccc10cc0d4ccc080dd598241824801002a441056f726465720013375e00266e95200233047375200897ae014a0608e60886ea8c11c004c10cdd50009bae30443045002375c6086002607e6ea80e854ccc0f4c0c40344c0d4c024cc0640808c0c0ccc06cdd59821982218201baa304330443040375400207891107666163746f72790013232323253330413037011132325333043303b30443754002264646464646464646464646464646464646464646464a6660b2609660b46ea80044c94ccc1694ccc168cdc40061bad305f305c37540042a6660b466e1c04800454ccc168c13405054ccc168c134c16cdd5005099b89375a60be60b86ea80280045288a5014a029404c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc1bd4ccc1bcc184ccc1301192211c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70004881034d5350001533306f3375e0280102a6660de66ebc04c01854ccc1bccdc3808801099b8701000114a029405280a501323232325333073306b307437540022646464a6660ec66e1ccdc0005a4026004266ebc00cc8c8c8c8c8c8c8c8c8c8c8c8c8c1f0cc21c04c22004034cc21c04c22004030cc21c04c2200402ccc21c04c22004028cc21c04c22004024cc21c04c22004020cc21c04c2200401ccc21c04c22004018cc21c04c22004014cc21c04c22004010cc21c04c2200400ccc21c04c22004008cc21c04c22004004cc21c04dd4007984480984480800984400800984380800984300800984280800984200800984180800984100800984080800984000800983f800983f000983e800983c1baa07314a060c20046660a200691011c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70000053078307537540022c60ee60f00046eacc1d8004c1d8c1c8dd501799998178070068058050b1bad30733074002375a60e400260e40046eb4c1c0004c1c0008c1b8004c1b8008c1b0004c1b0c1a0dd50119bae306a306b002375c60d200260ca6ea801cdd7183398340011bae30660013062375400a6eb4c184008dd6982f800a99982e99baf0020131337606ea0024dd4002099bb037500086ea0024c178008c170004cc074040038594c8ccc168c134c16cdd5004099299982d99b8800100210011002375a60be60b86ea80204004cdc00018010b182e982d1baa305d305a375406c6eb4c170c174c174c174008dd6982d800982d8011bad3059001305900230570013057002305500130553055002375a60a600260a660a600460a200260a2004609e002609e0046eb4c134004c134008dd698258009825982598239baa042533304430373045375400226464646464646464646464646464646464646464a6660b660bc0042646464649318240031824808982400918240098b19299982d982d0008a99982c1825182c8008a5115333058304b305900114a02c2c6ea8c170004c170008c168004c168008dd6982c000982c0011bad30560013056002375a60a800260a80046eb4c148004c148008dd6982800098280011827000982700118260009826001182500098231baa001163048304537540022c608e6090609060886ea8c8c94ccc11cc128008400458c120004cc07808c8c8c8c94ccc118c0e0c11cdd50008a99982319b8f375c609660906ea800522011c295cd9f0691f9a09c13e38b475142042edbd78680af336a5c3e4afcb001303833302300248811c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70004881034d53500014a02940c128c11cdd518250011bab3049304a0013045375400266601e04407e0322a666082606c02226464646464646464646464646464646464646464a6660aa609a60ac6ea80044c8c8c8c8c8c8c8c8c8c94ccc17ccdd7805191919182d998331833801998331833801198331833800998331ba8337020386eb4c19c01cc1a0c1a0004c19c004c198004c184dd502e0a9991983019baf374c01a6e98cccc098cccc0980e922011c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70000093001003007006300100213375e6e9cc09c0dcdd3998321ba7330643752038660c898106456f72646572003306437506002605803c97ae04bd701b81480005280a50375a60c660c80046eb4c188004c188004c8c8ccc00400406c0f8888c8c94ccc184c164c188dd500089919191919191919299983498169ba700a13306d3750008660da6ea0008cc1b4dd4000a5eb804c8c8cc1bcdd419b80375a60e000400c660de6ea0cdc01bad30700010043306f375066e00dd698381838800801a5eb80c1c0004ccc034034028018dd6983698370011bad306c001306c002375a60d400264646464646464646464646464a6660e2a6660e266ebc0a4c1d803454ccc1c4cdd78138058a99983899baf00200913375e6e98010dd30008a5014a029404cc1d4dd419b80007006330754c01010000330754c10100004bd700b1bab3075307600230740013070375460e602066660666666066666606697adef6c6048900488100482026fb808dd718390009bae307230730013370666e0804800c07d2211c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70000163370666e0807400c07cc1b8dd50111bad307030713071002375a60de00260de00460da00260da00460d600260d600260cc6ea800cc1a4014c09c004c198c18cdd50008b18329833183318311baa306530663062375460ca00660ca004a6660b6609c60b86ea803c4c94ccc170cdc400099b8000e00b13370266e0003802c00452000375a60c060ba6ea803c52000375c60be60c00046eb8c178004c168dd5007191919199980d1bae305f002375c60be60c00046eb8c17c004dd7182f9830000982d9baa305b002305a375460b20026603401e01a608400260b460ae6ea800458c164c168008dd5982c000982c182a1baa33302003305002a375a60ac60ae60ae0046eb4c154004c154008dd698298009829982980118288009828982898289828982880118278009827801182680098268011bad304b001304b304b304b002375c6092002608a6ea8100ccc028094dd718238009bae304730480013043375407c29408888c018cc014c018cc01401000cc018cc01400800488cdc500100091b930012232323232323253330453371e00a0042a66608a66e400100044cdd8004003899bb0007008153330453372000a004266ec002001c4cdd80038041bae3049304a002375c609000260886ea8010dd7182318238011bae3045001304137540046ebd3010180002533303c302f303d37540022646464646464646464646464a666096609c004264646493181c004981c005181b8058b1bad304c001304c0023253330493048001153330463038304700114a22a66608c6072608e00229405858dd5182500098250011bad3048001304800230460013046002304400130440023042001303e37540022c4444a66607c60620022008264646600200200c44a66608800226608a66ec0dd48031ba60034bd6f7b6300991919192999822981f9980780500109982499bb037520146e9801c01454ccc114cdc78050010992999823181c98239baa00113304a337606ea402cc12cc120dd5000802080219299982329998248008a5114a02980103d87a80001303f3304a374c00297ae0323300100100222533304a00113304b337606ea402cdd400525eb7bdb1804c8c8c8c94ccc12cc114cc05403c0084cc13ccdd81ba900f375001c00a2a66609666e3c03c0084c94ccc130c0fcc134dd500089982819bb0375202060a2609c6ea80040104010c94ccc130c0fc0045300103d87a80001304533050375000297ae03370000201c26609e66ec0dd48011ba800133006006003375a60980066eb8c128008c138008c1300044cc124cdd81ba9002374c0026600c00c0066eacc11800cdd7182200118240011823000991900119198008008011129998220008a4c264a66608a002293099192999822181b98229baa3300e375c608a60920086eb8c1140084cc014014cc12000800458c124008c11c004c11c004cc108cdd81ba9002375000297adef6c602323300100100222533303f00114bd7009919991119198008008019129998228008801899198239ba733047375200c6608e6ea4dd71822000998239ba8375a608a00297ae03300300330490023047001375c607c0026eacc0fc004cc00c00cc10c008c104004888cc05c00c8c8c94ccc0f8c0c0ccc06cdd598219822001002a45056f726465720013375e00266e95200233042375200897ae014a06084607e6ea8c108004c0f8dd518209821181f1baa001222533303a302d00114bd6f7b6300991919800800a5eb7bdb180894ccc1000044cc104cdd81ba9006374c00697adef6c601323232325333041303b3300b00a002133045337606ea4028dd30038028a99982099b8f00a002133045337606ea4028dd300380189982299bb037520046e98004cc01801800cdd598210019bae30400023044002304200132330010014bd6f7b63011299981f80089982019bb037520086ea000d2f5bded8c0264646464a66608060746601401000426608866ec0dd48041ba8007005153330403371e01000426608866ec0dd48041ba8007003133044337606ea4008dd4000998030030019bad3041003375c607e0046086004608200244a66607066e400080045300103d8798000153330383371e0040022980103d87a800014c103d87b80002533303630293037375400226464646464646464a66608260880042646493181700318168038b1bad30420013042002375a60800026080004607c002607c004607800260706ea800458c004004894ccc0e000452000133700900119801001181d8009111919299981d181e80108008b181d8009980880191919299981c181519980a9bab303d303e00200548810874726561737572790015333038302a30393754002266e3cdd7181e981d1baa00100414a02940c0f0c0e4dd5181e000981c1baa00122233010003232325333037302933301437566078607a00400a91010673656c6c65720015333037302930383754002266e3c010dd7181e181c9baa00114a02940c0ecc0e0dd5181d800981b9baa303a303b3037375400260626ea8068dd6981a18189baa001163033303037540066eb4c0c8c0bcdd50008b181898171baa303100230303031001302c3754010646600200201244a66605c002297adef6c60132323232533302f3371e911000021003133033337606ea4008dd3000998030030019bab3030003375c605c004606400460600022c6eb8c0b4c0a8dd50008b181618149baa302c002375660566058002604e6ea8c0a8c0acc09cdd51919192999815981700108008b181600099801004919192999814980d9998031bab302e302f302b3754605c605e00404e91010874726561737572790013375e0020082940c0b4004c0a4dd5000981518139baa00a22323300100100322533302b00114bd7009919299981518028010998170011980200200089980200200098178011816800911192999813980c98141baa0011480004dd6981618149baa001325333027301930283754002298103d87a8000132330010013756605a60546ea8008894ccc0b0004530103d87a80001323232533302c3371e00e6eb8c0b400c4c094cc0c0dd4000a5eb804cc014014008dd698168011818001181700099198008008021129998158008a6103d87a80001323232533302b3371e00e6eb8c0b000c4c090cc0bcdd3000a5eb804cc014014008dd598160011817801181680098139814181418140011bab30260013026302600237586048002604860480046eb0c088004c078dd50010b18101810801180f800980d9baa00114984d958c94ccc060c02c00454ccc06cc068dd50010a4c2c2a666030601400226464a66603a60400042930b1bad301e001301a37540042a666030602000226464a66603a60400042930b1bad301e001301a37540042a666030601e0022a66603660346ea80085261615333018300e0011533301b301a37540042930b0a99980c18068008a99980d980d1baa00214985854ccc060c03000454ccc06cc068dd50010a4c2c2c60306ea8004c00404894ccc054c020c058dd500089919191919191919191919191919191919191919191919191919191919191919299981c181d801099191919191924c64a666076605c00226464a666080608600426493299981e9818181f1baa001132323232323253330463049002149858dd6982380098238011bad30450013045002375a6086002607e6ea80045858c104004c0f4dd50048a99981d98168008a99981f181e9baa00914985858c0ecdd5004181300798128081812808981280b181200b8b1bad3039001303900230370013037002375a606a002606a0046eb4c0cc004c0cc008dd6981880098188011817800981780118168009816801181580098158011bad30290013029002375a604e002604e004604a002604a004604600260460046eb4c084004c084008dd6980f800980f8011bae301d001301d002375c6036002602e6ea8004588c94ccc054c0200044c8c94ccc068c07400852616375a6036002602e6ea800854ccc054c01c00454ccc060c05cdd50010a4c2c2c602a6ea800494ccc04cc018c050dd5000899191919299980d180e8010991924c64a666032601800226464a66603c60420042649318058008b180f800980d9baa00315333019300b0011533301c301b37540062930b0b180c9baa002300800316301b001301b0023019001301537540022c4a666024600a60266ea80044c8c8c8c94ccc064c07000852616375c603400260340046eb8c060004c050dd50008b1192999809180280089919299980b980d00109924c600a0022c603000260286ea800854ccc048c0100044c8c8c8c8c8c94ccc06cc07800852616375a603800260380046eb4c068004c068008dd6980c000980a1baa0021630123754002464a666022600800226464a66602c60320042930b1bae3017001301337540042a666022600600226464a66602c60320042930b1bae3017001301337540042c60226ea8004c050c044dd50059b8748008dc3a40006e1d200c370e90051b8748020dc3a400c6e1d2004374a90001baf4c0103d8798000371090001bae0015734aae7555cf2ab9f5740ae855d101",
          [authenPolicyId],
          { dataType: "list", items: [{ dataType: "bytes" }] } as any,
        ),
      };
    },

    {
      redeemer: {
        title: "TreasuryRedeemer",
        anyOf: [
          {
            title: "InitTreasury",
            dataType: "constructor",
            index: 0,
            fields: [],
          },
          {
            title: "AddSeller",
            dataType: "constructor",
            index: 1,
            fields: [{ dataType: "integer", title: "amount" }],
          },
          {
            title: "CollectSeller",
            dataType: "constructor",
            index: 2,
            fields: [{ dataType: "integer", title: "amount" }],
          },
          {
            title: "CollectOrders",
            dataType: "constructor",
            index: 3,
            fields: [],
          },
          {
            title: "CreateAmmPool",
            dataType: "constructor",
            index: 4,
            fields: [],
          },
          { title: "RedeemLP", dataType: "constructor", index: 5, fields: [] },
          {
            title: "CloseEvent",
            dataType: "constructor",
            index: 6,
            fields: [],
          },
        ],
      },
    },
  ) as unknown as TreasuryValidatorValidateTreasuryMintingOrWithdrawal;
