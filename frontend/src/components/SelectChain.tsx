"use client";

import { useAccount } from "wagmi";
import { useWallets } from "@privy-io/react-auth";
import { addChainToWallet } from "@/config/chain";

export default function SelectChain() {
  const { address, chainId } = useAccount();
  const { wallets } = useWallets();

  const handleSwitch = async (targetChainId: number) => {
    try {
      // Tìm ví đang active - thử nhiều cách
      let activeWallet = wallets.find(w => w.address === address);
      
      // Nếu không tìm thấy, thử tìm ví đầu tiên
      if (!activeWallet && wallets.length > 0) {
        activeWallet = wallets[0];
      }
      
      if (activeWallet) {
        // Sử dụng wallet.switchChain() cho tất cả loại ví
        await activeWallet.switchChain(targetChainId);
      } else {
        throw new Error(`No active wallet found. Address: ${address}, Wallets: ${wallets.length}`);
      }
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      console.error("Chain switch error:", error);
      
      // Xử lý lỗi 4902 - chain chưa được thêm vào ví
      if (err?.code === 4902) {
        try {
          await addChainToWallet(targetChainId);
        } catch (addError: unknown) {
          const addErr = addError as { message?: string };
          console.error("Add chain error:", addError);
          alert(`Chain switch failed: ${err.message}\n\nFailed to add chain: ${addErr.message}`);
        }
      } else {
        alert(`Chain switch failed: ${err.message}`);
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
        value={chainId}
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
