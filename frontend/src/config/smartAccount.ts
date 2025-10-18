import { Implementation, toMetaMaskSmartAccount } from "@metamask/delegation-toolkit";
import { createPublicClient, createWalletClient, http, custom, keccak256, toHex } from "viem";
import { createBundlerClient } from "viem/account-abstraction";
import { monadTestnet } from "./wagmi";
import { sepolia } from "wagmi/chains";
import type { Chain } from "viem";

// Bundler URLs for each chain
const BUNDLER_URLS: Record<number, string> = {
  11155111: process.env.NEXT_PUBLIC_SEPOLIA_BUNDLER_URL || "", // Sepolia (Pimlico)
  10143: process.env.NEXT_PUBLIC_MONAD_BUNDLER_URL || "", // Monad (Biconomy)
};

// Get chain config by chainId
function getChainConfig(chainId: number): Chain {
  if (chainId === 11155111) return sepolia;
  if (chainId === 10143) return monadTestnet;
  throw new Error(`Unsupported chain ID: ${chainId}`);
}

// Get bundler URL by chainId
function getBundlerUrl(chainId: number): string {
  const url = BUNDLER_URLS[chainId];
  if (!url) throw new Error(`No bundler configured for chain ID: ${chainId}`);
  return url;
}

/**
 * Initialize MetaMask Smart Account from Privy or MetaMask signer
 * @param chainId - Chain ID (11155111 for Sepolia, 10143 for Monad)
 * 
 * Bundler Services:
 * - Sepolia: Pimlico (stable)
 * - Monad: Biconomy (testing alternative to Pimlico)
 */
export async function createMetaMaskSmartAccount(chainId: number) {
  // Get chain config
  const chain = getChainConfig(chainId);
  const bundlerUrl = getBundlerUrl(chainId);

  // Step 1: Viem public client
  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  // Step 2: Bundler client (Pimlico)
  const bundlerClient = createBundlerClient({
    client: publicClient,
    transport: http(bundlerUrl),
  });
  
  // Set EntryPoint manually after creation - Use Biconomy's EntryPoint
  // @ts-expect-error - entryPoint property exists at runtime
  bundlerClient.entryPoint = "0x0000000071727de22e5e9d8baf0edac6f37da032";

  // Step 3: Wrap Privy or MetaMask provider
  if (typeof window === 'undefined') {
    throw new Error("This function can only be called on the client side");
  }
  
  const provider = window.ethereum;
  if (!provider) throw new Error("MetaMask or Privy provider not found");

  // Get accounts from provider
  const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
  const address = accounts[0] as `0x${string}`;

  // Step 4: Create wallet client
  const walletClient = createWalletClient({
    account: address,
    chain,
    transport: custom(provider),
  });

  // Step 5: Create MetaMask Smart Account with unique salt per EOA
  const salt = keccak256(toHex(address)); // Unique salt per EOA address
  
  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [address, [], [], []],
    deploySalt: salt, // Unique per EOA
    signer: { walletClient },
  });
  
  return { smartAccount, walletClient, publicClient, bundlerClient, chain };
}

/**
 * Deploy Smart Account lên chain (normal transaction, không qua bundler)
 * @param chainId - Chain ID (11155111 for Sepolia, 10143 for Monad)
 */
export async function deploySmartAccount(chainId: number) {
  if (typeof window === 'undefined') {
    throw new Error("This function can only be called on the client side");
  }
  
  const provider = window.ethereum;
  if (!provider) throw new Error("MetaMask not found");

  const accounts = await provider.request({ method: "eth_requestAccounts" }) as string[];
  const address = accounts[0] as `0x${string}`;

  // Get chain config
  const chain = getChainConfig(chainId);

  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account: address,
    chain,
    transport: custom(provider),
  });

  // Tạo Smart Account (counterfactual) với unique salt per EOA
  const salt = keccak256(toHex(address)); // Unique salt per EOA address
  
  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [address, [], [], []],
    deploySalt: salt, // Unique per EOA
    signer: { walletClient },
  });

  const saAddress = await smartAccount.getAddress();

  // Check đã deploy chưa
  const code = await publicClient.getCode({ address: saAddress });
  if (code && code !== "0x") {
    return { saAddress, alreadyDeployed: true };
  }

  // Get factory args từ smart account
  const factoryArgs = await (smartAccount as { getFactoryArgs?: () => Promise<{ factory: string; factoryData: string }> }).getFactoryArgs?.();
  
  if (!factoryArgs || !factoryArgs.factory || !factoryArgs.factoryData) {
    throw new Error("Cannot get factory args from smart account");
  }
  
  const { factory, factoryData } = factoryArgs;

  // Deploy qua factory contract (normal transaction, EOA trả gas)
  const txHash = await walletClient.sendTransaction({
    to: factory as `0x${string}`,
    data: factoryData as `0x${string}`,
    gas: BigInt(1000000), // Đủ gas cho deployment
  });

  // Đợi transaction confirm
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: 60_000, // 60 seconds
  });

  if (receipt.status === "success") {
    return { 
      saAddress, 
      txHash: receipt.transactionHash, 
      alreadyDeployed: false,
      chainId 
    };
  } else {
    throw new Error(`Deployment failed! Status: ${receipt.status}`);
  }
}
