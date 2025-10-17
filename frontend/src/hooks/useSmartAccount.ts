"use client";

import { useState } from "react";
import { createMetaMaskSmartAccount } from "@/config/smartAccount";

export function useSmartAccount() {
  const [smartAccount, setSmartAccount] = useState<{ address: string } | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSmartAccount = async (chainId: number) => {
    setIsCreating(true);
    setError(null);

    try {
      const { smartAccount: sa } = await createMetaMaskSmartAccount(chainId);
      const address = await sa.getAddress();
      
      setSmartAccount({ ...sa, address });
      return sa;
    } catch (err: unknown) {
      const error = err as Error;
      const errorMsg = error.message || String(err);
      setError(errorMsg);
      console.error("Failed to create smart account:", err);
    } finally {
      setIsCreating(false);
    }
  };

  return {
    smartAccount,
    createSmartAccount,
    isCreating,
    error,
  };
}

