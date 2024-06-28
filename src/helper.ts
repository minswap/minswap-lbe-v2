import type { TreasuryDatum, UnixTime } from "./types";

export type LbePhase =
  | "pending"
  | "discovery"
  | "counting"
  | "encounter"
  | "cancelled";

export namespace LbePhase {
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
    if (!datum.isManagerCollected) {
      return true;
    }
    if (datum.collectedFund !== datum.reserveRaise + datum.totalPenalty) {
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
      return datum.totalLiquidity > 0;
    }
  }
}
