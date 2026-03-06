const KEY = "inri_history";

export function getTx(address: string) {
  const data = JSON.parse(localStorage.getItem(KEY) || "{}");
  return data[address] || [];
}

export function addTx(address: string, tx: any) {
  const data = JSON.parse(localStorage.getItem(KEY) || "{}");

  if (!data[address]) data[address] = [];

  data[address].push(tx);

  localStorage.setItem(KEY, JSON.stringify(data));
}