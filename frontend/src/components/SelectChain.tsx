"use client";

import { useAccount } from "wagmi";
import { useWallets } from "@privy-io/react-auth";
import { addChainToWallet } from "@/config/chain";

export default function SelectChain() {
  const { address, chainId: wagmiChainId } = useAccount();
  const { wallets } = useWallets();
  
  // Only use supported chains (10143: Monad, 11155111: Sepolia)
  const chainId = wagmiChainId === 10143 || wagmiChainId === 11155111 ? wagmiChainId : null;

  const handleSwitch = async (targetChainId: number) => {
    try {
      // Force OKX wallet to switch chain
      await window.ethereum?.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });
      
      // Force refresh page to sync chain state
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      
      if (err.code === 4902) {
        // Chain not added, try to add it
        try {
          await addChainToWallet(targetChainId);
          // Try switch again after adding
          await window.ethereum?.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${targetChainId.toString(16)}` }],
          });
          // Force refresh
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch {
          alert("Failed to add chain to wallet");
        }
      } else {
        alert(`Chain switch failed: ${err.message || 'Unknown error'}`);
      }
    }
  };

  // Danh sách chains được hỗ trợ
  const supportedChains = [
    { id: 11155111, name: 'Sepolia Testnet' },
    { id: 10143, name: 'Monad Testnet' },
  ];

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-gray-600">Current chain: {chainId}</p>
      <p className="text-xs text-gray-500">
        Address: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
      </p>
      <p className="text-xs text-gray-500">
        Wallets: {wallets.length}
      </p>
      <select
        value={chainId || ""}
        onChange={(e) => handleSwitch(Number(e.target.value))}
        className="px-3 py-2 border rounded bg-white"
      >
        {supportedChains.map((chain) => (
          <option key={chain.id} value={chain.id}>
            {chain.name}
          </option>
        ))}
      </select>
    </div>
  );
}
