// deno-lint-ignore-file
import { applyParamsToScript, Data, Validator } from "translucent-cardano";

export interface AuthenMintingPolicyValidateAuthen {
  new (outRef: {
    transactionId: { hash: string };
    outputIndex: bigint;
  }): Validator;
  redeemer: "MintFactoryAuthen" | "CreateTreasury";
}

export const AuthenMintingPolicyValidateAuthen = Object.assign(
  function (outRef: { transactionId: { hash: string }; outputIndex: bigint }) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "5907d801000032323232323232323222232533300732323232533300b3370e900018050008991919191919299980899b87480000104c8c8c8c8c8c8c8c8c94ccc074c0800044c8c8c94ccc080c08c0084c8c8c8c8c94ccc0894ccc088cdc780280b0a99981119b8f003489024d530013370e00290010a5014a026464a66604e6054004264646464a66605066e1d2004302700113232533302a3370e900018148008991919192999818981a0010a99981719b8f00348901000013371e00291121ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000014a02c6eb8c0c8004c0c8008dd7181800098140008b181700098130008b18160009816000981580098110008b181400099809006919b87333015375660506052604200202e9101024d53004800858dd6981300098130011bae30240013024002375c60440022c6eb0c084004c8cc004004008894ccc08000452f5c0264666444646600200200644a66604c0022006264660506e9ccc0a0dd4803198141ba9375c604a002660506ea0dd69813000a5eb80cc00c00cc0a8008c0a0004dd7180f8009bab30200013300300330240023022001300b002163300900723375e603e603000202e6eacc074004c074004c070008dd6180d000980d000980c8011bac3017001300f0091323232323232323232323232323232533302330260021323232325333027302a00213232323232323232323232323232323232323375e6e98c09c07cdd31919199980099998009999800a5eb7bdb1800b1221024d5300480080b12201034d535000480080b000d20feffffffffffffffff012222533303b3370e00290000802099191980080080311299982080089982119bb0375200c6e9800d2f5bded8c0264646464a66608466ebccc03002800930103d8798000133046337606ea4028dd30038028a99982119b8f00a0021323253330443370e900000089982419bb037520186092608400400a200a608400264a666086a66608c00229445280a60103d87a800013374a9000198239ba60014bd70191980080080111299982380089982419bb037520166ea00292f5bded8c0264646464a66609066ebccc04803c00930103d879800013304c337606ea403cdd40070028a99982419b8f00f00213232533304a3370e900000089982719bb03752022609e609000400a200a609000264a66609266e1c005200014c103d87a800013374a9000198269ba80014bd7019b8000100e13304c337606ea4008dd4000998030030019bad3049003375c608e0046096004609200226608c66ec0dd48011ba600133006006003375660860066eb8c104008c114008c10c004c8c8008c8cc004004008894ccc104004526132533304200114984c8c8c8c8c8c8c94ccc118cdc3a40000022660140146609400c00a2c60880026601c0040026eb8c11000cdd7182180198238019822801182200118220009981f99bb037520046ea00052f5bded8c044a66607066e400080045300103d8798000153330383371e0040022980103d87a800014c103d87b80003232300233001300233001009007300233001005003223371400400246e4c004dd7181c800981c8011bae3037001302f005375c606a002606a0046eb8c0cc004c0ac008c0b8008c0b0004c8c8c8c8c8c8c8c94ccc0c8cdc78038018a99981919b90005001133760016012266ec002402c54ccc0c8cdc8003801899bb000b0091337600120166eb8c0d8004c0d8008dd7181a00098160029bae30320013032002375c60600026050006605c002605c004605800260480046464a66604e66e1d2000001132323232533302e303100213232498c01c008c01800c58c0bc004c0bc008c0b4004c09400c58c0940088c94ccc09ccdc3a4000002264646464a66605c60620042930b1bae302f001302f002375c605a002604a0042c604a002604c0022c6050002646600200200c44a66604e002297adef6c60132325333026323253330283370e9001000899baf007302d302600214a0604c002604e0042660540046600800800226600800800260560046052002604c002603c0022c60480026601c018466e1cccc044dd598121812980e98121812980e800809a45024d530048008dd59811000981100098108009810000980f800980f0011bab301c001301c001301b001301a00130190023758602e002601e01244646600200200644a66602e002297ae0132325333016300500213301a00233004004001133004004001301b00230190012323300100100222533301500114bd6f7b630099191919299980b19b8f48900002100313301a337606ea4008dd3000998030030019bab3017003375c602a0046032004602e002444646464a66602866e1d20020011480004dd6980c9809001180900099299980999b8748008004530103d87a8000132323300100100222533301900114c103d87a8000132323232533301a3371e014004266e9520003301e375000297ae0133006006003375a60360066eb8c064008c074008c06c004dd5980c18088011808800991980080080211299980b0008a6103d87a800013232323253330173371e010004266e9520003301b374c00297ae0133006006003375660300066eb8c058008c068008c060004c030024dd7180880098048008b18078009807801180680098028010a4c26cac64a66600e66e1d20000011533300a300500314985854ccc01ccdc3a40040022a666014600a0062930b0b1802801118029baa001230033754002ae6955ceaab9e5573eae815d0aba21",
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
        {
          title: "MintFactoryAuthen",
          dataType: "constructor",
          index: 0,
          fields: [],
        },
        {
          title: "CreateTreasury",
          dataType: "constructor",
          index: 1,
          fields: [],
        },
      ],
    },
  },
) as unknown as AuthenMintingPolicyValidateAuthen;

export interface FactoryValidatorValidateFactory {
  new (
    authenPolicyId: string,
    treasuryHash: string,
    orderHash: string,
  ): Validator;
  datum: { head: string; tail: string };
  redeemer: {
    baseAsset: { policyId: string; assetName: string };
    raiseAsset: { policyId: string; assetName: string };
  };
}

export const FactoryValidatorValidateFactory = Object.assign(
  function (authenPolicyId: string, treasuryHash: string, orderHash: string) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "590b1f0100003232323232323232322322322322223232323253330103232323253330143370e9001180980089919191919191919191919191919191919191919191919191919191919191919299981a19b8748000c0cc0044c8c8c8c8c8c8c8c8c8c8c94ccc108c1140044c8c8c8c94ccc118c1240084c8c8c8c94ccc11ccdc3a4008608c0022646464646464a66609a66e1d2004304c0011323232323232533305630590021323232323253330583370e9002182b8008991919299982d99b9003802a1533305b3372005406c2a6660b666ebc04ccdd2a4000660be6ea40e0cc17cdd481525eb8054ccc16ccdd780699ba548000cc17cdd48151982f9ba90364bd700991919299982f19baf374c66002082910100374c66660046666004666600497adef6c6005a4881024d5300480081692201034d535000480081680b520feffffffffffffffff0113232323232323232323232323232323232323232323232323253330773375e0300b02a6660ee66ebc05815854ccc1dcccc1dccdd782c02b2504a22a6660ee66ebcdd31980d01124500374c0022a6660ee66e21200000c153330773371e01c0de2a6660ee66e1c0212000153330773370e0149000099b87006480005280a5014a029405280a5014a02940cccc068cccc068cccc0692f5bded8c00e49101034d535000480081c811520feffffffffffffffff0100300100b375c60f400260f40046eb8c1e0004c1c014cdd6983b000983b0011bad30740013074002375a60e400260e40046eb4c1c0004c1c0008dd718370009837000983680098360009835800983500098348009834001183300098330011832000982e0028a5022323300100100322533306400114bd6f7b630099191919299983299b8f0070021003133069337606ea4008dd3000998030030019bab3066003375c60c800460d000460cc0024444a6660c066e1c005200010041323233001001006225333066001133067337606ea4018dd3001a5eb7bdb1804c8c8c8c94ccc19ccdd79980600500126103d879800013306b337606ea4028dd30038028a99983399b8f00a0021323253330693370e900000089983699bb0375201860dc60ce00400a200a60ce00264a6660d0a6660d600229445280a60103d87a800013374a9000198361ba60014bd70191980080080111299983600089983699bb037520166ea00292f5bded8c0264646464a6660da66ebccc04803c00930103d8798000133071337606ea403cdd40070028a99983699b8f00f00213232533306f3370e900000089983999bb0375202260e860da00400a200a60da00264a6660dc66e1c005200014c103d87a800013374a9000198391ba80014bd7019b8000100e133071337606ea4008dd4000998030030019bad306e003375c60d800460e000460dc0022660d666ec0dd48011ba600133006006003375660d00066eb8c198008c1a8008c1a0004c8c8008c8cc004004008894ccc198004526132533306700114984c8c8c8c8c8c8c94ccc1accdc3a4000002266014014660de00c00a2c60d20026601c0040026eb8c1a400cdd7183400198360019835001183480118348009983219bb037520046ea00052f5bded8c044a6660ba66e400080045300103d87980001533305d3371e0040022980103d87a800014c103d87b800014a029405280a50323232533305d3370e9000000899191919191919191919191919191919191919191919191919191919299983e183f8010991919191924c6044022604202464a6660f866e1d200000113232323253330830130860100213232498c94ccc20804cdc3a400000226464a66610e02611402004264931929998428099b87480000044c8c94ccc22804c234040084c926302d00116308b0100130830100215333085013370e900100089919191919192999847009848808010a4c2c6eb4c23c04004c23c04008dd69846808009846808011bad308b01001308301002163083010011630880100130800100315333082013370e90010008a999842809840008018a4c2c2c610002004604c0062c61080200261080200461040200260f40282c60f402660d803460d60362c6eb4c1f4004c1f4008dd6983d800983d8011bad30790013079002375a60ee00260ee0046eb4c1d4004c1d4008dd7183980098398011838800983880118378009837801183680098368011bad306b001306b002375a60d200260d20046eb4c19c004c19c008c194004c194008c18c004c16c01058c16c00c8c94ccc174cdc3a400000226464a6660c460ca0042930b1bad3063001305b0021533305d3370e90010008a999830182d8010a4c2c2c60b6002464a6660b866e1d20000011323253330613064002149858dd71831000982d0010a99982e19b87480080044c8c94ccc184c19000852616375c60c400260b40042c60b400260bc00260ac0022c60b800260b80046eacc168004c168004c14400458c15c004cc0500dc8c8c8c8c8c8c8c94ccc164cdc3a400400226464a6660b666e3c1540044cdc399981480302ba45034d535000480085281bae305f001305700214a060ae00260b800260a80066eacc168004c168008c160004c140004c110008c10c01cc14c004c12c00458c144004c144004c140004c11c01cc134004c11400458c12c004c12c004c128004c10400c58c11c004c11c008c114004cc0080948c8c8c8c94ccc110cdd7801805099b873330120010404881024d5300480085281bab304800130480023046001303e001163300102723375e0066088607a6088607a6088608a607a00244646600200200644a666088002297ae01323253330433005002133047002330040040011330040040013048002304600130410013039001303f0013037001303d001303d0013034001303a001303200116323300100101d22533303800114c103d87a800013232533303732323232323232533303e3375e00c052266e1cccc0300040e92201024d5300480085281bab304200130420013039001303f001303f002303d001303500213374a90001981d80125eb804cc010010004c0f0008c0e8004888c8c8c94ccc0e0cdc3a40040022900009bad303d303600230360013253330373370e90010008a6103d87a8000132323300100100222533303d00114c103d87a8000132323232533303e3371e014004266e95200033042375000297ae0133006006003375a607e0066eb8c0f4008c104008c0fc004dd5981e181a801181a800991980080080211299981d0008a6103d87a8000132323232533303b3371e010004266e9520003303f374c00297ae0133006006003375660780066eb8c0e8008c0f8008c0f0004c8c8c008cc004c008cc00402401cc008cc00401400c88cdc500100091b93001375c606a002606a0046eb8c0cc004c0ac014dd7181880098188011bae302f0013027002302a00230280013232323232323232533302e3371e00e0062a66605c66e400140044cdd8007806899bb000d00f1533302e3372000e006266ec003c0344cdd80068079bae30320013032002375c606000260500126eb8c0b8004c0b8008dd7181600098120039bae302a001302a002375c60500026040032604c002604c004604800260380286eacc088004c088004c084008dd6180f800980f800980f0011bac301c0013014005301a001301200116301800130180023016001300e00514984d958c94ccc040cdc3a4000002264646464a66602e60340042646493180380118030018b180c000980c001180b00098070030b1807002919299980819b87480000044c8c8c8c94ccc05cc06800852616375c603000260300046eb8c058004c03800858c038004c0040108c94ccc038cdc3a4000002264646464a66602a60300042930b1bae30160013016002375c602800260180042c60180026eb8004dd70009bae001230053754002460066ea80055cd2ab9d5573caae7d5d02ba15745",
        [authenPolicyId, treasuryHash, orderHash],
        {
          dataType: "list",
          items: [
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
          ],
        },
      ],
    },
  },
) as unknown as FactoryValidatorValidateFactory;

export interface OrderValidatorFeedType {
  new (): Validator;
  _datum: {
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
    lpAssetName: string;
    expectOutputAsset: { policyId: string; assetName: string };
    minimumReceive: bigint;
    step: "Deposit" | "RedeemRaiseAsset" | "RedeemLP";
  };
  _redeemer: "ApplyOrder" | "CancelOrder";
}

export const OrderValidatorFeedType = Object.assign(
  function () {
    return { type: "PlutusV2", script: "510100003222253330044a029309b2b2b9a1" };
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
            { dataType: "bytes", title: "lpAssetName" },
            {
              title: "expectOutputAsset",
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
            { dataType: "integer", title: "minimumReceive" },
            {
              title: "step",
              anyOf: [
                {
                  title: "Deposit",
                  dataType: "constructor",
                  index: 0,
                  fields: [],
                },
                {
                  title: "RedeemRaiseAsset",
                  dataType: "constructor",
                  index: 1,
                  fields: [],
                },
                {
                  title: "RedeemLP",
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
  {
    _redeemer: {
      title: "OrderRedeemer",
      anyOf: [
        { title: "ApplyOrder", dataType: "constructor", index: 0, fields: [] },
        { title: "CancelOrder", dataType: "constructor", index: 1, fields: [] },
      ],
    },
  },
) as unknown as OrderValidatorFeedType;

export interface OrderValidatorValidateOrder {
  new (
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
        },
  ): Validator;
  rawDatum: Data;
  rawRedeemer: Data;
}

export const OrderValidatorValidateOrder = Object.assign(
  function (
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
        },
  ) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "59032a01000032323232323232322222533300732323232533300b3370e9001180500089919299980699b87480000044c8c8c8c8c8c8c8c8c8cc004004008894ccc0680045280991919299980d19baf01700114a226600a00a0046034004603a00460360026eacc060004c060004c05c004c058004c054004c050004c04c004c02c0144c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc070cdc3a4000603600226464646600200201244a66604600229404c8c94ccc088cdc78010028a511330040040013026002375c60480026eb8c084004c06800458c07c004c060004c074004c058050c8c94ccc064cdc3a4000002264646464646464646464a66604c605000426464649319299981319b874800000454ccc0a4c09001052616153330263370e90010008a99981498120020a4c2c2a66604c66e1d200400115333029302400414985858c09000cc94ccc094cdc3a4000002264646464a666058605c0042930b1bae302c001302c002375c6054002604600e2c604600c64a66604866e1d2000001132323232533302b302d00213232498c94ccc0a8cdc3a400000226464a66605e60620042649319299981699b87480000044c8c94ccc0c8c0d00084c9263018001163032001302b0021533302d3370e90010008991919191919299981b181c0010a4c2c6eb4c0d8004c0d8008dd6981a000981a0011bad3032001302b00216302b00116302f00130280031533302a3370e90010008a99981698140018a4c2c2c605000460220062c60560026056004605200260440142c60440122c604c002604c0046eb4c090004c090008c088004c088008dd718100009810001180f000980b80a8b180b80a119299980c99b87480000044c8c94ccc078c08000852616375c603c002602e0042a66603266e1d200200113232533301e3020002149858dd7180f000980b8010b180b8009bac301a001301a0013019001301800130170013016001301500130140013013001300b005300b00732533300c3370e90000008a99980798050038a4c2c2a66601866e1d20020011533300f300a00714985858c02801858c038004c038008c030004c01400452613656230053754002460066ea80055cd2ab9d5573caae7d5d0aba21",
        [stakeCredential],
        {
          dataType: "list",
          items: [
            {
              title: "Referenced",
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
                    { dataType: "integer", title: "slotNumber" },
                    { dataType: "integer", title: "transactionIndex" },
                    { dataType: "integer", title: "certificateIndex" },
                  ],
                },
              ],
            },
          ],
        } as any,
      ),
    };
  },
  { rawDatum: { title: "Data", description: "Any Plutus data." } },
  { rawRedeemer: { title: "Data", description: "Any Plutus data." } },
) as unknown as OrderValidatorValidateOrder;

export interface OrderValidatorValidateOrderSpending {
  new (treasuryHash: string): Validator;
  redeemer: { treasuryInputIndex: bigint };
}

export const OrderValidatorValidateOrderSpending = Object.assign(
  function (treasuryHash: string) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "59012001000032323232323232322322232533300832323232533300c3370e9002180580089919191919191919191919299980b99b8748008c0580044cdc78099bae301b301500116301a00130130013018001301100130160013016001300e333232323001001222533301533712900a0008999801801980d180d180d180d180d180d180d180d180d180d00119b81001480504cc010008004c0040048894ccc04ccdc4800a40002602e0042666006006603000466e04005200200100337586026002601800a6eb4c044004c02801c58c03c004c03c008c034004c018008526136563253330083370e900000089919299980698078010a4c2c6eb4c034004c01800c58c018008dd7000918029baa001230033754002ae6955ceaab9e5573eae855d101",
        [treasuryHash],
        { dataType: "list", items: [{ dataType: "bytes" }] } as any,
      ),
    };
  },

  {
    redeemer: {
      title: "OrderBatchingRedeemer",
      anyOf: [
        {
          title: "OrderBatchingRedeemer",
          dataType: "constructor",
          index: 0,
          fields: [{ dataType: "integer", title: "treasuryInputIndex" }],
        },
      ],
    },
  },
) as unknown as OrderValidatorValidateOrderSpending;

export interface TreasuryValidatorValidateTreasury {
  new (authenPolicyId: string): Validator;
  datum: {
    baseAsset: { policyId: string; assetName: string };
    raiseAsset: { policyId: string; assetName: string };
    discoveryStartTime: bigint;
    discoveryEndTime: bigint;
    encounterStartTime: bigint;
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
    orderHash: string;
    reserveBase: bigint;
    reserveRaise: bigint;
    totalLiquidity: bigint;
    isCancel: bigint;
    isCreatedPool: bigint;
  };
  redeemer: "UpdateLBE" | "CreatePool" | "Batching" | "CancelLBE";
}

export const TreasuryValidatorValidateTreasury = Object.assign(
  function (authenPolicyId: string) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "5902bc01000032323232323232322322223232533300a4a229309b2b19299980519b874800000454ccc034c020010526161533300a3370e90010008a99980698040020a4c2c2a66601466e1d20040011533300d300800414985854ccc028cdc3a400c0022a66601a60100082930b0b180400199191919299980619b87480000044c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc0acc0b40084c8c8c8c8c9263022011302101232533302b3370e90000008991919192999819181a0010991924c64a66606266e1d20000011323253330363038002132498c94ccc0d0cdc3a400000226464a66607260760042649318170008b181c80098190010a99981a19b87480080044c8c8c8c8c8c94ccc0f4c0fc00852616375a607a002607a0046eb4c0ec004c0ec008dd6981c80098190010b18190008b181b00098178018a99981899b874800800454ccc0d0c0bc00c5261616302f0023027003163032001303200230300013029014163029013302001a301f01b16375a605600260560046eb4c0a4004c0a4008dd6981380098138011bad30250013025002375a604600260460046eb8c084004c084008c07c004c07c008c074004c074008c06c004c06c008dd6980c800980c8011bad30170013017002375a602a002602a004602600260260046022002601400e2c601400c464a66601866e1d20000011323253330113013002149858dd6980880098050010a99980619b874800800454ccc03cc0280085261616300a001232533300b3370e90000008991919192999809180a0010a4c2c6eb8c048004c048008dd7180800098048010b1804800919299980519b87480000044c8c94ccc03cc04400852616375c601e00260100042a66601466e1d200200113232533300f3011002149858dd7180780098040010b18040009bae001230053754002460066ea80055cd2ab9d5573caae7d5d0aba201",
        [authenPolicyId],
        { dataType: "list", items: [{ dataType: "bytes" }] } as any,
      ),
    };
  },
  {
    datum: {
      title: "TreasuryDatum",
      anyOf: [
        {
          title: "TreasuryDatum",
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
            { dataType: "integer", title: "discoveryStartTime" },
            { dataType: "integer", title: "discoveryEndTime" },
            { dataType: "integer", title: "encounterStartTime" },
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
            { dataType: "bytes", title: "orderHash" },
            { dataType: "integer", title: "reserveBase" },
            { dataType: "integer", title: "reserveRaise" },
            { dataType: "integer", title: "totalLiquidity" },
            { dataType: "integer", title: "isCancel" },
            { dataType: "integer", title: "isCreatedPool" },
          ],
        },
      ],
    },
  },
  {
    redeemer: {
      title: "TreasuryRedeemer",
      anyOf: [
        { title: "UpdateLBE", dataType: "constructor", index: 0, fields: [] },
        { title: "CreatePool", dataType: "constructor", index: 1, fields: [] },
        { title: "Batching", dataType: "constructor", index: 2, fields: [] },
        { title: "CancelLBE", dataType: "constructor", index: 3, fields: [] },
      ],
    },
  },
) as unknown as TreasuryValidatorValidateTreasury;
