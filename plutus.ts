import {
  applyParamsToScript,
  Data,
  type Validator,
} from "@minswap/translucent";

export interface FactoryValidateFactory {
  new (
    outRef: { transactionId: { hash: string }; outputIndex: bigint },
    treasuryHash: string,
    managerHash: string,
    sellerHash: string,
    orderHash: string,
  ): Validator;
  datum: { head: string; tail: string };
  redeemer: {
    wrapper:
      | "Initialization"
      | {
          CreateTreasury: {
            baseAsset: { policyId: string; assetName: string };
            raiseAsset: { policyId: string; assetName: string };
          };
        }
      | {
          CloseTreasury: {
            baseAsset: { policyId: string; assetName: string };
            raiseAsset: { policyId: string; assetName: string };
          };
        }
      | "MintManager"
      | "MintSeller"
      | "MintOrder";
  };
}

export const FactoryValidateFactory = Object.assign(
  function (
    outRef: { transactionId: { hash: string }; outputIndex: bigint },
    treasuryHash: string,
    managerHash: string,
    sellerHash: string,
    orderHash: string,
  ) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "59026601000032323232323222322322322322253233300d3001300e3754004264a66601c944526136563232533300f3003001153330123011375400a2930b0a99980799b87480080044c8c8c8c94ccc058c0600084c8c92630070023006003163016001301600230140013011375400a2a66601e66e1d20040011323232325333016301800213232498c01c008c01800c58c058004c058008c050004c044dd50028a99980799b874801800454ccc048c044dd50028a4c2c2a66601e66e1d2008001153330123011375400a2930b0a99980799b874802800454ccc048c044dd50028a4c2c2c601e6ea801094ccc038c008c03cdd5000899191919299980a980b8010a4c2c6eb8c054004c054008dd7180980098081baa0011613232253330104a229309b2b199119299980898028008a99980a18099baa00214985854ccc044cdc3a4004002264646464a66603060340042646493180400118038018b180c000980c001180b00098099baa002153330113370e9002000899191919299980c180d0010991924c6010004600e0062c60300026030004602c00260266ea800854ccc044cdc3a400c0022a66602860266ea800852616153330113370e90040008a99980a18099baa00214985854ccc044cdc3a40140022a66602860266ea80085261616301137540024a66601e600660206ea80044c8c8c8c94ccc058c06000852616375c602c002602c0046eb8c050004c044dd50008b180918081baa003533300d3001300e3754006264646464a666028602c0042930b1bae30140013014002375c6024002601e6ea800c58dc3a40006eb8004dd70009bae001375c002ae6955ceaab9e5573eae855d11",
        [outRef, treasuryHash, managerHash, sellerHash, orderHash],
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
                  title: "Initialization",
                  dataType: "constructor",
                  index: 0,
                  fields: [],
                },
                {
                  title: "CreateTreasury",
                  dataType: "constructor",
                  index: 1,
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
                {
                  title: "CloseTreasury",
                  dataType: "constructor",
                  index: 2,
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
                {
                  title: "MintManager",
                  dataType: "constructor",
                  index: 3,
                  fields: [],
                },
                {
                  title: "MintSeller",
                  dataType: "constructor",
                  index: 4,
                  fields: [],
                },
                {
                  title: "MintOrder",
                  dataType: "constructor",
                  index: 5,
                  fields: [],
                },
              ],
            },
          ],
        },
      ],
    },
  },
) as unknown as FactoryValidateFactory;

export interface FactoryValidateFactoryMinting {
  new (
    outRef: { transactionId: { hash: string }; outputIndex: bigint },
    treasuryHash: string,
    managerHash: string,
    sellerHash: string,
    orderHash: string,
  ): Validator;
  redeemer:
    | "Initialization"
    | {
        CreateTreasury: {
          baseAsset: { policyId: string; assetName: string };
          raiseAsset: { policyId: string; assetName: string };
        };
      }
    | {
        CloseTreasury: {
          baseAsset: { policyId: string; assetName: string };
          raiseAsset: { policyId: string; assetName: string };
        };
      }
    | "MintManager"
    | "MintSeller"
    | "MintOrder";
}

export const FactoryValidateFactoryMinting = Object.assign(
  function (
    outRef: { transactionId: { hash: string }; outputIndex: bigint },
    treasuryHash: string,
    managerHash: string,
    sellerHash: string,
    orderHash: string,
  ) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "59026601000032323232323222322322322322253233300d3001300e3754004264a66601c944526136563232533300f3003001153330123011375400a2930b0a99980799b87480080044c8c8c8c94ccc058c0600084c8c92630070023006003163016001301600230140013011375400a2a66601e66e1d20040011323232325333016301800213232498c01c008c01800c58c058004c058008c050004c044dd50028a99980799b874801800454ccc048c044dd50028a4c2c2a66601e66e1d2008001153330123011375400a2930b0a99980799b874802800454ccc048c044dd50028a4c2c2c601e6ea801094ccc038c008c03cdd5000899191919299980a980b8010a4c2c6eb8c054004c054008dd7180980098081baa0011613232253330104a229309b2b199119299980898028008a99980a18099baa00214985854ccc044cdc3a4004002264646464a66603060340042646493180400118038018b180c000980c001180b00098099baa002153330113370e9002000899191919299980c180d0010991924c6010004600e0062c60300026030004602c00260266ea800854ccc044cdc3a400c0022a66602860266ea800852616153330113370e90040008a99980a18099baa00214985854ccc044cdc3a40140022a66602860266ea80085261616301137540024a66601e600660206ea80044c8c8c8c94ccc058c06000852616375c602c002602c0046eb8c050004c044dd50008b180918081baa003533300d3001300e3754006264646464a666028602c0042930b1bae30140013014002375c6024002601e6ea800c58dc3a40006eb8004dd70009bae001375c002ae6955ceaab9e5573eae855d11",
        [outRef, treasuryHash, managerHash, sellerHash, orderHash],
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
    redeemer: {
      title: "FactoryRedeemer",
      anyOf: [
        {
          title: "Initialization",
          dataType: "constructor",
          index: 0,
          fields: [],
        },
        {
          title: "CreateTreasury",
          dataType: "constructor",
          index: 1,
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
        {
          title: "CloseTreasury",
          dataType: "constructor",
          index: 2,
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
        { title: "MintManager", dataType: "constructor", index: 3, fields: [] },
        { title: "MintSeller", dataType: "constructor", index: 4, fields: [] },
        { title: "MintOrder", dataType: "constructor", index: 5, fields: [] },
      ],
    },
  },
) as unknown as FactoryValidateFactoryMinting;

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

export interface FeedTypeOrder {
  new (): Validator;
  _datum: {
    factoryPolicyId: string;
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

export const FeedTypeOrder = Object.assign(
  function () {
    return {
      type: "PlutusV2",
      script:
        "5902330100003232323232322323232232253330084a029309b2b19299980398028008a99980518049baa00214985854ccc01cc01000454ccc028c024dd50010a4c2c2a66600e66e1d20040011533300a300937540042930b0b18039baa0013232533300630043007375400a26464646464646464646464646464a66602e6032004264646493299980b180a180b9baa009132323232533301d301f00213232498c94ccc070c0680044c8c94ccc084c08c0084c92632533301f301d0011323253330243026002132498c07400458c090004c084dd50010a99980f980e0008991919191919299981418150010a4c2c6eb4c0a0004c0a0008dd6981300098130011bad3024001302137540042c603e6ea800458c084004c078dd50018a99980e180c8008a99980f980f1baa00314985858c070dd5001180b0018b180e800980e801180d800980c1baa00916301000a300f00b16375a602e002602e00464a66602a60280022a666024601e6026002294454ccc048c040c04c0045280b0b1baa30150013015002375a6026002602600460220026022004601e002601e004601a002601a0046eb8c02c004c020dd50028b12999803180218039baa001132323232533300d300f002149858dd7180680098068011bae300b001300837540022c464a66600c600800226464a666016601a0042930b1bae300b001300837540042a66600c600600226464a666016601a0042930b1bae300b001300837540042c600c6ea8004dc3a40046e1d20005734aae7555cf2ab9f5742ae89",
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
            { dataType: "bytes", title: "factoryPolicyId" },
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
) as unknown as FeedTypeOrder;

export interface ManagerValidateManagerSpending {
  new (treasuryHash: string): Validator;
  managerInDatum: {
    factoryPolicyId: string;
    orderHash: string;
    sellerHash: string;
    baseAsset: { policyId: string; assetName: string };
    raiseAsset: { policyId: string; assetName: string };
    sellerCount: bigint;
    reserveRaise: bigint;
    totalPenalty: bigint;
  };
  redeemer: "ManageSeller" | "SpendManager";
}

export const ManagerValidateManagerSpending = Object.assign(
  function (treasuryHash: string) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "59010101000032323232323223223232232253330094a229309b2b19299980418020008a99980598051baa00214985854ccc020cdc3a40040022a66601660146ea800852616163008375400264a66600c6004600e6ea800c4c8c8c8c8c8c8c8c8c8c8c8c8c8c8c8c94ccc064c06c0084c8c9263012008301100916375a603200260320046eb4c05c004c05c008dd6980a800980a80118098009809801180880098088011bae300f001300f002375c601a002601a0046eb8c02c004c020dd50018b12999803180118039baa001132323232533300d300f002149858dd7180680098068011bae300b001300837540022c6e1d2000375c002ae6955ceaab9e5573eae855d11",
        [treasuryHash],
        { dataType: "list", items: [{ dataType: "bytes" }] } as any,
      ),
    };
  },
  {
    managerInDatum: {
      title: "ManagerDatum",
      anyOf: [
        {
          title: "ManagerDatum",
          dataType: "constructor",
          index: 0,
          fields: [
            { dataType: "bytes", title: "factoryPolicyId" },
            { dataType: "bytes", title: "orderHash" },
            { dataType: "bytes", title: "sellerHash" },
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
            { dataType: "integer", title: "sellerCount" },
            { dataType: "integer", title: "reserveRaise" },
            { dataType: "integer", title: "totalPenalty" },
          ],
        },
      ],
    },
  },
  {
    redeemer: {
      title: "ManagerRedeemer",
      anyOf: [
        {
          title: "ManageSeller",
          dataType: "constructor",
          index: 0,
          fields: [],
        },
        {
          title: "SpendManager",
          dataType: "constructor",
          index: 1,
          fields: [],
        },
      ],
    },
  },
) as unknown as ManagerValidateManagerSpending;

export interface OrderValidateOrder {
  new (sellerHash: string, treasuryHash: string): Validator;
  _rawDatum: Data;
  rawRedeemer: Data;
}

export const OrderValidateOrder = Object.assign(
  function (sellerHash: string, treasuryHash: string) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "581b0100003223223222253330084a229309b2b1bae001375c002ae681",
        [sellerHash, treasuryHash],
        {
          dataType: "list",
          items: [{ dataType: "bytes" }, { dataType: "bytes" }],
        } as any,
      ),
    };
  },
  { _rawDatum: { title: "Data", description: "Any Plutus data." } },
  { rawRedeemer: { title: "Data", description: "Any Plutus data." } },
) as unknown as OrderValidateOrder;

export interface SellerValidateSellerSpending {
  new (treasuryHash: string, managerHash: string): Validator;
  sellerInDatum: {
    factoryPolicyId: string;
    baseAsset: { policyId: string; assetName: string };
    raiseAsset: { policyId: string; assetName: string };
    amount: bigint;
    penaltyAmount: bigint;
  };
  redeemer: "UsingSeller" | "CountingSeller";
}

export const SellerValidateSellerSpending = Object.assign(
  function (treasuryHash: string, managerHash: string) {
    return {
      type: "PlutusV2",
      script: applyParamsToScript(
        "58e5010000323232323232232232232322322533300b4a229309b2b19299980518020008a99980698061baa00214985854ccc028cdc3a40040022a66601a60186ea80085261616300a375400264a666010600460126ea800c4c8c8c8c8c8c8c8c8c8c94ccc054c05c0084c8c926300c006300b00716375a602a002602a0046eb4c04c004c04c008c044004c044008c03c004c03c008dd7180680098051baa0031625333008300230093754002264646464a66601e60220042930b1bae300f001300f002375c601a00260146ea800458dc3a40006eb8004dd7000ab9a5573aaae7955cfaba15745",
        [treasuryHash, managerHash],
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
            { dataType: "bytes", title: "factoryPolicyId" },
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
      title: "SellerRedeemer",
      anyOf: [
        { title: "UsingSeller", dataType: "constructor", index: 0, fields: [] },
        {
          title: "CountingSeller",
          dataType: "constructor",
          index: 1,
          fields: [],
        },
      ],
    },
  },
) as unknown as SellerValidateSellerSpending;

export interface TreasuryValidateTreasurySpending {
  new (): Validator;
  treasuryInDatum: {
    factoryPolicyId: string;
    managerHash: string;
    sellerHash: string;
    orderHash: string;
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
    minimumOrderRaise: bigint | null;
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
    isManagerCollected: boolean;
  };
  redeemer:
    | "CollectManager"
    | "CollectOrders"
    | "CreateAmmPool"
    | "RedeemOrders"
    | "RedeemerLPByOwner"
    | "CloseEvent"
    | "CancelLBE"
    | "UpdateLBE";
}

export const TreasuryValidateTreasurySpending = Object.assign(
  function () {
    return {
      type: "PlutusV2",
      script:
        "5904030100003232323232322323232232253330084a229309b2b19299980398028008a99980518049baa00214985854ccc01cc01000454ccc028c024dd50010a4c2c2a66600e66e1d20040011533300a300937540042930b0a99980399b874801800454ccc028c024dd50010a4c2c2a66600e66e1d20080011533300a300937540042930b0a99980399b874802800454ccc028c024dd50010a4c2c2a66600e66e1d200c0011533300a300937540042930b0a99980399b874803800454ccc028c024dd50010a4c2c2c600e6ea8004c8c8c94ccc01cc014c020dd50030991919191919191919191919191919191919191919191919191919191919191919191919191919192999819181a00109919191919191924c64a66606c606800226464a666076607a00426493299981c181b181c9baa001132323232323253330413043002149858dd6982080098208011bad303f001303f002375a607a00260746ea80045858c0ec004c0e0dd50070a99981b18198008a99981c981c1baa00e14985858c0d8dd5006981700a181680a981600b2999818981798191baa0171323232325333038303a00213232498c94ccc0dcc0d40044c8c94ccc0f0c0f80084c92632533303a303800113232533303f3041002132498c0e000458c0fc004c0f0dd50010a99981d181b8008991919191919299982198228010a4c2c6eb4c10c004c10c008dd6982080098208011bad303f001303c37540042c60746ea800458c0f0004c0e4dd50018a99981b981a0008a99981d181c9baa00314985858c0dcdd500118188018b181c000981c001181b00098199baa01716302b01c302a01d1632533303230310011533302f302c303000114a22a66605e605a606000229405858dd51819000981900119299981818178008a999816981518170008a511533302d302b302e00114a02c2c6ea8c0c0004c0c0008dd698170009817001181600098160011bad302a001302a002375a605000260500046eb4c098004c098008c090004c090008c088004c088008c080004c080008c078004c078008dd6980e000980e0011bad301a001301a0023018001301800230160013016002375a602800260280046eb8c048004c048008dd7180800098080011bae300e001300e002375c601800260126ea8018588c94ccc020c0180044c8c94ccc034c03c00852616375a601a00260146ea800854ccc020c01400454ccc02cc028dd50010a4c2c2c60106ea800494ccc018c010c01cdd5000899191919299980698078010a4c2c6eb8c034004c034008dd7180580098041baa001162325333006300400113232533300b300d002149858dd7180580098041baa00215333006300300113232533300b300d002149858dd7180580098041baa00216300637540026e1d2002370e90002b9a5573aaae7955cfaba157441",
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
            { dataType: "bytes", title: "factoryPolicyId" },
            { dataType: "bytes", title: "managerHash" },
            { dataType: "bytes", title: "sellerHash" },
            { dataType: "bytes", title: "orderHash" },
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
              title: "minimumOrderRaise",
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
            {
              title: "isManagerCollected",
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
      title: "TreasuryRedeemer",
      anyOf: [
        {
          title: "CollectManager",
          dataType: "constructor",
          index: 0,
          fields: [],
        },
        {
          title: "CollectOrders",
          dataType: "constructor",
          index: 1,
          fields: [],
        },
        {
          title: "CreateAmmPool",
          dataType: "constructor",
          index: 2,
          fields: [],
        },
        {
          title: "RedeemOrders",
          dataType: "constructor",
          index: 3,
          fields: [],
        },
        {
          title: "RedeemerLPByOwner",
          dataType: "constructor",
          index: 4,
          fields: [],
        },
        { title: "CloseEvent", dataType: "constructor", index: 5, fields: [] },
        { title: "CancelLBE", dataType: "constructor", index: 6, fields: [] },
        { title: "UpdateLBE", dataType: "constructor", index: 7, fields: [] },
      ],
    },
  },
) as unknown as TreasuryValidateTreasurySpending;
