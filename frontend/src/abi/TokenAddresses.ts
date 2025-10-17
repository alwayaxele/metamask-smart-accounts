
/*
  This file is auto-generated.
  Command: 'npm run genabi'
*/
export const TokenAddresses = {
  "10143": {
    chainId: 10143,
    chainName: "monad",
    tokens: {
      USDC: { name: "USDC Token", symbol: "USDC", address: "0x2Ea973542a227E9ee0ad754Bef78e673d10eD93F" as const },
      USDT: { name: "Tether Token", symbol: "USDT", address: "0x024Ba065Eeeb8C0ADBb9be64d4E58BF9CdfDdf61" as const },
      BTC: { name: "Bitcoin", symbol: "BTC", address: "0x6CA1DF273345c2BD103cCc5f2f7B8b38bBCb3b70" as const },
      ETH: { name: "Ethereum", symbol: "ETH", address: "0xE1eA01fB5aE3066D56ab778cC03d4700975eFCbC" as const }
    }
  },
  "11155111": {
    chainId: 11155111,
    chainName: "sepolia",
    tokens: {
      USDC: { name: "USDC Token", symbol: "USDC", address: "0x69Ab00d96FD2605C20d4FB15C348A7561826212e" as const },
      USDT: { name: "Tether Token", symbol: "USDT", address: "0x31D4d520c397B3169627dE49a8065A470A9ADbf3" as const },
      BTC: { name: "Bitcoin", symbol: "BTC", address: "0x24106438a4EdBDaAb3ec42A258A8B52bB9813CbC" as const },
      ETH: { name: "Ethereum", symbol: "ETH", address: "0x5f3b4c60780545aCe26dB30B76691D13E0cEC2a5" as const }
    }
  }
};

// Helper to get token by symbol
export function getTokenAddress(chainId: number, symbol: string): string | undefined {
  const chain = TokenAddresses[chainId.toString() as keyof typeof TokenAddresses];
  if (!chain) return undefined;
  return chain.tokens[symbol as keyof typeof chain.tokens]?.address;
}

// Export list of all tokens on chain
export function getTokens(chainId: number) {
  const chain = TokenAddresses[chainId.toString() as keyof typeof TokenAddresses];
  if (!chain) return [];
  return Object.values(chain.tokens);
}
