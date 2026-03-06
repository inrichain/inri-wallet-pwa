const KEY = "inri_vault";

export function loadVault() {
  const v = localStorage.getItem(KEY);
  if (!v) return null;
  return JSON.parse(v);
}

export function saveVault(vault: any) {
  localStorage.setItem(KEY, JSON.stringify(vault));
}

export function clearVault() {
  localStorage.removeItem(KEY);
}

export async function encryptMnemonicToVault(mnemonic: string, password: string) {
  return {
    mnemonic,
    password
  };
}

export async function decryptMnemonicFromVault(vault: any, password: string) {
  if (vault.password !== password) {
    throw new Error("wrong password");
  }
  return vault.mnemonic;
}