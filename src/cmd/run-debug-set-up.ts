import invariant from "@minswap/tiny-invariant";
import * as T from "@minswap/translucent";
import * as fs from "fs";
import path from "path";
import { AlwaysSuccessSpend } from "../../amm-plutus";
import {
  collectMinswapValidators,
  collectValidators,
  deployValidators,
  type DeployedValidators,
  type MinswapValidators,
  type Validators,
} from "../deploy-validators";
import logger from "../logger";
import type {
  Address,
  Credential,
  LbeScript,
  OutRef,
  Script,
  Translucent,
  UTxO,
} from "../types";

const DEPLOY_TO =
  "addr_test1qrtu7cmf73668t8a68n0g3s4n5eas764ffc8knxnmvrrzsqlzcsaav6q4nwlv8gpazkdylxqmq2pselxvj35s46lauqsmlauwm";

type LbeParams = {
  minswap: {
    poolStakeCredential: Credential;
    seedOutRef: OutRef;
    authenRef: OutRef;
    factoryRef: OutRef;
    poolRef: OutRef;
    poolBatchingRef: OutRef;
  };
  seedOutRef: OutRef;
};

type WarehouseSetUpConfigs = {
  t: Translucent;
  params: LbeParams;
  scripts: LbeScript;
  validators: Validators;
  minswapValidators: MinswapValidators;
  deployedValidators?: DeployedValidators;
};

class WarehouseSetUp {
  t: Translucent;
  params: LbeParams;
  scripts: LbeScript;
  validators: Validators;
  minswapValidators: MinswapValidators;
  deployedValidators: DeployedValidators | undefined;

  private constructor(configs: WarehouseSetUpConfigs) {
    let {
      t,
      params,
      scripts,
      validators,
      minswapValidators,
      deployedValidators,
    } = configs;
    this.t = t;
    this.params = params;
    this.scripts = scripts;
    this.validators = validators;
    this.minswapValidators = minswapValidators;
    this.deployedValidators = deployedValidators;
  }

  static async new(t: Translucent): Promise<WarehouseSetUp> {
    let params = JSON.parse(
      fs.readFileSync(path.resolve("params.json"), "utf-8"),
    );
    let scripts: LbeScript = JSON.parse(
      fs.readFileSync(path.resolve("lbe-v2-script.json"), "utf-8"),
    );
    let minswapValidators = collectMinswapValidators({
      t,
      seedOutRef: params.minswap!.seedOutRef! as OutRef,
      poolStakeCredential: params.minswap!.poolStakeCredential! as Credential,
    });
    let validators = collectValidators({
      t,
      seedOutRef: params.seedOutRef! as OutRef,
    });
    let deployedValidators: DeployedValidators | undefined = undefined;
    if (!scripts.factoryRefInput) {
      deployedValidators = await deployValidators(t, validators, DEPLOY_TO);
    }
    let W = new WarehouseSetUp({
      t,
      params,
      scripts,
      validators,
      minswapValidators,
      deployedValidators,
    });
    return W;
  }

  async setup() {
    let setupAmmRef = async (options: {
      tag: string;
      validator: Script;
      outRef: OutRef;
    }): Promise<string> => {
      let { tag, validator, outRef } = options;
      console.log(outRef);
      let refUtxo = (await this.t.utxosByOutRef([outRef]))[0];
      let validatorHash = this.t.utils.validatorToScriptHash(
        refUtxo.scriptRef!,
      );
      let hash = this.t.utils.validatorToScriptHash(validator);
      invariant(validatorHash === hash, `${tag} hash missmatch`);
      let refInputHex = T.toHex(T.utxoToCore(refUtxo).to_bytes());
      let cur = (this.scripts as any)[tag];
      if (cur) {
        invariant(cur == refInputHex, `${tag} missmatch`);
      }
      return refInputHex;
    };

    let setupValidatorHash = (tag: string, script: Script): string => {
      let cur = (this.scripts as any)[tag];
      let hash = this.t.utils.validatorToScriptHash(script);
      if (cur) {
        invariant(cur === hash, `${tag} missmatch`);
      }
      return hash;
    };

    let setupValidatorAddress = (tag: string, script: Script): Address => {
      let cur = (this.scripts as any)[tag];
      let address = this.t.utils.validatorToAddress(script);
      if (cur) {
        invariant(cur === address, `${tag} missmatch`);
      }
      return address;
    };

    let setupOutRef = (tag: string, utxo?: UTxO): OutRef => {
      let cur = (this.scripts as any)[tag];
      if (!utxo) {
        invariant(cur, `${tag} is undefined`);
        return cur;
      }
      let outRef: OutRef = {
        txHash: utxo.txHash,
        outputIndex: utxo.outputIndex,
      };
      if (cur) {
        invariant(cur === outRef, `${tag} missmatch`);
      }
      return outRef;
    };

    let setupRefInput = (tag: string, utxo?: UTxO): string => {
      let cur = (this.scripts as any)[tag];
      if (!utxo) {
        invariant(cur, `${tag} is undefined`);
        return cur;
      }
      let refInputHex = T.toHex(T.utxoToCore(utxo).to_bytes());
      if (cur) {
        invariant(cur === refInputHex, `${tag} missmatch`);
      }
      return refInputHex;
    };

    let lbeScript: LbeScript = {
      factoryRefInput: setupRefInput(
        "factoryRefInput",
        this.deployedValidators?.factoryValidator,
      ),
      treasuryRefInput: setupRefInput(
        "treasuryRefInput",
        this.deployedValidators?.treasuryValidator,
      ),
      managerRefInput: setupRefInput(
        "managerRefInput",
        this.deployedValidators?.managerValidator,
      ),
      sellerRefInput: setupRefInput(
        "sellerRefInput",
        this.deployedValidators?.sellerValidator,
      ),
      orderRefInput: setupRefInput(
        "orderRefInput",
        this.deployedValidators?.orderValidator,
      ),
      factoryAddress: setupValidatorAddress(
        "factoryAddress",
        this.validators.factoryValidator,
      ),
      treasuryAddress: setupValidatorAddress(
        "treasuryAddress",
        this.validators.treasuryValidator,
      ),
      managerAddress: setupValidatorAddress(
        "managerAddress",
        this.validators.managerValidator,
      ),
      sellerAddress: setupValidatorAddress(
        "sellerAddress",
        this.validators.sellerValidator,
      ),
      orderAddress: setupValidatorAddress(
        "orderAddress",
        this.validators.orderValidator,
      ),
      factoryRewardAddress: this.t.utils.validatorToRewardAddress(
        this.validators.factoryValidator,
      ),
      factoryHash: setupValidatorHash(
        "factoryHash",
        this.validators.factoryValidator,
      ),
      treasuryHash: setupValidatorHash(
        "treasuryHash",
        this.validators.treasuryValidator,
      ),
      managerHash: setupValidatorHash(
        "managerHash",
        this.validators.managerValidator,
      ),
      sellerHash: setupValidatorHash(
        "sellerHash",
        this.validators.sellerValidator,
      ),
      orderHash: setupValidatorHash(
        "orderHash",
        this.validators.orderValidator,
      ),
      seedOutRef: this.params.seedOutRef,
      factoryOutRef: setupOutRef(
        "factoryOutRef",
        this.deployedValidators?.factoryValidator,
      ),
      treasuryOutRef: setupOutRef(
        "treasuryOutRef",
        this.deployedValidators?.treasuryValidator,
      ),
      managerOutRef: setupOutRef(
        "managerOutRef",
        this.deployedValidators?.managerValidator,
      ),
      sellerOutRef: setupOutRef(
        "sellerOutRef",
        this.deployedValidators?.sellerValidator,
      ),
      orderOutRef: setupOutRef(
        "orderOutRef",
        this.deployedValidators?.orderValidator,
      ),
      ammAuthenRefInput: await setupAmmRef({
        tag: "ammAuthenRefInput",
        validator: this.minswapValidators.authenValidator,
        outRef: this.params!.minswap.authenRef,
      }),
      ammFactoryRefInput: await setupAmmRef({
        tag: "ammFactoryRefInput",
        validator: this.minswapValidators.factoryValidator,
        outRef: this.params!.minswap.factoryRef,
      }),
      ammPoolRefInput: await setupAmmRef({
        tag: "ammPoolRefInput",
        validator: this.minswapValidators.poolValidator,
        outRef: this.params!.minswap.poolRef,
      }),
      ammSeedOutRef: this.params.minswap.seedOutRef,
      ammAuthenHash: setupValidatorHash(
        "ammAuthenHash",
        this.minswapValidators.authenValidator,
      ),
      ammFactoryHash: setupValidatorHash(
        "ammFactoryHash",
        this.minswapValidators.factoryValidator,
      ),
      ammPoolHash: setupValidatorHash(
        "ammPoolHash",
        this.minswapValidators.poolValidator,
      ),
      ammPoolBatchingHash: setupValidatorHash(
        "ammPoolBatchingHash",
        this.minswapValidators.poolBatchingValidator,
      ),
      ammPoolStakeCredential: this.params.minswap.poolStakeCredential,
    };

    const jsonData = JSON.stringify(lbeScript, null, 2);
    fs.writeFile("lbe-v2-script.json", jsonData, "utf8", (err) => {
      if (err) {
        console.error("Error writing JSON file:", err);
        return;
      }
      console.log("lbe-v2-script.json file has been saved.");
    });

    const script = {
      "factoryHash": lbeScript.factoryHash,
      "treasuryHash": lbeScript.treasuryHash,
      "managerHash": lbeScript.managerHash,
      "sellerHash": lbeScript.sellerHash,
      "orderHash": lbeScript.orderHash,
      factoryScript: this.deployedValidators?.factoryValidator.scriptRef!.script,
      treasuryScript: this.deployedValidators?.treasuryValidator.scriptRef!.script,
      managerScript: this.deployedValidators?.managerValidator.scriptRef!.script,
      sellerScript: this.deployedValidators?.sellerValidator.scriptRef!.script,
      orderScript: this.deployedValidators?.orderValidator.scriptRef!.script,
      "factoryAddress": lbeScript.factoryAddress,
      "treasuryAddress": lbeScript.treasuryAddress,
      "managerAddress": lbeScript.managerAddress,
      "sellerAddress": lbeScript.sellerAddress,
      "orderAddress": lbeScript.orderAddress,
      "factoryRewardAddress": lbeScript.factoryRewardAddress,
    }
    fs.writeFile("script.json", JSON.stringify(script, null, 2), "utf8", (err) => {
      if (err) {
        console.error("Error writing JSON file:", err);
        return;
      }
      console.log("script.json file has been saved.");
    });

    const reference = {
      "factoryRefInput": lbeScript.factoryRefInput,
      "treasuryRefInput":lbeScript.treasuryRefInput,
      "managerRefInput": lbeScript.managerRefInput,
      "sellerRefInput": lbeScript.sellerRefInput,
      "orderRefInput": lbeScript.orderRefInput,
      "factoryTxId": "834e0958594e51c525363bbdabd0cdbe773a358ac2e2c8321cc3f645b30335ae#0",
      "treasuryTxId": "a5b0274543fbad4ca79798be047317a0b4b270ab6011dd7e08fc663ba6ee1f32#0",
      "managerTxId": "f0c8a033bf84faad54e70c9882057a422fa1ee257843fad0a07aa5eb7ee9ebaf#0",
      "sellerTxId": "a15c06f2fa3e91359136b346eae43997311644320e18a0c5f2ea40c8127c9284#0",
      "orderTxId": "a08042f93335157e6dd8e87feef448d5e9000f60ef14cbe19ae365c8de9bead8#0"
    }
    
    fs.writeFile("reference.json", JSON.stringify(reference, null, 2), "utf8", (err) => {
      if (err) {
        console.error("Error writing JSON file:", err);
        return;
      }
      console.log("reference.json file has been saved.");
    });
  }

  async registerStake() {
    let lbeV2Script: LbeScript = JSON.parse(
      fs.readFileSync(path.resolve("lbe-v2-script.json"), "utf-8"),
    );
    const tx = await this.t
      .newTx()
      .registerStake(lbeV2Script.factoryRewardAddress)
      .complete();
    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();
    logger.info(`register txHash ${txHash}`);
    await this.t.awaitTx(txHash);
  }

  static async genSeed(t: Translucent) {
    const secretNumber = parseInt(process.argv[5] ?? "42");
    invariant(secretNumber, "not found secret Number");
    const C = T.CModuleLoader.get;
    const alwaysSuccessValidator = new AlwaysSuccessSpend();
    const scriptAddress = t.utils.validatorToAddress(alwaysSuccessValidator);
    const plutusData = C.PlutusData.new_integer(
      C.BigInt.from_str(secretNumber.toString()),
    );
    const datum = T.toHex(plutusData.to_bytes());
    const tx = await t
      .newTx()
      .payToContract(scriptAddress, datum, {})
      .complete({ witnessSet: { plutusData: [datum] } });

    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();
    logger.info(`paying to always success ${txHash}`);
    await t.awaitTx(txHash);

    const params = JSON.parse(
      fs.readFileSync(path.resolve("params.json"), "utf-8"),
    );
    const newParams = {
      ...params,
      seedOutRef: {
        txHash,
        outputIndex: 0,
      },
    };
    const jsonData = JSON.stringify(newParams, null, 2);
    fs.writeFile("params.json", jsonData, "utf8", (err) => {
      if (err) {
        console.error("Error writing JSON file:", err);
        return;
      }
      console.log("params.json file has been saved.");
    });
  }
}

let main = async () => {
  logger.info("Start | set-up");
  await T.loadModule();
  await T.CModuleLoader.load();

  const seedPhase =
    "voyage private emerge bunker laundry before drastic throw scout damp budget adult wonder charge sister route jacket sound undo dwarf dignity quit cat erode";
  let protocolParameters = {
    ...T.PROTOCOL_PARAMETERS_DEFAULT,
    maxTxSize: 36384,
  };
  const emulator = new T.Emulator([], protocolParameters);
  let t = await T.Translucent.new(emulator, "Preprod");
  t.selectWalletFromSeed(seedPhase);
  const params = JSON.parse(
    fs.readFileSync(path.resolve("params.json"), "utf-8"),
  );
  // add seed utxo
  emulator.addUTxO({
    txHash: params.seedOutRef.txHash,
    outputIndex: params.seedOutRef.outputIndex,
    assets: {
      lovelace: 100_000_000_000n,
    },
    address: await t.wallet.address(),
  });

  const maestro = new T.Maestro({
    network: "Preprod",
    apiKey: "E0n5jUy4j40nhKCuB7LrYabTNieG0egu",
  });
  const refUtxos = await maestro.getUtxosByOutRef([
    params.minswap.authenRef,
    params.minswap.factoryRef,
    params.minswap.poolBatchingRef,
    params.minswap.poolRef,
    params.minswap.seedOutRef,
  ]);

  // add amm seed utxo
  for (let u of refUtxos) {
    emulator.addUTxO(u);
  }

  let warehouseSetUp = await WarehouseSetUp.new(t);
  await warehouseSetUp.setup();
  await warehouseSetUp.registerStake();
  logger.info("Finish | set-up");
};

main();
