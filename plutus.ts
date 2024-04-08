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
  redeemer: "MintFactoryAuthen" | "CreateTreasury";
}

export const AuthenMintingPolicyValidateAuthen = Object.assign(
  function (outRef: { transactionId: { hash: string }; outputIndex: bigint }) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "59076a010000323232323232322232323225333007323232533300a3007300b375400226464646464a66601e601860206ea80344c8c8c8c94ccc058c064cc014dd6180c002119baf30193016375400202626464a66603060360042646464a666030a66603066e3cdd7180e8020070a99980c19b8f0024881024d53001301400114a029404c8c94ccc074c0800084c94ccc06ccdc3a400860386ea80044c94ccc070c064c074dd5000899191919299981198130010a99981019b8f003488101000013371e00291121ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff000014a02c6eb8c090004c090008dd71811000980f1baa001163020301d37540022c603e6040604060386ea800458c078004cc02801c8c054ccc034dd5980f180f980d9baa00100f4881024d530016375a6038603a0046eb8c06c004c06c00458dd6180c8009919800800980380111299980c0008a5eb804c8ccc888c8cc00400400c894ccc078004400c4c8cc080dd3998101ba90063302037526eb8c074004cc080dd41bad301e0014bd7019801801981100118100009bae30170013756603000266006006603800460340022c6eacc05cc060c060008dd6180b000980b180b00098089baa00713232323232325333018301b0021323232533301b301e00213232323232323375e6e98c044034dd31919199980099998009999800a5eb7bdb1800592201024d5300480080592201034d53500048008058c8c8c008cc004c008cc004dd718138031bae30273028006300233001375c604e00a6eb8c09cc0a001488cdc500100091b93001483fbfffffffffffffffc0488894ccc08cc08000440104c8c8cc004004018894ccc0a40044cc0a8cdd81ba9006374c00697adef6c60132323232533302a3375e6601801400498103d879800013302e337606ea4028dd30038028a99981519b8f00a002132533302b3028302c375400226605e66ec0dd4805981818169baa001004100432533302b533302e00114a229405300103d87a8000130203302f374c00297ae0323300100100222533302f001133030337606ea402cdd400525eb7bdb1804c8c8c8c94ccc0c0cdd79980900780126103d8798000133034337606ea403cdd40070028a99981819b8f00f0021325333031302e3032375400226606a66ec0dd4808181b18199baa0010041004325333031302e00114c103d87a80001302633035375000297ae03370000201c26606866ec0dd48011ba800133006006003375a60620066eb8c0bc008c0cc008c0c40044cc0b8cdd81ba9002374c0026600c00c0066eacc0ac00cdd7181480118168011815800991900119198008008011129998148008a4c264a666054002293099192999814981318151baa3300b375c6054605c0086eb8c0a80084cc014014cc0b400800458c0b8008c0b0004c0b0004cc09ccdd81ba9002375000297adef6c60225333020337200040022980103d8798000153330203371e0040022980103d87a800014c103d87b8000301f3754603e004603c6ea8c074004cc88c8c8c8c8c8c94ccc08ccdc78028010a99981199b9000400113376001000e266ec001c02054ccc08ccdc8002801099bb000800713376000e0106eb8c09cc0a0008dd7181300098111baa004375c6048604a0046eb8c08c004c07cdd5001181000098101810800980e1baa00232533301a3017301b3754004264646464a66604260480042646493180300118028018b181100098110011810000980e1baa002162533301a3017301b3754002264646464a66604260480042930b1bae30220013022002375c604000260386ea800458c06800458c070004c8cc004004014894ccc06c00452f5bded8c026464a66603464a666036602e60386ea80044cdd78031810180e9baa00114a0603600426603c00466008008002266008008002603e004603a0026034602e6ea800458c064004cc014dd6180c002118081998041bab3019301a3016375460326034602c6ea80040292201024d53003756602e603060306030603060300046eacc058004c058c058c058c058004c044dd500391191980080080191299980a8008a5eb804c8c94ccc050c0140084cc060008cc0100100044cc010010004c064008c05c0048c8cc004004008894ccc04c00452f5bded8c0264646464a66602866e3d2201000021003133018337606ea4008dd3000998030030019bab3015003375c6026004602e004602a00244464a666020601860226ea8004520001375a602a60246ea8004c94ccc040c030c044dd50008a60103d87a8000132330010013756602c60266ea8008894ccc054004530103d87a8000132323253330153371e00e6eb8c05800c4c028cc064dd4000a5eb804cc014014008dd6980b001180c801180b800991980080080211299980a0008a6103d87a8000132323253330143371e00e6eb8c05400c4c024cc060dd3000a5eb804cc014014008dd5980a801180c001180b0009ba548000dd7180798061baa00116300e300f002300d0013009375400229309b2b19299980318018008a99980498041baa00414985854ccc018c00800454ccc024c020dd50020a4c2c2c600c6ea800cdc3a40046e1d20005734aae7555cf2ab9f5740ae855d11",
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
        "590a61010000323232323232322322322322323232232322533300f323232533233013300130143754004264646464646464646464646464646464646464a66604c603c604e6ea80044c8c8c94ccc0b0c0bccc0040508cdd7801981798161baa302f302c3754605e606060586ea80044c8c8c8c94ccc0c0c0cc0084c94cc8cc0bcc004c0c0dd5001099192999818980198191baa001132323232325333039303c00213232325333039300b303a375400226464a66607666e4007806454ccc0eccdc800c80e8a99981d99baf00c30183303f375203c6607e6ea40652f5c02a66607666ebc028c060cc0fcdd480c9981f9ba901d4bd700991919299981f19baf374c6600204c910100374c66660046666004666600497adef6c6003c4881024d5300480080f12201034d535000480080f007120feffffffffffffffff0113232323232323232323232323232533304c3375e60a201c0642a66609866ebc0300c454ccc130ccc130cdd7819018a504a22a66609866ebcdd31980780aa4500374c0022a66609866e2120000081533304c3371e01408c2a66609860880082a666098608800c2608800629405280a5014a029405280a5014a0666601e666601e666601e97adef6c600494881034d535000480081240a520feffffffffffffffff01375c60a00026eb8c140c14400401cc130dd50181bad304e304f002375a609a002609a0046eb4c12c004c12c008dd6982480098248011bae30470013047304730473047304730473047002304500130450013040375400a294088c8cc00400400c894ccc11000452f5bded8c0264646464a66608a66e3c01c008400c4cc124cdd81ba9002374c0026600c00c0066eacc11800cdd718220011824001182300091112999820181c0008802099191980080080311299982300089982399bb0375200c6e9800d2f5bded8c0264646464a66608e66ebccc03002800930103d879800013304b337606ea4028dd30038028a99982399b8f00a002132533304830403049375400226609866ec0dd4805982698251baa0010041004325333048533304b00114a229405300103d87a8000130253304c374c00297ae0323300100100222533304c00113304d337606ea402cdd400525eb7bdb1804c8c8c8c94ccc134cdd79980900780126103d8798000133051337606ea403cdd40070028a99982699b8f00f002132533304e3046304f37540022660a466ec0dd4808182998281baa001004100432533304e304600114c103d87a80001302b33052375000297ae03370000201c2660a266ec0dd48011ba800133006006003375a609c0066eb8c130008c140008c1380044cc12ccdd81ba9002374c0026600c00c0066eacc12000cdd7182300118250011824000991900119198008008011129998230008a4c264a66608e002293099192999823181f18239baa3300b375c608e60960086eb8c11c0084cc014014cc12800800458c12c008c124004c124004cc110cdd81ba9002375000297adef6c6022533303d337200040022980103d87980001533303d3371e0040022980103d87a800014c103d87b800014a029405280a503232533303c3034303d3754006264646464646464646464646464646464646464646464646464646464a6660b660bc004264646464649318108089810009299982d1829182d9baa0131323232325333061306400213232498c94ccc180c1600044c8c94ccc194c1a00084c926325333063305b001132325333068306b002132498c0ac00458c1a4004c194dd50010a99983198288008991919191919299983618378010a4c2c6eb4c1b4004c1b4008dd6983580098358011bad3069001306537540042c60c66ea800458c198004c188dd50018a99983018270008a99983198311baa00314985858c180dd500118120018b183100098310011830000982e1baa01316304d01a304c01b16375a60b800260b80046eb4c168004c168008dd6982c000982c0011bad30560013056002375a60a800260a80046eb8c148004c148008c140004c140008c138004c138008c130004c130008dd6982500098250011bad30480013048002375a608c002608c004608800260880046084002607c6ea800c588c94ccc0f4c0d40044c8c94ccc108c11400852616375a6086002607e6ea800854ccc0f4c0ac00454ccc100c0fcdd50010a4c2c2c607a6ea80048c94ccc0f0c0d00044c8c94ccc104c11000852616375c6084002607c6ea800854ccc0f0c0a80044c8c94ccc104c11000852616375c6084002607c6ea800858c0f0dd5000981f181d9baa00116303d303e00237566078002607860706ea800458c0e8004cc0300748c8c8c94ccc0e0c098c0e4dd50008a99981c19b8f034375c607a60746ea80044c098ccc0500080d9221034d53500014a02940c0f0c0e4dd5181e0011bab303b303c0013037375400260540046052006606c60666ea800458c0d4c0d8c0d8c0c8dd5002181a18189baa002370e90020b18191819981998179baa0031630310013031002302f0013300101223232533302c3375e606200400c260346660100020549101024d530014a06eacc0c0c0c4004c0b0dd50008b1119198008008019129998178008a5eb804c8c94ccc0b8c0140084cc0c8008cc0100100044cc010010004c0cc008c0c4004c0b0c0a4dd5000981598141baa302b302c30283754605660506ea800458c8cc004004044894ccc0a8004530103d87a80001323253330293232533302b3375e60600040302603266600e002052911024d530014a06eacc0bcc0c0c0b0dd51817981800098159baa002130063302d0024bd7009980200200098170011816000911192999814180b18149baa0011480004dd6981698151baa0013253330283016302937540022980103d87a8000132330010013756605c60566ea8008894ccc0b4004530103d87a80001323232533302d3371e00e6eb8c0b800c4c028cc0c4dd4000a5eb804cc014014008dd698170011818801181780099198008008021129998160008a6103d87a80001323232533302c3371e00e6eb8c0b400c4c024cc0c0dd3000a5eb804cc014014008dd59816801181800118170009ba548000c8c8c008cc004c008cc004dd718148021bae3029302a004300233001375c60520066eb8c0a4c0a800c88cdc500100091b9300130233754604600460446ea8c084004c8c8c8c8c8c94ccc094cdc78028010a99981299b90004001133760016014266ec002802c54ccc094cdc8002801099bb000b00a1337600140166eb8c0a4c0a8008dd7181400098121baa007375c604c604e0046eb8c094004c084dd50029bae30233024002375c6044002603c6ea8054c080c084008c07c004c06cdd50071bab301d301e301e00237586038002603860380046eb0c068004c058dd5002180c180a9baa002370e90010b180b180b801180a80098089baa00114984d9594ccc034c014c038dd5001099191919299980a180b8010991924c600c004600a0062c602a002602a0046026002601e6ea80085894ccc034c014c038dd5000899191919299980a180b8010a4c2c6eb8c054004c054008dd7180980098079baa0011630010032533300a3002300b3754002264646464a66602260280042930b1bae30120013012002375c602000260186ea800458dc3a40006eb8004dd70009bae0015734aae7555cf2ab9f5740ae855d11",
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
    return {
      type: "PlutusV2",
      script:
        "5902220100003232323232322323232232253330084a029309b2b19299980398028008a99980518049baa00214985854ccc01cc01000454ccc028c024dd50010a4c2c2c600e6ea8004c94ccc014c00cc018dd50020991919191919191919192999809180a001099191924c64a66602460200022a66602a60286ea80105261615333012300f00115333015301437540082930b0a99980919b874801000454ccc054c050dd50020a4c2c2c60246ea800d4ccc040c038c044dd5003099191919299980b980c8010a4c2c6eb8c05c004c05c008dd7180a80098091baa00616533300f300d30103754012264646464a66602c6030004264649319299980a980980089919299980d180e00109924c64a666030602c00226464a66603a603e00426493180b0008b180e800980d1baa002153330183015001132323232323253330213023002149858dd6981080098108011bad301f001301f002375a603a00260346ea800858c060dd50008b180d000980b9baa00315333015301200115333018301737540062930b0b180a9baa002300f00316301600130160023014001301137540122c2c602400260240046eb4c040004c040008c038004c038008dd718060009806001180500098039baa004162325333006300400113232533300b300d002149858dd7180580098041baa00215333006300300113232533300b300d002149858dd7180580098041baa00216300637540026e1d2002370e90002b9a5573aaae7955cfaba15745",
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
        "5902ec0100003232323232322222533300532325332330083001300937546018601a00626464a666014600460166ea801c4c8cc004004dd5980798081808180818081808180818069baa00522533300f00114a0264a66601a66ebc030c038c044008528899801801800980880089919192999806980298071baa001132323300100100522533301300114a0264a66602266e3cdd7180a8010020a511330030030013015001375c6022601e6ea800458c040c038dd5180818071baa00a32533300c3004300d3754014264646464646464646464a666032603600426464649319299980c98088008a99980e180d9baa00414985854ccc064c04800454ccc070c06cdd50020a4c2c2a66603266e1d20040011533301c301b37540082930b0b180c9baa0035333017300f3018375400c264646464a66603c60400042930b1bae301e001301e002375c603800260326ea8018594ccc058c038c05cdd5004899191919299980e980f8010991924c64a666038602800226464a66604260460042649319299980f980b800899192999812181300109924c602c0022c604800260426ea800854ccc07cc0600044c8c8c8c8c8c94ccc0a0c0a800852616375a605000260500046eb4c098004c098008dd6981200098109baa00216301f37540022c6042002603c6ea800c54ccc070c05400454ccc07cc078dd50018a4c2c2c60386ea8008c03c00c58c074004c074008c06c004c060dd50048b0b180c800980c8011bad3017001301700230150013015002375c602600260260046022002601c6ea8028588c94ccc034c0140044c8c94ccc048c05000852616375c6024002601e6ea800854ccc034c0180044c8c94ccc048c05000852616375c6024002601e6ea800858c034dd50009bac300e300f300f300f300f300f300f300f300f300c375400864a66601460040022a66601a60186ea801c526161533300a30030011533300d300c375400e2930b0b18051baa006370e90001b874800858c028004c01cdd50008a4c26cacae6955ceaab9e5573eae855d101",
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
        "59010601000032323232323223223225333006323253330083370e900218049baa300c300d00213253330093370e900118051baa00113371e00e6eb8c034c02cdd50008b180618051baa300c300a37546018601a60146ea8ccc8c8c8c0040048894ccc034cdc4a40280022666006006602460246024602460246024602460246024602400466e0000520131330040020013001001222533300b337120029000098078010999801801980800119b8000148004dd6180618051baa001375a601860146ea801458c02c004c020dd50008a4c26caca66600866e1d20003005375400226464a66601260160042930b1bad3009001300637540022c6eb80055cd2ab9d5573caae7d5d0aba21",
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
        "5917a40100003232323232323232232232323232323232323223232253330113232323232323232323232323232325333020301b3021375401c2646464646464646464646464a666058604e00a2646464a6660646601a036464a666062605860646ea80044cdc79bae3036303337540020062940c0d4c0c8dd5181a98191baa3035303630323754002264a666060605660626ea80044c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc1054ccc1054ccc104c0f4dd698230010a999820981e8008a999820a999820981e98211baa0091337126eb4c118c10cdd50048018a5113371201602229405280a5014a22a666082607a60846ea801c4cdc49bad30463043375400e00629404c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc150c118c154dd5000899191919299982c18299bad305d305e305e0021325333059305433303803348811c627fc44f022bf1df8b90c0585b09960ddb8c0864c563063f30033d76004881034d535000153330593375e02e01c2a6660b266ebc05803054ccc164cdc380a0050a99982c99b8701300913370e00400229405280a5014a02940ccc0dc0192211c627fc44f022bf1df8b90c0585b09960ddb8c0864c563063f30033d760000f16375a60b800260b860b860b860b860b860b860b860b860b860b860b860b06ea8008c128004c164c158dd50008b182c182c8011bab305700130573053375405a6eb4c154c158008dd6982a000982a182a001182900098290011828000982818261baa01e333301e375c609c0046eb8c138c13c008dd718270009bae304e304f001304a375400a60926ea8014dd698240011bad304600153330443375e004024266ec0dd40041ba80061337606ea0018dd4004182280118218009980c8078068b1bad3045304600130453045002375a608600260860046eb4c104004c104c104008c0fc004c0fc008c0f4004c0f4c0f4008dd6981d800981d981d981d801181c800981c801181b80098199baa02e375a606a60646ea800458c0d0c0c4dd5181a18189baa01316375c60666068606860686068606860686068606860606ea80ad4ccc0b4c0a4c0b8dd5000899191919191919191919191919191919191919192999822182380109919191924c607400c6076022607402460740262c64a66608860860022a66608260786084002294454ccc104c0f4c1080045280b0b1baa3045001304500230430013043002375a608200260820046eb4c0fc004c0fc008dd6981e800981e8011bad303b001303b002375a60720026072004606e002606e004606a002606a0046066002605e6ea800458c8c94ccc0c4c0d00084c94ccc0bcc084c0c0dd50008981a18189baa00116303330343034303037540022c6064002660140284646464a666060605660626ea800454ccc0c0cdc79bae30353032375400291011c672708fe3f48419b67f178da4293bccf26a04c464af871204b552dce001302b33300f00248811c627fc44f022bf1df8b90c0585b09960ddb8c0864c563063f30033d76004881034d53500014a02940c0d0c0c4dd5181a0011bab30333034001302f3754002264a66605a603e00c264646464646464646464646464646464646464646464646464646464646464646464646464a6660a466ebcdd39982b182b8059982b1ba833303100f002001330563057305800b33056375066606201e9111c627fc44f022bf1df8b90c0585b09960ddb8c0864c563063f30033d76000074bd701ba733332222323333300100100500900400322222533305b30620041001132323232323232323253330643375e60d200460d201226666601c01c60d401a60d401860d4016664a646660cc60c4004246464646464646464646464646464a6660eaa6660ea66e1c00800454ccc1d4cdc38048008980819982a00624410048810014a029404c8c8cc1ecdd419b80375a60f8012008660f66ea0cdc01bad307c0020043307b307c0013307b307c307d0014bd70183e000983d8038b1919982a0061bae307a001375c60f460f600260ec6ea8c1e40294ccc1cccc11800c0084cdc0000a41ff23e80220026660a26eacc1dc02c008004dd7183b183b8011bae30750013071375460e860ea0046eb0c1cc004c1cc008dd69838800983880098380011bab306e001306e001306937540022a6660cc60c200424646464646464646464646464646464a6660eca6660ec66e1c00c00454ccc1d8cdc38058008980899982a806a450048810014a029404c8c8cc1f0dd419b81375a60fa01600a660f86ea0cdc09bad307d0020053307c307d0013307c307d307e0014bd70183e800983e0048b299983a99824003002099b80001482fe36dc044004ccc14c02c01400cccc148dd5983c0061bae3078001375c60f060f200260f00046eb8c1d8004c1d8008dd7183a00098381baa30733074002375860e400260e40046eb4c1c0004c1c0c1c0008dd59837000983700098349baa00112323232323232323232323232323232533307653330763370e66e08008ccc154dd5983d8079bae307b00a0083370400c00e260226660aa01a9110048810014a02660f46ea0018cc1e8dd40021983d1ba83370200400e660f46ea0cdc0800803a5eb8058dd6983d183d8011bad30790013079002375a60ee00260ee00c6eb4c1d4014ccc138018dd7183a183a8010009bae3073001307300130723072306e375460e260e40046eb0c1c0004c1c0c1c0c1c0008dd59837000983700098349baa0013712906046db8098329baa004304433068374c006660d06e98004cc1a001ccc1a0dd4002998341ba700a3306800f4bd700b1bab306830690013064375460ce0126eacc198028c194c198008dd698320009832001183100098311831000982e9baa3060003323300100100622533305700114bd7009982c1ba6375660b260b460ac6ea8c164c168c158dd5182c80099801001182d0009bac305400633056305701133056375066606203a004002660ac60ae60b0022660ac6ea0ccc0c40752211c627fc44f022bf1df8b90c0585b09960ddb8c0864c563063f30033d76000074bd7018191982b1ba9002330563752002660ac6ea4140cc158dd48039982b26011e581c627fc44f022bf1df8b90c0585b09960ddb8c0864c563063f30033d76004bd700a999829191919299982a9828182b1baa002132533305630513057375400426464666002002604c6604a014460bc60be60be60be60be60b66ea800528911299982e80108008999801801983000119299982d8010a99982d9826982e1baa00113371203800c2a6660b666e240780184cdc480280e0a5014a060be0046eb4c16cc160dd50010b1bad305a305737540042c60b260ac6ea8c164c168008c160c154dd5182c000982a1baa03613375e6e980b1300101a00014a02c6eb8c158c15c008dd7182a80098289baa0143301b001232323232323232323253330583371090001bad305d002153330583371e00a01a2a6660b066ebc00cc94ccc164c1540044c0e4cc174dd482b9982e9ba900e4bd700a99982c982a000880f0981c9982ea611e581c627fc44f022bf1df8b90c0585b09960ddb8c0864c563063f30033d76003305d375201c97ae03059375400220102c2c2c60b860ba00260b800460b400260b40046eb8c160004c160c150dd50012999828982698291baa001132323232323232323232533305e30610021323232498c94ccc178c16800454ccc184c180dd50020a4c2c2a6660bc60b20022a6660c260c06ea8010526161533305e305000115333061306037540082930b0b182f1baa0033054006305200916305f001305f002375a60ba00260ba00460b600260b60046eb8c164004c164008c15c004c14cdd50008b2999828182118289baa001130553052375400226604806200260a860aa60aa60a26ea8c150c154c144dd50009bac304e001323232533304f3330210210020011337606e9c008dd38008b19980f00f01b1980f80f8009981581c9192999827982518281baa00113371e6eb8c150c144dd50008018a5030533050375460a660a06ea8c14cc150c140dd50009bae305100c3333020375c60a00046eb8c140c144008dd718280009bae30503051001304c3754609800460966ea8c128004cc080c13403c034c134c134c134c134c134c134c134c134c134c134c124dd5001181d800a999822981b98231baa0011304a3047375400226603204c002609260940046eacc120004c120c110dd500f18239823800982318231823182318230011bad30440013044002375a608400260840046080002608000260766ea8008c0b40054ccc0dcc0a4c0e0dd50008981e181c9baa00113300b018001303b303c002375660740026074606c6ea8c0e4c0e8c0d8dd500891191980080080191299981d0008a5eb804cc0ecc00cc0f0004cc008008c0f4004c004004894ccc0d800452f5c02646607000266006006660246074004466606a66ebc00400928251303800122253330333371200290000a5eb8054ccc0d800852f5c026606e6070004666006006607200466e0000520012253330340011480004cdc02400466004004606e002444a666068004266ebcdd3800a6010180001533303400114a02666006006606e004606e00244a66605e601400426014002294054ccc0b4cdc3a400c00c26464646464646464646464646464646464a66607c6060607e6ea80044c8c94ccc1014ccc100c0f002054ccc100c0f001c54ccc100cdd79ba6006374c008266ebc008c8c8c8c8c8c8c8c8c8c8c8c8c0b0cc140c144030cc140c14402ccc140c144028cc140c144024cc140c144020cc140c14401ccc140c144018cc140c144014cc140c144010cc140c14400ccc140c144008cc140c144004cc1413010101003052305200130510013050001304f001304e001304d001304c001304b001304a0013049001304800130470013042375407a29405280a501323232323253330480011533304530413046375402226464a66608e608460906ea80044c94ccc120cdc4009001899b8801600114a06eb4c130c124dd50008b182598241baa304b304837540546eb4c128c11cdd50088b0a99982418258008a511533304530413046375402226464a66608e608460906ea80044c94ccc120cdc4009001899b8801600114a06eb4c130c124dd50008b182598241baa304b304837540546eb4c128c11cdd50088b1981101711919192999824182198249baa001153330483371e6eb8c134c128dd5000a4411c672708fe3f48419b67f178da4293bccf26a04c464af871204b552dce001533304830433330270024891c627fc44f022bf1df8b90c0585b09960ddb8c0864c563063f30033d76004881034d53500013371090001998138012451c627fc44f022bf1df8b90c0585b09960ddb8c0864c563063f30033d760000514a02940528182618249baa304c002375660966098002608e6ea8c128c12cc11cdd5000999980c1bae3048002375c609060920046eb8c120004dd71824182480098221baa3044002304337546084002660300240202c6068002608660806ea800458c108c10c008dd598208009820981e9baa0173756607e608060786ea8c0fcc100c0f0dd500b9bad303e303f002375a607a002607a607a0046eb4c0ec004c0ecc0ecc0ecc0ec008c0e4004c0e4c0e4c0e4008dd6981b800981b981b801181a800981a801181980098179baa02a132533302e302a302f37540022a66605c64646600200202444a66606800229404c94ccc0c8cdc79bae303700200414a2266006006002606e0026eb8c0ccc0c0dd50008992999817981518181baa0011323232323232323232323232323232533303e337106eb4c10cc100dd50081bad30433044304400f1533303e3370e66603a0169110048810033301d009489004881001533303e3370e66603a01201a018002266ebc01cc8c8c8c8c8c8c8c094cc124c12801ccc124c128018cc124c128014cc124c128010cc124c12800ccc124c128008cc12402ccc124024cc124c128004cc124dd4004182598258009825182518250009824800982400098238009823000982280098201baa03b14a029405281bad30423043304300230410013041002303f001303f303f303f303f303f303f303b3754004605a002a66606e605260706ea80044c0f0c0e4dd500089980580c000981d981e0011bab303a001303a303637540206eacc0e0c0e4c0d4dd5181c181c981a9baa010375c606e60700046eb8c0d8004c0c8dd5181a80098189baa02c163033303037546066606860606ea80485280b181918179baa303230333033303330333033302f37540544464a66605e605660606ea80044c0d0c0c4dd50008b19299981798158008a60103d87a80001533302f302a001132323300100100522533303500114c0103d87a8000132323253330353371e00c6eb8c0d800c4c054cc0e40052f5c026600a00a004606c0046072004606e0026eb8c0d0c0c4dd50010980799819981a18189baa0024bd7018179baa0012222300633005300633005004003300633005002001223371400400246e4c00488c8c8c8c8c8c94ccc0c0cdc78028010a99981819b9000400113376001000e266ec001c02054ccc0c0cdc8002801099bb000800713376000e0106eb8c0d0c0d4008dd7181980098179baa004375c606260640046eb8c0c0004c0b0dd500118141baa01a323300100100d22533302b00114bd6f7b63009919191929998161803801080189981819bb037520046e98004cc01801800cdd598168019bae302b002302f002302d001371e910100323232533302a302d002100116302b0013300300d2323253330283375e605a0040082604666600e00204c911034d53500014a06eacc0b0c0b4004c0a0dd5000981498131baa3029302a30263754002646464a66605260580042a66604c66ebcc0acc0a0dd500080188008b0b181500099801008118101998021bab302a302b3027375460546056604e6ea800408d2201034d53500030283025375402244646600200200644a666052002297ae0132325333028300500213302c00233004004001133004004001302d002302b0012223253330253020302637540022900009bad302a3027375400264a66604a6040604c6ea80045300103d87a8000132330010013756605660506ea8008894ccc0a8004530103d87a80001323232533302a3371e00e6eb8c0ac00c4c028cc0b8dd4000a5eb804cc014014008dd698158011817001181600099198008008021129998148008a6103d87a8000132323253330293371e00e6eb8c0a800c4c024cc0b4dd3000a5eb804cc014014008dd59815001181680118158009ba54800058dd59812181298128011bac3023001302300230210013021302130210023756603e002603e603e0046eb0c074004c074008dd6180d800980d8011bac3019001301537546030004602e603000260266ea800452613656325333010300c00115333013301237540062930b0a99980818058008a99980998091baa00314985854ccc040c00800454ccc04cc048dd50018a4c2c2a66602066e1d200600115333013301237540062930b0b18081baa002370e9002180080492999806180418069baa001132323232323232323232323232323232323232323232323232323232533302b302e00213232323232498c088044c084048c08404cc084068c08006c58dd6981600098160011bad302a001302a002375a605000260500046eb4c098004c098008dd6981200098120011bae3022001302200230200013020002301e001301e002301c001301c002375a603400260340046eb4c060004c060008dd6980b000980b001180a000980a001180900098071baa00116232533300c30080011323253330113014002149858dd6980900098071baa0021533300c30070011533300f300e37540042930b0b18061baa0012533300a3006300b3754002264646464a66602260280042646493192999808180600089919299980a980c00109924c60160022c602c00260246ea800c54ccc040c02c00454ccc04cc048dd50018a4c2c2c60206ea8008c02000c58c048004c048008c040004c030dd50008b12999804980298051baa00113232323253330103013002149858dd7180880098088011bae300f001300b37540022c464a666012600a00226464a66601c60220042649318028008b180780098059baa002153330093004001132323232323253330123015002149858dd6980980098098011bad30110013011002375a601e00260166ea800858c024dd50009192999804180200089919299980698080010a4c2c6eb8c038004c028dd50010a999804180180089919299980698080010a4c2c6eb8c038004c028dd50010b18041baa001370e90011b8748000dd7000ab9a5573aaae7955cfaba05742ae895d19",
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
