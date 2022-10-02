import * as main from "../contracts/main";
import { Address } from "ton";
import BN from "bn.js";

export function initData(commission_address: string, owner_address: string) {
  const randomNumber = new BN(Math.floor(Math.random() * 100000));
  return main.data({
    randomNumber: randomNumber,
    commissionAddress: Address.parseFriendly(commission_address).address,
    ownerAddress: Address.parseFriendly(owner_address).address
  });
}

export function initMessage() {
  return main.deposit();
}
