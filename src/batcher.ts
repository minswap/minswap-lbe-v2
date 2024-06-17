/**
 * I call this batcher is ALL-IN.
 * Because it works for all automate-tx related to LBE:
 * - Create AMM Pool
 * - Collect Sellers
 * - Collect Manager
 * - Collect Orders
 * - Redeem LP
 * - Refund
 *
 *
 **/
import * as T from "@minswap/translucent";
import type { Maestro, MaestroSupportedNetworks, UTxO } from "./types";
import { WarehouseBuilder } from "./build-tx";

class Batcher {
  treasuries: UTxO[] = [];
  sellers: UTxO[] = [];
  managers: UTxO[] = [];
  orders: UTxO[] = [];
  provider: Maestro;
  builder: WarehouseBuilder;

  constructor(provider: Maestro, builder: WarehouseBuilder) {
    this.provider = provider;
    this.builder = builder;
  }

  collectManager() {
    let pendingManagers = this.managers.filter((m) => {});
  }
}

const main = async () => {
  let network: MaestroSupportedNetworks = process
    .argv[2] as MaestroSupportedNetworks;
  let maestroApiKey = process.argv[2];
  let maestro = new T.Maestro({ network, apiKey: maestroApiKey });
  let t = await T.Translucent.new(maestro, network);
  // export type WarehouseBuilderOptions = {
  //     t: Translucent;
  //     validators: Validators;
  //     deployedValidators: DeployedValidators;
  //     ammValidators: MinswapValidators;
  //     ammDeployedValidators: DeployedValidators;
  //   };
};

main();
