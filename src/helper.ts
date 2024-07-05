import { WarehouseBuilder } from "./build-tx";
import type { LbeUTxO, TreasuryDatum, UnixTime } from "./types";

export type BatchingPhase =
  | "countingSellers"
  | "collectManager"
  | "collectOrders"
  | "redeemOrders"
  | "refundOrders";

export namespace BatchingPhase {
  export function from(options: {
    treasury: LbeUTxO;
    now: UnixTime;
    orders?: LbeUTxO[];
    manager?: LbeUTxO;
  }): BatchingPhase | undefined {
    let { treasury, manager, orders, now } = options;
    let treasuryDatum = WarehouseBuilder.fromDatumTreasury(treasury.datum);
    // counting
    if (treasuryDatum.isCancelled || treasuryDatum.endTime < now) {
      if (manager) {
        let managerDatum = WarehouseBuilder.fromDatumManager(manager.datum);
        if (managerDatum.sellerCount > 0n) return "countingSellers";
        if (managerDatum.sellerCount === 0n) return "collectManager";
      }
      if (
        orders &&
        orders.length > 0 &&
        treasuryDatum.isManagerCollected &&
        treasuryDatum.collectedFund !==
          treasuryDatum.reserveRaise + treasuryDatum.totalLiquidity
      )
        return "collectOrders";
    }
    // encounter
    if (
      treasuryDatum.isCancelled &&
      treasuryDatum.isManagerCollected &&
      treasuryDatum &&
      treasuryDatum.collectedFund > 0n &&
      treasuryDatum.collectedFund ===
        treasuryDatum.reserveRaise + treasuryDatum.totalLiquidity
    ) {
      return "refundOrders";
    }
    if (
      treasuryDatum.totalLiquidity > 0n &&
      treasuryDatum.collectedFund > 0n &&
      treasuryDatum.collectedFund ===
        treasuryDatum.reserveRaise + treasuryDatum.totalLiquidity
    ) {
      return "redeemOrders";
    }
    return undefined;
  }
}

export type LbePhase =
  | "pending"
  | "discovery"
  | "counting"
  | "encounter"
  | "cancelled"
  | "completed";

export namespace LbePhaseUtils {
  export function from(options: {
    datum: TreasuryDatum;
    currentTime: UnixTime;
  }): LbePhase {
    let things: {
      checker: (options: {
        datum: TreasuryDatum;
        currentTime: UnixTime;
      }) => boolean;
      phase: LbePhase;
    }[] = [
      { checker: isCancel, phase: "cancelled" },
      { checker: isPending, phase: "pending" },
      { checker: isDiscovery, phase: "discovery" },
      { checker: isCounting, phase: "counting" },
      { checker: isEncounter, phase: "encounter" },
      { checker: isCompleted, phase: "completed" },
    ];
    for (let { checker, phase } of things) {
      if (checker(options)) {
        return phase;
      }
    }
    throw Error("Cannot found LBE phase");
  }

  function isCancel(options: {
    datum: TreasuryDatum;
    currentTime: UnixTime;
  }): boolean {
    return options.datum.isCancelled;
  }

  function isPending(options: {
    datum: TreasuryDatum;
    currentTime: UnixTime;
  }): boolean {
    let { datum, currentTime } = options;
    return currentTime < datum.startTime && !datum.isCancelled;
  }

  function isDiscovery(options: {
    datum: TreasuryDatum;
    currentTime: UnixTime;
  }): boolean {
    let { datum, currentTime } = options;
    return (
      currentTime > datum.startTime &&
      currentTime < datum.endTime &&
      !datum.isCancelled
    );
  }

  function isCounting(options: {
    datum: TreasuryDatum;
    currentTime: UnixTime;
  }): boolean {
    let { datum } = options;
    if (datum.isCancelled) {
      return false;
    }
    if (!datum.isManagerCollected) {
      return true;
    }
    if (!datum.totalLiquidity) {
      return true;
    }
    return false;
  }

  function isEncounter(options: {
    datum: TreasuryDatum;
    currentTime: UnixTime;
  }): boolean {
    let { datum } = options;
    if (datum.isCancelled) {
      return (
        datum.isManagerCollected &&
        datum.collectedFund === datum.reserveRaise + datum.totalPenalty
      );
    } else {
      // created pool and has redeeming orders
      return datum.totalLiquidity > 0 && datum.collectedFund > 0;
    }
  }

  export function isCompleted(options: {
    datum: TreasuryDatum;
    currentTime: UnixTime;
  }): boolean {
    let { datum } = options;
    // created pool and redeem all orders
    return datum.totalLiquidity > 0 && !datum.collectedFund;
  }
}
