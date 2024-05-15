import { beforeEach, expect, test } from "bun:test";
import * as T from "@minswap/translucent";
import type { Emulator, Translucent } from "../types";
import { generateAccount, type GeneratedAccount } from "./utils";
import { collectValidators, deployValidators, type DeployedValidators, type Validators } from "../deploy-validators";

let t: Translucent;
let ACCOUNT: GeneratedAccount;
let validators: Validators;
let deployedValidators: DeployedValidators;
let emulator: Emulator;

beforeEach(async () => {
  await T.loadModule();
  await T.CModuleLoader.load();
  ACCOUNT = await generateAccount({
    lovelace: 2000000000000000000n,
  });
  emulator = new T.Emulator([ACCOUNT]);
  t = await T.Translucent.new(emulator);
  emulator.awaitBlock(10_000); // For validity ranges to be valid
  t.selectWalletFromPrivateKey(ACCOUNT.privateKey);

  validators = collectValidators();
  deployedValidators = await deployValidators(t, validators);
  emulator.awaitBlock(1);
  console.log(deployedValidators)
});

test("Example Testing", async () => {
  expect(1).toBeGreaterThan(0)
});
