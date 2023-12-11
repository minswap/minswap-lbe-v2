import { Constr, Data } from "https://deno.land/x/lucid@0.10.7/mod.ts";
import { OutRef } from "./types.ts";

export function outRefToPlutusData(outRef: OutRef): Data {
  return new Constr(0, [new Constr(0, [outRef.txId]), outRef.index]);
}
