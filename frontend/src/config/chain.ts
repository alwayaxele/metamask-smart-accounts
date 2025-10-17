// config/chain.ts
// Cấu hình chain cho việc thêm chain vào ví (fallback cho lỗi 4902)
export const chainConfigs = {
  11155111: {
    chainId: '0xaa36a7',
    chainName: 'Sepolia Testnet',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: [process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com'],
    blockExplorerUrls: ['https://sepolia.etherscan.io']
  },
  10143: {
    chainId: '0x279f', // 10143 in hex
    chainName: 'Monad Testnet',
    nativeCurrency: {
      name: 'Monad',
      symbol: 'MON',
      decimals: 18
    },
    rpcUrls: [process.env.NEXT_PUBLIC_MONAD_RPC_URL || 'https://testnet-rpc.monad.xyz'],
    blockExplorerUrls: ['https://testnet.monadexplorer.com']
  }
};

// Hàm thêm chain vào ví (fallback cho lỗi 4902)
export const addChainToWallet = async (chainId: number) => {
  const chainConfig = chainConfigs[chainId as keyof typeof chainConfigs];
  if (!chainConfig) {
    throw new Error(`Chain configuration not found for chain ID: ${chainId}`);
  }

  // Gọi wallet_addEthereumChain
  await window.ethereum?.request({
    method: 'wallet_addEthereumChain',
    params: [chainConfig]
  });
};
