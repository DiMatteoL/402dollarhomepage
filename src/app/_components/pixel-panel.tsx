"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useCallback, useEffect, useState } from "react";
import { createWalletClient, custom, publicActions } from "viem";
import { baseSepolia, base } from "viem/chains";
import { preparePaymentHeader, signPaymentHeader } from "x402/client";
import type { PaymentRequirements } from "x402/types";
import { api } from "~/trpc/react";
import { FullColorPicker, useRecentColors } from "./color-picker";
import { useUsdcBalance, getNetworkName } from "~/lib/use-usdc-balance";

interface PixelInfo {
  x: number;
  y: number;
  color: string;
  price: number;
  owner: string | null;
  updateCount: number;
}

interface PixelPanelProps {
  pixel: PixelInfo | null;
  onClose: () => void;
  onSuccess: (pixel: PixelInfo) => void;
  initialColor?: string;
  onColorChange?: (color: string) => void;
}

type PaymentState = "idle" | "processing" | "success" | "error";

const X402_VERSION = 1;
const CHAINS = { "base-sepolia": baseSepolia, base } as const;
const MAX_CLAIMS = 10; // Maximum number of times a pixel can be claimed

// Warning icon component
function WarningIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-2h2v2h-2zm0-4V7h2v6h-2z" />
    </svg>
  );
}

// Wallet section for disconnected users
function WalletDisconnected({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-4">
      <div className="flex items-start gap-4">
        {/* USDC on Base logo */}
        <img
          src="/usdc_base.png"
          alt="USDC on Base"
          className="h-14 w-14 flex-shrink-0"
        />

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-[var(--color-text-primary)] mb-1">
            Connect to paint your first pixel
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            Pixels are paid with{" "}
            <span className="text-[#2775CA] font-medium">USDC</span> on{" "}
            <span className="text-[#0052FF] font-medium">Base</span>. Connect
            your wallet to get started.
          </p>
        </div>
      </div>

      <button
        className="mt-3 w-full rounded-lg border border-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/10 px-4 py-2.5 font-medium text-sm text-[var(--color-accent-cyan)] transition-all hover:bg-[var(--color-accent-cyan)]/20 hover:shadow-[0_0_15px_rgba(0,255,255,0.2)]"
        onClick={onConnect}
        type="button"
      >
        Connect Wallet
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
      {/* Wallet info grid */}
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
                {/* Tooltip */}
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
                      or bridge from another chain using{" "}
                      <a
                        href="https://bridge.base.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-accent-cyan)] hover:underline"
                      >
                        Base Bridge
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Amount row */}
        <div className="flex items-center justify-between">
          <span className="text-[var(--color-text-muted)]">Charged</span>
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

export function PixelPanel({
  pixel,
  onClose,
  onSuccess,
  initialColor,
  onColorChange,
}: PixelPanelProps) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { addRecentColor } = useRecentColors();

  const [selectedColor, setSelectedColor] = useState(
    initialColor ?? (pixel?.owner ? pixel.color : "#1d4ed8")
  );
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [error, setError] = useState<string | null>(null);

  const utils = api.useUtils();

  // Get the first connected wallet
  const activeWallet = wallets[0];
  const walletAddress = activeWallet?.address ?? null;

  // Fetch USDC balance
  const { balance, isLoading: balanceLoading } = useUsdcBalance(walletAddress);

  // Sync with external color changes
  useEffect(() => {
    if (initialColor) {
      setSelectedColor(initialColor);
    }
  }, [initialColor]);

  // Notify parent of color changes
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    onColorChange?.(color);
  };

  // Global ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  /**
   * Handle the x402 payment flow
   */
  const handlePaint = useCallback(async () => {
    if (!pixel || !walletAddress || !activeWallet) {
      setError("Please connect your wallet first");
      return;
    }

    setError(null);
    setPaymentState("processing");

    try {
      const body = { x: pixel.x, y: pixel.y, color: selectedColor };

      // 1. Get payment requirements (402 response)
      const res = await fetch("/api/pixel/paint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status !== 402) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Unexpected response");
      }

      const paymentData = await res.json();
      console.log("[x402] Payment requirements:", paymentData);

      const requirements: PaymentRequirements = paymentData.accepts?.[0];
      if (!requirements) throw new Error("No payment options available");

      // 2. Switch chain if needed
      const chain = CHAINS[requirements.network as keyof typeof CHAINS];
      if (!chain) {
        throw new Error(`Unsupported network: ${requirements.network}`);
      }

      console.log("[x402] Switching to chain:", chain.name, chain.id);
      await activeWallet.switchChain(chain.id).catch((e) => {
        console.warn("[x402] Chain switch failed:", e);
      });

      // 3. Create wallet client from Privy provider
      const provider = await activeWallet.getEthereumProvider();

      // Verify provider chain
      const providerChainId = await provider.request({ method: "eth_chainId" });
      console.log(
        "[x402] Provider chainId:",
        providerChainId,
        "Expected:",
        chain.id
      );

      if (parseInt(providerChainId as string, 16) !== chain.id) {
        throw new Error(
          `Wallet is on wrong chain. Expected ${chain.id}, got ${providerChainId}`
        );
      }

      const walletClient = createWalletClient({
        account: walletAddress as `0x${string}`,
        chain,
        transport: custom(provider),
      }).extend(publicActions);

      // 4. Sign payment header
      console.log("[x402] Wallet type:", activeWallet.walletClientType);
      console.log("[x402] Preparing payment header for:", walletAddress);
      const unsigned = preparePaymentHeader(
        walletAddress as `0x${string}`,
        X402_VERSION,
        requirements
      );
      console.log(
        "[x402] Unsigned payload:",
        JSON.stringify(unsigned, null, 2)
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paymentHeader = await signPaymentHeader(
        walletClient as any,
        requirements,
        unsigned
      );
      console.log(
        "[x402] Payment header signed, length:",
        paymentHeader.length
      );

      // Debug: decode the signed payload
      try {
        const decoded = JSON.parse(atob(paymentHeader));
        console.log("[x402] Signed payload:", JSON.stringify(decoded, null, 2));
      } catch {
        console.log("[x402] Could not decode payment header");
      }

      // 5. Submit with payment
      const payRes = await fetch("/api/pixel/paint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT": paymentHeader,
        },
        body: JSON.stringify(body),
      });

      const result = await payRes.json().catch(() => ({}));
      console.log("[x402] Payment response:", payRes.status, result);

      if (!payRes.ok) {
        throw new Error(result.error ?? result.reason ?? "Payment failed");
      }

      setPaymentState("success");
      // Add to recent colors on successful paint
      addRecentColor(selectedColor);
      onSuccess({
        ...pixel,
        color: selectedColor,
        owner: walletAddress,
        price: result.pixel?.price ?? pixel.price,
        updateCount: result.pixel?.updateCount ?? pixel.updateCount + 1,
      });
      void utils.canvas.getCanvas.invalidate();
      onClose();
    } catch (err: unknown) {
      console.error("[x402] Payment error:", err);
      setError(err instanceof Error ? err.message : "Payment failed");
      setPaymentState("error");
    }
  }, [
    pixel,
    selectedColor,
    walletAddress,
    activeWallet,
    utils,
    onSuccess,
    onClose,
    addRecentColor,
  ]);

  if (!pixel) return null;

  const nextPrice = (0.01 * (pixel.updateCount + 1)).toFixed(2);
  const isWalletConnected = authenticated && !!walletAddress;
  const balanceNum = balance ? parseFloat(balance) : 0;
  const hasInsufficientBalance =
    !balanceLoading && balance !== null && balanceNum < parseFloat(nextPrice);
  const hasReachedMaxClaims = pixel.updateCount >= MAX_CLAIMS;

  return (
    <div
      aria-labelledby="pixel-panel-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
    >
      {/* Backdrop */}
      <button
        aria-label="Close panel"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md animate-fade-in rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-5 shadow-2xl">
        {/* Close button */}
        <button
          aria-label="Close"
          className="absolute top-3 right-3 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          onClick={onClose}
          type="button"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-4">
          <h2 className="font-bold text-lg" id="pixel-panel-title">
            Paint Pixel{" "}
            <span className="font-mono text-[var(--color-accent-cyan)]">
              ({pixel.x}, {pixel.y})
            </span>
          </h2>
          <div className="mt-0.5 flex items-center justify-between text-xs">
            <span className="text-[var(--color-text-muted)]">
              {pixel.owner ? (
                <>Claimed by {pixel.owner.slice(0, 6)}...{pixel.owner.slice(-4)}</>
              ) : (
                <>Unclaimed</>
              )}
            </span>
            <span className={`font-mono ${pixel.updateCount >= MAX_CLAIMS ? "text-[var(--color-accent-orange)]" : "text-[var(--color-text-muted)]"}`}>
              Claim counter: {pixel.updateCount}/{MAX_CLAIMS}
            </span>
          </div>
        </div>

        {/* Color picker */}
        <div className="mb-4">
          <FullColorPicker
            selectedColor={selectedColor}
            onColorSelect={handleColorChange}
          />
        </div>

        {/* Preview */}
        <div className="mb-4 flex items-center gap-3">
          <div className="text-[var(--color-text-muted)] text-xs">Preview</div>
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded border border-[var(--color-border)]"
              style={{ backgroundColor: pixel.color }}
              title={`Current: ${pixel.color}`}
            />
            <span
              aria-hidden="true"
              className="text-[var(--color-text-muted)] text-xs"
            >
              →
            </span>
            <div
              className="h-6 w-6 rounded border-2 border-[var(--color-accent-cyan)]"
              style={{ backgroundColor: selectedColor }}
              title={`New: ${selectedColor}`}
            />
          </div>
          <div className="ml-auto text-right">
            <span className="font-bold text-lg text-[var(--color-accent-green)]">
              ${nextPrice}
            </span>
            <span className="ml-1 text-[var(--color-text-muted)] text-xs">
              USDC
            </span>
          </div>
        </div>

        {/* Wallet section */}
        <div className="mb-4">
          {!ready ? (
            <div className="flex h-20 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-accent-cyan)] border-t-transparent" />
            </div>
          ) : isWalletConnected ? (
            <WalletConnected
              walletAddress={walletAddress}
              balance={balance}
              balanceLoading={balanceLoading}
              requiredAmount={nextPrice}
              onDisconnect={logout}
            />
          ) : (
            <WalletDisconnected onConnect={login} />
          )}
        </div>

        {/* Max claims warning */}
        {hasReachedMaxClaims && (
          <div
            className="mb-3 rounded-lg border border-[var(--color-accent-orange)] bg-[var(--color-accent-orange)]/10 px-3 py-2 text-[var(--color-accent-orange)] text-xs"
            role="alert"
          >
            This pixel has reached the maximum of {MAX_CLAIMS} claims and can no longer be painted.
          </div>
        )}

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
        {paymentState !== "idle" && paymentState !== "error" && (
          <output className="mb-3 block rounded-lg bg-[var(--color-bg-tertiary)] px-3 py-2">
            <div className="flex items-center gap-2">
              {paymentState === "success" ? (
                <span className="text-[var(--color-accent-green)]">✓</span>
              ) : (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent-cyan)] border-t-transparent" />
              )}
              <span className="text-xs">
                {paymentState === "processing" && "Processing payment..."}
                {paymentState === "success" && "Pixel painted successfully!"}
              </span>
            </div>
          </output>
        )}

        {/* Action buttons - only show when wallet is connected */}
        {isWalletConnected && (
          <div className="flex gap-2">
            <button
              className="btn-secondary flex-1 py-2.5 text-sm"
              disabled={paymentState === "processing"}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="btn-primary flex-1 py-2.5 text-sm"
              disabled={paymentState === "processing" || hasInsufficientBalance || hasReachedMaxClaims}
              onClick={handlePaint}
              type="button"
              title={
                hasReachedMaxClaims
                  ? "This pixel has reached the maximum number of claims"
                  : hasInsufficientBalance
                  ? "Insufficient USDC balance"
                  : undefined
              }
            >
              {paymentState === "processing"
                ? "Processing..."
                : hasReachedMaxClaims
                ? "Max Claims Reached"
                : hasInsufficientBalance
                ? "Insufficient Balance"
                : `Pay $${nextPrice}`}
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
