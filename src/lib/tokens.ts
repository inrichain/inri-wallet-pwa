export type Token = {
  symbol: string;
  address: string;
  decimals: number;
  logo?: string;
};

export const TOKENS: Token[] = [
  {
    symbol: "iUSD",
    address: "0x116b2fF23e062A52E2c0ea12dF7e2638b62Fa0FC",
    decimals: 6,
    logo: "/token-iusd.png",
  },
  {
    symbol: "WINRI",
    address: "0x8731F1709745173470821eAeEd9BC600EEC9A3D1",
    decimals: 18,
    logo: "/token-winri.png",
  },
  {
    symbol: "DNR",
    address: "0xDa9541bB01d9EC1991328516C71B0E539a97d27f",
    decimals: 18,
    logo: "/token-dnr.png",
  },
];