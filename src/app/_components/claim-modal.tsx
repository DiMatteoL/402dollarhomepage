"use client";

import { usePrivy, useWallets, useLinkAccount } from "@privy-io/react-auth";
import { useCallback, useEffect, useState } from "react";
import { createWalletClient, custom, publicActions } from "viem";
import { baseSepolia, base } from "viem/chains";
import { preparePaymentHeader, signPaymentHeader } from "x402/client";
import type { PaymentRequirements } from "x402/types";
import { useUsdcBalance, getNetworkName } from "~/lib/use-usdc-balance";
import type { PendingPixel } from "~/lib/use-pending-pixels";

interface ClaimModalProps {
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
const CHAINS = { "base-sepolia": baseSepolia, base } as const;

// Warning icon component
function WarningIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z" />
    </svg>
  );
}

// Wallet section for disconnected users
function WalletDisconnected({
  onConnect,
  isLinkMode = false,
}: {
  onConnect: () => void;
  isLinkMode?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-4">
      <div className="flex items-start gap-4">
        <img
          src="/usdc_base.png"
          alt="USDC on Base"
          className="h-14 w-14 flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-[var(--color-text-primary)] mb-1">
            {isLinkMode
              ? "Link a wallet to continue"
              : "Connect to claim your pixels"}
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            Pixels are paid with{" "}
            <span className="text-[#2775CA] font-medium">USDC</span> on{" "}
            <span className="text-[#0052FF] font-medium">Base</span>.{" "}
            {isLinkMode
              ? "Link a wallet to get started."
              : "Connect your wallet to get started."}
          </p>
        </div>
      </div>

      <button
        className="mt-3 w-full rounded-lg border border-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/10 px-4 py-2.5 font-medium text-sm text-[var(--color-accent-cyan)] transition-all hover:bg-[var(--color-accent-cyan)]/20 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)]"
        onClick={onConnect}
        type="button"
      >
        {isLinkMode ? "Link Wallet" : "Connect Wallet"}
      </button>
    </div>
  );
}

// Wallet section for connected users
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
  const networkName = getNetworkName();
  const balanceNum = balance ? parseFloat(balance) : 0;
  const requiredNum = parseFloat(requiredAmount);
  const hasInsufficientBalance =
    !balanceLoading && balance !== null && balanceNum < requiredNum;

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-3">
      <div className="space-y-2 text-sm">
        {/* Wallet address row */}
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-text-muted)]">Wallet</span>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[var(--color-accent-cyan)]">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </span>
            <button
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent-orange)] transition-colors underline underline-offset-2"
              onClick={onDisconnect}
              type="button"
            >
              Disconnect
            </button>
          </div>
        </div>

        {/* Balance row */}
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-text-muted)]">Available</span>
          <div className="flex items-center gap-1.5">
            {balanceLoading ? (
              <div className="h-4 w-16 animate-pulse rounded bg-[var(--color-bg-hover)]" />
            ) : balance !== null ? (
              <span
                className={`font-mono ${
                  hasInsufficientBalance
                    ? "text-[var(--color-accent-orange)]"
                    : "text-[var(--color-text-primary)]"
                }`}
              >
                ${parseFloat(balance).toFixed(2)}{" "}
                <span className="text-[var(--color-text-muted)]">USDC</span>
              </span>
            ) : (
              <span className="text-[var(--color-text-muted)]">--</span>
            )}
            {hasInsufficientBalance && (
              <div className="group relative">
                <WarningIcon className="h-4 w-4 text-[var(--color-accent-orange)] cursor-help" />
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-50">
                  <div className="w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 shadow-xl text-xs">
                    <p className="font-semibold text-[var(--color-accent-orange)] mb-1">
                      Insufficient USDC
                    </p>
                    <p className="text-[var(--color-text-muted)] leading-relaxed">
                      Get USDC on Base from{" "}
                      <a
                        href="https://www.coinbase.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-accent-cyan)] hover:underline"
                      >
                        Coinbase
                      </a>{" "}
                      or bridge from another chain.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Amount row */}
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-text-muted)]">Total</span>
          <span className="font-mono text-[var(--color-text-primary)]">
            ${requiredAmount}{" "}
            <span className="text-[var(--color-text-muted)]">USDC</span>
          </span>
        </div>

        {/* Network row */}
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-text-muted)]">Network</span>
          <span className="flex items-center gap-1.5 text-[var(--color-text-primary)]">
            <span className="h-2 w-2 rounded-full bg-[#0052FF]" />
            {networkName}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ClaimModal({
  pendingPixels,
  totalPrice,
  onClose,
  onSuccess,
}: ClaimModalProps) {
  const { ready: privyReady, authenticated, login, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { linkWallet } = useLinkAccount();

  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Get the first connected wallet
  const activeWallet = wallets[0];
  const walletAddress = activeWallet?.address ?? null;

  // Fetch USDC balance
  const { balance, isLoading: balanceLoading } = useUsdcBalance(walletAddress);

  const pixelCount = pendingPixels.size;
  const priceString = totalPrice.toFixed(2);

  // Calculate breakdown for display
  const pixels = Array.from(pendingPixels.values());
  const newClaims = pixels.filter((p) => p.updateCount === 0);
  const reclaims = pixels.filter((p) => p.updateCount > 0);
  const nearMaxPixels = pixels.filter((p) => p.updateCount >= 9);
  const newClaimsPrice = newClaims.length * 0.01;
  const reclaimsPrice = reclaims.reduce(
    (sum, p) => sum + 0.01 * (p.updateCount + 1),
    0
  );

  // Global ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && paymentState === "idle") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, paymentState]);

  // Cancel handler
  const handleCancel = useCallback(() => {
    setPaymentState("idle");
    setError(null);
    onClose();
  }, [onClose]);

  /**
   * Handle the x402 batch payment flow
   */
  const handleClaim = useCallback(async () => {
    if (!walletAddress || !activeWallet || pendingPixels.size === 0) {
      setError("Please connect your wallet first");
      return;
    }

    setError(null);
    setPaymentState("preparing");

    try {
      // Build the batch request body
      const pixelsArray = Array.from(pendingPixels.values()).map((p) => ({
        x: p.x,
        y: p.y,
        color: p.newColor,
      }));
      const body = { pixels: pixelsArray };

      // 1. Get payment requirements (402 response)
      const res = await fetch("/api/pixel/paint-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status !== 402) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Unexpected response");
      }

      const paymentData = await res.json();
      console.log("[x402-batch] Payment requirements:", paymentData);

      const requirements: PaymentRequirements = paymentData.accepts?.[0];
      if (!requirements) throw new Error("No payment options available");

      // 2. Switch chain if needed
      const chain = CHAINS[requirements.network as keyof typeof CHAINS];
      if (!chain) {
        throw new Error(`Unsupported network: ${requirements.network}`);
      }

      // 3. Check wallet chain using Privy's chainId (CAIP-2 format: "eip155:8453")
      const getWalletChainId = (): number => {
        const caip2 = activeWallet.chainId ?? ""; // e.g., "eip155:8453"
        if (!caip2) return 0;
        const parts = caip2.split(":");
        return parts.length === 2 ? parseInt(parts[1] ?? "0", 10) : 0;
      };

      let walletChainId = getWalletChainId();
      console.log(
        "[x402-batch] Expected:",
        chain.id,
        "Wallet:",
        walletChainId,
        "CAIP-2:",
        activeWallet.chainId
      );

      // If on wrong chain, attempt to switch
      if (walletChainId !== chain.id) {
        try {
          await activeWallet.switchChain(chain.id);
          walletChainId = getWalletChainId();
          console.log("[x402-batch] After switch:", walletChainId);
        } catch (switchError) {
          console.log("[x402-batch] Chain switch failed:", switchError);
        }

        if (walletChainId !== chain.id) {
          throw new Error(`Please switch your wallet to Base and try again`);
        }
      }

      // Get provider AFTER confirming chain (provider instances don't update after switchChain)
      const provider = await activeWallet.getEthereumProvider();

      const walletClient = createWalletClient({
        account: walletAddress as `0x${string}`,
        chain,
        transport: custom(provider),
      }).extend(publicActions);

      // 4. Sign payment header
      setPaymentState("signing");
      const unsigned = preparePaymentHeader(
        walletAddress as `0x${string}`,
        X402_VERSION,
        requirements
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paymentHeader = await signPaymentHeader(
        walletClient as any,
        requirements,
        unsigned
      );

      // 5. Submit with payment
      setPaymentState("submitting");
      const payRes = await fetch("/api/pixel/paint-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT": paymentHeader,
        },
        body: JSON.stringify(body),
      });

      const result = await payRes.json().catch(() => ({}));
      console.log("[x402-batch] Payment response:", payRes.status, result);

      if (!payRes.ok) {
        throw new Error(result.error ?? result.reason ?? "Payment failed");
      }

      // Success!
      setPaymentState("success");

      // Close modal and notify parent after a brief delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      // Handle wallet rejection gracefully
      const errorMessage =
        err instanceof Error ? err.message.toLowerCase() : "";
      if (
        errorMessage.includes("rejected") ||
        errorMessage.includes("denied") ||
        errorMessage.includes("cancelled") ||
        errorMessage.includes("canceled") ||
        errorMessage.includes("user refused")
      ) {
        console.log("[x402-batch] User rejected transaction");
        setPaymentState("idle");
        return;
      }

      console.error("[x402-batch] Payment error:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
      setPaymentState("error");
    }
  }, [pendingPixels, walletAddress, activeWallet, onSuccess, onClose]);

  const isWalletConnected = authenticated && !!walletAddress;
  const balanceNum = balance ? parseFloat(balance) : 0;
  const hasInsufficientBalance =
    !balanceLoading && balance !== null && balanceNum < totalPrice;
  const isProcessing =
    paymentState === "preparing" ||
    paymentState === "signing" ||
    paymentState === "submitting";

  return (
    <div
      aria-labelledby="claim-modal-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
    >
      {/* Backdrop */}
      <button
        aria-label="Close modal"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
        type="button"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md animate-fade-in rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 shadow-2xl">
        {/* Close button */}
        <button
          aria-label="Close"
          className="absolute top-3 right-3 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          onClick={handleCancel}
          type="button"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-4">
          <h2 className="font-bold text-lg" id="claim-modal-title">
            Claim{" "}
            <span className="text-[var(--color-accent-cyan)]">
              {pixelCount} pixel{pixelCount !== 1 ? "s" : ""}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            Your painted pixels will be saved to the canvas
          </p>
        </div>

        {/* Pixel preview - show a sample of colors */}
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            {Array.from(pendingPixels.values())
              .slice(0, 10)
              .map((p) => (
                <div
                  key={`${p.x}-${p.y}`}
                  className="h-6 w-6 rounded border border-[var(--color-border)]"
                  style={{ backgroundColor: p.newColor }}
                  title={`(${p.x}, ${p.y})`}
                />
              ))}
            {pendingPixels.size > 10 && (
              <span className="text-xs text-[var(--color-text-muted)]">
                +{pendingPixels.size - 10} more
              </span>
            )}
          </div>
        </div>

        {/* Price breakdown */}
        <div className="mb-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-3 space-y-2">
          {/* New claims row */}
          {newClaims.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-text-muted)]">
                {newClaims.length} new pixel{newClaims.length !== 1 ? "s" : ""}
              </span>
              <span className="font-mono text-[var(--color-text-secondary)]">
                ${newClaimsPrice.toFixed(2)}
              </span>
            </div>
          )}

          {/* Reclaims row */}
          {reclaims.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-accent-orange)]">
                {reclaims.length} reclaim{reclaims.length !== 1 ? "s" : ""}
              </span>
              <span className="font-mono text-[var(--color-accent-orange)]">
                ${reclaimsPrice.toFixed(2)}
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-[var(--color-border)]" />

          {/* Total row */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              Total
            </span>
            <span className="font-bold text-lg text-[var(--color-accent-green)]">
              ${priceString}{" "}
              <span className="text-xs font-normal text-[var(--color-text-muted)]">
                USDC
              </span>
            </span>
          </div>
        </div>

        {/* Warning for pixels near max */}
        {nearMaxPixels.length > 0 && (
          <div className="mb-4 rounded-lg border border-[var(--color-accent-orange)]/30 bg-[var(--color-accent-orange)]/5 px-3 py-2">
            <p className="text-xs text-[var(--color-accent-orange)]">
              ⚠️ {nearMaxPixels.length} pixel
              {nearMaxPixels.length !== 1 ? "s are" : " is"} at 9/10 claims —
              this will be the last time
              {nearMaxPixels.length !== 1 ? " they" : " it"} can be claimed!
            </p>
          </div>
        )}

        {/* Wallet section */}
        <div className="mb-4">
          {!privyReady ? (
            <div className="flex h-20 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-accent-cyan)] border-t-transparent" />
            </div>
          ) : !authenticated ? (
            <WalletDisconnected onConnect={login} />
          ) : !walletsReady ? (
            <div className="flex h-20 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-accent-cyan)] border-t-transparent" />
                <span className="text-sm text-[var(--color-text-muted)]">
                  Loading wallet...
                </span>
              </div>
            </div>
          ) : isWalletConnected ? (
            <WalletConnected
              walletAddress={walletAddress}
              balance={balance}
              balanceLoading={balanceLoading}
              requiredAmount={priceString}
              onDisconnect={logout}
            />
          ) : (
            <WalletDisconnected onConnect={linkWallet} isLinkMode />
          )}
        </div>

        {/* Error message */}
        {error && (
          <div
            className="mb-3 rounded-lg border border-[var(--color-accent-orange)] bg-[var(--color-accent-orange)]/10 px-3 py-2 text-[var(--color-accent-orange)] text-xs"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Payment status */}
        {isProcessing && (
          <output className="mb-3 block rounded-lg px-3 py-2.5 bg-[var(--color-bg-tertiary)]">
            <div className="flex items-center gap-3">
              <div className="relative flex h-6 w-6 items-center justify-center">
                <div
                  className={`absolute inset-0 rounded-full border-2 ${
                    paymentState === "signing"
                      ? "border-[var(--color-accent-magenta)]/30"
                      : "border-[var(--color-accent-cyan)]/30"
                  }`}
                />
                <div
                  className={`absolute inset-0 rounded-full border-2 border-t-transparent animate-spin ${
                    paymentState === "signing"
                      ? "border-[var(--color-accent-magenta)]"
                      : "border-[var(--color-accent-cyan)]"
                  }`}
                />
              </div>
              <div className="flex-1">
                <span
                  className={`text-sm font-medium ${
                    paymentState === "signing"
                      ? "text-[var(--color-accent-magenta)]"
                      : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  {paymentState === "preparing" && "Preparing..."}
                  {paymentState === "signing" && "Authorizing..."}
                  {paymentState === "submitting" && "Claiming pixels..."}
                </span>
                {paymentState === "signing" && (
                  <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    Please confirm in your wallet
                  </p>
                )}
              </div>
            </div>
          </output>
        )}

        {/* Success state */}
        {paymentState === "success" && (
          <output className="mb-3 block rounded-lg px-3 py-2.5 bg-[var(--color-accent-green)]/10 border border-[var(--color-accent-green)]/30">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-accent-green)]">
                <svg
                  className="h-4 w-4 text-black"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-sm font-medium text-[var(--color-accent-green)]">
                Pixels claimed successfully!
              </span>
            </div>
          </output>
        )}

        {/* Action buttons */}
        {isWalletConnected && paymentState !== "success" && (
          <div className="flex gap-2">
            <button
              className="btn-secondary flex-1 py-2.5 text-sm"
              onClick={handleCancel}
              disabled={isProcessing}
              type="button"
            >
              Cancel
            </button>
            <button
              className="btn-primary flex-1 py-2.5 text-sm"
              disabled={isProcessing || hasInsufficientBalance}
              onClick={handleClaim}
              type="button"
            >
              {isProcessing
                ? paymentState === "signing"
                  ? "Authorizing..."
                  : paymentState === "submitting"
                  ? "Claiming..."
                  : "Preparing..."
                : hasInsufficientBalance
                ? "Insufficient Balance"
                : `Pay $${priceString}`}
            </button>
          </div>
        )}

        {/* x402 badge */}
        <div className="mt-3 text-center">
          <span className="inline-flex items-center gap-1 text-[var(--color-text-muted)] text-[10px]">
            Powered by{" "}
            <span className="font-mono text-[var(--color-accent-magenta)]">
              x402
            </span>{" "}
            • HTTP 402 Payments
          </span>
        </div>
      </div>
    </div>
  );
}
