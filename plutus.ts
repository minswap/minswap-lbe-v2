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
        "5912e60100003232323232323223223223223223232322323232253330123232325333015300630163754002264646464646464646464646464646464646464646464646464a66605c6048605e6ea80044c8c8c8c8c8c8c8c8c8c8c8c8c94c8c8ccc0f4c0ccc0f8dd500d0a999820182199801813119baf00f304330403754608660806ea8c10cc110c100dd5000899191919299982218238010992999821180398219baa00113232533304430093045375400226464646464a666098609e004264a66609466e1ccc8c004004894ccc13c004520001337009001198010011829000800a40502a66466096646600200200644a6660a000229444c94ccc138c94ccc13cc050c140dd500089919191919191919299982b9806982e0030a99982b99baf00403515333057304d0021304d00114a029405281bad305b305c002375a60b400260b400460b000260b000260a66ea80094ccc140c118c144dd500089919191919191919299982d982f0010991924c609600c609400e2c6eb4c170004c170008dd6982d000982d001182c000982c001182b00098291baa001163054305137540022c60a660a860a860a06ea8c14c0084cc00c00c004528182980089919192999827180998279baa0011323253330503372005604c2a6660a066e400980a854ccc140cdd780718129982a1ba902b33054375204c97ae0153330503375e018604a660a86ea4098cc150dd481525eb8054ccc140cdd79ba6301a035374c66603809c09805a26464646464646464646464646464646464646464646464646464646464646464a6660e066e3c1a0dd7183a8100a99983819b8f06a01e153330703370e03890140a999838183300d0a999838181300c0a99983819baf01604e15333070333070302604e4a094454ccc1c0cdd79ba63303b02448900374c0022a6660e060680282a6660e066e2005004854ccc1c14ccc1c0c198c1c4dd50080992999838a999838983398391baa00f1337100026eb4c1d8c1ccdd50078a511303500114a06eb4c1d4c1c8dd50080a999838183318389baa00e13034375a60ea60e46ea80385288a999838181a0060a99983818330050a99983818330040a9998382999838183318389baa006132323232325333075337120320082a6660ea66e2001000854ccc1d4cdc480100b8a99983a981c800899b8800148320045280a5014a02940dd6983c983d0011bad30780013078002375a60ec00260e46ea8c1d4c1c8dd50030a511533307030660041533307000314a026660e09412825114a029405280a5014a029405280a5014a029405280a5014a029405280a50333303c333303c4bd6f7b630036a450874726561737572790048008dd7183a0009bae3074307500100b3070375409c606260dc6ea8c1c8c1cc008dd698388009838801183780098378011bad306d001306d002375a60d600260d60046eb4c1a4004c1a4008c19c004c19c008c194004c194c194008dd6983180098318011bad30610013061002305f001305f002305d001305d002375a60b600260b60046eb4c164004c164008dd7182b800982b80098291baa00214a029405280a5014a0602c00260a660a06ea800458c148c14c008dd59828800982898269baa003375e0542c2c6601e06046464a666098607a6660406eacc144c1480081212210673656c6c6572001533304c303d304d3754002266e3c110dd7182898271baa00114a02940c140c134dd5182800098261baa00116304d0013300d02e23232533304a303b33301e3756609e60a00040909101087472656173757279001533304a303b304b3754002266e3c118dd7182798261baa00114a02940c138c12cdd5182700098251baa001303b002303a0033049304637540022c609060926092608a6ea800cc11cc110dd50008b18231823982398219baa00316304500130450023043001330030242323253330403375e608a0040242606266602800207c91107666163746f72790014a06eacc110c114004c100dd50008b099191919299982218238010992999821180398219baa001132325333044300930453754002264646464646464646464646464a6660a860ae004264a6660a4609060a66ea80044c94ccc14ccdd7982c182a9baa001025153330533044333027375660b060b260aa6ea8004145220107666163746f7279001325333054301930553754002264646464a6660b660bc004264a6660b2603c60b46ea80044c8c8c8c8c8c8c8c8c8c8c8c8c94ccc198c170c19cdd5000899192999834182c98349baa0011325333069337200360322a6660d266ebc054c0f8cc1b4dd480d998369ba90194bd700a99983499baf374c606609c6e98ccc0d419c19411854ccc1a4c8cc004004130894ccc1b8004528099299983619b8f375c60e200400c29444cc00c00c004c1c400454ccc1a4cdc40008058a5115333069305f00d15333069533306900514a226660d29452825115333069305f0081305f00614a029405280a5014a029405281bad306d306a37540022c60d860d26ea8c1b0c1b4c1a4dd50251bae306b306837540022c60d460ce6ea8c1a8018c0a0c194dd5183498350011bad3068001306830683068002375a60cc00260cc60cc60cc60cc00260ca60ca0046eb4c18c004c18cc18cc18cc18c008dd6983080098309830982e9baa0023021001305e305b37540022c60ba60bc60bc60b46ea8c174c178c168dd50008b182e0009980e01f91919299982c99baf305e00202b1304a33302d00105748907666163746f72790014a06eacc174c178004c164dd5182e182e982c9baa001304a0013059305637540022c60b060b260b260aa6ea80045858c15cc150dd50008b299982a01c0a6103d87a8000130263305530560384bd700b1bae30550013055002375c60a6002a66609aa66609a66e3c01408c4cdc78008118a501330513752004660a26ea40112f5c02a66609aa66609a66e3c01008c4cdc78010118a50133051375200a660a26ea40052f5c02c6eb8c144c148008dd7182800098261baa006375c609c609e0046eb8c134004c124dd5002981d801181d001982498231baa001163048304930493045375460906092608a6ea800cc11cc110dd50008b18231823982398219baa30463047304337540062c608a002608a00460860026600604c46464a66608066ebcc1140080484c0c4ccc0500040f9220107666163746f72790014a06eacc110c114004c100dd51821982218201baa001371090001b874801088c8cc00400400c894ccc10400452f5c026464a666080600a00426608800466008008002266008008002608a00460860024a666074606060766ea80044c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc17cc1880084c8c8c8c8c8c9263253330623058001132325333067306a0021324994ccc190c168c194dd50008991919191919299983698380010a4c2c6eb4c1b8004c1b8008dd6983600098360011bad306a001306637540022c2c60d000260c86ea802c54ccc188c14c00454ccc194c190dd50058a4c2c2c60c46ea8028c0a0044c09c0494ccc178c150c17cdd5009899191919299983298340010991924c64a6660c860b400226464a6660d260d800426493192999833982e800899192999836183780109924c60640022c60da00260d26ea800854ccc19cc1600044c8c8c8c8c8c94ccc1c0c1cc00852616375a60e200260e20046eb4c1bc004c1bc008dd6983680098349baa00216306737540022c60d400260cc6ea800c54ccc190c15400454ccc19cc198dd50018a4c2c2c60c86ea8008c0ac00c58c198004c198008c190004c180dd50098b182780c182700c8b19299982f982f0008a99982e1826982e8008a511533305c3052305d00114a02c2c6ea8c180004c180008dd6982f000982f001182e000982e0011bad305a001305a002375a60b000260b00046eb4c158004c158008c150004c150008c148004c148008c140004c140008dd6982700098270011bad304c001304c002304a001304a00230480013048002375a608c002608c0046eb4c110004c110008dd7182100098210011bae3040001303c37540022c464a666074606000226464a66607e60840042930b1bad3040001303c37540042a66607460560022a66607a60786ea80085261616303a3754002464a666072605e00226464a66607c60820042930b1bae303f001303b37540042a666072605400226464a66607c60820042930b1bae303f001303b37540042c60726ea80048cc00800522010022323300100100322533303c00114bd6f7b630099191919299981e99b8f0070021003133041337606ea4008dd3000998030030019bab303e003375c60780046080004607c002444a66606e605a60706ea80044cccc010cccc010ccc01400d22107666163746f7279004800800d2201087472656173757279004800800922010673656c6c657200480a04cccc010ccc01400d220107666163746f7279004800400d2201087472656173757279004800488894ccc0dcc0b400440104c8c8cc004004018894ccc0f40044cc0f8cdd81ba9006374c00697adef6c60132323232533303e300d3300e00a002133042337606ea4028dd30038028a99981f19b8f00a002132533303f30353040375400226608666ec0dd4805982218209baa001004100432533303f533304200114a229405300103d87a80001301433043374c00297ae03233001001002225333043001133044337606ea402cdd400525eb7bdb1804c8c8c8c94ccc110c04ccc05003c0084cc120cdd81ba900f375001c00a2a66608866e3c03c0084c94ccc114c0ecc118dd500089982499bb037520206094608e6ea80040104010c94ccc114c0ec0045300103d87a80001301a33049375000297ae03370000201c26609066ec0dd48011ba800133006006003375a608a0066eb8c10c008c11c008c1140044cc108cdd81ba9002374c0026600c00c0066eacc0fc00cdd7181e8011820801181f8009919001191980080080111299981e8008a4c264a66607c00229309919299981e9819981f1baa3300d375c607c60840086eb8c0f80084cc014014cc10400800458c108008c100004c100004cc0eccdd81ba9002375000297adef6c602225333035302b00114bd6f7b6300991919800800a5eb7bdb180894ccc0ec0044cc0f0cdd81ba9006374c00697adef6c60132323232533303c300b3300c00a002133040337606ea4028dd30038028a99981e19b8f00a002133040337606ea4028dd300380189982019bb037520046e98004cc01801800cdd5981e8019bae303b002303f002303d00132330010014bd6f7b63011299981d00089981d99bb037520086ea000d2f5bded8c0264646464a66607660146601601000426607e66ec0dd48041ba80070051533303b3371e01000426607e66ec0dd48041ba800700313303f337606ea4008dd4000998030030019bad303c003375c6074004607c00460780026ebd300103d879800022533303233720004002298103d8798000153330323371e0040022980103d87a800014c103d87b8000303430313754002606660606ea8c0ccc0d0c0c0dd5181998181baa00116323300100101722533303200114c103d87a8000132325333031323253330333375e607000403c2604866600e00206291107666163746f72790014a06eacc0dcc0e0c0d0dd5181b981c00098199baa00213006330350024bd70099802002000981b001181a000911192999818181098189baa0011480004dd6981a98191baa0013253330303021303137540022980103d87a8000132330010013756606c60666ea8008894ccc0d4004530103d87a8000132323253330353371e00e6eb8c0d800c4c028cc0e4dd4000a5eb804cc014014008dd6981b001181c801181b800991980080080211299981a0008a6103d87a8000132323253330343371e00e6eb8c0d400c4c024cc0e0dd3000a5eb804cc014014008dd5981a801181c001181b0009ba548000c8c8c008cc004c008cc004dd718188021bae30313032004300233001375c60620066eb8c0c4c0c800c88cdc500100091b93001302b3754605600460546ea8c0a4004c8c8c8c8c8c94ccc0b4cdc78028010a99981699b9000400113376001a016266ec002c03454ccc0b4cdc8002801099bb000d00b13376001601a6eb8c0c4c0c8008dd7181800098161baa008375c605c605e0046eb8c0b4004c0a4dd50039bae302b302c002375c6054002604c6ea806cc0a0c0a4008c09c004c09c008c094004c084dd50091bac30233024002302200130223022302200237566040002604060400046eb0c078004c078c078008dd6180e000980c1baa003301a301737540022c60326034004603000260286ea80045261365653330103006301137540062646464646464a666032603800426464649319299980c98078008a99980e180d9baa00414985854ccc064c02800454ccc070c06cdd50020a4c2c2c60326ea800cc024010c02001458c068004c068008c060004c060008c058004c048dd50018b1b874800894ccc03cc014c040dd5000899191919299980b180c8010a4c2c6eb8c05c004c05c008dd7180a80098089baa0011630010032533300c3002300d3754002264646464a666026602c0042930b1bae30140013014002375c6024002601c6ea800458dc3a40006eb8004dd70009bae001375c002ae6955ceaab9e5573eae815d0aba201",
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

export interface FeedTypeAmmPool {
  new (): Validator;
  _datum: {
    assetA: { policyId: string; assetName: string };
    assetB: { policyId: string; assetName: string };
    totalLiquidity: bigint;
    reserveA: bigint;
    reserveB: bigint;
    tradingFeeNumerator: bigint;
    tradingFeeDenominator: bigint;
    profitSharingOpt: [bigint, bigint] | null;
  };
  _redeemer: Data;
}

export const FeedTypeAmmPool = Object.assign(
  function () {
    return {
      type: "PlutusV2",
      script:
        "5901290100003232323232322322253330054a029309b2b19192999802180118029baa003132323232323232323232323232323232533301730190021323232498c94ccc05cc0540044c8c94ccc070c0780084c92632375a60380046eb4c06800458c94ccc070c078c0780044cdd8180e800980e980f0008b1bac301c001301937540082a66602e66e1d20020011533301a301937540082930b0b180b9baa003301200e301100f1630170013017002375a602a002602a0046eb4c04c004c04c008dd6980880098088011bad300f001300f002375a601a002601a004601600260160046012002600c6ea800c5894ccc010c008c014dd5000899191919299980598068010a4c2c6eb8c02c004c02c008dd7180480098031baa00116370e90002b9a5573aaae7955cfaba157441",
    };
  },
  {
    _datum: {
      title: "PoolDatum",
      anyOf: [
        {
          title: "PoolDatum",
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
            { dataType: "integer", title: "totalLiquidity" },
            { dataType: "integer", title: "reserveA" },
            { dataType: "integer", title: "reserveB" },
            { dataType: "integer", title: "tradingFeeNumerator" },
            { dataType: "integer", title: "tradingFeeDenominator" },
            {
              title: "profitSharingOpt",
              anyOf: [
                {
                  title: "Some",
                  description: "An optional value.",
                  dataType: "constructor",
                  index: 0,
                  fields: [
                    {
                      dataType: "list",
                      items: [{ dataType: "integer" }, { dataType: "integer" }],
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
  },
  { _redeemer: { title: "Data", description: "Any Plutus data." } },
) as unknown as FeedTypeAmmPool;

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
  _redeemer: "UpdateOrder" | "CollectOrder" | "RedeemOrder";
}

export const OrderValidatorFeedTypeOrder = Object.assign(
  function () {
    return {
      type: "PlutusV2",
      script:
        "5902280100003232323232322323232232253330084a029309b2b19299980398028008a99980518049baa00214985854ccc01cc01000454ccc028c024dd50010a4c2c2a66600e66e1d20040011533300a300937540042930b0b18039baa0013232533300630043007375400a2646464646464646464646464a66602a602e004264646493299980a1809180a9baa009132323232533301b301d00213232498c94ccc068c0600044c8c94ccc07cc0840084c92632533301d301b0011323253330223024002132498c06c00458c088004c07cdd50010a99980e980d0008991919191919299981318140010a4c2c6eb4c098004c098008dd6981200098120011bad3022001301f37540042c603a6ea800458c07c004c070dd50018a99980d180b8008a99980e980e1baa00314985858c068dd5001180a0018b180d800980d801180c800980b1baa00916300e00a300d00b16375a602a002602a00464a66602660240022a666020601a6022002294454ccc040c038c0440045280b0b1baa30130013013002375a60220026022004601e002601e004601a002601a004601600260106ea80145894ccc018c010c01cdd5000899191919299980698078010a4c2c6eb8c034004c034008dd7180580098041baa001162325333006300400113232533300b300d002149858dd7180580098041baa00215333006300300113232533300b300d002149858dd7180580098041baa00216300637540026e1d2002370e90002b9a5573aaae7955cfaba15745",
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
          title: "CollectOrder",
          dataType: "constructor",
          index: 1,
          fields: [],
        },
        { title: "RedeemOrder", dataType: "constructor", index: 2, fields: [] },
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
        "5902300100003232323232323223223222253330083232323253323300d3001300e37546024602600a2646464a64666022600a00626600400c60026602a66e95200233015375201e97ae04bd700a99980899b874800000c4cc008018c004cc054cdd2a40046602a6ea40352f5c097ae013371064a666024600c60266ea8004520001375a602e60286ea8004c94ccc048c018c04cdd50008a6103d87a80001323300100137566030602a6ea8008894ccc05c004530103d87a8000132323253330173371e911056f7264657200375c60300062600e660366ea00052f5c026600a00a0046eb4c060008c06c008c064004c8cc004004c8cc004004024894ccc05c00452f5bded8c0264646464a66603066e3d22100002100313301c337606ea4008dd3000998030030019bab3019003375c602e0046036004603200244a66602c002298103d87a8000132323253330163371e0246eb8c05c00c4c018cc068dd3000a5eb804cc014014008dd5980b801180d001180c000a40006e95200022323300100100322533301600114a0264a66602866ebc010c054c064008528899801801800980c80098079baa00832533300e3370e90000008a99980898081baa00814985854ccc038c00800454ccc044c040dd50040a4c2c2a66601c66e1d200400115333011301037540102930b0b18071baa007370e90010b1bab3010301130110023756601e002601e601e601e601e60166ea8c038004c028dd50008a4c26cac6eb8004dd7000ab9a5573aaae7955cfaba05742ae89",
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
        "591230010000323232323232322322322253232323233300b3001300c375400a264a666018646464646464a6660246010006264a66602c60326600600a46464a66602c601c66600a6eacc06cc07000804922010673656c6c65720015333016300e30173754002266e3c010dd7180d980c1baa00114a02940c068c05cdd5180d000980b1baa3019301a30163754002294458c94ccc04cc0240044dd7180c180a9baa00615333013300a0011325333014300a30153754002264a66602a601a602c6ea80044dd7180d180b9baa001163019301637540022c6030602a6ea801858c04cdd50028a99980918048018a99980a980c1980100211919299980a98069998021bab301a301b0020134890874726561737572790015333015300d30163754002266e3c044dd7180d180b9baa00114a02940c064c058dd5180c800980a9baa301830193015375400229445852811119299980a9806980b1baa0011480004dd6980d180b9baa001325333015300d30163754002298103d87a8000132330010013756603660306ea8008894ccc068004530103d87a80001323232533301a3371e00e6eb8c06c00c4c04ccc078dd4000a5eb804cc014014008dd6980d801180f001180e000991980080080211299980c8008a6103d87a8000132323253330193371e00e6eb8c06800c4c048cc074dd3000a5eb804cc014014008dd5980d001180e801180d80091191980080080191299980b8008a5eb804c8c94ccc058c0140084cc068008cc0100100044cc010010004c06c008c064004c040dd50051bac301330103754602600460246026002601c6ea80185261365632533300c30020011533300f300e375400e2930b0a99980618020008a99980798071baa00714985854ccc030c00c00454ccc03cc038dd50038a4c2c2c60186ea80184cc8c88c894ccc040c8c8c94ccc04cc02cc050dd5000899191919299980b9807801099b8833300100301348810673656c6c6572004800054ccc05cc0340084c8c8c8c8cccccc8c8c8c8c8c8c8c8c8c8c8c8c8c8c888888c8c8c94ccc0c8c0a8c0ccdd500089919299981a1816181a9baa001132325333036302e30373754002264a666074607a6602601a464a666072606260746ea80044cdc79bae303e303b37540020062940c0f4c0e8dd5181e981d1baa303d303e303a375400226464646464646464a666084608a6464a666082646600200200444a66608c00229444c94ccc110c8c94ccc118c0f8ccc0c0dd5982580102124410673656c6c65720013375e66e9520043304a0074bd700008a50304a304b001304a3046375460920042660060060022940c124004400458cc0700508cdd7982318219baa30463043375400260146608a6ea402d2f5c0607066086603460826ea801ccc10cc058c104dd5003998219ba8337006eb4c110c114c114c104dd501d1bad304000433043375066e00dd6982218229822982298209baa03a375a608200897ae01533303f3375e603460826ea801cc07cc104dd501d0a99981f99baf30163041375400e604060826ea80e854ccc0fccdc41bad30443045304530453045304530453041375400e01a2a66607e66e2002cdd69822182298229822982298229822982298209baa007100114a029405280a5016533303e3370e004002266ebcdd3980b01526101800013375e6e9cc0580a8dd3998211ba733042375201066084980106456f726465720033042375066e040040092f5c097ae03016003301500333322232323232323253330443370e66e040040114ccc110c0f0c114dd50048a4000264646464a666090a66609066e20050dd698268020a5113371000402c290000a99982419b8800600913370666e08cdc0804803000a419002290001bad304c304d002375a60960026096002608c6ea8c124c118dd5004899bb0375066e04008014dd419b8100100416375a608a0046eb4c10c004ccc07801d2f7b630101000001010000223232325333046303d304737540022646464a666092607e60946ea800c4c8c8c8c8c8c8c8c8c8c8c8c94ccc160c16c0084c8c8c8c94ccc1654ccc1654ccc16401c528099982ca504a094454ccc164cdd780780e8a99982c99baf00d01c13375e6e98004dd300a8a5014a029404cdd81ba8337000240126ea0cdc00088028b199981b00400201100d981c804982580518250058b1bad30590013059002325333056305500115333053304b305400114a22a6660a6609260a800229405858dd5182b800982b8011bad305500130550023053001305300230510013051002304f001304b37540062c6eb4c128018dd69824002982598241baa00116304a304b002375660920026092608a6ea8008dd698210011bad304000133301b0054bded8c101000001010000223232325333043303a304437540022646464a66608c6078608e6ea800c4c8c8c8c8c8c8c8c8c8c8c8c94ccc154c1600084c8c8c8c94ccc158c130c15cdd5000899299982ba99982b99191980080081591299982e8008a50132533305b3371e6eb8c18000801052889980180180098300009bae305c305937540042a6660aea6660ae01029404ccc15d282504a22a6660ae66ebc04006c54ccc15ccdd780700d099baf374c0026e980585280a5014a029404cdd81ba8337000260146ea0cdc00090030b199981a00480281000c8b182d182b9baa00a3036009304800a304700b16375a60ac00260ac00464a6660a660a40022a6660a0609060a2002294454ccc140c118c1440045280b0b1baa30540013054002375a60a400260a400460a000260a0004609c002609c004609800260906ea800c58dd698238031bad30450053048304537540022c608e60900046eacc118004c118c108dd51822982318211baa002304030413041304130413041304130413041304130413041304130413041303d3754006602c607a6ea800cc058c0f4dd5001991980b80791919299981f181b1998141bab30433044002008489056f726465720013375e002600e660846ea40112f5c02940c108c0fcdd51821000981f1baa001375c603660786ea8008c8cc0580408c8c94ccc0f4c0d4ccc09cdd598211821801003a45056f726465720013375e002600c660826ea40112f5c02940c104c0f8dd51820800981e9baa30403041303d37540026eb8c068c0ecdd50009919299981e9820001099299981d9819181e1baa00113232002533303c3032303d3754002264646464646464646464646464646464646464646464646464646464646464646464a6660c260c8004264646464646493192999832182d000899192999834983600109924ca6660cc60b860ce6ea80044c8c8c8c8c8c94ccc1bcc1c800852616375a60e000260e00046eb4c1b8004c1b8008dd6983600098341baa0011616306a001306637540162a6660c860b80022a6660ce60cc6ea802c526161630643754014608a0226088024608402660a803060a60322c64a6660c260c00022a6660bc60ac60be002294454ccc178c150c17c0045280b0b1baa30620013062002375a60c000260c000460bc00260bc0046eb4c170004c170008dd6982d000982d0011bad30580013058002305600130560023054001305400230520013052002375a60a000260a00046eb4c138004c138008c130004c130008c128004c128008dd6982400098240011bad30460013046002375c608800260880046eb8c108004c0f8dd50008b1820181e9baa00116303f30403040303c3754607e608060786ea800458c0f8004cc0500348c8c94ccc0ecc0ccccc094dd59820182080101ca450874726561737572790013375e00260086607e6ea40dd2f5c02940c0fcc0f0dd5181f800981d9baa303e303f303b37540026e95200216375c607660706ea800458c0e8c0dcdd5181d181b9baa303a303b303737546464a666074607a00420022c60760026602201646464a66607060606660446eacc0f4c0f8c0e8dd5181e981f00101a2450673656c6c65720013375e00204a2940c0f0004c0e0dd50009bad3039303637540022c6070606a6ea800cdd6981b981a1baa00116303630333754606c004606a606c00260626ea80088c0bcc0c0c0c0c0c0c0c0c0c00048c8cc004004008894ccc0b800452f5c0264666444646600200200644a66606800220062646606c6e9ccc0d8dd48031981b1ba9375c60660026606c6ea0dd6981a000a5eb80cc00c00cc0e0008c0d8004dd718168009bab302e0013300300330320023030001300100122533302b0011480004cdc02400466004004605c00246056605860586058605800244646600200200644a666056002297ae013232533302a300500213302e00233004004001133004004001302f002302d00122232333001001004003222533302c00210011333003003302f00233004302e00200122223333005333300533330054bd6f7b630245004881003370090404df70119b824820225e92004375c600c60506ea8004dd7180398141baa001337000080060049101056f72646572004800888894ccc094c06c00440104c8c8cc004004018894ccc0ac0044cc0b0cdd81ba9006374c00697adef6c60132323232533302c3375e6602001400498103d8798000133030337606ea4028dd30038028a99981619b8f00a002132533302d3023302e375400226606266ec0dd4805981918179baa001004100432533302d533303000114a229405300103d87a80001302633031374c00297ae03233001001002225333031001133032337606ea402cdd400525eb7bdb1804c8c8c8c94ccc0c8cdd79980b00780126103d8798000133036337606ea403cdd40070028a99981919b8f00f002132533303330293034375400226606e66ec0dd4808181c181a9baa0010041004325333033302900114c103d87a80001302c33037375000297ae03370000201c26606c66ec0dd48011ba800133006006003375a60660066eb8c0c4008c0d4008c0cc0044cc0c0cdd81ba9002374c0026600c00c0066eacc0b400cdd7181580118178011816800991900119198008008011129998158008a4c264a666058002293099192999815981098161baa3300f375c605860600086eb8c0b00084cc014014cc0bc00800458c0c0008c0b8004c0b8004cc0a4cdd81ba9002375000297adef6c60230260012302530260012533301f301530203754002264646464a66604c60520042646493192999812980d800899192999815181680109924c64a666050603c00226464a66605a60600042649318078008b181700098151baa002153330283020001132323232323253330313034002149858dd6981900098190011bad30300013030002375a605c00260546ea800858c0a0dd50008b181580098139baa00315333025301d00115333028302737540062930b0b18129baa002300800316302700130270023025001302137540022c464a66603e602a00226464a666048604e0042930b1bad3025001302137540042a66603e602e0022a66604460426ea80085261616301f375400244a66603c66e400080045300103d87980001533301e3371e0040022980103d87a800014c103d87b8000232533301d30130011323253330223025002149858dd71811800980f9baa0021533301d30150011323253330223025002149858dd71811800980f9baa00216301d37540026eb0c080010dd618100019bac3020002302000137586040604200260406040604060406040002603e002603c00260326ea801852811119299980d1809180d9baa0011480004dd6980f980e1baa00132533301a3012301b3754002298103d87a80001323300100137566040603a6ea8008894ccc07c004530103d87a80001323232533301f3371e00e6eb8c08000c4c060cc08cdd4000a5eb804cc014014008dd6981000118118011810800991980080080211299980f0008a6103d87a80001323232533301e3371e00e6eb8c07c00c4c05ccc088dd3000a5eb804cc014014008dd5980f80118110011810000980b1baa0083233001001375660346036603660366036602e6ea8010894ccc06400452f5bded8c0264646464a66603466e3d22100002100313301e337606ea4008dd3000998030030019bab301b003375c6032004603a00460360026030602a6ea800458c05cc060008c058004c048dd50008a4c26cac64a66601e600a0022a66602460226ea8008526161533300f300700115333012301137540042930b0a99980798030008a99980918089baa00214985858c03cdd5000a999806180118069baa007132323232323232325333017301a00213232498c028018c02401c58dd6980c000980c0011bad30160013016002301400130140023012001300e375400e2c4a6660186004601a6ea80044c8c8c8c94ccc04cc05800852616375c602800260280046eb8c048004c038dd50008b180818069baa005370e90001b8748010dc3a40046e952000375c0026eb80055cd2ab9d5573caae7d5d02ba15745",
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
        "591230010000323232323232322322322253232323233300b3001300c375400a264a666018646464646464a6660246010006264a66602c60326600600a46464a66602c601c66600a6eacc06cc07000804922010673656c6c65720015333016300e30173754002266e3c010dd7180d980c1baa00114a02940c068c05cdd5180d000980b1baa3019301a30163754002294458c94ccc04cc0240044dd7180c180a9baa00615333013300a0011325333014300a30153754002264a66602a601a602c6ea80044dd7180d180b9baa001163019301637540022c6030602a6ea801858c04cdd50028a99980918048018a99980a980c1980100211919299980a98069998021bab301a301b0020134890874726561737572790015333015300d30163754002266e3c044dd7180d180b9baa00114a02940c064c058dd5180c800980a9baa301830193015375400229445852811119299980a9806980b1baa0011480004dd6980d180b9baa001325333015300d30163754002298103d87a8000132330010013756603660306ea8008894ccc068004530103d87a80001323232533301a3371e00e6eb8c06c00c4c04ccc078dd4000a5eb804cc014014008dd6980d801180f001180e000991980080080211299980c8008a6103d87a8000132323253330193371e00e6eb8c06800c4c048cc074dd3000a5eb804cc014014008dd5980d001180e801180d80091191980080080191299980b8008a5eb804c8c94ccc058c0140084cc068008cc0100100044cc010010004c06c008c064004c040dd50051bac301330103754602600460246026002601c6ea80185261365632533300c30020011533300f300e375400e2930b0a99980618020008a99980798071baa00714985854ccc030c00c00454ccc03cc038dd50038a4c2c2c60186ea80184cc8c88c894ccc040c8c8c94ccc04cc02cc050dd5000899191919299980b9807801099b8833300100301348810673656c6c6572004800054ccc05cc0340084c8c8c8c8cccccc8c8c8c8c8c8c8c8c8c8c8c8c8c8c888888c8c8c94ccc0c8c0a8c0ccdd500089919299981a1816181a9baa001132325333036302e30373754002264a666074607a6602601a464a666072606260746ea80044cdc79bae303e303b37540020062940c0f4c0e8dd5181e981d1baa303d303e303a375400226464646464646464a666084608a6464a666082646600200200444a66608c00229444c94ccc110c8c94ccc118c0f8ccc0c0dd5982580102124410673656c6c65720013375e66e9520043304a0074bd700008a50304a304b001304a3046375460920042660060060022940c124004400458cc0700508cdd7982318219baa30463043375400260146608a6ea402d2f5c0607066086603460826ea801ccc10cc058c104dd5003998219ba8337006eb4c110c114c114c104dd501d1bad304000433043375066e00dd6982218229822982298209baa03a375a608200897ae01533303f3375e603460826ea801cc07cc104dd501d0a99981f99baf30163041375400e604060826ea80e854ccc0fccdc41bad30443045304530453045304530453041375400e01a2a66607e66e2002cdd69822182298229822982298229822982298209baa007100114a029405280a5016533303e3370e004002266ebcdd3980b01526101800013375e6e9cc0580a8dd3998211ba733042375201066084980106456f726465720033042375066e040040092f5c097ae03016003301500333322232323232323253330443370e66e040040114ccc110c0f0c114dd50048a4000264646464a666090a66609066e20050dd698268020a5113371000402c290000a99982419b8800600913370666e08cdc0804803000a419002290001bad304c304d002375a60960026096002608c6ea8c124c118dd5004899bb0375066e04008014dd419b8100100416375a608a0046eb4c10c004ccc07801d2f7b630101000001010000223232325333046303d304737540022646464a666092607e60946ea800c4c8c8c8c8c8c8c8c8c8c8c8c94ccc160c16c0084c8c8c8c94ccc1654ccc1654ccc16401c528099982ca504a094454ccc164cdd780780e8a99982c99baf00d01c13375e6e98004dd300a8a5014a029404cdd81ba8337000240126ea0cdc00088028b199981b00400201100d981c804982580518250058b1bad30590013059002325333056305500115333053304b305400114a22a6660a6609260a800229405858dd5182b800982b8011bad305500130550023053001305300230510013051002304f001304b37540062c6eb4c128018dd69824002982598241baa00116304a304b002375660920026092608a6ea8008dd698210011bad304000133301b0054bded8c101000001010000223232325333043303a304437540022646464a66608c6078608e6ea800c4c8c8c8c8c8c8c8c8c8c8c8c94ccc154c1600084c8c8c8c94ccc158c130c15cdd5000899299982ba99982b99191980080081591299982e8008a50132533305b3371e6eb8c18000801052889980180180098300009bae305c305937540042a6660aea6660ae01029404ccc15d282504a22a6660ae66ebc04006c54ccc15ccdd780700d099baf374c0026e980585280a5014a029404cdd81ba8337000260146ea0cdc00090030b199981a00480281000c8b182d182b9baa00a3036009304800a304700b16375a60ac00260ac00464a6660a660a40022a6660a0609060a2002294454ccc140c118c1440045280b0b1baa30540013054002375a60a400260a400460a000260a0004609c002609c004609800260906ea800c58dd698238031bad30450053048304537540022c608e60900046eacc118004c118c108dd51822982318211baa002304030413041304130413041304130413041304130413041304130413041303d3754006602c607a6ea800cc058c0f4dd5001991980b80791919299981f181b1998141bab30433044002008489056f726465720013375e002600e660846ea40112f5c02940c108c0fcdd51821000981f1baa001375c603660786ea8008c8cc0580408c8c94ccc0f4c0d4ccc09cdd598211821801003a45056f726465720013375e002600c660826ea40112f5c02940c104c0f8dd51820800981e9baa30403041303d37540026eb8c068c0ecdd50009919299981e9820001099299981d9819181e1baa00113232002533303c3032303d3754002264646464646464646464646464646464646464646464646464646464646464646464a6660c260c8004264646464646493192999832182d000899192999834983600109924ca6660cc60b860ce6ea80044c8c8c8c8c8c94ccc1bcc1c800852616375a60e000260e00046eb4c1b8004c1b8008dd6983600098341baa0011616306a001306637540162a6660c860b80022a6660ce60cc6ea802c526161630643754014608a0226088024608402660a803060a60322c64a6660c260c00022a6660bc60ac60be002294454ccc178c150c17c0045280b0b1baa30620013062002375a60c000260c000460bc00260bc0046eb4c170004c170008dd6982d000982d0011bad30580013058002305600130560023054001305400230520013052002375a60a000260a00046eb4c138004c138008c130004c130008c128004c128008dd6982400098240011bad30460013046002375c608800260880046eb8c108004c0f8dd50008b1820181e9baa00116303f30403040303c3754607e608060786ea800458c0f8004cc0500348c8c94ccc0ecc0ccccc094dd59820182080101ca450874726561737572790013375e00260086607e6ea40dd2f5c02940c0fcc0f0dd5181f800981d9baa303e303f303b37540026e95200216375c607660706ea800458c0e8c0dcdd5181d181b9baa303a303b303737546464a666074607a00420022c60760026602201646464a66607060606660446eacc0f4c0f8c0e8dd5181e981f00101a2450673656c6c65720013375e00204a2940c0f0004c0e0dd50009bad3039303637540022c6070606a6ea800cdd6981b981a1baa00116303630333754606c004606a606c00260626ea80088c0bcc0c0c0c0c0c0c0c0c0c00048c8cc004004008894ccc0b800452f5c0264666444646600200200644a66606800220062646606c6e9ccc0d8dd48031981b1ba9375c60660026606c6ea0dd6981a000a5eb80cc00c00cc0e0008c0d8004dd718168009bab302e0013300300330320023030001300100122533302b0011480004cdc02400466004004605c00246056605860586058605800244646600200200644a666056002297ae013232533302a300500213302e00233004004001133004004001302f002302d00122232333001001004003222533302c00210011333003003302f00233004302e00200122223333005333300533330054bd6f7b630245004881003370090404df70119b824820225e92004375c600c60506ea8004dd7180398141baa001337000080060049101056f72646572004800888894ccc094c06c00440104c8c8cc004004018894ccc0ac0044cc0b0cdd81ba9006374c00697adef6c60132323232533302c3375e6602001400498103d8798000133030337606ea4028dd30038028a99981619b8f00a002132533302d3023302e375400226606266ec0dd4805981918179baa001004100432533302d533303000114a229405300103d87a80001302633031374c00297ae03233001001002225333031001133032337606ea402cdd400525eb7bdb1804c8c8c8c94ccc0c8cdd79980b00780126103d8798000133036337606ea403cdd40070028a99981919b8f00f002132533303330293034375400226606e66ec0dd4808181c181a9baa0010041004325333033302900114c103d87a80001302c33037375000297ae03370000201c26606c66ec0dd48011ba800133006006003375a60660066eb8c0c4008c0d4008c0cc0044cc0c0cdd81ba9002374c0026600c00c0066eacc0b400cdd7181580118178011816800991900119198008008011129998158008a4c264a666058002293099192999815981098161baa3300f375c605860600086eb8c0b00084cc014014cc0bc00800458c0c0008c0b8004c0b8004cc0a4cdd81ba9002375000297adef6c60230260012302530260012533301f301530203754002264646464a66604c60520042646493192999812980d800899192999815181680109924c64a666050603c00226464a66605a60600042649318078008b181700098151baa002153330283020001132323232323253330313034002149858dd6981900098190011bad30300013030002375a605c00260546ea800858c0a0dd50008b181580098139baa00315333025301d00115333028302737540062930b0b18129baa002300800316302700130270023025001302137540022c464a66603e602a00226464a666048604e0042930b1bad3025001302137540042a66603e602e0022a66604460426ea80085261616301f375400244a66603c66e400080045300103d87980001533301e3371e0040022980103d87a800014c103d87b8000232533301d30130011323253330223025002149858dd71811800980f9baa0021533301d30150011323253330223025002149858dd71811800980f9baa00216301d37540026eb0c080010dd618100019bac3020002302000137586040604200260406040604060406040002603e002603c00260326ea801852811119299980d1809180d9baa0011480004dd6980f980e1baa00132533301a3012301b3754002298103d87a80001323300100137566040603a6ea8008894ccc07c004530103d87a80001323232533301f3371e00e6eb8c08000c4c060cc08cdd4000a5eb804cc014014008dd6981000118118011810800991980080080211299980f0008a6103d87a80001323232533301e3371e00e6eb8c07c00c4c05ccc088dd3000a5eb804cc014014008dd5980f80118110011810000980b1baa0083233001001375660346036603660366036602e6ea8010894ccc06400452f5bded8c0264646464a66603466e3d22100002100313301e337606ea4008dd3000998030030019bab301b003375c6032004603a00460360026030602a6ea800458c05cc060008c058004c048dd50008a4c26cac64a66601e600a0022a66602460226ea8008526161533300f300700115333012301137540042930b0a99980798030008a99980918089baa00214985858c03cdd5000a999806180118069baa007132323232323232325333017301a00213232498c028018c02401c58dd6980c000980c0011bad30160013016002301400130140023012001300e375400e2c4a6660186004601a6ea80044c8c8c8c94ccc04cc05800852616375c602800260280046eb8c048004c038dd50008b180818069baa005370e90001b8748010dc3a40046e952000375c0026eb80055cd2ab9d5573caae7d5d02ba15745",
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
    isCancelled: boolean;
  };
  redeemer: {
    wrapper:
      | "InitTreasury"
      | "AddSeller"
      | "CollectSeller"
      | "CollectOrders"
      | "CreateAmmPool"
      | "RedeemOrders"
      | "CloseEvent"
      | "CancelLBE";
  };
}

export const TreasuryValidatorValidateTreasurySpending = Object.assign(
  function (authenPolicyId: string) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "592968010000323232323232322322253232323232323232323233300f300230103754016264a666020646464646464a66602c601c602e6ea804c54ccc058c03cc05cdd5002899299980b9805180c1baa0011325333018300a30193754002266600600a02c6eb8c074c068dd50008b180e180c9baa00116301b3018375400a2c2a66602c6012602e6ea80144c8c94ccc060c02c0044cdd79ba6004374c646464a666036601c60386ea930103d8798000133330013333001333002019488107666163746f727900480080652201087472656173757279004800801522010673656c6c657200480a04cccc004ccc008065220107666163746f727900480040652201087472656173757279004800488894ccc078c04400440104c8c8cc004004018894ccc0900044cc094cdd81ba9006374c00697adef6c60132323232533302530203300d00a002133029337606ea4028dd30038028a99981299b8f00a002132533302630193027375400226605466ec0dd4805981598141baa0010041004325333026533302900114a229405300103d87a8000130203302a374c00297ae0323300100100222533302a00113302b337606ea402cdd400525eb7bdb1804c8c8c8c94ccc0acc098cc04c03c0084cc0bccdd81ba900f375001c00a2a66605666e3c03c0084c94ccc0b0c07cc0b4dd500089981819bb037520206062605c6ea80040104010c94ccc0b0c07c0045300103d87a80001302633030375000297ae03370000201c26605e66ec0dd48011ba800133006006003375a60580066eb8c0a8008c0b8008c0b00044cc0a4cdd81ba9002374c0026600c00c0066eacc09800cdd7181200118140011813000991900119198008008011129998120008a4c264a66604a002293099192999812180b98129baa3300c375c604a60520086eb8c0940084cc014014cc0a000800458c0a4008c09c004c09c004cc088cdd81ba9002375000297adef6c60222533301c300f00114bd6f7b6300991919800800a5eb7bdb180894ccc0880044cc08ccdd81ba9006374c00697adef6c601323232325333023301e3300b00a002133027337606ea4028dd30038028a99981199b8f00a002133027337606ea4028dd300380189981399bb037520046e98004cc01801800cdd598120019bae30220023026002302400132330010014bd6f7b63011299981080089981119bb037520086ea000d2f5bded8c0264646464a666044603a6601401000426604c66ec0dd48041ba8007005153330223371e01000426604c66ec0dd48041ba8007003133026337606ea4008dd4000998030030019bad3023003375c6042004604a004604600244a66603466e40008004530103d87980001533301a3371e0040022980103d87a800014c103d87b800015333018300a0011333003005016002153330183011001133300300501600214a060306ea8050dd7180d980c1baa00516222533301b301e323300100100422533301d00114bd7009919299980e1919299980f180819299980f980898101baa0011480004dd6981218109baa00132533301f301130203754002298103d87a8000132330010013756604a60446ea8008894ccc090004530103d87a8000132323253330243371e91108747265617375727900375c604a0062603c660506ea00052f5c026600a00a0046eb4c094008c0a0008c098004c8cc004004dd5981218128019129998118008a6103d87a8000132323253330233371e01a6eb8c09000c4c074cc09cdd3000a5eb804cc014014008dd59812001181380118128008a99980f1808180f9baa00113371e00e6eb8c08cc080dd50008a5014a06044603e6ea8c088004c078dd518109811180f1baa002133020002330040040011330040040013021002301f00114a22c64660020026eacc068c06cc06cc06cc06c00c894ccc06400452f5bded8c0264646464a66603466e3d22100002100313301e337606ea4008dd3000998030030019bab301b003375c6032004603a00460360026eb0c060004c050dd5180b801180b180b80098091baa00c14984d958c94ccc040c00c00454ccc04cc048dd50068a4c2c2a66602060040022a66602660246ea803452616153330103009001153330133012375401a2930b0a99980818040008a99980998091baa00d14985854ccc040c01c00454ccc04cc048dd50068a4c2c2a666020600c0022a66602660246ea803452616153330103005001153330133012375401a2930b0a99980818020008a99980998091baa00d14985858c040dd5006099919191919191191299980c191919299980d9806980e1baa001132323232323232323232323232325333029301b302a3754002264a66605a60606600a01c464a666058603c605a6ea80044cdc79bae3031302e37540020062940c0c0c0b4dd5181818169baa30303031302d375400226464646464a66605e604260606ea80044c8c94ccc0c4c08cc0c8dd5000899191919191919192991919981d981680489919191919299982199980681200b8018991919191919191919192999825182198259baa00113232533304c3371003600e2a666098a66609800c29404ccc131282504a22a66609866ebcdd30109ba63330140234890673656c6c65720000b1533304c3375e6e98c030094dd31806002099baf0023232304833052305300233052305300133052375066e0002c034c150c150004c14c004c138dd50248a5014a02940528181c000982798261baa00116304e304f0023756609a002609a60926ea8030c034c11cdd518259826182618261826182618261826182618260011bad304a001304a304a304a304a304a002375a60900026090609060886ea80fcc02c0088cc05c0052201001632325333041323300100100222533304600114a2264a6660886464a66608c60706660446eacc12c0080752210673656c6c65720013375e66e9520043304a0074bd700008a50304a304b001304a3046375460920042660060060022940c124004400458cc06c0808cdd7982318219baa304630433754002600e6608a6ea40112f5c06072660866088002660866088608a002660869801010000330434c10100004bd7018221822182218220011bae3042001303e375407266600e0360720242a666076606801226644646464646464646464646464646464a666098608a609a6ea80044c8c8c8c8c8c94ccc154c16000854ccc1494ccc148cdc40068118a511533305200814a226660a494528251153330523375e6e9809cdd319980d014a450673656c6c65720033704900080a899baf00632323232323232323232323232305933063306400d33063306400c33063375066e04080088cc18cc19002ccc18cc190028cc18cc190024cc18cc190020cc18cc19001ccc18cc190018cc18cc190014cc18cc190010cc18cc19000ccc18cdd419b8001801033063306400233063306400133063375066e00058038c194c194004c190004c18cc18c004c188004c184004c180004c17c004c178004c174004c170004c16c004c168c168004c164004c150dd50278a5014a02c6eb4c158004c158008dd6982a00099199800800809a5eb84101000081010000111299982a00108008999801801982b80119191919299982c182d801099299982b1827982b9baa00113232323232323232533305e533305e3375e60c600c03a266ebc01006c5280998311ba833700018004660c46ea0cdc0005000a5eb8058dd6983118318011bad30610013061002305f001305f001305a3754004a6660ae609460b06ea80044c8c8c8c8c8c8c8c94ccc188c1940084c8c9263050006304f00716375a60c600260c60046eb4c184004c184008c17c004c17c008c174004c164dd50008b182d982c1baa00116305a305b305b3057375460b460b660ae6ea801058dd6982c800982c8019bad30570023056002303a0013051304e37540022c60a060a260a2609a6ea8040c044c12cdd5182798280011bad304e001304e304e304e002375a6098002609860986098609860980046eb4c128004c128c128008c120004c120008c118004c118c118008dd698220009822182218201baa03b300700133300701b03901233300801f012375c6080607a6ea80e04c8c8c8c94c8ccc100c0e00384c8c8c8cc88c8c8c8c8c8c8c8c8c8c8c8c94ccc144c128c148dd50008991919191919299982b99baf32323230543305e305f0033305e305f0023305e305f0013305e375066e0004801cc180c180004c17c004c178004c164dd502a0030a99982b99baf374c0106e98cccc0680c000800401054ccc15cc12804454ccc15cc060dd3980d8160a99982b8050a5013330574a0941288a5014a029405281bae305b305c002375c60b400260ac6ea8020c8ccc004004044040888c8c94ccc160c144c164dd5000899191919299982e180e9ba70061533305c301d374e00420022c266e00ccc024024018008004c8c8c8c8c8c8c8c8c8c8c8c94ccc19cc180c1a0dd5000899192999834a99983499baf374c0086e98cccc0b12f5bded8c091010048810033700904044bd2410137dc042a6660d266ebc03407c54ccc1a4cdd780580e8a999834a9998348038a5013330694a094128899baf3232323230673307130720043307130720033307130720023307130720013307133306d4a2980103d87a80004c0103d879800030733073001307200130710013070001306b375402200429405280a5014a0266e0002401858c0a8004c1b0c1a4dd50008b183598360011bab306a001306a3066375460d201e6eb4c1a0c1a4008c0a4c18cdd5183380098338011bad306500130653065002306300130630023061001305d375400660c000a603600260ba60b46ea800458c170c174c174c164dd5182e182e982c9baa305c003305c002303f0013056305337540022c60aa60ac0046eacc150004c150c140dd519980d017026012980a18271baa30523053305330533053305330533053305330533053305300230510013051002304f001304f002375a609a002609a0046eb4c12c004c12cc12cc11cdd50211998040138010009980f011919192999823181c1998111bab304b304c0020054881056f726465720013375e0026018660946ea40112f5c02940c128c11cdd5182500098231baa001375c608e60900046eb8c118004c108dd501e8a999820181a8070a999821982318231980d8121181999980e9bab3046304730433754608c608e60866ea80040fd22107666163746f72790014a22c26464646464a66608a607802626464a66608e608060906ea80044c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc174c13cc178dd5000899299982f299982f19b8800c375a60c660c06ea800854ccc178cdc38090008a99982f182880a0a99982f1828982f9baa00a1337126eb4c18cc180dd50050008a5114a0294052809919191919191919191919191919191919191919192999839a999839983299982782424411c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70004881034d535000153330733375e0280102a6660e666ebc04c01854ccc1cccdc3808801099b8701000114a029405280a5013232323253330773070307837540022646464a6660f466e1ccdc0005a4026004266ebc00cc8c8c8c8c8c8c8c8c8c8c8c8c8c20404cc22c04c23004034cc22c04c23004030cc22c04c2300402ccc22c04c23004028cc22c04c23004024cc22c04c23004020cc22c04c2300401ccc22c04c23004018cc22c04c23004014cc22c04c23004010cc22c04c2300400ccc22c04c23004008cc22c04c23004004cc22c04dd4007984680984680800984600800984580800984500800984480800984400800984380800984300800984280800984200800984180800984100800984080800983e1baa07714a060cc0046660a800691011c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a7000005307c307937540022c60f660f80046eacc1e8004c1e8c1d8dd501799998178070068058050b1bad30773078002375a60ec00260ec0046eb4c1d0004c1d0008c1c8004c1c8008c1c0004c1b0dd50119bae306e306f002375c60da00260d26ea801cdd7183598360011bae306a0013066375400a6eb4c194008dd69831800a99983099baf0020131337606ea0024dd4002099bb037500086ea0024c188008c180004cc074040038594c8ccc178c144c17cdd5004099299982f99b8800100210011002375a60c660c06ea80204004cdc00018010b1830982f1baa3061305e37540726eb4c180c184c184c184008dd6982f800982f8011bad305d001305d002305b001305b002305900130593059002375a60ae00260ae60ae00460aa00260aa00460a600260a60046eb4c144004c144008dd698278009827982798259baa0465333048303b30493754002264646464646464646464646464646464a6660b660bc004264646493180d001982480718240078b182e000982e0011bad305a001305a002375a60b000260b00046eb4c158004c158008dd6982a000982a0011bad3052001305200230500013050002304e001304a37540022c609860926ea800458c12cc130c130c120dd519192999825982700108008b18260009981081311919192999825181e18259baa0011533304a3371e6eb8c13cc130dd5000a451c295cd9f0691f9a09c13e38b475142042edbd78680af336a5c3e4afcb001303c33302600248811c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70004881034d53500014a02940c138c12cdd518270011bab304d304e0013049375400266602204a0860382a66608a6076026264646464a64666094666094607a6eb4c13cc140c140c140c140c140c140c140c140c140c140c140c140011282511323232323232323232323232323232323232533305c3055305d3754002264646464646464646464a6660cc66ebc028c8c8c8c18ccc1b4c1b800ccc1b4c1b8008cc1b4c1b8004cc1b4dd419b8101c375a60dc00e60de60de00260dc00260da00260d06ea818c54ccc198cdd79ba600c374c6666052666605207e91011c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a7000008301d002006005301d00113375e6e9cc0a80ecdd3998351ba73306a3752036660d498106456f72646572003306a3750603a606003e97ae04bd700a5014a06eb4c1a8c1ac008dd698348009834800991919980080080e82211119192999834183098349baa0011323232323232323253330703031374e0142660e86ea0010cc1d0dd40011983a1ba80014bd70099191983b1ba8337006eb4c1dc008018cc1d8dd419b80375a60ee002008660ec6ea0cdc01bad307730780010034bd70183b8009998068068050031bad30743075002375a60e600260e60046eb4c1c4004c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc1e94ccc1e8cdd7815983f8078a99983d19baf02900d1533307a3375e004016266ebcdd30021ba600114a0294052809983f1ba833700012010660fc6ea001ccc1f8dd400325eb8058dd5983f183f801183e800983c9baa307c0123333039333303933330394bd6f7b63024500488100482026fb808dd7183d8009bae307b307c0010024891c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70000180033077375404866e0ccdc100900180f99b833370403800403c6eb4c1dcc1e0c1e0008dd6983b000983b001183a000983a0011839000983900098369baa0033070005302b001306d306a37540022c60d860da60da60d26ea8c1b0c1b4c1a4dd5183600198360012999831182a98319baa00f13253330633371000266e0003802c4cdc099b8000e00b001148000dd6983398321baa00f148000dd7183318338011bae30650013061375401c646464666603a6eb8c198008dd7183318338011bae3066001375c60cc60ce00260c46ea8c188008c184dd518300009980e80780698250009830982f1baa0011630603061002375660be00260be60b66ea8044dd6982e982f182f0011bad305c001305c002375a60b400260b460b400460b000260b060b060b060b060b000460ac00260ac00460a800260a80046eb4c148004c148c148c148008dd7182800098261baa047132323232323232323232323232323232533305a3053305b3754002264646464646464646464a6660c8a6660c801c29444ccc19128a504a22a6660c866ebc028c8c8c8c8c8c8c8c8c8c8c8c8c8c1accc1d4c1d8034cc1d4c1d8030cc1d4c1d802ccc1d4dd419b8102401133075307600a33075307600933075307600833075307600733075307600633075307600533075307600433075307600333075375066e0407803ccc1d4c1d8008cc1d4c1d8004cc1d4dd419b8101c00e3077307700130760013075307500130740013073001307200130710013070001306f001306e001306d306d001306c001306b001306637540c22a6660c866ebcdd30061ba6333302703d007006301b00413375e6e9cc0a00e4dd3998341ba7330683752032660d098106456f72646572003306837506036605c03a97ae04bd700a5014a02940dd6983418348011bad30670013067002375a60ca002646660020020320804446464a6660c860ba60ca6ea80044c8c8c8c8c8c8c8c94ccc1b0c0b4dd38050998381ba8004330703750004660e06ea00052f5c026464660e46ea0cdc01bad307300200633072375066e00dd69839800802198391ba8337006eb4c1ccc1d000400d2f5c060e600266601a01a01400c6eb4c1c0c1c4008dd6983780098378011bad306d001323232323232323232323232323232533307653330763375e04e60f601e2a6660ec66ebc09403454ccc1d8cdd7801005899baf374c0086e980045280a5014a02660f46ea14ccc1d801c4cdc00048030a4000660f46ea0024cc1e8dd400325eb8058dd5983d183d801183c800983a9baa3078012333303533330354bd6f7b6302450048810053330720031482026fb8084cdc02410137dc04904044bd1bae3077001375c60ee60f000266e00014008c1ccdd50101bad3075307600230363070375460e800260e80046eb4c1c8004c1c8008c1c0004c1c0008c1b8004c1b8004c1a4dd500198360029813800983498331baa001163068306930693065375460d060d260ca6ea8c1a000cc1a0008dd7183198320011bae3062001305e3754016609000260be60b86ea800458c178c17c008dd5982e800982e982c9baa00f301d3057375460b660b80046eb4c168004c168c168c168008dd6982c000982c182c182c182c182c182c182c001182b000982b001182a000982a0011bad3052001305230523052002375c60a000260986ea811cdc0a400066602805008c03e6660180566eb8c130008dd71826000982600098239baa042153330453039013132323232323232323232323232323232323253330573050305837540022646464a6660b466e1c048cdc00050040a99982d182680a0a99982d299982d19b8801200114a226464a6660be60c4004264a6660ba60ac60bc6ea80044c94ccc178c144c17cdd50008991919191919191919191919191919192999838983a001099191919baf374c660ea6606004e04a97adef6c60374c660ea66ec00480412f5bded8c0606000660be01c60bc01e2c60e400260e40046eb4c1c0004c1c0008dd6983700098370011bad306c001306c002375a60d400260d40046eb4c1a0004c1a0008c198004c198008c190004c180dd50008b1831182f9baa00116306130623062305e375460c260c460bc6ea800458c180004cc0d40f08c8c8c94ccc178c140c17cdd50008a99982f19b8f375c60c660c06ea800522011c295cd9f0691f9a09c13e38b475142042edbd78680af336a5c3e4afcb001305033303a00248811c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70004881034d53500014a02940c188c17cdd518310011bab30613062001305d375460c060c260ba6ea800454ccc1694ccc16801c528099982d2504a094454ccc168cdd78019919191919191919191919191919191831998369837007998369837007198369837006998369837006198369837005998369837005198369837004998369837004198369837003998369837003198369837002998369837002198369837001998369837001198369837000998369837183780099836999834a514c0103d87a80004c0103d87980004bd7018370009836800983600098358009835000983480098340009833800983300098328009832000983180098310009830800982e1baa05713375e6e980ccdd30028a5014a029405280a505333059304b305a37540162900109bad305e305b3754016608a00260b860b26ea800458c16cc170008dd5982d000982d182b1baa33302003405202b301a3054375460b060b20046eb4c15c004c15cc15cc15c008dd6982a800982a982a982a8011829800982998299829982980118288009828801182780098278011bad304d001304d002375a609600260966096608e6ea810852811111803198029803198028020019803198028010009119b8a0020012372600244646464646464a66609266e3c01400854ccc124cdc8002000899bb000800713376000e0102a66609266e400140084cdd8004003899bb0007008375c609a609c0046eb8c130004c120dd50021bae304a304b002375c6092002608a6ea80088c94ccc108c0d40044c8c94ccc11cc1280084c92632375a608e0046eb4c11400458c94ccc11cc128c1280044cdd81824800982498250008b1bac3048001304437540042a66608460680022a66608a60886ea80085261616304237540026ebd3010180002533303f3032304037540022646464646464646464646464a66609c60a2004264646493181e004981e005181d8058b1bad304f001304f00232533304c304b00115333049303b304a00114a22a6660926078609400229405858dd5182680098268011bad304b001304b00230490013049002304700130470023045001304137540022c4444a66608260680022008264646600200200c44a66608e00226609066ec0dd48031ba60034bd6f7b630099191919299982418219980880500109982619bb037520146e9801c01454ccc120cdc78050010992999824981e18251baa00113304d337606ea402cc138c12cdd50008020802192999824a9998260008a5114a02980103d87a8000130433304d374c00297ae0323300100100222533304d00113304e337606ea402cdd400525eb7bdb1804c8c8c8c94ccc138c124cc05c03c0084cc148cdd81ba900f375001c00a2a66609c66e3c03c0084c94ccc13cc108c140dd500089982999bb0375202060a860a26ea80040104010c94ccc13cc1080045300103d87a80001304933053375000297ae03370000201c2660a466ec0dd48011ba800133006006003375a609e0066eb8c134008c144008c13c0044cc130cdd81ba9002374c0026600c00c0066eacc12400cdd7182380118258011824800991900119198008008011129998238008a4c264a666090002293099192999823981d18241baa33010375c609060980086eb8c1200084cc014014cc12c00800458c130008c128004c128004cc114cdd81ba9002375000297adef6c602323300100100222533304200114bd7009919991119198008008019129998240008801899198251ba73304a375200c660946ea4dd71823800998251ba8375a609000297ae033003003304c002304a001375c60820026eacc108004cc00c00cc118008c110004888cc06400c8c8c94ccc104c0ccccc074dd598231823801002a45056f726465720013375e002600e6608a6ea40112f5c02940c114c108dd5182280098209baa30443045304137540026e95200237109000111299981d98170008a5eb7bdb1804c8c8cc0040052f5bded8c044a66608200226608466ec0dd48031ba60034bd6f7b6300991919192999821181e9980580500109982319bb037520146e9801c01454ccc108cdc780500109982319bb037520146e9801c00c4cc118cdd81ba9002374c0026600c00c0066eacc10c00cdd71820801182280118218009919800800a5eb7bdb180894ccc1000044cc104cdd81ba9004375000697adef6c601323232325333041303c3300a008002133045337606ea4020dd40038028a99982099b8f008002133045337606ea4020dd400380189982299bb037520046ea0004cc01801800cdd698210019bae30400023044002304200122533303933720004002298103d8798000153330393371e0040022980103d87a800014c103d87b8000300100122533303a0011480004cdc02400466004004607a0024446464a666078607e00420022c607a0026602400646464a666074605866602c6eacc0fcc1000080152201087472656173757279001533303a302c303b3754002266e3cdd7181f981e1baa00100414a02940c0f8c0ecdd5181f000981d1baa00122233011003232325333039302b3330153756607c607e00400a91010673656c6c65720015333039302b303a3754002266e3c010dd7181f181d9baa00114a02940c0f4c0e8dd5181e800981c9baa303c303d3039375400260666ea8074dd6981b18199baa001163035303237540066eb4c0d0c0c4dd50008b181998181baa303300230323033001302e37540126600201291010022323300100100322533303100114bd6f7b630099191919299981919b8f0070021003133036337606ea4008dd3000998030030019bab3033003375c6062004606a00460660022c6eb8c0b8c0acdd50008b181698151baa302d00237566058605a00260506ea8c0acc0b0c0a0dd51919192999816181780108008b181680099801005919192999815180e1998031bab302f3030302c3754605e606000405091010874726561737572790013375e0020082940c0b8004c0a8dd5000981598141baa00c22323300100100322533302c00114bd7009919299981598028010998178011980200200089980200200098180011817000911192999814180d18149baa0011480004dd6981698151baa001325333028301a30293754002298103d87a8000132330010013756605c60566ea8008894ccc0b4004530103d87a80001323232533302d3371e00e6eb8c0b800c4c09ccc0c4dd4000a5eb804cc014014008dd698170011818801181780099198008008021129998160008a6103d87a80001323232533302c3371e00e6eb8c0b400c4c098cc0c0dd3000a5eb804cc014014008dd598168011818001181700098141814981498148011bab3027001302730270023758604a002604a0046eb0c08c004c08c008dd61810800980e9baa00216301f3020002301e001301a375400229309b2b19299980b98050008a99980d180c9baa00214985854ccc05cc02400454ccc068c064dd50010a4c2c2a66602e60200022a66603460326ea80085261615333017300f0011533301a301937540042930b0a99980b98070008a99980d180c9baa00214985854ccc05cc03400454ccc068c064dd50010a4c2c2a66602e60180022a66603460326ea80085261615333017300b0011533301a301937540042930b0b180b9baa001300101125333014300730153754002264646464646464646464646464646464646464646464646464646464646464646464a666072607800426464646464649319299981e1817800899192999820982200109924ca66607c6062607e6ea80044c8c8c8c8c8c94ccc11cc12800852616375a609000260900046eb4c118004c118008dd6982200098201baa00116163042001303e37540162a666078605c0022a66607e607c6ea802c5261616303c37540146050022604e024604e026604e030604c0322c64a66607260700022a66606c6050606e002294454ccc0d8c0a4c0dc0045280b0b1baa303a001303a002375a60700026070004606c002606c0046eb4c0d0004c0d0008dd6981900098190011bad30300013030002302e001302e002302c001302c002302a001302a002375a605000260500046eb4c098004c098008c090004c090008c088004c088008dd6981000098100011bad301e001301e002375c603800260380046eb8c068004c058dd50008b119299980a180380089919299980c980e0010a4c2c6eb4c068004c058dd50010a99980a18030008a99980b980b1baa00214985858c050dd500092999809180298099baa0011323232325333019301c00213232498c94ccc060c02c0044c8c94ccc074c0800084c92632533301b300e0011323253330203023002132498c03800458c084004c074dd50010a99980d98068008991919191919299981218138010a4c2c6eb4c094004c094008dd6981180098118011bad3021001301d37540042c60366ea800458c078004c068dd50018a99980c18050008a99980d980d1baa00314985858c060dd500118038018b180d000980d001180c000980a1baa0011625333011300430123754002264646464a66603060360042930b1bae30190013019002375c602e00260266ea8004588c94ccc044c0100044c8c94ccc058c06400852616375c602e00260266ea800854ccc044c00c0044c8c94ccc058c06400852616375c602e00260266ea800858c044dd5000980a18089baa00b370e90011b8748000dc3a401c6e1d200c370e90051b8748020dc3a400c6e1d2004374a90001baf4c103d8798000375c002ae6955ceaab9e5573eae815d0aba201",
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
            {
              title: "isCancelled",
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
                  fields: [],
                },
                {
                  title: "CollectSeller",
                  dataType: "constructor",
                  index: 2,
                  fields: [],
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
                  title: "RedeemOrders",
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
                {
                  title: "CancelLBE",
                  dataType: "constructor",
                  index: 7,
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
    | "AddSeller"
    | "CollectSeller"
    | "CollectOrders"
    | "CreateAmmPool"
    | "RedeemOrders"
    | "CloseEvent"
    | "CancelLBE";
}

export const TreasuryValidatorValidateTreasuryMintingOrWithdrawal =
  Object.assign(
    function (authenPolicyId: string) {
      return {
        type: "PlutusV2",
        script: applyParamsToScript(
          "592968010000323232323232322322253232323232323232323233300f300230103754016264a666020646464646464a66602c601c602e6ea804c54ccc058c03cc05cdd5002899299980b9805180c1baa0011325333018300a30193754002266600600a02c6eb8c074c068dd50008b180e180c9baa00116301b3018375400a2c2a66602c6012602e6ea80144c8c94ccc060c02c0044cdd79ba6004374c646464a666036601c60386ea930103d8798000133330013333001333002019488107666163746f727900480080652201087472656173757279004800801522010673656c6c657200480a04cccc004ccc008065220107666163746f727900480040652201087472656173757279004800488894ccc078c04400440104c8c8cc004004018894ccc0900044cc094cdd81ba9006374c00697adef6c60132323232533302530203300d00a002133029337606ea4028dd30038028a99981299b8f00a002132533302630193027375400226605466ec0dd4805981598141baa0010041004325333026533302900114a229405300103d87a8000130203302a374c00297ae0323300100100222533302a00113302b337606ea402cdd400525eb7bdb1804c8c8c8c94ccc0acc098cc04c03c0084cc0bccdd81ba900f375001c00a2a66605666e3c03c0084c94ccc0b0c07cc0b4dd500089981819bb037520206062605c6ea80040104010c94ccc0b0c07c0045300103d87a80001302633030375000297ae03370000201c26605e66ec0dd48011ba800133006006003375a60580066eb8c0a8008c0b8008c0b00044cc0a4cdd81ba9002374c0026600c00c0066eacc09800cdd7181200118140011813000991900119198008008011129998120008a4c264a66604a002293099192999812180b98129baa3300c375c604a60520086eb8c0940084cc014014cc0a000800458c0a4008c09c004c09c004cc088cdd81ba9002375000297adef6c60222533301c300f00114bd6f7b6300991919800800a5eb7bdb180894ccc0880044cc08ccdd81ba9006374c00697adef6c601323232325333023301e3300b00a002133027337606ea4028dd30038028a99981199b8f00a002133027337606ea4028dd300380189981399bb037520046e98004cc01801800cdd598120019bae30220023026002302400132330010014bd6f7b63011299981080089981119bb037520086ea000d2f5bded8c0264646464a666044603a6601401000426604c66ec0dd48041ba8007005153330223371e01000426604c66ec0dd48041ba8007003133026337606ea4008dd4000998030030019bad3023003375c6042004604a004604600244a66603466e40008004530103d87980001533301a3371e0040022980103d87a800014c103d87b800015333018300a0011333003005016002153330183011001133300300501600214a060306ea8050dd7180d980c1baa00516222533301b301e323300100100422533301d00114bd7009919299980e1919299980f180819299980f980898101baa0011480004dd6981218109baa00132533301f301130203754002298103d87a8000132330010013756604a60446ea8008894ccc090004530103d87a8000132323253330243371e91108747265617375727900375c604a0062603c660506ea00052f5c026600a00a0046eb4c094008c0a0008c098004c8cc004004dd5981218128019129998118008a6103d87a8000132323253330233371e01a6eb8c09000c4c074cc09cdd3000a5eb804cc014014008dd59812001181380118128008a99980f1808180f9baa00113371e00e6eb8c08cc080dd50008a5014a06044603e6ea8c088004c078dd518109811180f1baa002133020002330040040011330040040013021002301f00114a22c64660020026eacc068c06cc06cc06cc06c00c894ccc06400452f5bded8c0264646464a66603466e3d22100002100313301e337606ea4008dd3000998030030019bab301b003375c6032004603a00460360026eb0c060004c050dd5180b801180b180b80098091baa00c14984d958c94ccc040c00c00454ccc04cc048dd50068a4c2c2a66602060040022a66602660246ea803452616153330103009001153330133012375401a2930b0a99980818040008a99980998091baa00d14985854ccc040c01c00454ccc04cc048dd50068a4c2c2a666020600c0022a66602660246ea803452616153330103005001153330133012375401a2930b0a99980818020008a99980998091baa00d14985858c040dd5006099919191919191191299980c191919299980d9806980e1baa001132323232323232323232323232325333029301b302a3754002264a66605a60606600a01c464a666058603c605a6ea80044cdc79bae3031302e37540020062940c0c0c0b4dd5181818169baa30303031302d375400226464646464a66605e604260606ea80044c8c94ccc0c4c08cc0c8dd5000899191919191919192991919981d981680489919191919299982199980681200b8018991919191919191919192999825182198259baa00113232533304c3371003600e2a666098a66609800c29404ccc131282504a22a66609866ebcdd30109ba63330140234890673656c6c65720000b1533304c3375e6e98c030094dd31806002099baf0023232304833052305300233052305300133052375066e0002c034c150c150004c14c004c138dd50248a5014a02940528181c000982798261baa00116304e304f0023756609a002609a60926ea8030c034c11cdd518259826182618261826182618261826182618260011bad304a001304a304a304a304a304a002375a60900026090609060886ea80fcc02c0088cc05c0052201001632325333041323300100100222533304600114a2264a6660886464a66608c60706660446eacc12c0080752210673656c6c65720013375e66e9520043304a0074bd700008a50304a304b001304a3046375460920042660060060022940c124004400458cc06c0808cdd7982318219baa304630433754002600e6608a6ea40112f5c06072660866088002660866088608a002660869801010000330434c10100004bd7018221822182218220011bae3042001303e375407266600e0360720242a666076606801226644646464646464646464646464646464a666098608a609a6ea80044c8c8c8c8c8c94ccc154c16000854ccc1494ccc148cdc40068118a511533305200814a226660a494528251153330523375e6e9809cdd319980d014a450673656c6c65720033704900080a899baf00632323232323232323232323232305933063306400d33063306400c33063375066e04080088cc18cc19002ccc18cc190028cc18cc190024cc18cc190020cc18cc19001ccc18cc190018cc18cc190014cc18cc190010cc18cc19000ccc18cdd419b8001801033063306400233063306400133063375066e00058038c194c194004c190004c18cc18c004c188004c184004c180004c17c004c178004c174004c170004c16c004c168c168004c164004c150dd50278a5014a02c6eb4c158004c158008dd6982a00099199800800809a5eb84101000081010000111299982a00108008999801801982b80119191919299982c182d801099299982b1827982b9baa00113232323232323232533305e533305e3375e60c600c03a266ebc01006c5280998311ba833700018004660c46ea0cdc0005000a5eb8058dd6983118318011bad30610013061002305f001305f001305a3754004a6660ae609460b06ea80044c8c8c8c8c8c8c8c94ccc188c1940084c8c9263050006304f00716375a60c600260c60046eb4c184004c184008c17c004c17c008c174004c164dd50008b182d982c1baa00116305a305b305b3057375460b460b660ae6ea801058dd6982c800982c8019bad30570023056002303a0013051304e37540022c60a060a260a2609a6ea8040c044c12cdd5182798280011bad304e001304e304e304e002375a6098002609860986098609860980046eb4c128004c128c128008c120004c120008c118004c118c118008dd698220009822182218201baa03b300700133300701b03901233300801f012375c6080607a6ea80e04c8c8c8c94c8ccc100c0e00384c8c8c8cc88c8c8c8c8c8c8c8c8c8c8c8c94ccc144c128c148dd50008991919191919299982b99baf32323230543305e305f0033305e305f0023305e305f0013305e375066e0004801cc180c180004c17c004c178004c164dd502a0030a99982b99baf374c0106e98cccc0680c000800401054ccc15cc12804454ccc15cc060dd3980d8160a99982b8050a5013330574a0941288a5014a029405281bae305b305c002375c60b400260ac6ea8020c8ccc004004044040888c8c94ccc160c144c164dd5000899191919299982e180e9ba70061533305c301d374e00420022c266e00ccc024024018008004c8c8c8c8c8c8c8c8c8c8c8c94ccc19cc180c1a0dd5000899192999834a99983499baf374c0086e98cccc0b12f5bded8c091010048810033700904044bd2410137dc042a6660d266ebc03407c54ccc1a4cdd780580e8a999834a9998348038a5013330694a094128899baf3232323230673307130720043307130720033307130720023307130720013307133306d4a2980103d87a80004c0103d879800030733073001307200130710013070001306b375402200429405280a5014a0266e0002401858c0a8004c1b0c1a4dd50008b183598360011bab306a001306a3066375460d201e6eb4c1a0c1a4008c0a4c18cdd5183380098338011bad306500130653065002306300130630023061001305d375400660c000a603600260ba60b46ea800458c170c174c174c164dd5182e182e982c9baa305c003305c002303f0013056305337540022c60aa60ac0046eacc150004c150c140dd519980d017026012980a18271baa30523053305330533053305330533053305330533053305300230510013051002304f001304f002375a609a002609a0046eb4c12c004c12cc12cc11cdd50211998040138010009980f011919192999823181c1998111bab304b304c0020054881056f726465720013375e0026018660946ea40112f5c02940c128c11cdd5182500098231baa001375c608e60900046eb8c118004c108dd501e8a999820181a8070a999821982318231980d8121181999980e9bab3046304730433754608c608e60866ea80040fd22107666163746f72790014a22c26464646464a66608a607802626464a66608e608060906ea80044c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc174c13cc178dd5000899299982f299982f19b8800c375a60c660c06ea800854ccc178cdc38090008a99982f182880a0a99982f1828982f9baa00a1337126eb4c18cc180dd50050008a5114a0294052809919191919191919191919191919191919191919192999839a999839983299982782424411c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70004881034d535000153330733375e0280102a6660e666ebc04c01854ccc1cccdc3808801099b8701000114a029405280a5013232323253330773070307837540022646464a6660f466e1ccdc0005a4026004266ebc00cc8c8c8c8c8c8c8c8c8c8c8c8c8c20404cc22c04c23004034cc22c04c23004030cc22c04c2300402ccc22c04c23004028cc22c04c23004024cc22c04c23004020cc22c04c2300401ccc22c04c23004018cc22c04c23004014cc22c04c23004010cc22c04c2300400ccc22c04c23004008cc22c04c23004004cc22c04dd4007984680984680800984600800984580800984500800984480800984400800984380800984300800984280800984200800984180800984100800984080800983e1baa07714a060cc0046660a800691011c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a7000005307c307937540022c60f660f80046eacc1e8004c1e8c1d8dd501799998178070068058050b1bad30773078002375a60ec00260ec0046eb4c1d0004c1d0008c1c8004c1c8008c1c0004c1b0dd50119bae306e306f002375c60da00260d26ea801cdd7183598360011bae306a0013066375400a6eb4c194008dd69831800a99983099baf0020131337606ea0024dd4002099bb037500086ea0024c188008c180004cc074040038594c8ccc178c144c17cdd5004099299982f99b8800100210011002375a60c660c06ea80204004cdc00018010b1830982f1baa3061305e37540726eb4c180c184c184c184008dd6982f800982f8011bad305d001305d002305b001305b002305900130593059002375a60ae00260ae60ae00460aa00260aa00460a600260a60046eb4c144004c144008dd698278009827982798259baa0465333048303b30493754002264646464646464646464646464646464a6660b660bc004264646493180d001982480718240078b182e000982e0011bad305a001305a002375a60b000260b00046eb4c158004c158008dd6982a000982a0011bad3052001305200230500013050002304e001304a37540022c609860926ea800458c12cc130c130c120dd519192999825982700108008b18260009981081311919192999825181e18259baa0011533304a3371e6eb8c13cc130dd5000a451c295cd9f0691f9a09c13e38b475142042edbd78680af336a5c3e4afcb001303c33302600248811c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70004881034d53500014a02940c138c12cdd518270011bab304d304e0013049375400266602204a0860382a66608a6076026264646464a64666094666094607a6eb4c13cc140c140c140c140c140c140c140c140c140c140c140c140011282511323232323232323232323232323232323232533305c3055305d3754002264646464646464646464a6660cc66ebc028c8c8c8c18ccc1b4c1b800ccc1b4c1b8008cc1b4c1b8004cc1b4dd419b8101c375a60dc00e60de60de00260dc00260da00260d06ea818c54ccc198cdd79ba600c374c6666052666605207e91011c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a7000008301d002006005301d00113375e6e9cc0a80ecdd3998351ba73306a3752036660d498106456f72646572003306a3750603a606003e97ae04bd700a5014a06eb4c1a8c1ac008dd698348009834800991919980080080e82211119192999834183098349baa0011323232323232323253330703031374e0142660e86ea0010cc1d0dd40011983a1ba80014bd70099191983b1ba8337006eb4c1dc008018cc1d8dd419b80375a60ee002008660ec6ea0cdc01bad307730780010034bd70183b8009998068068050031bad30743075002375a60e600260e60046eb4c1c4004c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc1e94ccc1e8cdd7815983f8078a99983d19baf02900d1533307a3375e004016266ebcdd30021ba600114a0294052809983f1ba833700012010660fc6ea001ccc1f8dd400325eb8058dd5983f183f801183e800983c9baa307c0123333039333303933330394bd6f7b63024500488100482026fb808dd7183d8009bae307b307c0010024891c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70000180033077375404866e0ccdc100900180f99b833370403800403c6eb4c1dcc1e0c1e0008dd6983b000983b001183a000983a0011839000983900098369baa0033070005302b001306d306a37540022c60d860da60da60d26ea8c1b0c1b4c1a4dd5183600198360012999831182a98319baa00f13253330633371000266e0003802c4cdc099b8000e00b001148000dd6983398321baa00f148000dd7183318338011bae30650013061375401c646464666603a6eb8c198008dd7183318338011bae3066001375c60cc60ce00260c46ea8c188008c184dd518300009980e80780698250009830982f1baa0011630603061002375660be00260be60b66ea8044dd6982e982f182f0011bad305c001305c002375a60b400260b460b400460b000260b060b060b060b060b000460ac00260ac00460a800260a80046eb4c148004c148c148c148008dd7182800098261baa047132323232323232323232323232323232533305a3053305b3754002264646464646464646464a6660c8a6660c801c29444ccc19128a504a22a6660c866ebc028c8c8c8c8c8c8c8c8c8c8c8c8c8c1accc1d4c1d8034cc1d4c1d8030cc1d4c1d802ccc1d4dd419b8102401133075307600a33075307600933075307600833075307600733075307600633075307600533075307600433075307600333075375066e0407803ccc1d4c1d8008cc1d4c1d8004cc1d4dd419b8101c00e3077307700130760013075307500130740013073001307200130710013070001306f001306e001306d306d001306c001306b001306637540c22a6660c866ebcdd30061ba6333302703d007006301b00413375e6e9cc0a00e4dd3998341ba7330683752032660d098106456f72646572003306837506036605c03a97ae04bd700a5014a02940dd6983418348011bad30670013067002375a60ca002646660020020320804446464a6660c860ba60ca6ea80044c8c8c8c8c8c8c8c94ccc1b0c0b4dd38050998381ba8004330703750004660e06ea00052f5c026464660e46ea0cdc01bad307300200633072375066e00dd69839800802198391ba8337006eb4c1ccc1d000400d2f5c060e600266601a01a01400c6eb4c1c0c1c4008dd6983780098378011bad306d001323232323232323232323232323232533307653330763375e04e60f601e2a6660ec66ebc09403454ccc1d8cdd7801005899baf374c0086e980045280a5014a02660f46ea14ccc1d801c4cdc00048030a4000660f46ea0024cc1e8dd400325eb8058dd5983d183d801183c800983a9baa3078012333303533330354bd6f7b6302450048810053330720031482026fb8084cdc02410137dc04904044bd1bae3077001375c60ee60f000266e00014008c1ccdd50101bad3075307600230363070375460e800260e80046eb4c1c8004c1c8008c1c0004c1c0008c1b8004c1b8004c1a4dd500198360029813800983498331baa001163068306930693065375460d060d260ca6ea8c1a000cc1a0008dd7183198320011bae3062001305e3754016609000260be60b86ea800458c178c17c008dd5982e800982e982c9baa00f301d3057375460b660b80046eb4c168004c168c168c168008dd6982c000982c182c182c182c182c182c182c001182b000982b001182a000982a0011bad3052001305230523052002375c60a000260986ea811cdc0a400066602805008c03e6660180566eb8c130008dd71826000982600098239baa042153330453039013132323232323232323232323232323232323253330573050305837540022646464a6660b466e1c048cdc00050040a99982d182680a0a99982d299982d19b8801200114a226464a6660be60c4004264a6660ba60ac60bc6ea80044c94ccc178c144c17cdd50008991919191919191919191919191919192999838983a001099191919baf374c660ea6606004e04a97adef6c60374c660ea66ec00480412f5bded8c0606000660be01c60bc01e2c60e400260e40046eb4c1c0004c1c0008dd6983700098370011bad306c001306c002375a60d400260d40046eb4c1a0004c1a0008c198004c198008c190004c180dd50008b1831182f9baa00116306130623062305e375460c260c460bc6ea800458c180004cc0d40f08c8c8c94ccc178c140c17cdd50008a99982f19b8f375c60c660c06ea800522011c295cd9f0691f9a09c13e38b475142042edbd78680af336a5c3e4afcb001305033303a00248811c4ad61bf61971298e8aba4e71ce34cac02cddf8030b6fce35c4693a70004881034d53500014a02940c188c17cdd518310011bab30613062001305d375460c060c260ba6ea800454ccc1694ccc16801c528099982d2504a094454ccc168cdd78019919191919191919191919191919191831998369837007998369837007198369837006998369837006198369837005998369837005198369837004998369837004198369837003998369837003198369837002998369837002198369837001998369837001198369837000998369837183780099836999834a514c0103d87a80004c0103d87980004bd7018370009836800983600098358009835000983480098340009833800983300098328009832000983180098310009830800982e1baa05713375e6e980ccdd30028a5014a029405280a505333059304b305a37540162900109bad305e305b3754016608a00260b860b26ea800458c16cc170008dd5982d000982d182b1baa33302003405202b301a3054375460b060b20046eb4c15c004c15cc15cc15c008dd6982a800982a982a982a8011829800982998299829982980118288009828801182780098278011bad304d001304d002375a609600260966096608e6ea810852811111803198029803198028020019803198028010009119b8a0020012372600244646464646464a66609266e3c01400854ccc124cdc8002000899bb000800713376000e0102a66609266e400140084cdd8004003899bb0007008375c609a609c0046eb8c130004c120dd50021bae304a304b002375c6092002608a6ea80088c94ccc108c0d40044c8c94ccc11cc1280084c92632375a608e0046eb4c11400458c94ccc11cc128c1280044cdd81824800982498250008b1bac3048001304437540042a66608460680022a66608a60886ea80085261616304237540026ebd3010180002533303f3032304037540022646464646464646464646464a66609c60a2004264646493181e004981e005181d8058b1bad304f001304f00232533304c304b00115333049303b304a00114a22a6660926078609400229405858dd5182680098268011bad304b001304b00230490013049002304700130470023045001304137540022c4444a66608260680022008264646600200200c44a66608e00226609066ec0dd48031ba60034bd6f7b630099191919299982418219980880500109982619bb037520146e9801c01454ccc120cdc78050010992999824981e18251baa00113304d337606ea402cc138c12cdd50008020802192999824a9998260008a5114a02980103d87a8000130433304d374c00297ae0323300100100222533304d00113304e337606ea402cdd400525eb7bdb1804c8c8c8c94ccc138c124cc05c03c0084cc148cdd81ba900f375001c00a2a66609c66e3c03c0084c94ccc13cc108c140dd500089982999bb0375202060a860a26ea80040104010c94ccc13cc1080045300103d87a80001304933053375000297ae03370000201c2660a466ec0dd48011ba800133006006003375a609e0066eb8c134008c144008c13c0044cc130cdd81ba9002374c0026600c00c0066eacc12400cdd7182380118258011824800991900119198008008011129998238008a4c264a666090002293099192999823981d18241baa33010375c609060980086eb8c1200084cc014014cc12c00800458c130008c128004c128004cc114cdd81ba9002375000297adef6c602323300100100222533304200114bd7009919991119198008008019129998240008801899198251ba73304a375200c660946ea4dd71823800998251ba8375a609000297ae033003003304c002304a001375c60820026eacc108004cc00c00cc118008c110004888cc06400c8c8c94ccc104c0ccccc074dd598231823801002a45056f726465720013375e002600e6608a6ea40112f5c02940c114c108dd5182280098209baa30443045304137540026e95200237109000111299981d98170008a5eb7bdb1804c8c8cc0040052f5bded8c044a66608200226608466ec0dd48031ba60034bd6f7b6300991919192999821181e9980580500109982319bb037520146e9801c01454ccc108cdc780500109982319bb037520146e9801c00c4cc118cdd81ba9002374c0026600c00c0066eacc10c00cdd71820801182280118218009919800800a5eb7bdb180894ccc1000044cc104cdd81ba9004375000697adef6c601323232325333041303c3300a008002133045337606ea4020dd40038028a99982099b8f008002133045337606ea4020dd400380189982299bb037520046ea0004cc01801800cdd698210019bae30400023044002304200122533303933720004002298103d8798000153330393371e0040022980103d87a800014c103d87b8000300100122533303a0011480004cdc02400466004004607a0024446464a666078607e00420022c607a0026602400646464a666074605866602c6eacc0fcc1000080152201087472656173757279001533303a302c303b3754002266e3cdd7181f981e1baa00100414a02940c0f8c0ecdd5181f000981d1baa00122233011003232325333039302b3330153756607c607e00400a91010673656c6c65720015333039302b303a3754002266e3c010dd7181f181d9baa00114a02940c0f4c0e8dd5181e800981c9baa303c303d3039375400260666ea8074dd6981b18199baa001163035303237540066eb4c0d0c0c4dd50008b181998181baa303300230323033001302e37540126600201291010022323300100100322533303100114bd6f7b630099191919299981919b8f0070021003133036337606ea4008dd3000998030030019bab3033003375c6062004606a00460660022c6eb8c0b8c0acdd50008b181698151baa302d00237566058605a00260506ea8c0acc0b0c0a0dd51919192999816181780108008b181680099801005919192999815180e1998031bab302f3030302c3754605e606000405091010874726561737572790013375e0020082940c0b8004c0a8dd5000981598141baa00c22323300100100322533302c00114bd7009919299981598028010998178011980200200089980200200098180011817000911192999814180d18149baa0011480004dd6981698151baa001325333028301a30293754002298103d87a8000132330010013756605c60566ea8008894ccc0b4004530103d87a80001323232533302d3371e00e6eb8c0b800c4c09ccc0c4dd4000a5eb804cc014014008dd698170011818801181780099198008008021129998160008a6103d87a80001323232533302c3371e00e6eb8c0b400c4c098cc0c0dd3000a5eb804cc014014008dd598168011818001181700098141814981498148011bab3027001302730270023758604a002604a0046eb0c08c004c08c008dd61810800980e9baa00216301f3020002301e001301a375400229309b2b19299980b98050008a99980d180c9baa00214985854ccc05cc02400454ccc068c064dd50010a4c2c2a66602e60200022a66603460326ea80085261615333017300f0011533301a301937540042930b0a99980b98070008a99980d180c9baa00214985854ccc05cc03400454ccc068c064dd50010a4c2c2a66602e60180022a66603460326ea80085261615333017300b0011533301a301937540042930b0b180b9baa001300101125333014300730153754002264646464646464646464646464646464646464646464646464646464646464646464a666072607800426464646464649319299981e1817800899192999820982200109924ca66607c6062607e6ea80044c8c8c8c8c8c94ccc11cc12800852616375a609000260900046eb4c118004c118008dd6982200098201baa00116163042001303e37540162a666078605c0022a66607e607c6ea802c5261616303c37540146050022604e024604e026604e030604c0322c64a66607260700022a66606c6050606e002294454ccc0d8c0a4c0dc0045280b0b1baa303a001303a002375a60700026070004606c002606c0046eb4c0d0004c0d0008dd6981900098190011bad30300013030002302e001302e002302c001302c002302a001302a002375a605000260500046eb4c098004c098008c090004c090008c088004c088008dd6981000098100011bad301e001301e002375c603800260380046eb8c068004c058dd50008b119299980a180380089919299980c980e0010a4c2c6eb4c068004c058dd50010a99980a18030008a99980b980b1baa00214985858c050dd500092999809180298099baa0011323232325333019301c00213232498c94ccc060c02c0044c8c94ccc074c0800084c92632533301b300e0011323253330203023002132498c03800458c084004c074dd50010a99980d98068008991919191919299981218138010a4c2c6eb4c094004c094008dd6981180098118011bad3021001301d37540042c60366ea800458c078004c068dd50018a99980c18050008a99980d980d1baa00314985858c060dd500118038018b180d000980d001180c000980a1baa0011625333011300430123754002264646464a66603060360042930b1bae30190013019002375c602e00260266ea8004588c94ccc044c0100044c8c94ccc058c06400852616375c602e00260266ea800854ccc044c00c0044c8c94ccc058c06400852616375c602e00260266ea800858c044dd5000980a18089baa00b370e90011b8748000dc3a401c6e1d200c370e90051b8748020dc3a400c6e1d2004374a90001baf4c103d8798000375c002ae6955ceaab9e5573eae815d0aba201",
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
          { title: "AddSeller", dataType: "constructor", index: 1, fields: [] },
          {
            title: "CollectSeller",
            dataType: "constructor",
            index: 2,
            fields: [],
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
            title: "RedeemOrders",
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
          { title: "CancelLBE", dataType: "constructor", index: 7, fields: [] },
        ],
      },
    },
  ) as unknown as TreasuryValidatorValidateTreasuryMintingOrWithdrawal;
