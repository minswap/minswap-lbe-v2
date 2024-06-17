import { Maestro, type MaestroConfig } from "@minswap/translucent";
import type { Address, Network, UTxO, Unit } from "../types";

type EventId = {
  baseAsset: Unit;
  raiseAsset: Unit;
};

type GetOrdersOptions = {
  eventId: EventId;
  owner?: Address;
};

type GetSellersOptions = {
  eventId: EventId;
};

type GetManagerOptions = {
  eventId: EventId;
};

type TreasuryPhase = "Pending" | "Discovery" | "Counting" | "Encounter";

type GetTreasuryOptions = {
  eventId?: EventId;
  phase?: TreasuryPhase;
};

export interface LbeProvider {
  getTreasuries(options: GetTreasuryOptions): Promise<UTxO[]>;
  getOrders(options: GetOrdersOptions): Promise<UTxO[]>;
  getSellers(options: GetSellersOptions): Promise<UTxO[]>;
  getManagers(options: GetManagerOptions): Promise<UTxO[]>;
}

export type MinswapLbeProviderConfig = {
  network: Network;
  kupoUrl: string;
  ogmiosUrl: string;
};

class MinswapLbeProvider implements LbeProvider {
  constructor(config: MinswapLbeProviderConfig) {}

  getTreasuries(options: GetTreasuryOptions): Promise<UTxO[]> {
    throw new Error("Method not implemented.");
  }
  getOrders(options: GetOrdersOptions): Promise<UTxO[]> {
    throw new Error("Method not implemented.");
  }
  getSellers(options: GetSellersOptions): Promise<UTxO[]> {
    throw new Error("Method not implemented.");
  }
  getManagers(options: GetManagerOptions): Promise<UTxO[]> {
    throw new Error("Method not implemented.");
  }
}
