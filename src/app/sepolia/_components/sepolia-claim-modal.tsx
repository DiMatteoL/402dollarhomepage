"use client";

import { usePrivy, useWallets, useLinkAccount } from "@privy-io/react-auth";
import { useCallback, useEffect, useState } from "react";
import { createWalletClient, createPublicClient, http, custom, publicActions } from "viem";
import { baseSepolia } from "viem/chains";
import { preparePaymentHeader, signPaymentHeader } from "x402/client";
import type { PaymentRequirements } from "x402/types";
import type { PendingPixel } from "~/lib/use-pending-pixels";

interface SepoliaClaimModalProps {
  pendingPixels: Map<string, PendingPixel>;
  totalPrice: number;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentState =
  | "idle"
  | "preparing"
  | "signing"
  | "submitting"
  | "success"
  | "error";

const X402_VERSION = 1;

// USDC on Base Sepolia
const SEPOLIA_USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

function WalletDisconnected({
  onConnect,
  isLinkMode = false,
}: {
  onConnect: () => void;
  isLinkMode?: boolean;
}) {
  return (
    <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4">
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 flex-shrink-0 rounded-full bg-orange-500/20 flex items-center justify-center">
          <span className="text-2xl">🧪</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-[var(--color-text-primary)] mb-1">
            {isLinkMode
              ? "Link a wallet to continue"
              : "Connect to test on Sepolia"}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            This is a <span className="text-orange-400 font-medium">testnet</span>.
            Pixels are paid with testnet USDC on Base Sepolia.
          </p>
        </div>
      </div>

      <button
        className="mt-3 w-full rounded-lg border border-orange-500 bg-orange-500/10 px-4 py-2.5 font-medium text-sm text-orange-400 transition-all hover:bg-orange-500/20"
        onClick={onConnect}
        type="button"
      >
        {isLinkMode ? "Link Wallet" : "Connect Wallet"}
      </button>
    </div>
  );
}

function WalletConnected({
  walletAddress,
  balance,
  balanceLoading,
  requiredAmount,
  onDisconnect,
}: {
  walletAddress: string;
  balance: string | null;
  balanceLoading: boolean;
  requiredAmount: string;
  onDisconnect: () => void;
}) {
  const balanceNum = balance ? parseFloat(balance) : 0;
  const requiredNum = parseFloat(requiredAmount);
  const hasEnough = balanceNum >= requiredNum;

  return (
    <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-orange-500 animate-pulse" />
          <span className="font-mono text-xs text-[var(--color-text-secondary)]">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </span>
        </div>
        <button
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
          onClick={onDisconnect}
          type="button"
        >
          Disconnect
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-muted)]">
          Testnet USDC Balance:
        </span>
        <span
          className={`font-mono text-sm ${
            balanceLoading
              ? "text-[var(--color-text-muted)]"
              : hasEnough
              ? "text-orange-400"
              : "text-red-400"
          }`}
        >
          {balanceLoading ? "Loading..." : `$${parseFloat(balance ?? "0").toFixed(2)}`}
        </span>
      </div>

      {!balanceLoading && !hasEnough && (
        <div className="mt-2 rounded-md bg-red-500/10 border border-red-500/30 p-2">
          <p className="text-xs text-red-400">
            Insufficient testnet USDC. Get some from a faucet.
          </p>
        </div>
      )}

      <div className="mt-2 rounded-md bg-orange-500/10 border border-orange-500/30 p-2">
        <p className="text-xs text-orange-400">
          🧪 Base Sepolia Testnet
        </p>
      </div>
    </div>
  );
}

export function SepoliaClaimModal({
  pendingPixels,
  totalPrice,
  onClose,
  onSuccess,
}: SepoliaClaimModalProps) {
  const { authenticated, login, logout, user, ready: privyReady } = usePrivy();
  const { wallets } = useWallets();
  const { linkWallet } = useLinkAccount();

  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // Get active wallet
  const activeWallet = wallets.find((w) => w.walletClientType !== "privy");
  const walletAddress = activeWallet?.address ?? user?.wallet?.address;
  const hasLinkedExternalWallet = !!activeWallet;

  // Fetch USDC balance on Sepolia using public RPC
  useEffect(() => {
    if (!walletAddress) {
      setBalance(null);
      setBalanceLoading(false);
      return;
    }

    const fetchBalance = async () => {
      try {
        setBalanceLoading(true);

        // Use public client with Base Sepolia RPC to read balance
        // This works regardless of which chain the wallet is connected to
        const publicClient = createPublicClient({
          chain: baseSepolia,
          transport: http(),
        });

        const bal = await publicClient.readContract({
          address: SEPOLIA_USDC_ADDRESS,
          abi: [
            {
              name: "balanceOf",
              type: "function",
              stateMutability: "view",
              inputs: [{ name: "account", type: "address" }],
              outputs: [{ name: "", type: "uint256" }],
            },
          ],
          functionName: "balanceOf",
          args: [walletAddress as `0x${string}`],
        });

        setBalance((Number(bal) / 1e6).toFixed(2));
      } catch (err) {
        console.error("Error fetching sepolia balance:", err);
        setBalance("0.00");
      } finally {
        setBalanceLoading(false);
      }
    };

    void fetchBalance();
  }, [walletAddress]);

  const handleClaim = useCallback(async () => {
    if (!activeWallet || !walletAddress) return;

    try {
      setPaymentState("preparing");
      setErrorMessage(null);

      // Switch to Base Sepolia
      await activeWallet.switchChain(baseSepolia.id);

      // Prepare pixels for batch request
      const pixelsArray = Array.from(pendingPixels.values()).map((p) => ({
        x: p.x,
        y: p.y,
        color: p.newColor,
      }));

      // Get payment requirements from sepolia endpoint
      const requirementsRes = await fetch("/api/sepolia/pixel/paint-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pixels: pixelsArray }),
      });

      if (requirementsRes.status !== 402) {
        throw new Error(`Unexpected response: ${requirementsRes.status}`);
      }

      const { accepts } = await requirementsRes.json();
      const requirements: PaymentRequirements = accepts[0];

      // Sign payment
      setPaymentState("signing");

      const provider = await activeWallet.getEthereumProvider();
      const client = createWalletClient({
        chain: baseSepolia,
        transport: custom(provider),
      }).extend(publicActions);

      const preparedPayment = await preparePaymentHeader(
        client,
        requirements,
        X402_VERSION
      );

      const signedPayment = await signPaymentHeader(client, preparedPayment);

      // Submit with payment
      setPaymentState("submitting");

      const paymentRes = await fetch("/api/sepolia/pixel/paint-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT": signedPayment,
        },
        body: JSON.stringify({ pixels: pixelsArray }),
      });

      if (!paymentRes.ok) {
        const error = await paymentRes.json();
        throw new Error(error.error || error.reason || "Payment failed");
      }

      setPaymentState("success");

      // Wait briefly then close
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Sepolia claim error:", err);
      setPaymentState("error");
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
    }
  }, [activeWallet, walletAddress, pendingPixels, onSuccess, onClose]);

  const pixelCount = pendingPixels.size;
  const requiredAmount = totalPrice.toFixed(2);
  const balanceNum = balance ? parseFloat(balance) : 0;
  const hasEnoughBalance = balanceNum >= totalPrice;
  const canClaim =
    authenticated &&
    hasLinkedExternalWallet &&
    hasEnoughBalance &&
    paymentState === "idle";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl border border-orange-500/30 bg-[var(--color-bg-primary)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-orange-500/20 px-6 py-4">
          <div>
            <h2 className="font-bold text-lg text-[var(--color-text-primary)]">
              Claim Pixels
            </h2>
            <p className="text-xs text-orange-400">
              🧪 Sepolia Testnet (100x100)
            </p>
          </div>
          <button
            className="rounded-lg p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
            onClick={onClose}
            type="button"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Summary */}
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[var(--color-text-muted)]">Pixels</span>
              <span className="font-mono text-sm text-[var(--color-text-primary)]">
                {pixelCount}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--color-text-muted)]">Total</span>
              <span className="font-bold text-lg text-orange-400">
                ${requiredAmount}
              </span>
            </div>
          </div>

          {/* Wallet Section */}
          {!privyReady ? (
            <div className="h-24 animate-pulse rounded-lg bg-[var(--color-bg-secondary)]" />
          ) : !authenticated ? (
            <WalletDisconnected onConnect={login} />
          ) : !hasLinkedExternalWallet ? (
            <WalletDisconnected onConnect={linkWallet} isLinkMode />
          ) : (
            <WalletConnected
              walletAddress={walletAddress ?? ""}
              balance={balance}
              balanceLoading={balanceLoading}
              requiredAmount={requiredAmount}
              onDisconnect={logout}
            />
          )}

          {/* Error */}
          {errorMessage && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{errorMessage}</p>
            </div>
          )}

          {/* Success */}
          {paymentState === "success" && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
              <p className="text-sm text-green-400">
                Testnet pixels claimed successfully!
              </p>
            </div>
          )}

          {/* Claim Button */}
          <button
            className={`w-full rounded-lg px-4 py-3 font-semibold text-sm transition-all ${
              canClaim
                ? "bg-orange-500 text-white hover:bg-orange-600"
                : "bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-not-allowed"
            }`}
            disabled={!canClaim}
            onClick={handleClaim}
            type="button"
          >
            {paymentState === "preparing" && "Preparing..."}
            {paymentState === "signing" && "Sign in wallet..."}
            {paymentState === "submitting" && "Submitting..."}
            {paymentState === "success" && "Success!"}
            {paymentState === "error" && "Try Again"}
            {paymentState === "idle" && `Claim ${pixelCount} Pixel${pixelCount !== 1 ? "s" : ""}`}
          </button>

          {/* Testnet notice */}
          <p className="text-center text-xs text-[var(--color-text-muted)]">
            Canvas resets daily at midnight UTC
          </p>
        </div>
      </div>
    </div>
  );
}
