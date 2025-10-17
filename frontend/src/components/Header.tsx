"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { useWallets } from "@privy-io/react-auth";
import { useState, useEffect, useRef } from "react";
import { parseChainId, formatAddress } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const { authenticated, login, logout } = usePrivy();
  const { address, chainId: wagmiChainId } = useAccount();
  const { wallets } = useWallets();
  const pathname = usePathname();
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const networkDropdownRef = useRef<HTMLDivElement>(null);

  const displayAddress = address || wallets[0]?.address;
  const displayChainId = wagmiChainId || parseChainId(wallets[0]?.chainId);

  const networks = [
    { id: 10143, name: 'Monad Testnet', icon: '/monad.svg' },
    { id: 11155111, name: 'Sepolia', icon: '/eth.svg' },
  ];

  const currentNetwork = networks.find(n => n.id === displayChainId) || networks[0];

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsWalletDropdownOpen(false);
      }
      if (networkDropdownRef.current && !networkDropdownRef.current.contains(event.target as Node)) {
        setIsNetworkDropdownOpen(false);
      }
    };

    if (isWalletDropdownOpen || isNetworkDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isWalletDropdownOpen, isNetworkDropdownOpen]);

  const handleSwitchChain = async (targetChainId: number) => {
    setIsNetworkDropdownOpen(false);
    try {
      // Dùng window.ethereum cho MetaMask Extension
      if (window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
      }
    } catch (error: unknown) {
      // Nếu chain chưa có trong wallet (error 4902), tự động add
      const err = error as { code?: number };
      if (err?.code === 4902) {
        const chainConfigs: Record<number, {
          chainId: string;
          chainName: string;
          nativeCurrency: { name: string; symbol: string; decimals: number };
          rpcUrls: string[];
          blockExplorerUrls: string[];
        }> = {
          10143: {
            chainId: '0x279f',
            chainName: 'Monad Testnet',
            nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
            rpcUrls: ['https://testnet-rpc.monad.xyz'],
            blockExplorerUrls: ['https://testnet.monadexplorer.com']
          },
          11155111: {
            chainId: '0xaa36a7',
            chainName: 'Sepolia Testnet',
            nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: ['https://ethereum-sepolia.publicnode.com'],
            blockExplorerUrls: ['https://sepolia.etherscan.io']
          }
        };
        
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [chainConfigs[targetChainId]],
          });
        } catch (addError) {
          console.error('Failed to add chain:', addError);
        }
      }
    }
  };

  const copyAddress = () => {
    if (displayAddress) {
      navigator.clipboard.writeText(displayAddress);
      // Có thể thêm toast notification ở đây
    }
  };

  return (
    <header className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-700 shadow-xl">
      <div className="max-w-[80%] mx-auto py-5 px-8 flex items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <span className="text-white font-bold text-[32px] tracking-tight leading-none">
            Monad Boost
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex gap-4 ml-8">
          <Link 
            href="/"
            className={`text-[16px] transition-colors duration-200 font-medium px-4 py-2 rounded focus:outline-none active:border-gray-600 ${
              pathname === '/' 
                ? 'text-white border border-gray-600' 
                : 'text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            Dashboard
          </Link>
          <Link 
            href="/faucet"
            className={`text-[16px] transition-colors duration-200 font-medium px-4 py-2 rounded focus:outline-none active:border-gray-600 ${
              pathname === '/faucet' 
                ? 'text-white border border-gray-600' 
                : 'text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            Faucet
          </Link>
        </nav>

        {/* Right Section */}
        <div className="ml-auto"></div>
        <div className="flex items-center gap-4">
          {authenticated && (
            <div className="relative" ref={networkDropdownRef}>
              <button
                onClick={() => setIsNetworkDropdownOpen(!isNetworkDropdownOpen)}
                className="h-10 px-[10px] text-[16px] bg-gray-800/80 backdrop-blur-sm border border-gray-600 rounded text-white hover:bg-gray-700 transition-all duration-200 shadow-lg flex items-center gap-2"
              >
                <Image 
                  src={currentNetwork.icon} 
                  alt={currentNetwork.name} 
                  width={20} 
                  height={20}
                  className="w-5 h-5"
                />
                <span>{currentNetwork.name}</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isNetworkDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-800/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 overflow-hidden z-50">
                  {networks.map((network) => (
                    <button
                      key={network.id}
                      onClick={() => handleSwitchChain(network.id)}
                      className={`w-full h-10 px-4 text-[16px] flex items-center gap-3 hover:bg-gray-700 transition-colors ${
                        network.id === displayChainId ? 'bg-gray-700/50' : ''
                      }`}
                    >
                      <Image 
                        src={network.icon} 
                        alt={network.name} 
                        width={20} 
                        height={20}
                        className="w-5 h-5"
                      />
                      <span className="text-white">{network.name}</span>
                      {network.id === displayChainId && (
                        <svg className="w-5 h-5 ml-auto text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {!authenticated ? (
            <button
              onClick={login}
              className="h-10 px-6 text-[16px] bg-gray-800/80 backdrop-blur-sm border border-gray-600 text-white font-semibold rounded hover:bg-gray-700 transition-all duration-200 shadow-lg flex items-center justify-center"
            >
              Connect Wallet
            </button>
          ) : displayAddress ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsWalletDropdownOpen(!isWalletDropdownOpen)}
                className="h-10 px-4 text-[16px] bg-gray-800/80 backdrop-blur-sm border border-gray-600 text-white rounded hover:bg-gray-700 transition-all duration-200 shadow-lg flex items-center justify-center"
              >
                <span className="font-mono">{formatAddress(displayAddress)}</span>
              </button>
              
              {isWalletDropdownOpen && (
                <div className="absolute right-0 mt-2 w-[180px] bg-gray-800/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-700 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-[16px] text-white font-mono">{formatAddress(displayAddress)}</span>
                      <button
                        onClick={copyAddress}
                        className="p-1 hover:bg-gray-700 rounded transition-colors duration-200"
                        title="Copy"
                      >
                        <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="px-1.5 py-1.5">
                    <button
                      onClick={() => {
                        logout();
                        setIsWalletDropdownOpen(false);
                      }}
                      className="w-full h-8 px-4 text-[16px] bg-red-500/90 hover:bg-red-600 text-white font-semibold rounded transition-all duration-200 flex items-center justify-center"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={logout}
              className="h-10 px-6 text-[16px] bg-gray-800/80 backdrop-blur-sm border border-gray-600 text-white font-semibold rounded hover:bg-gray-700 transition-all duration-200 shadow-lg flex items-center justify-center"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
