import { ethers } from "ethers";

export function createMnemonic12(): string {
  const wallet = ethers.Wallet.createRandom();
  return wallet.mnemonic?.phrase || "";
}

export function isValidMnemonic(m: string): boolean {
  return ethers.Mnemonic.isValidMnemonic(m);
}