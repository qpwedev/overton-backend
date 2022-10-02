// This is a simple generic deploy script in TypeScript that should work for most projects without modification
// Every contract you want to deploy should have a mycontract.deploy.ts script that returns its init data
// The script assumes that it is running from the repo root, and the directories are organized this way:
//  ./build/ - directory for build artifacts (mycontract.compiled.json) and deploy init data scripts (mycontract.deploy.ts)
//  ./.env - config file with DEPLOYER_MNEMONIC - secret mnemonic of deploying wallet (will be created if not found)

import axios from "axios";
import axiosThrottle from "axios-request-throttle";
axiosThrottle.use(axios, { requestsPerSecond: 0.5 }); // required since toncenter jsonRPC limits to 1 req/sec without API key

import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import glob from "fast-glob";
import { Address, beginCell, Cell, StateInit, toNano } from "ton";
import { TonClient, WalletContract, contractAddress } from "ton";
import { mnemonicNew } from "ton-crypto";

const COMMISSION_ADDRESS = "EQC3iRufmBujI4IJKvl4eWO-14eb5zKNSCBuOg2eNnhETxAx";

export async function main(owner_address: string): Promise<Array<string>> {
  console.log(`=================================================================`);
  console.log(`Deploy script running, let's find some contracts to deploy..`);

  const isTestnet = process.env.TESTNET || process.env.npm_lifecycle_event == "deploy:testnet";

  // check input arguments (given through environment variables)
  if (isTestnet) {
    console.log(`\n* We are working with 'testnet'`);
  } else {
    console.log(`\n* We are working with 'mainnet'`);
  }

  // initializ e globals
  const client = new TonClient({ endpoint: `https://${isTestnet ? "testnet." : ""}toncenter.com/api/v2/jsonRPC`, apiKey: "26a360b96446a5c9ff5a3dd16d4ae8731840d5efcb22c0a08e71be18c1662535" });
  const deployerWalletType = "org.ton.wallets.v3.r2"; // also see WalletV3R2Source class used below
  const newContractFunding = toNano(0.02); // this will be (almost in full) the balance of a new deployed contract and allow it to pay rent
  const workchain = 0; // normally 0, only special contracts should be deployed to masterchain (-1)

  // make sure we have a wallet mnemonic to deploy from (or create one if not found)
  const deployConfigEnv = ".env";
  let deployerMnemonic;
  if (!fs.existsSync(deployConfigEnv) || !process.env.DEPLOYER_MNEMONIC) {
    console.log(`\n* Config file '${deployConfigEnv}' not found, creating a new wallet for deploy..`);
    deployerMnemonic = (await mnemonicNew(24)).join(" ");
    const deployWalletEnvContent = `DEPLOYER_WALLET=${deployerWalletType}\nDEPLOYER_MNEMONIC="${deployerMnemonic}"\n`;
    fs.writeFileSync(deployConfigEnv, deployWalletEnvContent);
    console.log(` - Created new wallet in '${deployConfigEnv}' - keep this file secret!`);
  } else {
    console.log(`\n* Config file '${deployConfigEnv}' found and will be used for deployment!`);
    deployerMnemonic = process.env.DEPLOYER_MNEMONIC;
  }

  // go over all the contracts we have deploy scripts for
  const rootContracts = glob.sync(["build/*.deploy.ts"]);
  for (const rootContract of rootContracts) {
    // deploy a new root contract
    console.log(`\n* Found root contract '${rootContract} - let's deploy it':`);
    const contractName = path.parse(path.parse(rootContract).name).name;

    // prepare the init data cell
    const deployInitScript = require(__dirname + "/../" + rootContract);
    if (typeof deployInitScript.initData !== "function") {
      console.log(` - ERROR: '${rootContract}' does not have 'initData()' function`);
      process.exit(1);
    }
    const initDataCell = deployInitScript.initData(COMMISSION_ADDRESS, owner_address) as Cell;

    // prepare the init message
    if (typeof deployInitScript.initMessage !== "function") {
      console.log(` - ERROR: '${rootContract}' does not have 'initMessage()' function`);
      process.exit(1);
    }
    const initMessageCell = deployInitScript.initMessage() as Cell | null;

    // prepare the init code cell
    const hexArtifact = `build/${contractName}.compiled.json`;
    if (!fs.existsSync(hexArtifact)) {
      console.log(` - ERROR: '${hexArtifact}' not found, did you build?`);
      process.exit(1);
    }
    const initCodeCell = Cell.fromBoc(JSON.parse(fs.readFileSync(hexArtifact).toString()).hex)[0];

    const newContractAddress = contractAddress({ workchain, initialData: initDataCell, initialCode: initCodeCell });



    const cell = beginCell().endCell();

    (new StateInit({ data: initDataCell, code: initCodeCell })).writeTo(cell);

    const sInitSerialized = cell.toBoc().toString('base64');
    const initMessageCellSerialized = initMessageCell?.toBoc().toString('base64');



    return [newContractAddress.toFriendly({ urlSafe: true }), sInitSerialized, initMessageCellSerialized!];


    // // deploy by sending an internal message to the deploying wallet
    // console.log(` - Let's deploy the contract on-chain..`);
    // const seqno = await walletContract.getSeqNo();
    // const transfer = walletContract.createTransfer({
    //   secretKey: walletKey.secretKey,
    //   seqno: seqno,
    //   sendMode: SendMode.PAY_GAS_SEPARATLY + SendMode.IGNORE_ERRORS,
    //   order: new InternalMessage({
    //     to: newContractAddress,
    //     value: newContractFunding,
    //     bounce: false,
    //     body: new CommonMessageInfo({
    //       stateInit: new StateInit({ data: initDataCell, code: initCodeCell }),
    //       body: initMessageCell !== null ? new CellMessage(initMessageCell) : null,
    //     }),
    //   }),
    // });

    // const data = initDataCell.toBoc().toString("base64") + initCodeCell.toBoc().toString("base64") +
    //   await client.sendExternalMessage(walletContract, transfer);
    // console.log(` - Deploy transaction sent successfully`);

    // // make sure that the contract was deployed
    // console.log(` - Block explorer link: https://${process.env.TESTNET ? "test." : ""}tonwhales.com/explorer/address/${newContractAddress.toFriendly()}`);
    // console.log(` - Waiting up to 20 seconds to check if the contract was actually deployed..`);
    // for (let attempt = 0; attempt < 10; attempt++) {
    //   await sleep(2000);
    //   const seqnoAfter = await walletContract.getSeqNo();
    //   if (seqnoAfter > seqno) break;
    // }
    // if (await client.isContractDeployed(newContractAddress)) {
    //   console.log(` - SUCCESS! Contract deployed successfully to address: ${newContractAddress.toFriendly()}`);
    //   const contractBalance = await client.getBalance(newContractAddress);
    //   console.log(` - New contract balance is now ${fromNano(contractBalance)} TON, make sure it has enough to pay rent`);
    //   await performPostDeploymentTest(rootContract, deployInitScript, walletContract, walletKey.secretKey, newContractAddress);
    // } else {
    //   console.log(` - FAILUtract address still looks uninitialized: ${newContractAddress.toFriendly()}`);
    // }
  }
  console.log(``);

  return [];
}

// main().then(item => console.log(item))

// helpers

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function performPostDeploymentTest(rootContract: string, deployInitScript: any, walletContract: WalletContract, secretKey: Buffer, newContractAddress: Address) {
  if (typeof deployInitScript.postDeployTest !== "function") {
    console.log(` - Not running a post deployment test, '${rootContract}' does not have 'postDeployTest()' function`);
    return;
  }
  console.log(` - Running a post deployment test:`);
  await deployInitScript.postDeployTest(walletContract, secretKey, newContractAddress);
}

