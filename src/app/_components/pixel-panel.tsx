"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useCallback, useEffect, useState } from "react";
import { createWalletClient, custom, publicActions } from "viem";
import { baseSepolia, base } from "viem/chains";
import { preparePaymentHeader, signPaymentHeader } from "x402/client";
import type { PaymentRequirements } from "x402/types";
import { api } from "~/trpc/react";

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
}

const PRESET_COLORS = [
  "#ff0000",
  "#ff4400",
  "#ff8800",
  "#ffcc00",
  "#ffff00",
  "#88ff00",
  "#00ff00",
  "#00ff88",
  "#00ffff",
  "#0088ff",
  "#0000ff",
  "#4400ff",
  "#8800ff",
  "#ff00ff",
  "#ff0088",
  "#ffffff",
  "#cccccc",
  "#888888",
  "#444444",
  "#000000",
];

type PaymentState = "idle" | "processing" | "success" | "error";

const X402_VERSION = 1;
const CHAINS = { "base-sepolia": baseSepolia, base } as const;

export function PixelPanel({ pixel, onClose, onSuccess }: PixelPanelProps) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();

  const [selectedColor, setSelectedColor] = useState(
    pixel?.owner ? pixel.color : "#1d4ed8"
  );
  const [paymentState, setPaymentState] = useState<PaymentState>("idle");
  const [error, setError] = useState<string | null>(null);

  const utils = api.useUtils();

  // Get the first connected wallet
  const activeWallet = wallets[0];
  const walletAddress = activeWallet?.address ?? null;

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
      console.log("[x402] Provider chainId:", providerChainId, "Expected:", chain.id);

      if (parseInt(providerChainId as string, 16) !== chain.id) {
        throw new Error(`Wallet is on wrong chain. Expected ${chain.id}, got ${providerChainId}`);
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
        throw new Error(
          result.error ?? result.reason ?? "Payment failed"
        );
      }

      setPaymentState("success");
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
  ]);

  if (!pixel) return null;

  const nextPrice = (0.01 * (pixel.updateCount + 1)).toFixed(2);

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
      <div className="relative w-full max-w-md animate-fade-in rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-6 shadow-2xl">
        {/* Close button */}
        <button
          aria-label="Close"
          className="absolute top-4 right-4 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          onClick={onClose}
          type="button"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="font-bold text-xl" id="pixel-panel-title">
            Paint Pixel{" "}
            <span className="font-mono text-[var(--color-accent-cyan)]">
              ({pixel.x}, {pixel.y})
            </span>
          </h2>
          <p className="mt-1 text-[var(--color-text-muted)] text-sm">
            {pixel.owner
              ? `Owned by ${pixel.owner.slice(0, 16)}${
                  pixel.owner.length > 16 ? "..." : ""
                }`
              : "Unclaimed pixel"}
          </p>
        </div>

        {/* Price info */}
        <div className="mb-6 rounded-lg bg-[var(--color-bg-tertiary)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[var(--color-text-secondary)]">Price</span>
            <div className="text-right">
              <span className="font-bold text-2xl text-[var(--color-accent-green)]">
                ${nextPrice}
              </span>
              <span className="ml-2 text-[var(--color-text-muted)] text-sm">
                USDC
              </span>
            </div>
          </div>
          {pixel.updateCount > 0 && (
            <p className="mt-2 text-[var(--color-text-muted)] text-xs">
              Updated {pixel.updateCount} time
              {pixel.updateCount > 1 ? "s" : ""}. Price increases $0.01 each
              paint.
            </p>
          )}
        </div>

        {/* Color picker */}
        <div className="mb-6">
          <span className="mb-2 block font-medium text-[var(--color-text-secondary)] text-sm">
            Select Color
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                aria-label={`Select color ${color}`}
                className={`color-swatch ${
                  selectedColor === color ? "selected" : ""
                }`}
                key={color}
                onClick={() => setSelectedColor(color)}
                style={{ backgroundColor: color }}
                title={color}
                type="button"
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <label className="sr-only" htmlFor="color-picker">
              Color picker
            </label>
            <input
              className="h-10 w-16 cursor-pointer rounded border-none bg-transparent"
              id="color-picker"
              onChange={(e) => setSelectedColor(e.target.value)}
              type="color"
              value={selectedColor}
            />
            <label className="sr-only" htmlFor="color-hex">
              Color hex value
            </label>
            <input
              className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 font-mono text-sm"
              id="color-hex"
              onChange={(e) => {
                if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                  setSelectedColor(e.target.value);
                }
              }}
              placeholder="#00ffff"
              type="text"
              value={selectedColor}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="mb-6 flex items-center gap-4">
          <div className="text-[var(--color-text-secondary)] text-sm">
            Preview:
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-8 rounded border border-[var(--color-border)]"
              style={{ backgroundColor: pixel.color }}
              title={`Current: ${pixel.color}`}
            />
            <span aria-hidden="true" className="text-[var(--color-text-muted)]">
              →
            </span>
            <div
              className="h-8 w-8 rounded border-2 border-[var(--color-accent-cyan)]"
              style={{ backgroundColor: selectedColor }}
              title={`New: ${selectedColor}`}
            />
          </div>
        </div>

        {/* Wallet connection */}
        <div className="mb-6">
          <span className="mb-2 block font-medium text-[var(--color-text-secondary)] text-sm">
            Your Wallet
          </span>
          {!ready ? (
            <div className="flex h-12 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent-cyan)] border-t-transparent" />
            </div>
          ) : authenticated && walletAddress ? (
            <div className="flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-4 py-3">
              <span className="font-mono text-sm text-[var(--color-accent-cyan)]">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
              <button
                className="text-[var(--color-text-muted)] text-xs hover:text-[var(--color-text-secondary)]"
                onClick={logout}
                type="button"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              className="w-full rounded-lg border border-[var(--color-accent-cyan)] bg-[var(--color-accent-cyan)]/10 px-4 py-3 font-medium text-[var(--color-accent-cyan)] transition-colors hover:bg-[var(--color-accent-cyan)]/20"
              onClick={login}
              type="button"
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div
            className="mb-4 rounded-lg border border-[var(--color-accent-orange)] bg-[var(--color-accent-orange)]/10 px-4 py-3 text-[var(--color-accent-orange)] text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Payment status */}
        {paymentState !== "idle" && paymentState !== "error" && (
          <output className="mb-4 block rounded-lg bg-[var(--color-bg-tertiary)] px-4 py-3">
            <div className="flex items-center gap-3">
              {paymentState === "success" ? (
                <span className="text-[var(--color-accent-green)]">✓</span>
              ) : (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent-cyan)] border-t-transparent" />
              )}
              <span className="text-sm">
                {paymentState === "processing" && "Processing payment..."}
                {paymentState === "success" && "Pixel painted successfully!"}
              </span>
            </div>
          </output>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            className="btn-secondary flex-1"
            disabled={paymentState === "processing"}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="btn-primary flex-1"
            disabled={!walletAddress || paymentState === "processing"}
            onClick={handlePaint}
            type="button"
          >
            {!walletAddress
              ? "Connect Wallet First"
              : paymentState === "processing"
              ? "Processing..."
              : `Pay $${nextPrice} USDC`}
          </button>
        </div>

        {/* x402 badge */}
        <div className="mt-4 text-center">
          <span className="inline-flex items-center gap-1 text-[var(--color-text-muted)] text-xs">
            Powered by{" "}
            <span className="font-mono text-[var(--color-accent-magenta)]">
              x402
            </span>{" "}
            Protocol • HTTP 402 Payments
          </span>
        </div>
      </div>
    </div>
  );
}
