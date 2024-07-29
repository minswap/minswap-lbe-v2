import invariant from "@minswap/tiny-invariant";
import * as T from "@minswap/translucent";
import * as fs from "fs";
import path from "path";
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
  MaestroSupportedNetworks,
  OutRef,
  Script,
  Translucent,
  UTxO,
} from "../types";

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

const getParams = () => {
  let network = process.env["NETWORK"];
  let maestroApiKey = process.env["MAESTRO_KEY"];
  let fromSeedPhase = process.env["FROM_SEED_PHASE"];
  let toSeedPhase = process.env["TO_SEED_PHASE"];
  let toAddress = process.env["TO_ADDRESS"];

  invariant(network, "missing network");
  invariant(maestroApiKey, "missing maestroApiKey");
  invariant(fromSeedPhase, "missing fromSeedPhase");
  invariant(toSeedPhase, "missing toSeedPhase");
  invariant(toAddress, "missing toAddress");

  return {
    network: network as MaestroSupportedNetworks,
    maestroApiKey,
    fromSeedPhase,
    toSeedPhase,
    toAddress,
  };
};

type WarehouseSetUpConfigs = {
  t: Translucent;
  params: LbeParams;
  scripts: LbeScript;
  validators: Validators;
  minswapValidators: MinswapValidators;
  deployedValidators?: DeployedValidators;
  toAddress: Address;
};

class WarehouseSetUp {
  t: Translucent;
  params: LbeParams;
  scripts: LbeScript;
  validators: Validators;
  minswapValidators: MinswapValidators;
  deployedValidators: DeployedValidators | undefined;
  toAddress: Address;

  private constructor(configs: WarehouseSetUpConfigs) {
    let {
      t,
      params,
      scripts,
      validators,
      minswapValidators,
      deployedValidators,
      toAddress,
    } = configs;
    this.t = t;
    this.params = params;
    this.scripts = scripts;
    this.validators = validators;
    this.minswapValidators = minswapValidators;
    this.deployedValidators = deployedValidators;
    this.toAddress = toAddress;
  }

  static async new(
    t: Translucent,
    toAddress: Address,
  ): Promise<WarehouseSetUp> {
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
      deployedValidators = await deployValidators(t, validators, toAddress);
    }
    let W = new WarehouseSetUp({
      t,
      params,
      scripts,
      validators,
      minswapValidators,
      deployedValidators,
      toAddress,
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

  static async genSeed(t: Translucent, toAddress: string) {
    const completeTx = await t
      .newTx()
      .payToAddress(toAddress, { lovelace: 2_000_000n })
      .complete();
    const signedTx = await completeTx.sign().complete();
    const txHash = await signedTx.submit();

    logger.info(`paying to Seed Address success ${txHash}`);
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
  const inputParams = getParams();
  let { network, maestroApiKey, fromSeedPhase, toAddress } = inputParams;
  let maestro = new T.Maestro({ network, apiKey: maestroApiKey });
  let t = await T.Translucent.new(maestro, network);
  t.selectWalletFromSeed(fromSeedPhase);

  logger.info(`from wallet address: ${await t.wallet.address()}`);
  logger.info(`to wallet address: ${toAddress}`);

  await WarehouseSetUp.genSeed(t, toAddress);
  let warehouseSetUp = await WarehouseSetUp.new(t, toAddress);
  await warehouseSetUp.setup();
  await warehouseSetUp.registerStake();

  logger.info("Finish | set-up");
};

main();
