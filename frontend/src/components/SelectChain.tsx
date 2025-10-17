"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { useWallets } from "@privy-io/react-auth";
import { addChainToWallet } from "@/config/chain";

export default function SelectChain() {
  const { address, chainId: wagmiChainId } = useAccount();
  const { wallets } = useWallets();
  const { switchChain } = useSwitchChain();
  
  // Only use supported chains (10143: Monad, 11155111: Sepolia)
  const chainId = wagmiChainId === 10143 || wagmiChainId === 11155111 ? wagmiChainId : null;

  const handleSwitch = async (targetChainId: number) => {
    try {
      // Thử sử dụng wagmi's switchChain trước
      await switchChain({ chainId: targetChainId });
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      console.error("Wagmi switchChain failed, trying window.ethereum:", error);
      
      try {
        // Fallback: sử dụng window.ethereum trực tiếp
        await window.ethereum?.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
      } catch (ethereumError: unknown) {
        const ethErr = ethereumError as { code?: number; message?: string };
        console.error("Ethereum switch failed:", ethereumError);
        
        // Xử lý lỗi 4902 - chain chưa được thêm vào ví
        if (ethErr?.code === 4902) {
          try {
            await addChainToWallet(targetChainId);
            // Thử switch lại sau khi thêm chain
            await window.ethereum?.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${targetChainId.toString(16)}` }],
            });
          } catch (addError: unknown) {
            const addErr = addError as { message?: string };
            console.error("Failed to add chain:", addErr?.message || addError);
            alert(`Chain switch failed: ${ethErr.message}\n\nFailed to add chain: ${addErr.message}`);
          }
        } else {
          alert(`Chain switch failed: ${ethErr.message}`);
        }
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
