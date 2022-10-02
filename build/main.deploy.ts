import * as main from "../contracts/main";
import { Address, toNano, TonClient, TupleSlice, WalletContract } from "ton";
import { sendInternalMessageWithWallet } from "../test/helpers";
import BN from "bn.js";

// return the init Cell of the contract storage (according to load_data() contract method)
export function initData(commission_address: string, owner_address: string) {
  const randomNumber = new BN(Math.floor(Math.random() * 100000));
  return main.data({
    randomNumber: randomNumber,
    commissionAddress: Address.parseFriendly(commission_address).address,
    ownerAddress: Address.parseFriendly(owner_address).address
  });
}

// return the op that should be sent to the contract on deployment, can be "null" to send an empty message
export function initMessage() {
  return main.deposit();
}

// optional end-to-end sanity test for the actual on-chain contract to see it is actually working on-chain
export async function postDeployTest(walletContract: WalletContract, secretKey: Buffer, contractAddress: Address) {
  // const call = await walletContract.client.callGetMethod(contractAddress, "owner_address");
  // const counter = new TupleSlice(call.stack).readCell().beginParse().readAddress();
  // console.log(`   # Getter 'owner_address' = ${counter!.toString()}`);


  // const call3 = await walletContract.client.callGetMethod(contractAddress, "balance");
  // const counter3 = new TupleSlice(call3.stack).readBigNumber();
  // console.log(`   # Getter 'balance' = ${counter3.toString()}`);

  const message = main.deposit();
  await sendInternalMessageWithWallet({ walletContract, secretKey, to: contractAddress, value: toNano(0.05), body: message });
  console.log(`   # Sent 'increment' op message`);

  const call2 = await walletContract.client.callGetMethod(contractAddress, "balance");
  const counter2 = new TupleSlice(call2.stack).readBigNumber();
  console.log(`   # Getter 'balance' = ${counter2.toString()}`);


  // TEST

  // const message1 = main.withdraw({ withdrawAmount: toNano(0.01), withdrawAddress: Address.parseFriendly(SEND_TO_ADDRESS).address });
  // await sendInternalMessageWithWallet({ walletContract, secretKey, to: contractAddress, value: toNano(0.02), body: message1 });
  // console.log(`   # Sent 'increment' op message`);
}
