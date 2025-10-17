"use client";

import { useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { createMetaMaskSmartAccount, deploySmartAccount } from "@/config/smartAccount";
import { parseChainId, getChainName, getExplorerUrl } from "@/lib/utils";
import { createPublicClient, createWalletClient, http, custom, parseEther } from "viem";
import { monadTestnet } from "@/config/wagmi";
import { sepolia } from "wagmi/chains";
import { getTokens } from "@/abi/TokenAddresses";
import { MyTokenABI } from "@/abi/MyTokenABI";
import Image from "next/image";

export function SmartAccountInfo() {
  const { authenticated } = usePrivy();
  const { chainId: wagmiChainId } = useAccount();
  const { wallets } = useWallets();
  
  // Get chainId from wagmi or fallback to Privy wallet
  const rawChainId = wagmiChainId || parseChainId(wallets[0]?.chainId);
  // Only use supported chains (10143: Monad, 11155111: Sepolia)
  const chainId = rawChainId === 10143 || rawChainId === 11155111 ? rawChainId : null;
  
  const [address, setAddress] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDeployed, setIsDeployed] = useState(false);
  const [deployTxHash, setDeployTxHash] = useState("");
  const [currentChainId, setCurrentChainId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Deposit states
  const [selectedToken, setSelectedToken] = useState<string>("native");
  const [depositAmount, setDepositAmount] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositTxHash, setDepositTxHash] = useState("");

  const handleInit = async () => {
    if (!chainId) {
      setError("Please connect wallet and select a network!");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const { smartAccount, publicClient } = await createMetaMaskSmartAccount(chainId);
      const sa = await smartAccount.getAddress();
      
      const code = await publicClient.getCode({ address: sa });
      const deployed = code && code !== "0x";
      setIsDeployed(deployed || false);
      
      setAddress(sa);
      setCurrentChainId(chainId);
    } catch (err: unknown) {
      const error = err as Error;
      const errorMsg = error.message || String(err);
      setError(errorMsg);
      console.error("Init error:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeploy = async () => {
    if (!address) {
      setError("Please initialize Smart Account first!");
      return;
    }

    if (!chainId) {
      setError("Chain ID not found!");
      return;
    }

    setIsDeploying(true);
    setError(null);

    try {
      const result = await deploySmartAccount(chainId);
      
      if (result.alreadyDeployed) {
        setIsDeployed(true);
      } else {
        setIsDeployed(true);
        setDeployTxHash(result.txHash || "");
      }
    } catch (err: unknown) {
      const error = err as Error;
      const errorMsg = error.message || String(err);
      setError(errorMsg);
      console.error("Deploy error:", err);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDeposit = async () => {
    if (!address) {
      setError("Please initialize Smart Account first!");
      return;
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (!chainId) {
      setError("Chain ID not found!");
      return;
    }

    setIsDepositing(true);
    setError(null);
    setDepositTxHash("");

    try {
      const provider = window.ethereum;
      if (!provider) throw new Error("Wallet not found");

      const chain = chainId === 11155111 ? sepolia : monadTestnet;
      const walletAddress = wallets[0]?.address as `0x${string}`;

      const walletClient = createWalletClient({
        account: walletAddress,
        chain,
        transport: custom(provider),
      });

      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      let hash: string;

      if (selectedToken === "native") {
        // Deposit native token (MON/ETH)
        hash = await walletClient.sendTransaction({
          to: address as `0x${string}`,
          value: parseEther(depositAmount),
        });
      } else {
        // Deposit ERC20 token
        hash = await walletClient.writeContract({
          address: selectedToken as `0x${string}`,
          abi: MyTokenABI.abi,
          functionName: "transfer",
          args: [address as `0x${string}`, parseEther(depositAmount)],
        });
      }

      setDepositTxHash(hash);

      // Wait for transaction
      await publicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        timeout: 60_000,
      });

      setDepositAmount("");
      
    } catch (err: unknown) {
      const error = err as Error;
      const errorMsg = error.message || String(err);
      setError(`Deposit failed: ${errorMsg}`);
      console.error("Deposit error:", err);
    } finally {
      setIsDepositing(false);
    }
  };

  // Get available tokens for deposit
  const getAvailableTokens = () => {
    if (!chainId) return [];
    
    const tokens = [];
    
    // Native token
    if (chainId === 10143) {
      tokens.push({ symbol: "MON", name: "Monad (Native)", address: "native" });
    } else if (chainId === 11155111) {
      tokens.push({ symbol: "ETH", name: "Ethereum (Native)", address: "native" });
    }
    
    // ERC20 tokens
    const erc20Tokens = getTokens(chainId);
    tokens.push(...erc20Tokens.map((t: { name: string; symbol: string; address: string }) => ({ symbol: t.symbol, name: t.name, address: t.address })));
    
    return tokens;
  };

  // Auto-initialize Smart Account when component mounts or chainId changes
  useEffect(() => {
    if (authenticated && chainId) {
      // Reset state when chainId changes
      setAddress("");
      setIsDeployed(false);
      setDeployTxHash("");
      setDepositTxHash("");
      setError(null);
      
      // Re-initialize with new chainId
      handleInit();
    }
  }, [authenticated, chainId]);

  if (!authenticated) {
    return null;
  }

  return (
    <div className="p-6 rounded-lg border border-gray-700" style={{ backgroundColor: '#101828' }}>
      <h3 className="text-xl font-bold mb-4 text-white">
        Smart Account Overview
      </h3>
      
      {!address ? (
        <div>
          <p className="text-white mb-4">
            <strong>Step 1:</strong> Initialize Smart Account (counterfactual address)
          </p>
          {!chainId && (
            <div className="mb-3 p-3 bg-yellow-900/20 border border-yellow-500 rounded">
              <p className="text-[16px] text-yellow-400">⚠️ Please select a network first</p>
            </div>
          )}
          <button
            onClick={handleInit}
            disabled={isCreating || !chainId}
            className="h-10 px-4 bg-orange-500 border border-gray-600 hover:bg-orange-600 rounded disabled:opacity-50 transition-colors text-white text-[16px] flex items-center justify-center"
          >
            {isCreating ? "Creating..." : "Initialize Smart Account"}
          </button>
          {error && (
            <div className="mt-3 p-3 bg-red-900/20 border border-red-500 rounded">
              <p className="text-[16px] text-red-500 font-semibold">Error:</p>
              <p className="text-[16px] text-red-400 mt-1">{error}</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Address Row */}
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <span className="text-white text-[16px]">Address:</span>
              <span className="text-white text-[16px] font-mono">{address}</span>
            </div>
          </div>
          
          {/* Network Row */}
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <span className="text-white text-[16px]">Network:</span>
              <div className="flex items-center gap-2">
                <Image 
                  src={currentChainId === 10143 ? '/monad.svg' : '/eth.svg'} 
                  alt={getChainName(currentChainId)} 
                  width={20} 
                  height={20}
                  className="w-5 h-5"
                />
                <span className="text-white text-[16px]">{getChainName(currentChainId)}</span>
              </div>
            </div>
          </div>
          
          {/* Status Row */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="text-white text-[16px]">Status:</span>
              {isDeployed ? (
                <span className="text-green-500 text-[16px]">✅ Deployed</span>
              ) : (
                <span className="text-yellow-500 text-[16px]">⚠️ Counterfactual</span>
              )}
            </div>
          </div>

          {!isDeployed && (
            <div className="space-y-3 mb-4">
              <p className="text-white text-[16px]">
                <strong>Step 2:</strong> Deploy Smart Account to {getChainName(currentChainId)}
              </p>
              <button
                onClick={handleDeploy}
                disabled={isDeploying}
                className="w-full h-10 px-4 bg-blue-600 border border-gray-600 hover:bg-blue-700 rounded disabled:opacity-50 transition-colors text-white text-[16px] flex items-center justify-center"
              >
                {isDeploying ? "Deploying..." : "Deploy Smart Account"}
              </button>
              <p className="text-xs text-white opacity-60">
                💡 Deployed via standard transaction. EOA wallet pays gas.
              </p>
            </div>
          )}

          {isDeployed && deployTxHash && (
            <div className="mb-4">
              <a
                href={`${getExplorerUrl(currentChainId)}/tx/${deployTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline text-[16px]"
              >
                View deployment TX →
              </a>
            </div>
          )}

          {/* Deposit to Smart Account */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="text-xl font-bold mb-4 text-white">
              Fund Your Smart Account
            </h3>
            
            {/* Row 1: Labels */}
            <div className="grid grid-cols-3 gap-3 mb-2">
              <label className="text-sm text-gray-400">Select Token</label>
              <label className="text-sm text-gray-400">Amount</label>
              <div></div> {/* Empty space for button */}
            </div>
            
            {/* Row 2: Inputs */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              {/* Token Select */}
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="h-10 px-3 bg-gray-700 border border-gray-600 rounded text-white text-[16px] focus:outline-none focus:border-gray-500"
              >
                {getAvailableTokens().map((token) => (
                  <option key={token.address} value={token.address}>
                    {token.symbol}
                  </option>
                ))}
              </select>

              {/* Amount Input */}
              <input
                type="text"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.0"
                className="h-10 px-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 text-[16px] focus:outline-none focus:border-gray-500"
              />

              {/* Deposit Button */}
              <button
                onClick={handleDeposit}
                disabled={isDepositing || !depositAmount}
                className="h-10 px-4 bg-purple-600 border border-gray-600 hover:bg-purple-700 rounded disabled:opacity-50 transition-colors text-white text-[16px] flex items-center justify-center"
              >
                {isDepositing ? "Depositing..." : "Deposit"}
              </button>
            </div>

            {/* Transaction Hash */}
            {depositTxHash && (
              <div className="p-3 bg-green-900/20 border border-green-500 rounded">
                <p className="text-[16px] text-green-500">Deposit successful!</p>
                <p className="font-mono text-xs break-all mt-1 text-white">{depositTxHash}</p>
                <a
                  href={`${getExplorerUrl(currentChainId)}/tx/${depositTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline text-xs mt-1 inline-block"
                >
                  View on Explorer →
                </a>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-3 p-3 bg-red-900/20 border border-red-500 rounded">
              <p className="text-[16px] text-red-500 font-semibold">Error:</p>
              <p className="text-[16px] text-red-400 mt-1">{error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

