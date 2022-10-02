import BN from "bn.js";
import { Cell, beginCell, Address, toNano } from "ton";

// encode contract storage according to save_data() contract method
export function data(params: { randomNumber: BN, ownerAddress: Address, commissionAddress: Address }): Cell {
  return beginCell().storeAddress(params.ownerAddress).storeAddress(params.commissionAddress).storeUint(params.randomNumber, 32).endCell();
}

// message encoders for all ops (see contracts/imports/constants.fc for consts)

export function deposit(): Cell {
  return beginCell().storeUint(0x47d54391, 32).storeUint(0, 64).endCell();
}

export function withdraw(params: { withdrawAmount: BN, withdrawAddress: Address }): Cell {
  return beginCell().storeUint(0x41836980, 32).storeUint(0, 64).storeCoins(params.withdrawAmount).storeAddress(params.withdrawAddress).endCell();
}

export function transferOwnership(params: { newOwnerAddress: Address }): Cell {
  return beginCell().storeUint(0x2da38aaf, 32).storeUint(0, 64).storeAddress(params.newOwnerAddress).endCell();
}
