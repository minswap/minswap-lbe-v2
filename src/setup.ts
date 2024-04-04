import { Maestro, Translucent, type UTxO } from "translucent-cardano";
import { generateMinswapParams, type GenerateMinswapParams } from "./minswap-amm";
import { buildInitFactory } from "./build-tx";
import { collectValidators, utxo2ORef, type DeployedValidators, type Validators, quickSubmit } from "./utils";
import { deployValidators } from "./deploy_validators";

let lucid: Translucent;
let validators: Validators;
let minswapData: GenerateMinswapParams;
let seedUtxo: UTxO;
let deployedValidators: DeployedValidators;

async function main() {
  const network = "Preprod";
  const provider = new Maestro({
    network,
    apiKey: "7TEJmbeCv6zlzJhGAdSoDI8xb5Kgk7lg",
  });
  lucid = await Translucent.new(provider, network);
  minswapData = generateMinswapParams();

  lucid.selectWalletFromSeed("corn hollow run team clip abuse grant trick opinion idle egg federal risk cover giant erase recall rude deal survey moon now exhibit regular");
  const seedAddress = await lucid.wallet.address();
  console.log("seed Address: ", seedAddress);
  seedUtxo = (await lucid.utxosAt(seedAddress))[0];
  validators = collectValidators(lucid, utxo2ORef(seedUtxo));

  console.log("authenValidator", lucid.utils.validatorToAddress(validators.authenValidator));
  console.log("treasuryValidator", lucid.utils.validatorToAddress(validators.treasuryValidator));
  console.log("orderValidator", lucid.utils.validatorToAddress(validators.orderValidator));
  console.log("orderSpendingValidator", lucid.utils.validatorToAddress(validators.orderSpendingValidator));
  console.log("factoryValidator", lucid.utils.validatorToAddress(validators.factoryValidator));

  deployedValidators = await deployValidators(lucid, validators);
  console.log("deploy validators success");

  // registerStake
  await quickSubmit(lucid)({
    txBuilder: lucid
      .newTx()
      .registerStake(
        lucid.utils.validatorToRewardAddress(
          validators.orderSpendingValidator,
        ),
      ),
  });
  console.info("Register Order Order Spending Validator");

  const initFactoryBuilder = buildInitFactory({
    lucid,
    tx: lucid.newTx(),
    validatorRefs: {
      validators,
      deployedValidators,
    },
    seedUtxo,
  });
  await quickSubmit(lucid)({
    txBuilder: initFactoryBuilder.txBuilder,
  });
  console.info("Init Factory done");

}

main();