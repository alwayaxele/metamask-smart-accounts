"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useWallets } from "@privy-io/react-auth";
import { parseChainId, getChainName, getExplorerUrl } from "@/lib/utils";
import { AppHubABI } from "@/abi/AppHubABI";
import { AppHubAddresses } from "@/abi/AppHubAddresses";
import { MyTokenABI } from "@/abi/MyTokenABI";
import { getTokens } from "@/abi/TokenAddresses";
import { createPublicClient, createWalletClient, http, custom, formatUnits } from "viem";
import { monadTestnet } from "@/config/wagmi";
import { sepolia } from "wagmi/chains";

type TokenInfo = {
  name: string;
  symbol: string;
  address: string;
  balance?: string;
  claimed?: boolean;
  faucetAmount?: string;
  enabled?: boolean;
};

export function Faucet() {
  const { chainId: wagmiChainId, address: wagmiAddress } = useAccount();
  const { wallets } = useWallets();
  
  // Get chainId and address from wagmi or fallback to Privy wallet
  const rawChainId = wagmiChainId || parseChainId(wallets[0]?.chainId);
  // Only use supported chains (10143: Monad, 11155111: Sepolia)
  const chainId = rawChainId === 10143 || rawChainId === 11155111 ? rawChainId : null;
  const address = wagmiAddress || wallets[0]?.address;
  
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [txHashes, setTxHashes] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Helper function to add delay between requests
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Helper function to retry contract calls with exponential backoff
  const retryContractCall = async <T,>(
    callFn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await callFn();
      } catch (error: unknown) {
        const isRateLimited = (error as { code?: number; message?: string })?.code === -32011 || 
          (error as { message?: string })?.message?.includes('requests limited');
        
        if (isRateLimited && attempt < maxRetries - 1) {
          const delayMs = baseDelay * Math.pow(2, attempt); // Exponential backoff
          await delay(delayMs);
          continue;
        }
        
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  };

  const loadTokenInfo = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (!chainId) {
        setError("Please connect wallet and select a network");
        return;
      }

      // Check if AppHub is deployed on this chain
      const appHubData = AppHubAddresses[chainId.toString() as keyof typeof AppHubAddresses];
      if (!appHubData) {
        setError(`AppHub not deployed on chain ${chainId}`);
        setIsRefreshing(false);
        return;
      }

      const tokenList = getTokens(chainId);
      
      if (tokenList.length === 0) {
        setError(`No tokens found on chain ${chainId}`);
        setIsRefreshing(false);
        return;
      }

      const provider = window.ethereum;
      if (!provider) {
        setError("Please connect wallet");
        return;
      }

      // Determine which chain config to use
      const chain = chainId === 10143 ? monadTestnet : chainId === 11155111 ? sepolia : null;
      if (!chain) {
        setError(`Chain ${chainId} not supported`);
        setIsRefreshing(false);
        return;
      }

      const publicClient = createPublicClient({
        chain,
        transport: http(),
      });

      const appHubAddress = appHubData.address as `0x${string}`;
      
      // Load info for each token sequentially to avoid rate limiting
      const tokensWithInfo = [];
      for (let i = 0; i < tokenList.length; i++) {
        const token = tokenList[i];
        
        try {
          // Add delay between requests to avoid rate limiting
          if (i > 0) {
            await delay(200); // 200ms delay between requests
          }

          // Get balance with retry
          const balanceResult = await retryContractCall(() =>
            publicClient.readContract({
              address: token.address as `0x${string}`,
              abi: MyTokenABI.abi,
              functionName: "balanceOf",
              args: [address as `0x${string}`],
            })
          ) as bigint;

          // Check if claimed with retry
          const claimedResult = await retryContractCall(() =>
            publicClient.readContract({
              address: appHubAddress,
              abi: AppHubABI.abi,
              functionName: "userClaimed",
              args: [address as `0x${string}`, token.address as `0x${string}`],
            })
          ) as boolean;

          // Get faucet info with retry
          const faucetInfo = await retryContractCall(() =>
            publicClient.readContract({
              address: appHubAddress,
              abi: AppHubABI.abi,
              functionName: "faucetTokens",
              args: [token.address as `0x${string}`],
            })
          );

          // Parse faucet info correctly - it returns [enabled, amount] tuple
          const [enabled, amount] = faucetInfo as [boolean, bigint];

          tokensWithInfo.push({
            ...token,
            balance: formatUnits(balanceResult, 18),
            claimed: claimedResult,
            faucetAmount: formatUnits(amount, 18),
            enabled: enabled,
          });
        } catch (err) {
          console.error(`❌ Error loading info for ${token.symbol}:`, err);
          tokensWithInfo.push({
            ...token,
            balance: "0",
            claimed: false,
            faucetAmount: "0",
            enabled: false,
          });
        }
      }

      setTokens(tokensWithInfo);
    } catch (err) {
      console.error("Error loading tokens:", err);
      setError("Failed to load token information");
    } finally {
      setIsRefreshing(false);
    }
  }, [chainId, address, retryContractCall, delay]);

  // Load token info
  useEffect(() => {
    if (chainId && address) {
      loadTokenInfo();
    }
  }, [chainId, address, loadTokenInfo]);

  const handleClaim = async (tokenAddress: string, symbol: string) => {
    if (!address) {
      setError("Please connect wallet");
      return;
    }

    if (!chainId) {
      setError("Please connect wallet and select a network");
      return;
    }

    // Check if AppHub is deployed on this chain
    const appHubData = AppHubAddresses[chainId.toString() as keyof typeof AppHubAddresses];
    if (!appHubData) {
      setError(`AppHub not deployed on chain ${chainId}`);
      return;
    }

    setLoading({ ...loading, [symbol]: true });
    setError(null);
    setTxHashes({ ...txHashes, [symbol]: "" });

    try {
      const provider = window.ethereum;
      if (!provider) throw new Error("Wallet not found");

      // Determine which chain config to use
      const chain = chainId === 10143 ? monadTestnet : chainId === 11155111 ? sepolia : null;
      if (!chain) {
        setError(`Chain ${chainId} not supported`);
        return;
      }

      const walletClient = createWalletClient({
        account: address as `0x${string}`,
        chain,
        transport: custom(provider),
      });

      const appHubAddress = appHubData.address as `0x${string}`;

      // Call faucet function
      const hash = await walletClient.writeContract({
        address: appHubAddress,
        abi: AppHubABI.abi,
        functionName: "faucet",
        args: [tokenAddress as `0x${string}`],
      });

      setTxHashes({ ...txHashes, [symbol]: hash });

      // Wait for transaction
      const publicClient = createPublicClient({
        chain: monadTestnet,
        transport: http(),
      });

      await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 60_000,
      });

      // Reload token info
      await loadTokenInfo();

    } catch (err: unknown) {
      const error = err as Error;
      const errorMsg = error.message || String(err);
      setError(`Failed to claim ${symbol}: ${errorMsg}`);
      console.error("Claim error:", err);
    } finally {
      setLoading({ ...loading, [symbol]: false });
    }
  };

  // Check if AppHub is deployed on current chain
  const appHubDeployed = chainId ? AppHubAddresses[chainId.toString() as keyof typeof AppHubAddresses] : null;
  
  if (!appHubDeployed) {
    return (
      <div className="p-6 rounded" style={{ backgroundColor: '#101828' }}>
        <h3 className="text-xl font-bold mb-4 text-white">Token Faucet</h3>
        <div className="p-3 bg-yellow-900/20 border border-yellow-500 rounded">
          <p className="text-sm text-yellow-400">⚠️ Faucet not available on this network</p>
          <p className="text-xs text-yellow-300 mt-2">Current network: {getChainName(chainId)}</p>
          <p className="text-xs text-gray-400 mt-1">Please switch to Monad Testnet or Sepolia</p>
        </div>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="p-6 rounded" style={{ backgroundColor: '#101828' }}>
        <h3 className="text-xl font-bold mb-4 text-white">Token Faucet</h3>
        <div className="p-3 bg-yellow-900/20 border border-yellow-500 rounded">
          <p className="text-sm text-yellow-400">⚠️ Please connect wallet first</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-lg border border-gray-700" style={{ backgroundColor: '#1B282F' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">
          Token Faucet
        </h3>
        <button
          onClick={loadTokenInfo}
          disabled={isRefreshing}
          className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-white disabled:opacity-50"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="space-y-2">
        {tokens.map((token) => (
          <div
            key={token.symbol}
            className="flex items-center justify-between p-3 bg-gray-800 border border-gray-700 rounded"
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="min-w-[80px]">
                <h4 className="text-white font-semibold text-sm">{token.symbol}</h4>
                <p className="text-xs text-gray-400">{token.name}</p>
              </div>
              <div className="flex gap-4 text-xs">
                <span className="text-gray-400">
                  Balance: <span className="text-white">{parseFloat(token.balance || "0").toFixed(2)}</span>
                </span>
                <span className="text-gray-400">
                  Faucet: <span className="text-white">{token.faucetAmount || "0"}</span>
                </span>
              </div>
            </div>

            <button
              onClick={() => handleClaim(token.address, token.symbol)}
              disabled={
                loading[token.symbol] ||
                token.claimed ||
                !token.enabled ||
                isRefreshing
              }
              className="h-8 px-4 bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white text-xs whitespace-nowrap"
            >
              {loading[token.symbol]
                ? "Claiming..."
                : token.claimed
                ? "✅ Claimed"
                : !token.enabled
                ? "Disabled"
                : `Claim`}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-500 rounded">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      {Object.values(txHashes).some(hash => hash) && (
        <div className="mt-3 p-2 bg-green-900/20 border border-green-500 rounded">
          <p className="text-xs text-green-500">
            ✅ Transaction successful! 
            <a
              href={`${getExplorerUrl(chainId)}/tx/${Object.values(txHashes).find(h => h)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline ml-2"
            >
              View on Explorer →
            </a>
          </p>
        </div>
      )}

      <div className="mt-3 p-2 bg-blue-900/20 border border-blue-500 rounded">
        <p className="text-xs text-blue-400">
          ℹ️ Each token can only be claimed once per address
        </p>
      </div>
    </div>
  );
}

