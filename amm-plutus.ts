import {
  applyParamsToScript,
  Data,
  type Validator,
} from "@minswap/translucent";

export interface AlwaysSuccessSpend {
  new (): Validator;
  _d: Data;
  _r: Data;
}

export const AlwaysSuccessSpend = Object.assign(
  function () {
    return {
      type: "PlutusV2",
      script:
        "583c0100003232323232222533300432323253330073370e900118041baa00114a22c60120026012002600c6ea8004526136565734aae7555cf2ba157441",
    };
  },
  { _d: { title: "Data", description: "Any Plutus data." } },
  { _r: { title: "Data", description: "Any Plutus data." } },
) as unknown as AlwaysSuccessSpend;

export interface AuthenMintingPolicyValidateAuthen {
  new (outRef: {
    transactionId: { hash: string };
    outputIndex: bigint;
  }): Validator;
  redeemer: "DexInitialization" | "CreatePool";
}

export const AuthenMintingPolicyValidateAuthen = Object.assign(
  function (outRef: { transactionId: { hash: string }; outputIndex: bigint }) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "590f690100003232323232323232323222253330063370e90001802800899299980399191919299980599b8748000c0280044c8c8c8c8c8c94ccc044cdc3a40040082646464646464646464646464646464a666046604c004264646464a66604e605400426464646464646464646464646464a6660646464646464646464a66607466e3c01c00c4cdc8002800899b90007003375c607c002607c0046eb8c0f0004c0d0034dd7181d000981d0011bae3038001303000b1323375e6e98c094070dd31919199980099998009999800a5eb7bdb1800a5221034d534600480080a52201034d535000480080a400d20feffffffffffffffff01222253330383370e00290000802099191980080080311299981f00089981f99bb0375200c6e9800d2f5bded8c0264646464a66607e66ebccc03002800930103d8798000133043337606ea4028dd30038028a99981f99b8f00a0021323253330413370e900000089982299bb03752018608c607e00400a200a607e00264a666080a66608600229445280a60103d87a800013374a9000198221ba60014bd70191980080080111299982200089982299bb037520166ea00292f5bded8c0264646464a66608a66ebccc04803c00930103d8798000133049337606ea403cdd40070028a99982299b8f00f0021323253330473370e900000089982599bb037520226098608a00400a200a608a00264a66608c66e1c005200014c103d87a800013374a9000198251ba80014bd7019b8000100e133049337606ea4008dd4000998030030019bad3046003375c60880046090004608c00226608666ec0dd48011ba600133006006003375660800066eb8c0f8008c108008c100004c8c8008c8cc004004008894ccc0f8004526132533303f00114984c8c8c8c8c8c8c94ccc10ccdc3a40000022660140146608e00c00a2c60820026601c0040026eb8c10400cdd7182000198220019821001182080118208009981e19bb037520046ea00052f5bded8c044a66606a66e400080045300103d8798000153330353371e0040022980103d87a800014c103d87b80003232300233001300233001009007300233001005003223371400400246e4c00458dd7181b000981b0011bae3034001302c005375c606400260640046eb8c0c0004c0a000cc0b8004c0b8008c0b0004c090008c8c94ccc09ccdc3a4000002264646464a66605c60620042646493180380118030018b18178009817801181680098128018b1812801119299981399b87480000044c8c8c8c94ccc0b8c0c400852616375c605e002605e0046eb8c0b4004c09400858c094004c09800458c0a0004c8cc004004018894ccc09c00452f5bded8c026464a66604c6464a66605066e1d200200113375e00e605a604c0042940c098004c09c0084cc0a8008cc0100100044cc010010004c0ac008c0a4004c098004c07800458c090004cc0380308cdc39998081bab30243025301d30243025301d0010134881034d53460048008dd59811000981100098108009810000980f800980f0011bab301c001301c001301b001301a00130190023758602e002601e0122646464646464646464a66603a6040002264a666036a66603666e1ccc8c004004894ccc08000452000133700900119801001181180099198008008011129998100008a5eb804c8ccc888c8cc00400400c894ccc098004400c4c8cc0a0dd3998141ba90063302837526eb8c094004cc0a0dd41bad30260014bd7019801801981500118140009bae301f00137566040002660060066048004604400290020a99980d99b8733300c00100f4881044d53475300480084cdc3999806000807a441034d534600480085280a501323253330203023002132323232323232323232323232533302d3030002132323232323232323253330333371e01c9101010000153330333371e018910121ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000015333033333033303a0014a09444cdc3999812003813a441044d53475300480085280a5014a06eb0c0dc004c0bc008c8c8c94ccc0cccdc3a40000022646464646464646464646464a666084608a0042646464646464931809803180900398088041808004980780519198008008061129998220008a4c2646600600660900046020608c0022c6086002608600460820026082004607e002607e004607a002607a004607600260760046eb0c0e4004c0c401058c0c400c8c94ccc0cccdc3a4000002264646464a666074607a004264649319299981c99b87480000044c8c94ccc0f8c1040084c92632533303c3370e9000000899192999820982200109924c601c0022c608400260740042a66607866e1d2002001132323232323253330453048002149858dd6982300098230011bad30440013044002375a608400260740042c60740022c607e002606e0062a66607266e1d20020011533303c303700314985858c0dc008c01c00c58c0ec004c0ec008c0e4004c0c400858c0c40048c94ccc0c8cdc3a400000226464a66606e60740042930b1bae30380013030002153330323370e900100089919299981b981d0010a4c2c6eb8c0e0004c0c000858c0c0004c038004c0cc004c0cc008dd59818800981880098140008b18170009980c00991919191919299981719b87480080044cdc79bae3033302c00202214a0605800260620026052002605e002604e0026eb8c0b0004c0b0008dd71815000981100119299981219b87480000044c8c8c8c94ccc0acc0b800852616375c605800260580046eb8c0a8004c08800858c088004c0040088c94ccc08ccdc3a40080022605060420042c6042002604a002604a002604800260360022c60420026601600c466e1cccc034dd598109811180d0008082441034d5346004800858c03000858cc02401c8cdd7980f980c00080b9bab301d001301d001301c00237586034002603400260320046eb0c05c004c03c02488c8cc00400400c894ccc05c00452f5c026464a66602c600a0042660340046600800800226600800800260360046032002444646464a66602a66e1d20020011480004dd6980d1809801180980099299980a19b87480080045300103d87a8000132323300100100222533301a00114c103d87a8000132323232533301b3371e014004266e9520003301f375000297ae0133006006003375a60380066eb8c068008c078008c070004dd5980c98090011809000991980080080211299980b8008a6103d87a800013232323253330183371e010004266e9520003301c374c00297ae0133006006003375660320066eb8c05c008c06c008c0640048c8cc004004008894ccc05000452f5bded8c0264646464a66602a66e3d2201000021003133019337606ea4008dd3000998030030019bab3016003375c60280046030004602c00260180126eb8c044004c02400458c03c004c03c008c034004c014008526136563253330073370e90000008a99980518028018a4c2c2a66600e66e1d20020011533300a300500314985858c0140084c88c8c8c8c94ccc030c8c8c8c94ccc040cdc3a4004601e00226464646464646464646464646464646464a66604266e1d2000302000113232323232323232323232533302c3370e900118158008991919191919191919191919191919191919191919192999821191919299982299b87480000044c8c8cc0040040a0894ccc12c00452809919299982519b8f00200514a2266008008002609e0046eb8c134004dd718251821801099191929998240008a511323300100103622533304d00114a026464a66609866ebcc144c128c144c128c144c148c128008024528899802002000982880118278009919198008008169129998268008a501323232533304d3375e00c00229444cc014014008c134008c144008c13c004cdd2a40006609666e9520023304b375200297ae04bd701bae304b001304300230430013048001304000e13253330433370e66600203402c9101044d534753004800854ccc10ccdc399980080500b245044d534753004800854ccc10ccdd780300c0a99982199baf374c646600200205644a666090002297adef6c6013232323253330493371e91100002100313304d337606ea4008dd3000998030030019bab304a003375c609000460980046094002980101a0001333043304a0024a09445280a5014a02940888c8c8c94ccc120cdc3a40040022900009bad304d304600230460013253330473370e90010008a6103d87a8000132323300100100222533304d00114c103d87a8000132323232533304e3371e014004266e95200033052375000297ae0133006006003375a609e0066eb8c134008c144008c13c004dd598261822801182280099198008008021129998250008a6103d87a8000132323232533304b3371e010004266e9520003304f374c00297ae0133006006003375660980066eb8c128008c138008c1300045281bac3046001303e002303500132533303f3370e900200089822181e8020b181e8019821000981d002982000098200011bab303e001303e002303c0013034001303a01f303900130390013038001303700130360013035001302c02a375c606400260540022c606000260500066eacc0b8004c0b8008c0b0004c090004c0a8004c0a8004c084004c09c004c07c00458c8cc004004038894ccc094004530103d87a80001323253330243375e60526044004026266e952000330280024bd70099802002000981480118138009bac30240013024001302300237566042002604200260400046eacc078004c078004c074008dd6180d800980d800980d0011bac301800130100053016001300e00116301400130140023012001300a00514984d958c00401c8c94ccc030cdc3a40000022646464646464646464646464a666036603c004264646464646493180a0031809803980900418088049808005191980080080611299980e8008a4c2646600600660420046022603e0022c603800260380046034002603400460300026030004602c002602c004602800260280046eb0c048004c02800858c0280048c94ccc02ccdc3a4000002264646464a666024602a004264649319299980899b87480000044c8c94ccc058c0640084c9263253330143370e900000089919299980c980e00109924c601c0022c603400260240042a66602866e1d20020011323232323232533301d3020002149858dd6980f000980f0011bad301c001301c002375a603400260240042c60240022c602e002601e0062a66602266e1d200200115333014300f00314985858c03c008c01c00c58c04c004c04c008c044004c02400858c0240048c94ccc028cdc3a400000226464a66601e60240042930b1bae301000130080021533300a3370e900100089919299980798090010a4c2c6eb8c040004c02000858c020004c02cc0100048c014dd5000918019baa0015734aae7555cf2ab9f5740ae855d12ba301",
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
          title: "DexInitialization",
          dataType: "constructor",
          index: 0,
          fields: [],
        },
        { title: "CreatePool", dataType: "constructor", index: 1, fields: [] },
      ],
    },
  },
) as unknown as AuthenMintingPolicyValidateAuthen;

export interface AuthenMintingPolicyValidateSpendGlobalSetting {
  new (outRef: {
    transactionId: { hash: string };
    outputIndex: bigint;
  }): Validator;
  datum: {
    batchers: Array<{
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
    }>;
    poolFeeUpdater: {
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
    feeSharingTaker: {
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
    poolStakeKeyUpdater: {
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
    poolDynamicFeeUpdater: {
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
    admin: {
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
  };
  _redeemer: { wrapper: Data };
}

export const AuthenMintingPolicyValidateSpendGlobalSetting = Object.assign(
  function (outRef: { transactionId: { hash: string }; outputIndex: bigint }) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "590f690100003232323232323232323222253330063370e90001802800899299980399191919299980599b8748000c0280044c8c8c8c8c8c94ccc044cdc3a40040082646464646464646464646464646464a666046604c004264646464a66604e605400426464646464646464646464646464a6660646464646464646464a66607466e3c01c00c4cdc8002800899b90007003375c607c002607c0046eb8c0f0004c0d0034dd7181d000981d0011bae3038001303000b1323375e6e98c094070dd31919199980099998009999800a5eb7bdb1800a5221034d534600480080a52201034d535000480080a400d20feffffffffffffffff01222253330383370e00290000802099191980080080311299981f00089981f99bb0375200c6e9800d2f5bded8c0264646464a66607e66ebccc03002800930103d8798000133043337606ea4028dd30038028a99981f99b8f00a0021323253330413370e900000089982299bb03752018608c607e00400a200a607e00264a666080a66608600229445280a60103d87a800013374a9000198221ba60014bd70191980080080111299982200089982299bb037520166ea00292f5bded8c0264646464a66608a66ebccc04803c00930103d8798000133049337606ea403cdd40070028a99982299b8f00f0021323253330473370e900000089982599bb037520226098608a00400a200a608a00264a66608c66e1c005200014c103d87a800013374a9000198251ba80014bd7019b8000100e133049337606ea4008dd4000998030030019bad3046003375c60880046090004608c00226608666ec0dd48011ba600133006006003375660800066eb8c0f8008c108008c100004c8c8008c8cc004004008894ccc0f8004526132533303f00114984c8c8c8c8c8c8c94ccc10ccdc3a40000022660140146608e00c00a2c60820026601c0040026eb8c10400cdd7182000198220019821001182080118208009981e19bb037520046ea00052f5bded8c044a66606a66e400080045300103d8798000153330353371e0040022980103d87a800014c103d87b80003232300233001300233001009007300233001005003223371400400246e4c00458dd7181b000981b0011bae3034001302c005375c606400260640046eb8c0c0004c0a000cc0b8004c0b8008c0b0004c090008c8c94ccc09ccdc3a4000002264646464a66605c60620042646493180380118030018b18178009817801181680098128018b1812801119299981399b87480000044c8c8c8c94ccc0b8c0c400852616375c605e002605e0046eb8c0b4004c09400858c094004c09800458c0a0004c8cc004004018894ccc09c00452f5bded8c026464a66604c6464a66605066e1d200200113375e00e605a604c0042940c098004c09c0084cc0a8008cc0100100044cc010010004c0ac008c0a4004c098004c07800458c090004cc0380308cdc39998081bab30243025301d30243025301d0010134881034d53460048008dd59811000981100098108009810000980f800980f0011bab301c001301c001301b001301a00130190023758602e002601e0122646464646464646464a66603a6040002264a666036a66603666e1ccc8c004004894ccc08000452000133700900119801001181180099198008008011129998100008a5eb804c8ccc888c8cc00400400c894ccc098004400c4c8cc0a0dd3998141ba90063302837526eb8c094004cc0a0dd41bad30260014bd7019801801981500118140009bae301f00137566040002660060066048004604400290020a99980d99b8733300c00100f4881044d53475300480084cdc3999806000807a441034d534600480085280a501323253330203023002132323232323232323232323232533302d3030002132323232323232323253330333371e01c9101010000153330333371e018910121ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000015333033333033303a0014a09444cdc3999812003813a441044d53475300480085280a5014a06eb0c0dc004c0bc008c8c8c94ccc0cccdc3a40000022646464646464646464646464a666084608a0042646464646464931809803180900398088041808004980780519198008008061129998220008a4c2646600600660900046020608c0022c6086002608600460820026082004607e002607e004607a002607a004607600260760046eb0c0e4004c0c401058c0c400c8c94ccc0cccdc3a4000002264646464a666074607a004264649319299981c99b87480000044c8c94ccc0f8c1040084c92632533303c3370e9000000899192999820982200109924c601c0022c608400260740042a66607866e1d2002001132323232323253330453048002149858dd6982300098230011bad30440013044002375a608400260740042c60740022c607e002606e0062a66607266e1d20020011533303c303700314985858c0dc008c01c00c58c0ec004c0ec008c0e4004c0c400858c0c40048c94ccc0c8cdc3a400000226464a66606e60740042930b1bae30380013030002153330323370e900100089919299981b981d0010a4c2c6eb8c0e0004c0c000858c0c0004c038004c0cc004c0cc008dd59818800981880098140008b18170009980c00991919191919299981719b87480080044cdc79bae3033302c00202214a0605800260620026052002605e002604e0026eb8c0b0004c0b0008dd71815000981100119299981219b87480000044c8c8c8c94ccc0acc0b800852616375c605800260580046eb8c0a8004c08800858c088004c0040088c94ccc08ccdc3a40080022605060420042c6042002604a002604a002604800260360022c60420026601600c466e1cccc034dd598109811180d0008082441034d5346004800858c03000858cc02401c8cdd7980f980c00080b9bab301d001301d001301c00237586034002603400260320046eb0c05c004c03c02488c8cc00400400c894ccc05c00452f5c026464a66602c600a0042660340046600800800226600800800260360046032002444646464a66602a66e1d20020011480004dd6980d1809801180980099299980a19b87480080045300103d87a8000132323300100100222533301a00114c103d87a8000132323232533301b3371e014004266e9520003301f375000297ae0133006006003375a60380066eb8c068008c078008c070004dd5980c98090011809000991980080080211299980b8008a6103d87a800013232323253330183371e010004266e9520003301c374c00297ae0133006006003375660320066eb8c05c008c06c008c0640048c8cc004004008894ccc05000452f5bded8c0264646464a66602a66e3d2201000021003133019337606ea4008dd3000998030030019bab3016003375c60280046030004602c00260180126eb8c044004c02400458c03c004c03c008c034004c014008526136563253330073370e90000008a99980518028018a4c2c2a66600e66e1d20020011533300a300500314985858c0140084c88c8c8c8c94ccc030c8c8c8c94ccc040cdc3a4004601e00226464646464646464646464646464646464a66604266e1d2000302000113232323232323232323232533302c3370e900118158008991919191919191919191919191919191919191919192999821191919299982299b87480000044c8c8cc0040040a0894ccc12c00452809919299982519b8f00200514a2266008008002609e0046eb8c134004dd718251821801099191929998240008a511323300100103622533304d00114a026464a66609866ebcc144c128c144c128c144c148c128008024528899802002000982880118278009919198008008169129998268008a501323232533304d3375e00c00229444cc014014008c134008c144008c13c004cdd2a40006609666e9520023304b375200297ae04bd701bae304b001304300230430013048001304000e13253330433370e66600203402c9101044d534753004800854ccc10ccdc399980080500b245044d534753004800854ccc10ccdd780300c0a99982199baf374c646600200205644a666090002297adef6c6013232323253330493371e91100002100313304d337606ea4008dd3000998030030019bab304a003375c609000460980046094002980101a0001333043304a0024a09445280a5014a02940888c8c8c94ccc120cdc3a40040022900009bad304d304600230460013253330473370e90010008a6103d87a8000132323300100100222533304d00114c103d87a8000132323232533304e3371e014004266e95200033052375000297ae0133006006003375a609e0066eb8c134008c144008c13c004dd598261822801182280099198008008021129998250008a6103d87a8000132323232533304b3371e010004266e9520003304f374c00297ae0133006006003375660980066eb8c128008c138008c1300045281bac3046001303e002303500132533303f3370e900200089822181e8020b181e8019821000981d002982000098200011bab303e001303e002303c0013034001303a01f303900130390013038001303700130360013035001302c02a375c606400260540022c606000260500066eacc0b8004c0b8008c0b0004c090004c0a8004c0a8004c084004c09c004c07c00458c8cc004004038894ccc094004530103d87a80001323253330243375e60526044004026266e952000330280024bd70099802002000981480118138009bac30240013024001302300237566042002604200260400046eacc078004c078004c074008dd6180d800980d800980d0011bac301800130100053016001300e00116301400130140023012001300a00514984d958c00401c8c94ccc030cdc3a40000022646464646464646464646464a666036603c004264646464646493180a0031809803980900418088049808005191980080080611299980e8008a4c2646600600660420046022603e0022c603800260380046034002603400460300026030004602c002602c004602800260280046eb0c048004c02800858c0280048c94ccc02ccdc3a4000002264646464a666024602a004264649319299980899b87480000044c8c94ccc058c0640084c9263253330143370e900000089919299980c980e00109924c601c0022c603400260240042a66602866e1d20020011323232323232533301d3020002149858dd6980f000980f0011bad301c001301c002375a603400260240042c60240022c602e002601e0062a66602266e1d200200115333014300f00314985858c03c008c01c00c58c04c004c04c008c044004c02400858c0240048c94ccc028cdc3a400000226464a66601e60240042930b1bae301000130080021533300a3370e900100089919299980798090010a4c2c6eb8c040004c02000858c020004c02cc0100048c014dd5000918019baa0015734aae7555cf2ab9f5740ae855d12ba301",
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
    datum: {
      title: "GlobalSetting",
      anyOf: [
        {
          title: "GlobalSetting",
          dataType: "constructor",
          index: 0,
          fields: [
            {
              dataType: "list",
              items: {
                title: "Address",
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
              title: "batchers",
            },
            {
              title: "poolFeeUpdater",
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
              title: "feeSharingTaker",
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
              title: "poolStakeKeyUpdater",
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
              title: "poolDynamicFeeUpdater",
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
              title: "admin",
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
          ],
        },
      ],
    },
  },
  {
    _redeemer: {
      title: "Wrapped Redeemer",
      description:
        "A redeemer wrapped in an extra constructor to make multi-validator detection possible on-chain.",
      anyOf: [
        {
          dataType: "constructor",
          index: 1,
          fields: [{ description: "Any Plutus data." }],
        },
      ],
    },
  },
) as unknown as AuthenMintingPolicyValidateSpendGlobalSetting;

export interface FactoryValidatorValidateFactory {
  new (
    authenPolicyId: string,
    poolAddress: {
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
    },
    poolBatchingStakeCredential:
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
  datum: { head: string; tail: string };
  redeemer: {
    assetA: { policyId: string; assetName: string };
    assetB: { policyId: string; assetName: string };
  };
}

export const FactoryValidatorValidateFactory = Object.assign(
  function (
    authenPolicyId: string,
    poolAddress: {
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
    },
    poolBatchingStakeCredential:
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
        "590b6c0100003232323232323232322322222232323232533300e3232323253330123370e900118080008991919191919191919191919191919191919191919191919191929998161919191919191919299981a19b8f00700313372000a002266e4001c00cdd7181c000981c0011bae3036001302f011375c606800260680046eb8c0c8004c0ac03c4c8c94ccc0b8cdc3a40006058002264646464646464646464646464a66607c6082002264a66607866e1cccc0040180e1221034d534600480084c8c8c8c94ccc10cc1180084c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc1554ccc154cdc80038028a99982a99b90003001153330553371e00e0682a6660aa66e3c0040c854ccc154cdc7814802899b8f02900314a029405280a5014a026464a6660b460ba00426464646464646464646464646464646464646464646464646464646464646464646464a6660f466ebc06c1d054ccc1e8cdd780c82e8a99983d19baf01705b1533307a3370e02a00a2a6660f466e1c04c01c54ccc1e8cdc38088030a99983d19b884800001c54ccc1e8cdc42400000c2a6660f466e2120140051533307a3370e01e01a2a6660f4a6660f466e2403d20a01f13371290050078a501533307a533307a00914a026660f4941282511533307a3375e01698103d87a80001533307a3375e6e98c8cc004004180894ccc1fc00452f5bded8c0264646464a6661000266e3d220100002100313308401337606ea4008dd3000998030030019bab308101003375c60fe0046106020046102020026e98cccc008cccc008cccc0092f5bded8c00ec9101034d534600480081d92201034d535000480081d813920feffffffffffffffff0113375e6e98004dd30108a5014a029405280a5014a029405280a5014a029405280a5014a06666002666600266660026666002666600297adef6c6048810048810048302a294101501480181401380141d413400c1d5221034d5350004800888894ccc1f0cdc3800a40002008264646600200200c44a666104020022661060266ec0dd48031ba60034bd6f7b63009919191929998418099baf3300c00a0024c0103d879800013308701337606ea4028dd30038028a9998418099b8f00a002132325333085013370e90000008998448099bb0375201861140261080200400a200a61040200264a66610802a66610e0200229445280a60103d87a800013374a900019844009ba60014bd701919800800801112999844008008998448099bb037520166ea00292f5bded8c0264646464a6661120266ebccc04803c00930103d879800013308d01337606ea403cdd40070028a9998448099b8f00f00213232533308b013370e90000008998478099bb0375202261200261140200400a200a61100200264a6661140266e1c005200014c103d87a800013374a900019847009ba80014bd7019b8000100e13308d01337606ea4008dd4000998030030019bad308a01003375c61100200461180200461140200226610e0266ec0dd48011ba60013300600600337566108020066eb8c20804008c21804008c21004004c8c8008c8cc004004008894ccc2080400452613253330830100114984c8c8c8c8c8c8c94ccc21c04cdc3a4000002266014014661160200c00a2c6108020026601c0040026eb8c2140400cdd7184200801984400801984300801184280801184280800998400099bb037520046ea00052f5bded8c044a6660f266e400080045300103d8798000153330793371e0040022980103d87a800014c103d87b800033702907f7fffffffffffffff8099b8100148050c8c94ccc1dccdc419b8200100100213370000290010800a99983b19b88001480005854ccc1d8cdc3800a4000290000a99983b19b870014800852002153330763370e00290020a400426464666002002006004444a6660f466e200040084ccc00c00c004cdc199b803370600a0020029002080119b803370600290022400466e08008004ccc0e406c12c1254ccc1cd4ccc1cccdc78272450013371e0989110014a0266e0400520c0a8a504100133303701904d04b3370e900118391baa3076001307600230740013074002375a60e400260e40046eb4c1c0004c1c0008dd6983700098370011bad306c001306c002375a60d400260d400460d000260d000460cc00260cc00460c800260ba00464a6660bc66e1d20000011323232323232323232323232323232323232323253330753078002132323232498c94ccc1d8cdc3a400000226464a6660f660fc0042930b1bad307c0013075007153330763370e90010008a99983c983a8038a4c2c2c60e600c60d002260ce02464a6660e666e1d2000001132325333078307b002132498c94ccc1d8cdc3a400000226464a6660f660fc0042930b1bae307c0013075002153330763370e900100089919299983d983f0010a4c2c6eb8c1f0004c1d400858c1cc00458c1e4004c1c805054ccc1cccdc3a40040022646464646464a6660f860fe0042930b1bad307d001307d002375a60f600260f60046eb4c1e4004c1c805058c1c004c58cdc3a400460e46ea8c1d8004c1d8008c1d0004c1d0008dd6983900098390011bad30700013070002375a60dc00260dc0046eb4c1b0004c1b0008dd69835000983500118340009834001183300098330011832000982e8010b182d800980a000983000098300011bab305e001305e001305600116305b0013301c03d232323232323232533305d3370e90010008a99982e99baf05800613370e6660440080b2911034d535000480085280a50305a00130600013059003375660bc00260bc00460b800260aa0022c6eb8c164004c164008dd7182b80098280031bae30550013055002375c60a60026098008608400260060086080002600200c464a66609466e1d20040011304f3049002163047001304c001304c001304b0013043005304800130480013047001303f0031630440013044002304200133003024232323232323253330433375e016002266e1cccc02000c0fd221034d53460048008528182380098200019bab304500130450023043001303c0011622232323253330413370e90010008a400026eb4c118c100008c0f8004c94ccc100cdc3a4004002298103d87a8000132323300100100222533304600114c103d87a800013232323253330473371e014004266e9520003304b375000297ae0133006006003375a60900066eb8c118008c128008c120004dd59822981f801181e80099198008008021129998218008a6103d87a800013232323253330443371e010004266e95200033048374c00297ae01330060060033756608a0066eb8c10c008c11c008c11400458cc0040948cdd78019820181d1820181d18201820981d0009119198008008019129998200008a5eb804c8c94ccc0fcc0140084cc10c008cc0100100044cc010010004c110008c108004c0f4004c0d800cdd5981d800981d801181c8009819000981b800981b8009817800981a00098168008b191980080080c9129998190008a60103d87a80001323253330313375e606c606000403c266e952000330350024bd70099802002000981b001181a00099191801198009801198008048039801198008028019119b8a002001237260022c6eb8c0c0004c0c0008dd7181700098138049bae302c001302c002375c6054002604600e6eb8c0a0004c0a0008dd71813000980f80c981200098120011811000980d80a1bab30200013020001301f0023758603a002603a00260380046eb0c068004c04c014c060004c04400458c058004c058008c050004c0340145261365632533300e3370e9000000899191919299980a980c0010991924c600e004600c0062c602c002602c0046028002601a00c2c601600a464a66601c66e1d200000113232323253330153018002149858dd7180b000980b0011bae3014001300d00216300b0013001004232533300c3370e90000008991919192999809980b0010a4c2c6eb8c050004c050008dd7180900098058010b18048009bae001230043754002460086ea80055cd2ab9d5573caae7d5d02ba15745",
        [authenPolicyId, poolAddress, poolBatchingStakeCredential],
        {
          dataType: "list",
          items: [
            { dataType: "bytes" },
            {
              title: "Address",
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
              title: "assetA",
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
              title: "assetB",
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

export interface OrderValidatorValidateExpiredOrderCancel {
  new (): Validator;
  _redeemer: Data;
}

export const OrderValidatorValidateExpiredOrderCancel = Object.assign(
  function () {
    return {
      type: "PlutusV2",
      script:
        "590b230100003232323232323232322253330053232323253330093370e900218040008991919191919191919191919191919191919191919191919191919980080080580b1111919191919191919191919191919191919191919191919191919191919191919299982299b8748000c1100044c8c8c8c94ccc1254ccc124cdc40010180a99982499baf00e017153330493371266e04c0a406c004c0a405454ccc124cdd79ba63028015374c6050036266ebc030c94ccc128cdc3a4000002298103d87980001533304a3370e9001000899ba548008cc138c13cc1200512f5c0266e9520043304e37526e50dd99827982400a25eb80c12004c5280a5014a0294054ccc124cdd79ba70234c0101800014a2266604e04e0460422c6eb4c128008dd698240009919bb0304c001304c304d0013758609600260860022c609200260920026090002608e002608c002608a00260880046084002608400460800026080002606e00464a66607266e1d20000011323232323232323232323232323232323232533304e305100213232323232323232498c94ccc14ccdc3a400000226464a6660b060b600426493191bad3058002375a60ac0022c6466ec0c168004c168c16c004dd6182c80098288048a99982999b874800800454ccc158c144024526161630510083253330523370e900000089919191919191919299982e983000109924c607a00a2c66e1d2002305a375460bc00260bc0046eb4c170004c170008c168004c168008cdc3a400460a86ea8c160004c14003054ccc148cdc3a40040022646464646464a6660b660bc00426493181d8018b1bad305c001305c002305a001305a0023370e9001182a1baa3058001305000c153330523370e900200089919191919191919299982e983000109924c607a00a2c6eb4c178004c178008dd6982e000982e001182d000982d00119b8748008c150dd5182c00098280060a99982919b87480180044c8c8c8c8c8c8c8c94ccc174c1800084c926303d005163370e9001182d1baa305e001305e002375a60b800260b800460b400260b400466e1d20023054375460b000260a00182a6660a466e1d20080011323232323232533305b305e002132498c94ccc164cdc3a4000002264646464a6660c060c60042930b1bad30610013061002375a60be00260ae00c2a6660b266e1d200200113232323253330603063002149858dd6983080098308011bad305f0013057006163057005163370e9001182c1baa305c001305c002375a60b400260b400460b000260a00182a6660a466e1d200a00113232323232323232533305d3060002132498c0f801c58cdc3a400460b46ea8c178004c178008dd6982e000982e0011bad305a001305a0023058001305000c153330523370e900600089919191919191919299982e983000109924c607c00a2c66e1d2002305a375460bc00260bc0046eb4c170004c170008c168004c168008cdc3a400460a86ea8c160004c14003054ccc148cdc3a401c00226464646464646464646464646464a6660c660cc0042930b1bad30640013064002375a60c400260c40046eb4c180004c180008dd6982f000982f0011bad305c001305c002375a60b400260b400466e1d20023054375460b000260a00182a6660a466e1d2010001132323232323232323232533305f3062002132498c10002458cdc3a400460b86ea8c180004c180008dd6982f000982f0011bad305c001305c002375a60b400260b400460b000260a00182a6660a466e1d20120011323232323232533305b305e00213232498c0f0010c8cc004004018894ccc1740045261323300300330610023232533305c3370e90000008991919192999831983300109924c608a0062c66e1d20023060375460c800260c800460c400260b40042c60b400260be0022c6eb4c170004c170008c168004c168008dd6182c00098280060a99982919b874805000454ccc154c1400305261616305000b303500c303100d302f00e302f00f302d01032533304c3370e9000000899192999828982a0010a4c2c6eb8c148004c12804854ccc130cdc3a400400226464a6660a260a80042930b1bae3052001304a0121533304c3370e9002000899192999828982a0010a4c2c6eb8c148004c12804854ccc130cdc3a400c00226464a6660a260a80042930b1bae3052001304a01216304a01116304f001304f002375a609a002609a0046096002609600460920026092004608e002608e004608a002608a0046086002608600460820026082004607e002606e0042c606e00264a66607066e1d20040011303d3036008153330383370e9001000899191980080081191299981f0008b099191919299981f99b8f00700210011330060060033040003375c607c004608400460800026eb8c0f4c0d802058c0d801cc0ec004c0ec008dd5981c800981c801181b8009817805181a800981a8011bab30330013033001302a001303000130300013027004302e004302c003302c003302a0022323300100100222533302700114bd6f7b630099191919299981419b8f488100002100313302c337606ea4008dd3000998030030019bab3029003375c604e004605600460520024646464a66604866e1d20020011480004dd698149811001181100099299981199b8748008004530103d87a8000132323300100100222533302900114c103d87a8000132323232533302a3371e9110000213374a9000198171ba80014bd700998030030019bad302b003375c6052004605a00460560026eacc0a0c084008c084004c8cc004004008894ccc0980045300103d87a800013232323253330273371e9110000213374a9000198159ba60014bd700998030030019bab3028003375c604c00460540046050002464a66604266e1d20000011323232325333028302b00213232498c94ccc09ccdc3a400000226464a666058605e0042649319299981519b87480000044c8c94ccc0bcc0c80084c926301200116303000130280021533302a3370e900100089919191919192999819981b0010a4c2c6eb4c0d0004c0d0008dd6981900098190011bad3030001302800216302800116302d0013025003153330273370e90010008a99981518128018a4c2c2c604a00460160062c60520026052004604e002603e0042c603e002464a66604066e1d200000115333023301e00214985854ccc080cdc3a400400226464a66604a60500042930b1bae3026001301e002153330203370e900200089919299981298140010a4c2c6eb8c098004c07800858c0780048c94ccc07ccdc3a400000226464a666048604e0042930b1bad3025001301d0021533301f3370e900100089919299981218138010a4c2c6eb4c094004c07400858c0740048c94ccc078cdc3a400000226464a666046604c0042930b1bad3024001301c0021533301e3370e900100089919299981198130010a4c2c6eb4c090004c07000858c0700048c94ccc074cdc3a4000002264646464a666048604e0042930b1bae30250013025002375c604600260360042c6036002464a66603866e1d20000011323253330213024002149858dd71811000980d0010a99980e19b87480080044c8c94ccc084c09000852616375c604400260340042c603400264646464a66603a66e1d2002301c0011375a604460360022c60420026032002603e002602e00c646600200201e44a66603a002297ae013232533301c323232323232323253330243370e90010008a5114a06044002604e002603e002604a002603a002604600260460026034004266040004660080080022660080080026042004603e0026eacc070004c070004c06c004c068008c060004c060004c05c004c058004c054004c050008dd61809000980900098088011bac300f001300700316300d001300d002300b001300300114984d9588c014dd5000918019baa0015734aae7555cf2ab9f5740ae855d101",
    };
  },

  { _redeemer: { title: "Data", description: "Any Plutus data." } },
) as unknown as OrderValidatorValidateExpiredOrderCancel;

export interface OrderValidatorValidateOrder {
  new (
    poolBatchingCredential:
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
    expiredOrderCancelCredential:
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
    poolBatchingCredential:
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
    expiredOrderCancelCredential:
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
        "590a240100003232323232323232323222222533300832323232533300c3370e900118058008991919299980799b87480000084cc004dd5980a180a980a980a980a980a980a98068030060a99980799b87480080084c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc080cdc3a400000226464646600200201044a66604e00229404c8c94ccc098cdc78010028a51133004004001302b002375c60520026eb8c098004c07800854ccc080cdc3a400400226464646660466054646600200202844a666050002297ae01323253330273375e6058604a6058604a6058605a604a00400a26605600466008008002266008008002605800460540029412899ba548008cc098dd4800a5eb80dd71813000980f0010a99981019b87480100044cc048020cdd2a40006604866e952002330243025301e0024bd7025eb804c8c8ccc088cdc3991bad30253028323253330253370e90010008a5eb7bdb1804dd598151811801181180099198008008011129998140008a60103d87a800013232323253330293371e010004266e9520003302d374c00297ae0133006006003375660540066eb8c0a0008c0b0008c0a8004c8cc004004038894ccc09c00452f5bded8c0264646464a66605066e3d22100002100313302c337606ea4008dd3000998030030019bab3029003375c604e0046056004605200290002504a26eb8c098004c078008c078004c08c004c06c060c8c8c8c8c8c8c94ccc08ccdc3a40000022646464646464646464646464646464646464a6660706076004264646464646464649319299981e99b87480000044c8c94ccc108c1140084c92632375a60840046eb4c10000458c8cdd81822000982218228009bac3043001303b0091533303d3370e90010008a999820181d8048a4c2c2c607601064a66607866e1d2000001132323232323232325333047304a002132498c09401458cdc3a400460886ea8c120004c120008dd6982300098230011822000982200119b8748008c0f8dd51821000981d0060a99981e19b87480080044c8c8c8c8c8c94ccc114c1200084c926302300316375a608c002608c0046088002608800466e1d2002303e3754608400260740182a66607866e1d2004001132323232323232325333047304a002132498c09401458dd6982400098240011bad30460013046002304400130440023370e9001181f1baa3042001303a00c1533303c3370e9003000899191919191919192999823982500109924c604a00a2c66e1d200230443754609000260900046eb4c118004c118008c110004c110008cdc3a4004607c6ea8c108004c0e803054ccc0f0cdc3a40100022646464646464a66608a60900042649319299982199b87480000044c8c8c8c94ccc128c13400852616375a609600260960046eb4c124004c10401854ccc10ccdc3a4004002264646464a666094609a0042930b1bad304b001304b002375a6092002608200c2c608200a2c66e1d200230423754608c002608c0046eb4c110004c110008c108004c0e803054ccc0f0cdc3a401400226464646464646464a66608e60940042649318130038b19b8748008c110dd5182400098240011bad30460013046002375a60880026088004608400260740182a66607866e1d200c001132323232323232325333047304a002132498c09801458cdc3a400460886ea8c120004c120008dd6982300098230011822000982200119b8748008c0f8dd51821000981d0060a99981e19b87480380044c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc134c14000852616375a609c002609c0046eb4c130004c130008dd6982500098250011bad30480013048002375a608c002608c0046eb4c110004c110008cdc3a4004607c6ea8c108004c0e803054ccc0f0cdc3a4020002264646464646464646464a66609260980042649318140048b19b8748008c118dd5182500098250011bad30480013048002375a608c002608c0046eb4c110004c110008c108004c0e803054ccc0f0cdc3a40240022646464646464a66608a60900042646493181200219198008008031129998238008a4c2646600600660960046464a66608c66e1d2000001132323232533304d3050002132498c0b400c58cdc3a400460946ea8c138004c138008c130004c11000858c110004c12400458dd698230009823001182200098220011bac3042001303a00c1533303c3370e900a0008a99981f981d0060a4c2c2c6074016603a018603001a603001c602c01e602c02064a66606c66e1d200000113232533303b303e002149858dd7181e000981a0090a99981b19b87480080044c8c94ccc0ecc0f800852616375c607800260680242a66606c66e1d200400113232533303b303e002149858dd7181e000981a0090a99981b19b87480180044c8c94ccc0ecc0f800852616375c607800260680242c60680222c607200260720046eb4c0dc004c0dc008c0d4004c0d4008c0cc004c0cc008c0c4004c0c4008c0bc004c0bc008c0b4004c0b4008c0ac004c0ac008c0a4004c08407858c0840748c94ccc08ccdc3a40000022a66604c60420042930b0a99981199b87480080044c8c94ccc0a0c0ac00852616375c605200260420042a66604666e1d2004001132325333028302b002149858dd7181480098108010b1810800919299981119b87480000044c8c8c8c94ccc0a4c0b00084c8c9263253330283370e9000000899192999816981800109924c64a66605666e1d20000011323253330303033002132498c04400458c0c4004c0a400854ccc0accdc3a40040022646464646464a666068606e0042930b1bad30350013035002375a606600260660046eb4c0c4004c0a400858c0a400458c0b8004c09800c54ccc0a0cdc3a40040022a666056604c0062930b0b181300118050018b18150009815001181400098100010b1810000919299981099b87480000044c8c94ccc098c0a400852616375a604e002603e0042a66604266e1d20020011323253330263029002149858dd69813800980f8010b180f800919299981019b87480000044c8c94ccc094c0a000852616375a604c002603c0042a66604066e1d20020011323253330253028002149858dd69813000980f0010b180f000919299980f99b87480000044c8c8c8c94ccc098c0a400852616375c604e002604e0046eb8c094004c07400858c0740048c94ccc078cdc3a400000226464a666046604c0042930b1bae3024001301c0021533301e3370e900100089919299981198130010a4c2c6eb8c090004c07000858c070004dd618100009810000980f8011bab301d001301d001301c00237566034002603400260320026030002602e0046eb0c054004c0340184cc004dd5980a180a980a980a980a980a980a980680300591191980080080191299980a8008a50132323253330153375e00c00229444cc014014008c054008c064008c05c004c03001cc94ccc034cdc3a40000022a666020601600e2930b0a99980699b874800800454ccc040c02c01c526161533300d3370e90020008a99980818058038a4c2c2c601600c2c60200026020004601c002600c00229309b2b118029baa001230033754002ae6955ceaab9e5573eae815d0aba25747",
        [poolBatchingCredential, expiredOrderCancelCredential],
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

export interface PoolValidatorValidatePool {
  new (authenPolicyId: string): Validator;
  datum: {
    poolBatchingStakeCredential:
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
        };
    assetA: { policyId: string; assetName: string };
    assetB: { policyId: string; assetName: string };
    totalLiquidity: bigint;
    reserveA: bigint;
    reserveB: bigint;
    baseFeeANumerator: bigint;
    baseFeeBNumerator: bigint;
    feeSharingNumeratorOpt: bigint | null;
    allowDynamicFee: boolean;
  };
  redeemer:
    | "Batching"
    | {
        UpdatePoolParameters: {
          action:
            | "UpdatePoolFee"
            | "UpdateDynamicFee"
            | "UpdatePoolStakeCredential";
        };
      }
    | "WithdrawFeeSharing";
}

export const PoolValidatorValidatePool = Object.assign(
  function (authenPolicyId: string) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "590f45010000323232323232323232232222323232323232533300e3232323253330123370e90011808800899191919299980b19b87480000084cc004dd5980d980e180e180e180e180e180e180a003980d980a0088991919191919191919191919299981119b87480080384c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc0d0cdc3a4000606600226464646464646464646464646464646464a66608a666605600204002c0262a66608a6660580400160022a66608a605c605e032264646464646464646464646464646464a6660aaa6660aa66e1cccc0e00241452201034d535000480084cdd79ba6009374c00629404c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc20004cdc3a4000002264a6661020266ebc0a405454ccc20404cdd78138098a9998408099baf02501115333081013370e04601e2a6661020266e1c08403454ccc20404cdc380f8058a99984080a9998408080b8801899984080801a504a22a6661020266ebc0dc0c454ccc20404ccc0f002520a01f4802854ccc20404ccc0f001d20a01f4802840045280a5014a029405280a5014a029405280a50325333081013370e90010008a51133303c375a610c0260fe00a904827241083460fe0082a6661000266e1d200200115333080013375e0500282a6661000266ebc09804854ccc20004cdd78120080a9998400099b8702200e15333080013370e0400182a6661000266e1c07802854ccc20004cdc380e0040a9998400099b8701a00615333080013375e030008266ebc0d80c05280a5014a029405280a5014a02940528099baf07b02b307e05c3370e9001183f9baa308301001308301002308101001308101002375a60fe00260fe0046eb4c1f4004c1f4008dd6983d800983d8011bad30790013079002375a60ee00260ee00460ea00260ea00460e600260e600460e200260d202c66e1d2002306b375460de00260de00460da00260da0046eb4c1ac004c1ac008dd6983480098348011bad30670013067002375a60ca00260ca0046eb4c18c004c18c008c184004c184008c17c004c17c008c174004c154148c12c004c0dc00458c164004c164008dd5982b800982b801182a800982699817013000982980098258019bab30510013051002304f0013047001304d001304d0013044011222533304833712006004266e2400400c5280a5014a02940c94ccc114cdc3a4000002200e2a66608a66e1d20020011002100430430213048001304800230460013046001304500230430013043001303a0013301c014037303f0013037001303d001303d0013034001303a0013032001163301300e0203758606e002606e002606c0046eacc0d0004c0d0004c0cc008dd59818800981880098180011bac302e001302e0023758605800260580046eb0c0a8004c088054c0a0004c0800704c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc0c8cdc3a400060620022646464646464646464646464a66607c666604800203602201c2a66607c66604a03600c0022a66607c604e6050028264646464646464646464646464646464646464a6660a2a6660a266ebc03401c54ccc144cdd7826001099b8733303400b04d4881034d535000480085280a501323232323232323232323232323232323232323375e6e98060dd31999812999981280f00400319b8100c533306453330643371e0109110013371e00c9110014a0266e0400520c0a8a50410010040023370201466608e03c00800466608c03a00e00a6eb8c19c004c19c008dd71832800982e8051bae30630013063002375c60c200260b20106eb4c17c004c17c008dd6982e800982e800982e001182d000982d001182c000982c00098278260b18228009818800982980098298011bab30510013051002304f001304733028022001304d001304500337566096002609600460920026082002608e002608e002607c01a4444a66608666e1c00520001004132323300100100622533304900113304a337606ea4018dd3001a5eb7bdb1804c8c8c8c94ccc128cdd79980600500126103d879800013304e337606ea4028dd30038028a99982519b8f00a00213232533304c3370e900000089982819bb0375201860a2609400400a200a609400264a666096a66609c00229445280a60103d87a800013374a9000198279ba60014bd70191980080080111299982780089982819bb037520166ea00292f5bded8c0264646464a6660a066ebccc04803c00930103d8798000133054337606ea403cdd40070028a99982819b8f00f0021323253330523370e900000089982b19bb0375202260ae60a000400a200a60a000264a6660a266e1c005200014c103d87a800013374a90001982a9ba80014bd7019b8000100e133054337606ea4008dd4000998030030019bad3051003375c609e00460a600460a200226609c66ec0dd48011ba600133006006003375660960066eb8c124008c134008c12c004c8c8008c8cc004004008894ccc124004526132533304a00114984c8c8c8c8c8c8c94ccc138cdc3a4000002266014014660a400c00a2c60980026601c0040026eb8c13000cdd7182580198278019826801182600118260009982399bb037520046ea00052f5bded8c044a66608066e400080045300103d8798000153330403371e0040022980103d87a800014c103d87b800014a02940528182100098210009820800981c0009980d00a01a981e800981a800981d800981d8009819000981c00098180008b1980880700f1bac30350013035001303400237566064002606400260620046eacc0bc004c0bc004c0b8008dd6181600098160011bac302a001302a002375860500026040026446464a666050605600420022c605200266016004466ebcc0a4c088c0a4c08800400888cc0180088cdd7981418108008011119299981119b8748000c0840044c8c8c8c8c8c8c8c8c8c94ccc0b0cdc39998078018062441044d53475300480084c8c8008c94ccc0b8cdc3a40000022646464646464646464646464a66607a608000426464646464649318120031811803981100418108049810005191980080080611299981f8008a4c264660060066086004604260820022c607c002607c004607800260780046074002607400460700026070004606c002606c0046eb0c0d0004c0b000858c0b0004c03800458c0c0004c0c0008dd5981700098170009812800981580098158009811000981400098100008b1980280111919191919191919299981519b87480080044cdc79bae302f302800200a14a06050002605a002604a00260560026046002605200260520026040002464a66604066e1d200400113025301e00216301e00122232323253330233370e90010008a400026eb4c0a0c084008c084004c94ccc088cdc3a40040022980103d87a8000132323300100100222533302800114c103d87a800013232323253330293371e014004266e9520003302d375000297ae0133006006003375a60540066eb8c0a0008c0b0008c0a8004dd598139810001181000099198008008021129998128008a6103d87a800013232323253330263371e010004266e9520003302a374c00297ae01330060060033756604e0066eb8c094008c0a4008c09c00488c8cc00400400c894ccc08c0045300103d87a8000132325333022300500213374a90001981300125eb804cc010010004c09c008c0940048c94ccc074cdc3a4000002264646464a666048604e004264649319299981199b87480000044c8c94ccc0a0c0ac0084c926301c0011630290013021003153330233370e90010008a99981318108018a4c2c2c604200460320062c604a002604a004604600260360042c60360024444646464a66604266e1d2000001132323300100100622533302700114a026464a66604c66e3c00801452889980200200098158011bae3029001375c604c603e0042646464a66604800229444c8cc004004028894ccc0a400452809919299981419baf302d3026302d3026302d302e302600200914a2266008008002605a00460560026601c00e66e952000330273374a9001198139ba90014bd7025eb80dd71813800980f801180f8009812000980e00211119191929998111812800899198008008039129998120008a511323253330233232323232323232533302b3370e90010008a99981599baf00200e14a2266ebc010040528981480098170009813000981600098120009815000981500098108010998020020008a5030280023026001163300600523375e0046048603a6048603a6048604a603a0026044002603400444646600200200644a66603e002297ae013232533301e3005002133022002330040040011330040040013023002302100123375e6e98005300101a0002323300100100222533301c00114bd6f7b630099191919299980e99b8f4881000021003133021337606ea4008dd3000998030030019bab301e003375c60380046040004603c00244646600200200644a66603800229404c8c8c94ccc070cdd78030008a51133005005002301c0023020002301e001301300e3018001301000116301600130160023014001300c00714984d958c94ccc038cdc3a40000022a66602260180102930b0a99980719b87480080044c8c94ccc04cc0580084c9263253330113370e90000008a99980a18078010a4c2c2a66602266e1d200200115333014300f00214985854ccc044cdc3a40080022a666028601e0042930b0b18078008b180a00098060040a99980719b874801000454ccc044c0300205261616300c0073001007232533300d3370e9000000899191919191919191919191919191919191919192999812181380109919191924c64a66604a66e1d200000113232533302a302d002149858dd6981580098118038a99981299b874800800454ccc0a0c08c01c52616163023006301901130180123018013163370e900118109baa3025001302500230230013023002375a604200260420046eb4c07c004c07c008dd6980e800980e8011bad301b001301b002375a60320026032004602e002602e004602a002602a004602600260160042c6016002464a66601866e1d200000113232323253330133016002149858dd7180a000980a0011bae3012001300a00216300a001232533300b3370e9000000899192999808180980109924c600a0022c602200260120042a66601666e1d2002001132323232323253330143017002149858dd6980a800980a8011bad30130013013002375a602200260120042c6012002464a66601466e1d200000113232533300f3012002149858dd7180800098040010a99980519b87480080044c8c94ccc03cc04800852616375c602000260100042c60100026eb80048c014dd5000918019baa0015734aae7555cf2ab9f5740ae855d101",
        [authenPolicyId],
        { dataType: "list", items: [{ dataType: "bytes" }] } as any,
      ),
    };
  },
  {
    datum: {
      title: "PoolDatum",
      anyOf: [
        {
          title: "PoolDatum",
          dataType: "constructor",
          index: 0,
          fields: [
            {
              title: "poolBatchingStakeCredential",
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
            {
              title: "assetA",
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
              title: "assetB",
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
            { dataType: "integer", title: "totalLiquidity" },
            { dataType: "integer", title: "reserveA" },
            { dataType: "integer", title: "reserveB" },
            { dataType: "integer", title: "baseFeeANumerator" },
            { dataType: "integer", title: "baseFeeBNumerator" },
            {
              title: "feeSharingNumeratorOpt",
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
              title: "allowDynamicFee",
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
          ],
        },
      ],
    },
  },
  {
    redeemer: {
      title: "PoolRedeemer",
      anyOf: [
        { title: "Batching", dataType: "constructor", index: 0, fields: [] },
        {
          title: "UpdatePoolParameters",
          dataType: "constructor",
          index: 1,
          fields: [
            {
              title: "action",
              anyOf: [
                {
                  title: "UpdatePoolFee",
                  dataType: "constructor",
                  index: 0,
                  fields: [],
                },
                {
                  title: "UpdateDynamicFee",
                  dataType: "constructor",
                  index: 1,
                  fields: [],
                },
                {
                  title: "UpdatePoolStakeCredential",
                  dataType: "constructor",
                  index: 2,
                  fields: [],
                },
              ],
            },
          ],
        },
        {
          title: "WithdrawFeeSharing",
          dataType: "constructor",
          index: 2,
          fields: [],
        },
      ],
    },
  },
) as unknown as PoolValidatorValidatePool;

export interface PoolValidatorValidatePoolBatching {
  new (
    authenPolicyId: string,
    poolPaymentCred:
      | { VerificationKeyCredential: [string] }
      | { ScriptCredential: [string] },
  ): Validator;
  redeemer: {
    batcherIndex: bigint;
    ordersFee: Array<bigint>;
    inputIndexes: string;
    poolInputIndexesOpt: string | null;
    volFees: Array<bigint | null>;
  };
}

export const PoolValidatorValidatePoolBatching = Object.assign(
  function (
    authenPolicyId: string,
    poolPaymentCred:
      | { VerificationKeyCredential: [string] }
      | { ScriptCredential: [string] },
  ) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "593c02010000323232323232323232232222323232533300b32323232533300f3370e90021807000899191919191919191919191919191919191919191919191919191919191919191919191919191919191919191919299981ea99981e991919299982019b87480000044c8c8cc004004088894ccc11800452809919299982299b8f00200514a226600800800260940046eb8c120004dd71822981f001099191929998218008a511323300100103222533304800114a026464a66608e66ebcc130c114c130c114c130c134c114008024528899802002000982600118250009919198008008141129998240008a50132323253330483375e00c00229444cc014014008c120008c130008c128004cdd2a40006608c66e95200233046375200297ae04bd701bae3046001303e002303e0013043001303b0021533303d300101413375e6e98c8cc004004094894ccc10800452f5bded8c0264646464a66608666e3d221000021003133047337606ea4008dd3000998030030019bab3044003375c6084004608c0046088002980101a00014a029404c8c8c8c8c8c8c8c8c8c8c94ccc1214ccc120cdc39b8d01f300100813300300a00914a02a66609601429404c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc17c0504c8c8c94ccc188c1940c84c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8cdd79ba7001374e64646464646464646464646464646666600200207a0d40b202244444646464646464646464646464646464646464646464646464646464646464646464a66614a02a66614a0266e212000003153330a50133710900000f8a9998528099b8901f003153330a5013375e07c00e264a66614c0266e1d200200114a226466e241c4dd69854009919bb030ad0100130ad0130ae01001375861580200261480200461480200229405280a5014a02646464a6661560204620042666660520520460020420046eb0c2a404008dd61853808009929998530099b87480000044c8c8c8c8c8c8c8c8c8c94ccc2c004cdc42400000a266ec0dd39999999999999999981901100100d00c00b00a004803826825815023822821816801919b89006001374e0022c616a0205c61660205a66e1d200230ae0137546164020026164020046eb4c2c004004c2c004008c2b804004c2b804008cdc3a40046150026ea8c2b004004c2900401854ccc29804cdc3a400400226464646464646464a66615c0266e2120000031337606e9cccccccccccccccccc0c008000806005805004801c01412c1240a011410c1040ad28119b89001004374e0022c6166020586162020566eb4c2c004004c2c004008c2b804004c2b804008cdc3a40046150026ea8c2b004004c2900401854ccc29804cdc3a4008002264646464646464646464a66616002a6661600266e21200000513371090000018a501337606e9cccccccccccccccccc0c808800806806005805002401c13412c0a811c11410c0b528129998588099b8900600114a2266e24004010dd38008b185a808171859808169bad30b20100130b201002375a616002002616002004615c02002615c0200466e1d200230a801375461580200261480200c2a66614c0266e1d200600113232323232323232323253330b001337109000002899bb0374e646464646464646464646464646464646464646464646464646464646464a66619c0266e21200000113253330cf0100113253330d0013333053036034001022153330d0010291330d401375066e04cdc00100028021986a009ba83370203c04a661a8026ea0cdc000e0029986a009ba83370203404a661a8026ea00612f5c02661a8026ea0cdc08100129986a009ba83370266e00078014010cc35004dd419b8101c025330d401375066e00068014cc35004dd400c25eb8058cccccccc15410412402c02401c01401009054ccc33c054ccc33c040884cccc1480e40dccc14c10412408452808260b19b89003001163253330ce013370e900000089bad30d30130cc010251323253330d001337129000000899b813330a10104200c00a00116375a61a80200261980204a6198020486660e20020140bea6661960266e2008002c4cdc019b833370466e0803408120a09c013370466e0402c080cdc0a4141380201290010b1bae30cf0100130cf01002375c619a02002618a020166eb8c32c04004c32c04008dd71864808009860808049bad30c70100130c701002375a618a02002618a020046eb4c30c04004c30c04008c30404004c30404008c2fc040054ccc2e4040484cc2f404158cc2f404150cc2f404dd40049985e809ba8007330bd0137500a097ae01330bd01054330bd01056330bd01375000e6617a026ea0024cc2f404dd402725eb80dd6985e80800985e808011bad30bb0100130bb01002375a6172020026172020046eb4c2dc04004c2dc040b8dd6985a808169ba70011630b50102e30b30102d3370e90011857009baa30b20100130b201002375a616002002616002004615c02002615c0200466e1d200230a801375461580200261480200c2a66614c0266e1d20080011323232323232323253330ae01337109000002899bb0374e646464646464646464646464646464646464646464646464a66618c02a66618c0266e252000002153330c601337129000000899b8848000cdc00010008a5014a0264646464646464a66619a02002264a66619c0266660a20680640020442661a4026ea0cdc099b8002000a007330d201375066e04cdc000f00480299869009ba833700038014661a4026ea0cdc000d00499869009ba83370003000697ae016333307d333307d333307d333307d03f4890048810033702900002380a80999b814800002404403ccdc0a400001001a0160042a66619a02a66619a02044266660a006e06a660a207e08e0422940412858cdc48118009bad30d00100130d001002375a619c02002619c020046eb4c33004004c8c94ccc32004cdc4000801099191919867809ba8333305500200106205e330cf014c01010000330cf01375066e0ccdc119b813370400e00200402a66e00cdc100e80080125eb80dd69866008011bad30ca010013333305100400301a01805f153330c8013371000400226464646619e02981010000330cf01375066660aa0040020c00bc6619e026ea0cdc199b823370266e08018004008054cdc019b8201b0010024bd701bad30cc01002375a619402002666660a20060080300340ba266198029801010000330cc014c1010000330cc01375000497ae03370666e0800804405ccdc199b8200201001816375a618e020046eb4c31404004c94ccc31004cdc3a400000226466ec0c32804004c32804c32c04004c308040744c8c8c8c94ccc320054ccc32004cdc4a4000006266e25200000114a0266ec0dd419b813330990103a01000e003375066e04ccc264040e803002800458dd69866008009866008011bad30ca0100130c20101d30c20101c375c618e02002618e020046eb8c31404004c2f404160dd71861808009861808011bae30c10100130b901056375c617e02002617e020046eb8c2f404004c2d404150dd6985d80800985d808011bad30b90100130b901002375a616e02002616e020046eb4c2d404004c2d4040b0dd69859808159ba70011630b30102c30b10102b3370e90011856009baa30b00100130b001002375a615c02002615c0200461580200261480200c2a66614c0266e1d200a00113232323232323232323253330b00153330b001337109000003899b8848000014528099bb0374e64646464646464646464646464646464646464646464a66618c0266e21200000113232323253330ca0100113253330cb01333304e03102f00101d1330cf01375066e0406c010cc33c04dd419b81019003330cf01375066e0405c010cc33c04dd419b81015003330cf01375066e0404c0192f5c02c66660f466660f466660f466660f40789110048810033702900002200400319b814800001404003800c03002800854ccc328054ccc328040744cccc1340d00c8cc1380f011007052808238b29998648099b8902000213371203c0022940dd69865008011bad30c801001333304d01601400100e163253330c6013370e900000089bad30cb0130c40101f1323253330c801337129000000899b813330990103a00600400116375a61980200261880203e61880203c6eb8c32404004c32404008dd7186380800985f8082d1bae30c50100130c501002375c6186020026176020b06eb8c30404004c30404008dd7185f80800985b8082b1bad30bd0100130bd01002375a6176020026176020046eb4c2e404004c2e404008dd6985b80800985b808171bad30b50102d374e0022c616a0205c61660205a66e1d200230ae0137546164020026164020046eb4c2c004004c2c004008dd69857008009857008011856008009852008030a9998530099b87480300044c8c8c8c8c8c8c8c8c8c94ccc2c004cdc42400000a266ec0dd39919191919191919191919191919191919191929998618099b88480000044c8c8c8c8c8c8c94ccc328040044c94ccc32c04cccc1380c40bc00407454ccc32c040904cc33c04dd419b8101b007330cf01375066e04cdc080c80280199867809ba8017330cf01375066e0405400ccc33c04dd419b810130094bd70099867809ba83370266e0406c00c01ccc33c04dd419b81019005330cf01375066e0405c00ccc33c04dd400a99867809ba83370202601297ae016333307a333307a333307a03c4890048810033702900002200580499b814800002003c03400854ccc328054ccc328040744cccc1340d00c8cc1380f011007052808238b19b8901e001375a619a02002619a020046eb4c32c04004c32c04008dd69864808009919191919299986400810899866009ba833306d00405f05b330cc014c01010000330cc01375066e0000ccccc1b800800401017d2f5c026619802981010000330cc0137506660da0060ba0b666198026ea0cdc0002199983700080100182ea5eb80cdc080a80119b81016002375a618e020046eb4c31404004cccc12804c04400402c58c94ccc30c04cdc3a400000226eb4c32004c304040684c8c94ccc31404cdc4a4000002266e04ccc258040dc01801000458dd698648080098608080d18608080c9bae30c60100130c601002375c6188020026178020ae6eb8c30804004c30804008dd7186000800985c00800a99985c80809082a082b1bad30bd0100130bd01002375a6176020026176020046eb4c2e404004c2e404008dd6985b80800985b808171bad30b50102d374e0022c616a0205c61660205a66e1d200230ae0137546164020026164020046eb4c2c004004c2c004008c2b804004c2b804008cdc3a40046150026ea8c2b004004c2900401854ccc29804cdc3a401c002264646464646464646464646464646464646464a66617202a6661720266e21200000e153330b9013371090000060a99985c8099b884800002854ccc2e404cdc4240000102a6661720266e240200404cdc48198030a5014a029405280a501323232323232323232323232323253330c70153330c7010011323232323232323253330cf013375e002006266ebc10c01c52819ba548000cc348040e8cc348040e0cc348040d8cc348040d0cc348040c8cc348040c0cc34804cdd2a401c661a40266619c0204e98103d87a80004c0103d8798000330d2013750014661a4026ea008ccc34804dd401099869009ba83370203e900119869009ba801d330d201375003697ae0330d201375066e040b0120cc348040a92f5c060ec002660f21520200261a00200261a002002619e02004619a02002618a0202626660dc05a056026266ec0dd399865809ba800d330cb01375001666196026ea0024cc32c04dd400399865809ba80054bd701ba7012163370e90011863809baa30cb0100130cb01002375a6192020026192020046eb4c31c04004c31c04008dd69862808009862808011bad30c30100130c301002375a6182020026182020046eb4c2fc04004c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc368054ccc36804cdc42400000a2a6661b40266e240a40144cdd79ba6001374c0442940528099299986d8081a09986f809ba83370266e0008801800ccc37c04dd419b81020004330df01375066e00078018cc37c04dd419b8101c004330df013750034661be026ea0014cc37c04ccc36c0400530103d87a80004c0103d87980004bd7009986f809ba833702044008661be026ea0cdc099b80020006003330df01375066e04078010cc37c04dd419b8001c006330df013750034661be026ea0014cc37c04ccc36c04005300103d87a80004c0103d87980004bd70299986d0099b88480080ac4cdc48148020a50163333333305f04b05300c00a00800600400233307d00300d06b333307d01000e00200c3370205a002a6661aa0266e240b000440b04004c8c8c8c94ccc36004cdc42400000220022c66e0c008004cdc101480119b813370466e080a8004030cdc119b82028482827004038cdc0a414138020126eb8c36004004c36004008dd7186b008009867008059bae30d40100130d401002375c61a4020026194020126eb4c34004004c34004008dd69867008009867008011bad30cc0100130cc0100230ca0100130ca0100230c80100153330c20101b1330c60105f330c60105d330c60137500126618c026ea001ccc31804dd402ca5eb804cc31804174cc3180417ccc31804dd400399863009ba8009330c60137500ae97ae0375a618c02002618c020046eb4c31004004c31004008dd69861008009861008011bad30c00100130c001037375a617c0206c2c6eacc2f404004c2f404004c2d004008c2ec040d0c2e4040ccdd6985c00800985c008011bad30b60100130b601002375a6168020026168020046eb4c2c804004c2c804008dd69858008009858008011bad30ae0100130ae010023370e90011854009baa30ac0100130a401006153330a6013370e90080008991919191919191919191919299985900a9998590099b884800002454ccc2c804cdc42400000e266e21200000514a029404cdd81ba73232323232323232323232323232323232323232323253330c8013371090000008991919191919191919299986880800899299986900999982a81c01b00081109986b009ba83370266e04080014024cc35804dd419b813370203c00600e661ac026ea0cdc080e0029986b009ba833702034006661ac026ea0cdc080c005a5eb8058cccc20404cccc20404cccc20404cccc2040410d22010048810033702900002580680599b814800002805404c01004403c00854ccc344054ccc344040884cccc1500ec0e4cc15410c12c08452808270b19b89023003375a61a80200261a8020046eb4c34804004c34804008dd69868008009868008011bad30ce010013232323232323253330cf0133710002004264661a8026ea0ccc1d400419c18ccc35005301010000330d401375066e0401c004cc35004dd419b8000633330760050040010674bd70199999982b8030028020018130120330a9998678099b88002001132330d4014c01010000330d40137506660ea0020ca0c6661a8026ea0cdc0003999983b0020028008329986a009ba83370200c00297ae033333330570050060030040240260641330d3014c1010000330d3014c1010000330d301375000c661a6026ea00152f5c066e08010094cdc100201119b81018002337020320046eb4c33004008dd6986500800999982780b00a0008070b1929998640099b87480000044dd69866809863008108991929998650099b89480000044cdc099984d8081e0030020008b1bad30ce0100130c60102130c601020375c6196020026196020046eb8c32404004c30404170dd71863808009863808011bae30c50100130bd0105a375c6186020026186020046eb8c30404004c2e404160dd6985f80800985f808011bad30bd0100130bd01002375a6176020026176020046eb4c2e404004c2e4040c0dd6985b808179ba70011630b70103030b50102f3370e90011858009baa30b40100130b401002375a6164020026164020046eb4c2c004004c2c004008dd69857008009857008011856008009852008030a9998530099b87480500044cdd81ba7323232323232323232323232323232323232323253330ba0153330ba013371290000010a99985d0099b89480000044cdc42400066e000080045280a501330be01375066e00050008cc2f804dd419b80012001330be01375066e00040008cc2f804dd419b8000e001330be01375001897ae01633308a0102b00500353330b80133069008006133702002064264a6661720266e240cc004400858ccc224040a92210048810033308801029007005375c6176020026176020046eb8c2e404004c2c404138dd7185b80800985b808011bae30b50100130ad0104c375a6166020026166020046eb4c2c404004c2c404008dd69857808009857808011bad30ad0100130ad01024375a6156020466e9c09458c2900401458c2a404004c2a404008dd6985380800985380801185280800985280801185180800985180801185080800985080801184f80800984f80801184e80800984e80801184d80800984d80801184c80800984880801181d8009981f037000984a80800984a808011bab309301001309301002309101001308901001308f01001308f01001308601004308d01005375a61160200861160200a6112020084444444444444444464646464646464646464646464646464646464646464a66614a0266e212000001132323253330a801001153330a80153330a801323232323232323253330b0013370e9000000899baf02e007153330b0013375e05c00e2660b000805a2940c2b804004c2cc04004c2ac040acc2c404004c2c404004c2c004008c2b804004c298040a44c8c8c94ccc2ac04cdc3a4000002266ebcc2c004c2a404008dd3181b8018991919191919191919baf374c0166e98cccccccc0e40d40ac010008dd7185c008009bae30b80130b90100100f00e30b001005375c616c02002616c020046eb8c2d004004c2b004008c2bc04008c2b4040054ccc2ac0409c4cdd8012812099bb002402530a9010013333222253330ad013305e00400313232323253330b401002153330b10102d13374a90001985a809ba6330b501337609801014000374c6616a0266ec13001014000375066e04004cdc0014806a5eb7bdb180cc2d404cdd81ba9006374c6616a0266ec0dd48029ba800c4bd6f7b63025eb7bdb1812f5c02c26464a66616c020042646464a66617202004008264a666174020022646464a66617402a66617402a666174026661740206c94128899b8f00500f14a0266e3c0040385280a99985d0099b8801600213374a90001985f009ba6330be0133760981014000374c6617c0266ec13001014000375066e00cdc080501900aa5eb7bdb180cc2f804cdd81ba9005374c6617c0266ec0dd48009ba83370200402c97adef6c604bd6f7b63025eb8054ccc2e804cdc380100b099ba548000cc2f804dd31985f0099bb04c1014000374c6617c0266ec13001014000375066e00cdc080501900aa5eb7bdb1812f5bded8c097ae01614c103d87a8000375c6174020046eb4c2e804004c2f00400c014c2f004008dd7185b008011bab30b60100130b80100400114c103d87a800030b701002375a616402616a026eacc2c804008c2d404008c2cc04004c0e40bc5300103d87a8000375c6068614e020466eb8c0b8c29c0408cdd7181a1853808111bae302e30a7010223756605a614c02052294054ccc2a0040904cc2b004dd419b813370003200800466158026ea0cdc080b80199856009ba83370002a00866158026ea0cdc080980199856009ba80114bd70099856009ba83370203200666158026ea0cdc099b80017004002330ac01375066e0405400ccc2b004dd419b80013004330ac01375002297ae016153330a80153330a80101b1333302b0280273302c02a02002914a020382c603200466609600400e036666609601401000200c2c64a66614a0266e1d20000011375a61540261460204026464a66614e0266e2520000011337026660f005200c0080022c6eb4c2ac04004c28c04080c28c0407cdd71854008009854008011bae30a601001309e01007375a6148020026148020046eb4c28804004c28804008dd6985000800985000801184f00800a99984c0080a09984e008091984e009ba80093309c01375000e66138026ea003d2f5c02661380202266138026ea001ccc27004dd40049984e009ba800e4bd701bad309c01001309c01002375a6134020026134020046eb4c26004004c26004008dd6984b00800984b008021bad309401003222232323232323232323232533308b013370e900000088020a999845808020998198028068a50308901001308e0100130860100b5333087013375e01400a266ebcdd30041ba600314a06116020026116020046eacc22404004c22404008c21c04004c1fc00488cccc0b8009221004881003370400290009184080984100800911111112999841009981980300289999819199981900424410048810033702900019b800070020040030011533308201330330040031333303233330320084881004881003370200200e00c00a66e052000002133330323333032333303200848810048810033702900000380300299b814800000801000c0048888cdd81ba83370666e08008010004dd419b8333704004006002444444464646466e0ccdc0980799b813370400200266e08cdc12401000466e08cdc124141380201066e04cdc100300499b8200500a00133704900200119b803370466e08014008cdc000300419b820043370266e0801d20a09c013370400401266e0800c004cdc0a41413802002444446464646466ec0dd419b81300d33702601c00266e08cdc1001a4141380266e0520a09c01005001375066e08008cdc0a4141380200a66e08cdc099b824801120a09c0100400333704900219b800060043370466e0920083370000a00666e04cdc1002980580219b823370400c00800666e08cdc0002001001911119299983d99b87480080045200013370666e08cdc10028019bad30800130790023370466e0801120a09c01482827004c1e40048c1ec0048c8cc004004008894ccc1e800452f5bded8c02660f66466ec0c1e4004c1e8004c1f0004cc008008c1f400494ccc1d0cdc4000a40002c2a6660e866e1c005200014800054ccc1d0cdc3800a4004290010a99983a19b87001480105200213232333001001003002222533307833710002004266600600600266e0ccdc019b83005001001480104008cdc019b830014801120022337040020026eb0c1d8004c1d8008dd6183a000983a001183900098390011bad30700013070002375a60dc00260dc00460d800260d800460d400260d400460d000260c06666660200a400200a0bc940010c198004c198004c17400c58c18c0c4c188078c1840784c94ccc180c18c0684c8c94ccc188c1940e04c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc1eccdc3a402460f400a26464646464646464a6661060266e1d2000308201058132325333085015333085013371090000068a9998428099b884800009c54ccc21404cdc48138068a9998428099981600a8098140a999842809929998430099b874800800452889919b89051375a6110026466ec0c23404004c23404c23804004dd61846008009842008061842008058a9998428099baf01100315333085013371090000028a99984280998200238048a999842809824800899b89371a00290030a5014a029405280a5014a029405280a50132323232323232323232323232323232323232323232323232323232323232323253330a6013371090000008991929998540099b8902800213375e6e98004dd301f8a503333057333305733330570434890048810033702900002480480399b814800000801400c004ccc0780040800a858c94ccc29804cdc3a400000226eb4c2ac04c290040a04c8c94ccc2a004cdc4a4000002266e04ccc1e411002802000458dd69856008009852008141852008139bae30a90100130a901002375c614e02002613e0200a6eb8c29404004c29404008dd7185180800984d80801299984e0080508010802299984d8080608038802984f80800984f80801184e80800984a80805984d80800984d80801184c8080098488080419b8748008c24c04dd5184b80800984b8080098470080319b8748008c24004dd5184a00800984a008009845808021982900319b81304500648008c24004014cc140038cdc0982180724004611c0201a600200244446464646464a666126020082002266660120120020080046464646464646464646464646464646464646464646464646464646464646464a66615e0266ebc07400c4c8c8c8c8c8c94ccc2d404cdc42400005a26464a66616e0266e212000002153330b70153330b701009153330b7013370e66e04cdc000d0178008098a99985b8099b87337020300040222a66616e0266e1ccdc000b017807899b873370202800401a29405280a50153330b7013370e66e0406800804c54ccc2dc04cdc399b813370003005e0020222a66616e0266e1ccdc080b001007899b873370002805e01a29405280a501002161633305b02e00201e333305b00500302d00116375a6172020026172020046eb4c2dc04004c2dc04008dd6985a80800a99985780800899859809ba8012330b301375002066166026ea006d2f5c0266166026ea0040cc2cc04dd400919859809ba80194bd700b19b8748008c2bc04dd518598080098598080118588080098548080f1bad30af0100130af01002375a615a02002615a020046eb4c2ac04004c2ac04024dd69854808041bad30a80100130a801002375a614c02002614c020046eb4c29004004c29004010dd69851008019bac30a10100130a1010023758613e02002613e02004613a02002613a020046eb4c26c04004c26c04008dd6984c80800984c80801184b80800984b80800984b00800984680802184a008021849008019849008019848008011919199980080080182482d911119191919191929998488099baf374e00a980101800015333091015333091013375e9801018000374e006266ebd301018000374e00229404cc25404ccc02c0180100092f5c02c26612a0266601600c008004666601401400a006002612c0200c61280200a61280200a61240200861240200861200200644466666606e0f2611c02611e02610e0200600410a02944004ccc10c0052f5c0446608c0026609a0920042c6eb8c22404004c2040416058c21c04004c1fcc21804014dd69842808009842808011841808009841808011bac308101001307900516307f001307f002375a60fa00260fa00460f600260f600460f200260f200460ee00260ee00460ea00260ea00260e800260e600260d400460280026602e08e0086eacc1b8004c1b8004c194028c1ac004c1ac008dd598348009834800983000098330009833000982e8018b1bad3063037306204716306101922232533305f3370e90010008a4000266e0ccdc119b82004003375a60c860ba00466e0920a09c01482827004c1740048888c8c8cdc199b820010053370066e0920a09c010060013370400200666e0520a09c0100122232323232323232323253330653370e900000088010a9998328010998068028058a5030630023375e01400c60ce00260be01060ca00260ca00260c800460c400260b40024466ebc004c94ccc16ccdc3a40000022980103d87980001533305b3370e9001000899ba548008cc17cc180c16400d2f5c0266e9520043305f37526e50dd99830182c801a5eb80c1640088c94ccc164cdc3a40000022646464646464646464646464646464646464a6660dc60e2004264646464646464649319299983999b87480000044c8c94ccc1e0c1ec0084c92632375a60f00046eb4c1d800458c8cdd8183d000983d183d8009bac30790013071009153330733370e90010008a99983b18388048a4c2c2c60e201064a6660e466e1d200000113232323232323232533307d308001002132498c09401458cdc3a400460f46ea8c1f8004c1f8008dd6983e000983e001183d000983d00119b8748008c1d0dd5183c00098380060a99983919b87480080044c8c8c8c8c8c94ccc1ecc1f80084c926302300316375a60f800260f800460f400260f400466e1d20023074375460f000260e00182a6660e466e1d200400113232323232323232533307d308001002132498c09401458dd6983f000983f0011bad307c001307c002307a001307a0023370e9001183a1baa3078001307000c153330723370e900300089919191919191919299983e98400080109924c604a00a2c66e1d2002307a375460fc00260fc0046eb4c1f0004c1f0008c1e8004c1e8008cdc3a400460e86ea8c1e0004c1c003054ccc1c8cdc3a40100022646464646464a6660f660fc0042649319299983c99b87480000044c8c8c8c94ccc20004c20c0400852616375a6102020026102020046eb4c1fc004c1dc01854ccc1e4cdc3a4004002264646464a666100026106020042930b1bad308101001308101002375a60fe00260ee00c2c60ee00a2c66e1d20023078375460f800260f80046eb4c1e8004c1e8008c1e0004c1c003054ccc1c8cdc3a401400226464646464646464a6660fa6100020042649318130038b19b8748008c1e8dd5183f000983f0011bad307c001307c002375a60f400260f400460f000260e00182a6660e466e1d200c00113232323232323232533307d308001002132498c09801458cdc3a400460f46ea8c1f8004c1f8008dd6983e000983e001183d000983d00119b8748008c1d0dd5183c00098380060a99983919b87480380044c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc20c04c2180400852616375a6108020026108020046eb4c20804004c20804008dd69840008009840008011bad307e001307e002375a60f800260f80046eb4c1e8004c1e8008cdc3a400460e86ea8c1e0004c1c003054ccc1c8cdc3a4020002264646464646464646464a6660fe6104020042649318140048b19b8748008c1f0dd51840008009840008011bad307e001307e002375a60f800260f80046eb4c1e8004c1e8008c1e0004c1c003054ccc1c8cdc3a40240022646464646464a6660f660fc0042646493181200219837802919299983d19b87480000044c8c8c8c94ccc20404c210040084c9263035003163370e9001183f1baa308201001308201002308001001307800216307800116375a60f800260f800460f400260f40046eb0c1e0004c1c003054ccc1c8cdc3a40280022a6660ea60e00182930b0b18380059813806180c806981e007180b807981d00819299983619b87480000044c8c94ccc1c4c1d000852616375c60e400260d40242a6660d866e1d20020011323253330713074002149858dd7183900098350090a99983619b87480100044c8c94ccc1c4c1d000852616375c60e400260d40242a6660d866e1d20060011323253330713074002149858dd7183900098350090b18350088b183780098378011bad306d001306d002306b001306b0023069001306900230670013067002306500130650023063001306300230610013061002305f001305700216305700123253330583370e90000008a99982d982b0010a4c2c2a6660b066e1d200200113232533305d3060002149858dd7182f000982b0010a99982c19b87480100044c8c94ccc174c18000852616375c60bc00260ac0042c60ac002464a6660ae66e1d200000113232533305c305f002149858dd6982e800982a8010a99982b99b87480080044c8c94ccc170c17c00852616375a60ba00260aa0042c60aa002464a6660ac66e1d200000113232533305b305e002149858dd6982e000982a0010a99982b19b87480080044c8c94ccc16cc17800852616375a60b800260a80042c60a80024464a6660ac66e1d20040011305b3054002153330563370e9001000899191980080080291299982e0008b099191919299982e99b8f0070021001133006006003305e003375c60b800460c000460bc0026eb8c16cc15000858c150004888888c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc240054ccc240040e84cdc38118068a5115333090015333090013375e0520262a6661200266ebc0a40f854ccc24004cdd781b8188a9998480099baf02701115333090013375e04a01e2a6661200266e1c07401c54ccc24004cdc380d8028a9998480099baf019003153330900101710011333090010014a09445280a5014a029405280a5014a029404c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc294054ccc29404cdd79ba6002374c0942a66614a0266ebcdd30009ba604413370e66e0400c010cdc081c0110a5014a0266e952000330a90103c330a90103a330a90100c330a90137506660a806409c05866152026ea0ccc1500c01380b0cc2a4040b8cc2a404dd399854809ba8036330a901375006866152026ea0020cc2a404dd400319854809ba80384bd7019854809ba7330a901375004066152026ea0078cc2a404dd400399854809ba8005330a901375004497ae04bd700b199982a199982a199982a199982a199982a25eb7bdb18122010048810048302a2941013d2201034d5350004800804c04401803c03401013c030008cccc14ccccc14ccccc14ccccc14ccccc14d2f5bded8c09110048810048302a294101392201034d5350004800804804001803803001013802c008ccc1cc104134028ccc1c8118130024ccc1c40fc02c024ccc1c0110028020dd69850008011bad309e01001533309c013304d00b0091337606ea0cdc080124181514a086ea0cdc0800a4181514a08266ec0dd40011ba800133306c03a00a00833306b03f0090073374a90001984e809ba90443309d01375200297ae0304d3304e304d3304e007005304d3304e003001375c6138020026138020046eb8c26804004c248040a4dd7184c00800984c008011bae309601001308e0102716163370e90011848009baa309401001309401002309201001309201002375a6120020026120020046eb4c23804004c23804008dd69846008009846008011bad308a01001308a01002375a611002002611002004610c02002610c0200461080200261080200461040200260f4004605a002609802e66e1d2002307a375460fc00260fc00460f800260f80046eb4c1e8004c1e8008dd6983c000983c0011bad30760013076002375a60e800260e80046eb4c1c8004c1c8008c1c0004c1c0008c1b8004c1b8008c1b0004c190008c05c004c0d801cc1a0004c1a0008dd5983300098330011832000982e005183100098310011bab30600013060002305e0013056005222325333055333008001482807d200a100116533305400113253330553370e9001000880209919299982b999805000a4120069000099b8000100616375a60b600260a600660a600420064444a6660a866e1c00520001004132323300100100622533305a00113305b337606ea4018dd3001a5eb7bdb1804c8c8c8c94ccc16ccdd79980780500126103d879800013305f337606ea4028dd30038028a99982d99b8f00a00213232533305d3370e900000089983099bb0375201860c460b600400a200a60b600264a6660b8a6660be00229445280a60103d87a800013374a9000198301ba60014bd70191980080080111299983000089983099bb037520166ea00292f5bded8c0264646464a6660c266ebccc05403c00930103d8798000133065337606ea403cdd40070028a99983099b8f00f0021323253330633370e900000089983399bb0375202260d060c200400a200a60c200264a6660c466e1c005200014c103d87a800013374a9000198331ba80014bd7019b8000100e133065337606ea4008dd4000998030030019bad3062003375c60c000460c800460c40022660be66ec0dd48011ba600133006006003375660b80066eb8c168008c178008c170004c8c8008c8cc004004008894ccc168004526132533305b00114984c8c8c8c8c8c8c94ccc17ccdc3a4000002266014014660c600c00a2c60ba002660220040026eb8c17400cdd7182e0019830001982f001182e801182e8009982c19bb037520046ea00052f5bded8c044a6660a266e3c00922010013371e0029110014a0464a6660a066e1d2000001132323232323232323232323232323232323232325333067306a002132323232498c17c018c074044c070048c0cc04c58cdc3a400460c86ea8c1a0004c1a0008c198004c198008dd6983200098320011bad30620013062002375a60c000260c00046eb4c178004c178008dd6982e000982e001182d000982d001182c000982c001182b00098270010b1827000911299982819b890030021337120020062940894ccc138cdc80010008a60103d87980001533304e3371e0040022980103d87a800014c103d87b8000237260024466e280080048c94ccc12ccdc3a4000002264646464a6660a460aa0042930b1bae30530013053002375c60a200260920042c6092002609c0142c600200244a66609600229000099b8048008cc008008c138004c0040048894ccc1280084cdd79ba70014c10180001533304a00114a02666006006609a004609a00266600203497ae022330040013300b00500222232323330010010040022225333049337100029000080109998018019980299b8e00700100233702002900119b81371a0069001111982380080119801817119191919191919299982419982419baf00300d4a09444ccc120cdd7800821a504a22940c130004c110004c128004c108004c120004c120004c0fc004cc0080a48cdd79822981f1822981f00081d99800816119baf3044303d3044303d30443045303d00103a22323300100100322533304400114bd70099192999821980280109982380119802002000899802002000982400118230008b119299981f19b88480000044c8ccc004005221400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000480008894ccc104cdc48020008a511323253330433370e00290010a50133300500533714666e312000002004337169001199b8c337000049001241000200866e0000d20023371c00600266e380140045281b8d001330010060163001001222533303c33712900a0008999801801982118211821182118211821182118211821182100119b81001480504cc010008004c0040048894ccc0e8cdc4800a40002607e0042666006006608000466e0400520023232323232323232533303e3370e9001181e80189919299982019b8748008c0fc00c4c8c94ccc108cdc499b810010033370466e092014481e120d00f13370066e0ccdc0800801a40080062c6eb4c118004c0f800c58dd69822000981e0018b1821000981d0019820000981c001981f000981f001181e000981a00c1bac303a00130320013253330343370e90001819800899191919191919191919299981f19b8733300f00303a489044d53475300480084c8c8008c94ccc100cdc3a40000022646464646464646464646464a66609e60a4004264646464646493180f803180f003980e804180e004980d805198218059180d8008b18280009828001182700098270011826000982600118250009825001182400098240011bac3046001303e00216303e00130100011630420013042002375660800026080002606e002607a002607a0026068002607400260640022c646600200204044a666070002298103d87a80001323253330373232323232323232533303f3370e9001000899b8f375c6088607a0040762940c0f4004c108004c0e8004c100004c0e0004c0f8004c0f8004c0d40084cdd2a40006607600497ae0133004004001303c002303a00123253330343370e9000000899191919299981d981f0010991924c64a66607466e1d200000113232533303f3042002132498c02c00458c100004c0e000c54ccc0e8cdc3a40040022a66607a60700062930b0b181c00118040018b181e000981e001181d00098190010b1819000919299981999b87480000044c8c94ccc0e0c0ec0084c92630050011630390013031002153330333370e90010008991919191919299981e181f8010a4c2c6eb4c0f4004c0f4008dd6981d800981d8011bad3039001303100216303100123253330323370e900000089919299981b981d0010a4c2c6eb8c0e0004c0c000854ccc0c8cdc3a400400226464a66606e60740042930b1bae3038001303000216303000122232323253330353370e90010008a400026eb4c0e8c0cc008c0cc004c94ccc0d0cdc3a4004002298103d87a8000132323300100100222533303a00114c103d87a8000132323232533303b3371e014004266e9520003303f375000297ae0133006006003375a60780066eb8c0e8008c0f8008c0f0004dd5981c98190011819000991980080080211299981b8008a6103d87a800013232323253330383371e010004266e9520003303c374c00297ae0133006006003375660720066eb8c0dc008c0ec008c0e40048c94ccc0c0cdc3a40080022606a605c0042c605c0026eb0c0c8004c0c8008c0c0004c0c0008dd7181700098170011bac302c001302c002375a6054002604403c6eacc0a0004c0a0004c09c008dd618128009812801181180098118011bab3021001302100130200023756603c002603c002603a0046eb0c06c004c06c008dd6180c800980c8011bac3017001300f0053015001300d00116301300130130023011001300900414984d958c94ccc02ccdc3a4000002264646464646464646464a6660306036004264646493198070019180800099299980b99b87480000044c8c94ccc070c07c00852616375c603a002602a00a2a66602e66e1d20020011533301a301500514985858c054010cc03001c8dd68008b1bac3019001301900230170013017002375c602a002602a0046eb0c04c004c04c008dd6980880098048028b18048021119198008008019129998080008a4c26466006006602800460066024002464a66601466e1d200000113232533300f3012002149858dd6980800098040010a99980519b874800800454ccc034c02000852616163008001375c0024600a6ea80048c00cdd5000ab9a5573aaae7955cfaba05742ae89",
        [authenPolicyId, poolPaymentCred],
        {
          dataType: "list",
          items: [
            { dataType: "bytes" },
            {
              title: "Credential",
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
        } as any,
      ),
    };
  },

  {
    redeemer: {
      title: "PoolBatchingRedeemer",
      anyOf: [
        {
          title: "PoolBatchingRedeemer",
          dataType: "constructor",
          index: 0,
          fields: [
            { dataType: "integer", title: "batcherIndex" },
            {
              dataType: "list",
              items: { dataType: "integer" },
              title: "ordersFee",
            },
            { dataType: "bytes", title: "inputIndexes" },
            {
              title: "poolInputIndexesOpt",
              anyOf: [
                {
                  title: "Some",
                  description: "An optional value.",
                  dataType: "constructor",
                  index: 0,
                  fields: [{ dataType: "bytes" }],
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
              dataType: "list",
              items: {
                title: "Optional",
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
              title: "volFees",
            },
          ],
        },
      ],
    },
  },
) as unknown as PoolValidatorValidatePoolBatching;

export interface SampleMultiSignWithdraw {
  new (): Validator;
  _redeemer: Data;
}

export const SampleMultiSignWithdraw = Object.assign(
  function () {
    return {
      type: "PlutusV2",
      script:
        "5903170100003232323232323232322253330053370e900018020008a999802991919191919191919191919191919299980a19b8748010c04c0304c8c94ccc058cdc3a4000602a00226464a66603066e1d200230170011323232533301b3370e9000180d0008991919191919191919299981219b8748010c08c0044c8c8c8c8c8cc004004008894ccc0b4004528899192999816191980080080d1129998188008a501323253330303371e00400c29444cc010010004c0d4008dd718198008998020020008a503031002375c605e0026eb0c0b0c094008c94ccc09ccdc3a400000226464a666058605e0042649319198008008011129998170008a4c2646600600660640046eb8c0c000458dd6181680098128010b1812800981500098110008b181400098140009813800980f00098120009812000980d8009810800980c8008b191980080080811299980f8008a6103d87a800013232533301e323232323232323253330263370e9001000899b8f375c6056604800401a2940c090004c0a4004c084004c09c004c07c004c094004c094004c0700084cdd2a40006604400497ae013300400400130230023021001375c603c002602c0022c603800260280022c603400260240182c6eb0c060004c060004c05c004c058004c054004c050004c04c004c048008dd618080009808000980380198068009806801180580098018008a4c26cac264464a6660106464646464646464646464646464a66602c66e1d2002301500b13232323300100100222533301d00114a226464a666038646600200201044a66604200229404c8c94ccc080cdc78010030a511330040040013025002375c60460022660080080022940c084008dd7180f8009bac301c00130140131637586034002603400260320026030002602e002602c002602a00260280026026002601400660200026020004601c002600c00429309b2b19299980419b87480000044c8c94ccc034c0400084c926323300100100222533300f00114984c8cc00c00cc04c008dd718088008b1bac300e0013006005163006004300a3003001230053754002460066ea80055cd2ab9d5573caae7d5d02ba157441",
    };
  },

  { _redeemer: { title: "Data", description: "Any Plutus data." } },
) as unknown as SampleMultiSignWithdraw;

export interface SampleMultiSignSpend {
  new (): Validator;
  datum: { pubKeyHashes: Array<string> };
  _redeemer: { wrapper: Data };
}

export const SampleMultiSignSpend = Object.assign(
  function () {
    return {
      type: "PlutusV2",
      script:
        "5903170100003232323232323232322253330053370e900018020008a999802991919191919191919191919191919299980a19b8748010c04c0304c8c94ccc058cdc3a4000602a00226464a66603066e1d200230170011323232533301b3370e9000180d0008991919191919191919299981219b8748010c08c0044c8c8c8c8c8cc004004008894ccc0b4004528899192999816191980080080d1129998188008a501323253330303371e00400c29444cc010010004c0d4008dd718198008998020020008a503031002375c605e0026eb0c0b0c094008c94ccc09ccdc3a400000226464a666058605e0042649319198008008011129998170008a4c2646600600660640046eb8c0c000458dd6181680098128010b1812800981500098110008b181400098140009813800980f00098120009812000980d8009810800980c8008b191980080080811299980f8008a6103d87a800013232533301e323232323232323253330263370e9001000899b8f375c6056604800401a2940c090004c0a4004c084004c09c004c07c004c094004c094004c0700084cdd2a40006604400497ae013300400400130230023021001375c603c002602c0022c603800260280022c603400260240182c6eb0c060004c060004c05c004c058004c054004c050004c04c004c048008dd618080009808000980380198068009806801180580098018008a4c26cac264464a6660106464646464646464646464646464a66602c66e1d2002301500b13232323300100100222533301d00114a226464a666038646600200201044a66604200229404c8c94ccc080cdc78010030a511330040040013025002375c60460022660080080022940c084008dd7180f8009bac301c00130140131637586034002603400260320026030002602e002602c002602a00260280026026002601400660200026020004601c002600c00429309b2b19299980419b87480000044c8c94ccc034c0400084c926323300100100222533300f00114984c8cc00c00cc04c008dd718088008b1bac300e0013006005163006004300a3003001230053754002460066ea80055cd2ab9d5573caae7d5d02ba157441",
    };
  },
  {
    datum: {
      title: "MultiSignDatum",
      anyOf: [
        {
          title: "MultiSignDatum",
          dataType: "constructor",
          index: 0,
          fields: [
            {
              dataType: "list",
              items: { dataType: "bytes" },
              title: "pubKeyHashes",
            },
          ],
        },
      ],
    },
  },
  {
    _redeemer: {
      title: "Wrapped Redeemer",
      description:
        "A redeemer wrapped in an extra constructor to make multi-validator detection possible on-chain.",
      anyOf: [
        {
          dataType: "constructor",
          index: 1,
          fields: [{ description: "Any Plutus data." }],
        },
      ],
    },
  },
) as unknown as SampleMultiSignSpend;
