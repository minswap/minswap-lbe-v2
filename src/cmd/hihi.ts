import * as T from "@minswap/translucent";
import { Api, type LbeParameters } from "..";

let SEED =
  "muffin spell cement resemble frame pupil grow gloom hawk wild item hungry polar ice maximum sport economy drop sun timber stone circle army jazz";
let address =
  "addr_test1qr03hndgkqdw4jclnvps6ud43xvuhms7rurjq87yfgzc575pm6dyr7fz24xwkh6k0ldufe2rqhgkwcppx5fzjrx5j2rs2rt9qc";

let main = async () => {
  await T.loadModule();
  await T.CModuleLoader.load();
  let api = await Api.newBySeed(SEED);

  let params: LbeParameters = {
    baseAsset: {
      policyId: "e16c2dc8ae937e8d3790c7fd7168d7b994621ba14ca11415f39fed72",
      assetName: "0014df104b494e474d41",
    },
    reserveBase: 50_000_000_000_000n,
    raiseAsset: {
      policyId: "",
      assetName: "",
    },
    startTime: Date.now() + 3 * 60 * 60 * 1000,
    endTime: Date.now() + 14 * 24 * 60 * 60 * 1000,
    owner:
      "addr_test1qr03hndgkqdw4jclnvps6ud43xvuhms7rurjq87yfgzc575pm6dyr7fz24xwkh6k0ldufe2rqhgkwcppx5fzjrx5j2rs2rt9qc",
    receiver:
      "addr_test1qr03hndgkqdw4jclnvps6ud43xvuhms7rurjq87yfgzc575pm6dyr7fz24xwkh6k0ldufe2rqhgkwcppx5fzjrx5j2rs2rt9qc",
    poolAllocation: 100n,
    revocable: true,
    poolBaseFee: 30n,
  };

  // let createTx = await api.createLbe(params);
  // let txHash = await api.signAndSubmit(createTx);

  // let cancelTx = await api.cancelLbe({ baseAsset: params.baseAsset, raiseAsset: params.raiseAsset });
  // let txHash = await api.signAndSubmit(cancelTx);

  let createOrderTx = await api.createOrder({
    owner: address,
    amount: 10_000_000n,
    baseAsset: params.baseAsset,
    raiseAsset: params.raiseAsset,
  });
  let txHash = await api.signAndSubmit(createOrderTx);

  console.log(txHash);
};

main();
