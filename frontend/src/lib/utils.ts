/**
 * Parse chainId from various formats
 * Handles both wagmi chainId (number) and Privy wallet chainId (string like "eip155:11155111")
 */
export function parseChainId(chainIdStr: string | number | undefined): number | undefined {
  if (!chainIdStr) return undefined;
  if (typeof chainIdStr === 'number') return chainIdStr;
  if (typeof chainIdStr === 'string' && chainIdStr.includes(':')) {
    return parseInt(chainIdStr.split(':')[1]);
  }
  return parseInt(chainIdStr);
}

/**
 * Get chain name from chainId
 */
export function getChainName(chainId: number | undefined | null): string {
  if (chainId === 11155111) return "Sepolia";
  if (chainId === 10143) return "Monad Testnet";
  return "Unknown";
}

/**
 * Get block explorer URL from chainId
 */
export function getExplorerUrl(chainId: number | undefined | null): string {
  if (chainId === 11155111) return "https://sepolia.etherscan.io";
  if (chainId === 10143) return "https://testnet.monadexplorer.com";
  return "";
}

/**
 * Format wallet address (0x1234...5678)
 */
export function formatAddress(address: string | undefined): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

