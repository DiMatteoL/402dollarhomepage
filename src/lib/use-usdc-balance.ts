"use client";

import { useEffect, useState, useCallback } from "react";
import { createPublicClient, http, formatUnits } from "viem";
import { baseSepolia, base } from "viem/chains";
import { env } from "~/env";

// USDC contract addresses
const USDC_ADDRESSES = {
  "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
} as const;

// ERC-20 ABI for balanceOf
const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Get current network from env
const NETWORK = env.NEXT_PUBLIC_X402_NETWORK as keyof typeof USDC_ADDRESSES;
const chain = NETWORK === "base" ? base : baseSepolia;

// Create public client
const publicClient = createPublicClient({
  chain,
  transport: http(),
});

export interface UsdcBalanceResult {
  balance: string | null; // Formatted balance (e.g., "0.54")
  balanceRaw: bigint | null; // Raw balance in atomic units
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUsdcBalance(
  walletAddress: string | null
): UsdcBalanceResult {
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceRaw, setBalanceRaw] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) {
      setBalance(null);
      setBalanceRaw(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const usdcAddress = USDC_ADDRESSES[NETWORK];

      const rawBalance = await publicClient.readContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [walletAddress as `0x${string}`],
      });

      // USDC has 6 decimals
      const formatted = formatUnits(rawBalance, 6);
      setBalanceRaw(rawBalance);
      setBalance(formatted);
    } catch (err) {
      console.error("[USDC Balance] Error fetching balance:", err);
      setError("Failed to fetch balance");
      setBalance(null);
      setBalanceRaw(null);
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  // Fetch on mount and when wallet changes
  useEffect(() => {
    void fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    balanceRaw,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}

export function getNetworkName(): string {
  return NETWORK === "base" ? "Base" : "Base Sepolia";
}
