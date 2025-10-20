"use client";

import { useState } from "react";
import { parseEther, encodeFunctionData } from "viem";
import { useAccount } from "wagmi";
import { useWallets } from "@privy-io/react-auth";
import { createMetaMaskSmartAccount } from "@/config/smartAccount";
import { parseChainId, getExplorerUrl } from "@/lib/utils";
import { getTokens } from "@/abi/TokenAddresses";
import { MyTokenABI } from "@/abi/MyTokenABI";
import { AppHubABI, AppHubAddresses } from "@/abi/contracts";

export function SendUserOperation() {
  const { chainId: wagmiChainId } = useAccount();
  const { wallets } = useWallets();
  
  // Get chainId from wagmi or fallback to Privy wallet
  const rawChainId = wagmiChainId || parseChainId(wallets[0]?.chainId);
  // Only use supported chains (10143: Monad, 11155111: Sepolia)
  const chainId = rawChainId === 10143 || rawChainId === 11155111 ? rawChainId : null;
  
  const [selectedToken, setSelectedToken] = useState<string>("native");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get available tokens for sending
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

  const handleSendTx = async () => {
    if (!chainId) {
      setError("Please select a network!");
      return;
    }

    if (!recipient || !amount) {
      setError("Please enter recipient address and amount");
      return;
    }

    setIsSending(true);
    setError(null);
    setTxHash(null);

    try {
      // Create smart account and bundler client
      const { smartAccount, bundlerClient, publicClient, chain } = await createMetaMaskSmartAccount(chainId);
      
      let calls;
      
      if (selectedToken === "native") {
        // Send native token (MON/ETH)
        calls = [
          {
            to: recipient as `0x${string}`,
            value: parseEther(amount),
          },
        ];
        
      } else {
        // Send ERC20 token via AppHub contract to emit TransferExecuted event
        const appHubData = AppHubAddresses[chainId.toString() as keyof typeof AppHubAddresses];
        
        if (!appHubData) {
          throw new Error(`AppHub not deployed on chain ${chainId}`);
        }
        
        const appHubAddress = appHubData.address;
        
        // Step 1: Approve AppHub to spend tokens
        const approveAppHub = encodeFunctionData({
          abi: MyTokenABI.abi,
          functionName: "approve",
          args: [appHubAddress as `0x${string}`, parseEther(amount)],
        });
        
        // Step 2: Transfer via AppHub to emit TransferExecuted event
        const transferViaAppHub = encodeFunctionData({
          abi: AppHubABI.abi,
          functionName: "transferToken",
          args: [selectedToken as `0x${string}`, recipient as `0x${string}`, parseEther(amount)],
        });
        
        calls = [
          {
            to: selectedToken as `0x${string}`,
            data: approveAppHub,  // approve AppHub to spend
            value: BigInt(0),
          },
          {
            to: appHubAddress as `0x${string}`,
            data: transferViaAppHub,  // transfer via AppHub to emit event
            value: BigInt(0),
          },
        ];
        
      }
      
      // Check SA balance first
      const saAddress = await smartAccount.getAddress();
      
      if (selectedToken === "native") {
        const saBalance = await publicClient.getBalance({ address: saAddress });
        const symbol = chain.nativeCurrency.symbol;
        
        if (saBalance === BigInt(0)) {
          throw new Error(
            `⚠️ Smart Account has insufficient ${symbol} funds!\n\n` +
            `Smart Account address: ${saAddress}\n\n` +
            `Please deposit ${symbol} to this Smart Account first.`
          );
        }
      } else {
        // Check ERC20 balance
        const tokenBalance = await publicClient.readContract({
          address: selectedToken as `0x${string}`,
          abi: MyTokenABI.abi,
          functionName: "balanceOf",
          args: [saAddress],
        }) as bigint;
        
        if (tokenBalance === BigInt(0)) {
          throw new Error(
            `⚠️ Smart Account has insufficient token balance!\n\n` +
            `Smart Account address: ${saAddress}\n\n` +
            `Please deposit tokens to this Smart Account first.`
          );
        }
      }
      
      // Prepare user operation (get auto estimate)
      const userOp = await bundlerClient.prepareUserOperation({
        account: smartAccount,
        calls,
        // Không set nonce - để bundler tự detect (sẽ = 0 cho SA mới)
      });
      
      // Override với minimum gas limits (fallback nếu estimate quá thấp)
      // Pimlico estimate thấp cho Monad → cộng buffer 30%
      const callGasLimit = userOp.callGasLimit 
        ? userOp.callGasLimit + (userOp.callGasLimit * BigInt(30) / BigInt(100))
        : BigInt(400000);
      const verificationGasLimit = userOp.verificationGasLimit
        ? userOp.verificationGasLimit + (userOp.verificationGasLimit * BigInt(30) / BigInt(100))
        : BigInt(1000000);
      const preVerificationGas = userOp.preVerificationGas
        ? userOp.preVerificationGas + (userOp.preVerificationGas * BigInt(30) / BigInt(100))
        : BigInt(800000);
      
      // Update userOp với gas limits đã adjust
      userOp.callGasLimit = callGasLimit;
      userOp.verificationGasLimit = verificationGasLimit;
      userOp.preVerificationGas = preVerificationGas;
      
      // Sign user operation
      const signature = await smartAccount.signUserOperation(userOp);
      
      // Update userOp with signature
      userOp.signature = signature;
      
      // Send signed user operation via bundler (ERC-4337)
      const hash = await bundlerClient.sendUserOperation(userOp);
      setTxHash(hash); // Show hash ngay lập tức
      
      // Wait for receipt với timeout dài hơn
      try {
        const receipt = await bundlerClient.waitForUserOperationReceipt({
          hash,
          timeout: 120_000, // 2 phút timeout
        });
        
        // Update với actual transaction hash
        setTxHash(receipt.receipt.transactionHash);
        
      } catch {
        // Keep the userOp hash displayed
      }
      
    } catch (err: unknown) {
      const error = err as Error;
      const errorMsg = error.message || String(err);
      setError(errorMsg);
      console.error("Transaction error:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6 rounded-lg border border-gray-700" style={{ backgroundColor: '#1B282F' }}>
      <h3 className="text-xl font-bold mb-4 text-white">
        Transfer with Smart Account
      </h3>
      
      {/* Steps Guide */}
      <div className="mb-6 p-4 bg-gray-800/50 border border-gray-600 rounded-lg">
        <div className="flex flex-col items-center gap-3">
          {/* Numbers row */}
          <div className="flex items-center justify-center gap-16 text-sm">
            <span className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
            <span className="text-gray-400 text-2xl font-bold">→</span>
            <span className="w-8 h-8 bg-[#FF6A00] text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
            <span className="text-gray-400 text-2xl font-bold">→</span>
            <span className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
          </div>
          
          {/* Labels row */}
          <div className="flex items-center justify-center gap-16 text-sm">
            <span className="text-blue-400 font-medium text-center w-28">Faucet to OEA Wallet</span>
            <span className="text-purple-400 font-medium text-center w-28">Fund To Smart Account</span>
            <span className="text-green-400 font-medium text-center w-28">Transfer with Smart Account</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {!chainId && (
          <div className="p-3 bg-yellow-900/20 border border-yellow-500 rounded">
            <p className="text-[16px] text-yellow-400">⚠️ Please select a network first</p>
          </div>
        )}

        <div>
          <label className="block text-sm text-gray-400 mb-2">Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x..."
            className="w-full h-10 px-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 text-[16px] focus:outline-none"
          />
        </div>

        {/* Row 1: Labels */}
        <div className="grid grid-cols-3 gap-3 mb-2">
          <label className="text-sm text-gray-400">Select Token</label>
          <label className="text-sm text-gray-400">Amount</label>
          <div></div> {/* Empty space for button */}
        </div>
        
        {/* Row 2: Inputs */}
        <div className="grid grid-cols-3 gap-3">
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
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.1"
            className="h-10 px-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 text-[16px] focus:outline-none"
          />

          {/* Send Button */}
          <button
            onClick={handleSendTx}
            disabled={isSending || !recipient || !amount || !chainId}
            className="h-10 px-4 bg-[#FF6A00] border border-gray-600 hover:bg-[#E55A00] rounded disabled:opacity-50 transition-colors text-white text-[16px] flex items-center justify-center"
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>

        {txHash && (
          <div className="p-3 bg-green-900/20 border border-green-500 rounded">
            <p className="text-[16px] text-green-500">Transaction Hash:</p>
            <p className="font-mono text-xs break-all mt-1 text-white">{txHash}</p>
            <a
              href={`${getExplorerUrl(chainId)}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline text-[16px] mt-2 inline-block"
            >
              View on Explorer →
            </a>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500 rounded">
            <p className="text-[16px] text-red-500">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

