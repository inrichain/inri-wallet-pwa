import { ethers } from "ethers";

export function deriveAddressesFromMnemonic(mnemonic: string, count: number) {
  const list = [];

  for (let i = 0; i < count; i++) {
    const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, `m/44'/60'/0'/0/${i}`);
    list.push({
      index: i,
      address: wallet.address
    });
  }

  return list;
}

export function walletFromMnemonicIndex(mnemonic: string, index: number) {
  return ethers.HDNodeWallet.fromPhrase(
    mnemonic,
    undefined,
    `m/44'/60'/0'/0/${index}`
  );
}