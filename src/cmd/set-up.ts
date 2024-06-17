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
import type {
  Address,
  Credential,
  MaestroSupportedNetworks,
  OutRef,
  Script,
  Translucent,
  UTxO,
} from "../types";
import invariant from "@minswap/tiny-invariant";

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

type LbeScript = {
  factoryRefInput: string; // hex<UTxO>
  treasuryRefInput: string; // hex<UTxO>
  managerRefInput: string; // hex<UTxO>
  sellerRefInput: string; // hex<UTxO>
  orderRefInput: string; // hex<UTxO>

  factoryAddress: string;
  treasuryAddress: string;
  managerAddress: string;
  sellerAddress: string;
  orderAddress: string;

  factoryHash: string;
  treasuryHash: string;
  managerHash: string;
  sellerHash: string;
  orderHash: string;

  seedOutRef: OutRef;
  factoryOutRef: OutRef;
  treasuryOutRef: OutRef;
  managerOutRef: OutRef;
  sellerOutRef: OutRef;
  orderOutRef: OutRef;

  // Minswap AMM
  ammAuthenRefInput: string;
  ammFactoryRefInput: string;
  ammPoolRefInput: string;

  ammSeedOutRef: OutRef;
  ammPoolStakeCredential: Credential;
  ammAuthenHash: string;
  ammFactoryHash: string;
  ammPoolHash: string;
  ammPoolBatchingHash: string;
};

const getParams = () => {
  let network: MaestroSupportedNetworks = process
    .argv[2] as MaestroSupportedNetworks;
  let maestroApiKey = process.argv[3];
  let seedPhase = process.argv[4];
  return {
    network,
    maestroApiKey,
    seedPhase,
  };
};
type Params = ReturnType<typeof getParams>;

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

  static async new(options: Params): Promise<WarehouseSetUp> {
    let { network, maestroApiKey, seedPhase } = options;
    let maestro = new T.Maestro({ network, apiKey: maestroApiKey });
    let t = await T.Translucent.new(maestro, network);
    t.selectWalletFromSeed(seedPhase);
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
}

let main = async () => {
  await T.loadModule();
  await T.CModuleLoader.load();
  let warehouseSetUp = await WarehouseSetUp.new(getParams());
  await warehouseSetUp.setup();
};

main();
