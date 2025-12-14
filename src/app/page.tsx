"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useCallback, useRef, useState } from "react";
import { createWalletClient, custom, publicActions } from "viem";
import { baseSepolia, base } from "viem/chains";
import { preparePaymentHeader, signPaymentHeader } from "x402/client";
import type { PaymentRequirements } from "x402/types";
import {
  DEFAULT_RECENT_COLORS,
  useRecentColors,
} from "./_components/color-picker";
import { PixelCanvas } from "./_components/pixel-canvas";
import { PixelPanel, type PaintRequest } from "./_components/pixel-panel";
import {
  QuickColorPicker,
  useHasSuccessfulTransaction,
} from "./_components/quick-color-picker";
import { StatusIndicator, type PaymentStatus } from "./_components/status-indicator";

interface SelectedPixel {
  x: number;
  y: number;
  color: string;
  price: number;
  owner: string | null;
  updateCount: number;
}

const X402_VERSION = 1;
const CHAINS = { "base-sepolia": baseSepolia, base } as const;

export default function HomePage() {
  const [selectedPixel, setSelectedPixel] = useState<SelectedPixel | null>(
    null
  );
  // Shared color state - initialized with first default color (red)
  const [selectedColor, setSelectedColor] = useState(
    DEFAULT_RECENT_COLORS[0] ?? "#ff0000"
  );
  // Auto paint state
  const [autoPaint, setAutoPaint] = useState(false);
  const [autoPaintStatus, setAutoPaintStatus] = useState<PaymentStatus>("idle");
  const abortControllerRef = useRef<AbortController | null>(null);

  // Wallet and auth state
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const activeWallet = wallets[0];
  const walletAddress = activeWallet?.address ?? null;

  // Track successful transactions
  const { hasSuccessfulTx, markSuccessfulTransaction } =
    useHasSuccessfulTransaction();
  const { addRecentColor } = useRecentColors();

  // Show auto-paint checkbox only if wallet connected AND has successful transaction
  const showAutoPaint = authenticated && !!walletAddress && hasSuccessfulTx;

  /**
   * Cancel ongoing auto-paint operation
   */
  const handleCancelAutoPaint = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAutoPaintStatus("idle");
  }, []);

  /**
   * Auto-paint: directly send payment without modal
   */
  const handleAutoPaint = useCallback(
    async (pixel: SelectedPixel) => {
      if (!walletAddress || !activeWallet) return;

      // Create abort controller for this operation
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setAutoPaintStatus("preparing");

      try {
        const body = { x: pixel.x, y: pixel.y, color: selectedColor };

        // Check if cancelled
        if (abortController.signal.aborted) return;

        // 1. Get payment requirements (402 response)
        const res = await fetch("/api/pixel/paint", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abortController.signal,
        });

        if (res.status !== 402) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Unexpected response");
        }

        const paymentData = await res.json();
        const requirements: PaymentRequirements = paymentData.accepts?.[0];
        if (!requirements) throw new Error("No payment options available");

        // Check if cancelled
        if (abortController.signal.aborted) return;

        // 2. Switch chain if needed
        const chain = CHAINS[requirements.network as keyof typeof CHAINS];
        if (!chain) {
          throw new Error(`Unsupported network: ${requirements.network}`);
        }

        await activeWallet.switchChain(chain.id).catch(() => {});

        // Check if cancelled
        if (abortController.signal.aborted) return;

        // 3. Create wallet client from Privy provider
        const provider = await activeWallet.getEthereumProvider();
        const providerChainId = await provider.request({
          method: "eth_chainId",
        });

        if (parseInt(providerChainId as string, 16) !== chain.id) {
          throw new Error(`Wallet is on wrong chain`);
        }

        const walletClient = createWalletClient({
          account: walletAddress as `0x${string}`,
          chain,
          transport: custom(provider),
        }).extend(publicActions);

        // Check if cancelled
        if (abortController.signal.aborted) return;

        // 4. Sign payment header - waiting for user authorization
        setAutoPaintStatus("signing");
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

        // Check if cancelled after signing
        if (abortController.signal.aborted) return;

        // 5. Submit with payment - now painting
        setAutoPaintStatus("submitting");
        const payRes = await fetch("/api/pixel/paint", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PAYMENT": paymentHeader,
          },
          body: JSON.stringify(body),
          signal: abortController.signal,
        });

        const result = await payRes.json().catch(() => ({}));

        if (!payRes.ok) {
          throw new Error(result.error ?? result.reason ?? "Payment failed");
        }

        // Success - show success animation
        setAutoPaintStatus("success");
        addRecentColor(selectedColor);
        markSuccessfulTransaction();

        // Reset to idle after success animation
        setTimeout(() => setAutoPaintStatus("idle"), 2000);
      } catch (err: unknown) {
        // Handle cancellation gracefully
        if (err instanceof Error && err.name === "AbortError") {
          console.log("[Auto Paint] Cancelled by user");
          return;
        }

        // Handle wallet rejection gracefully (user denied signature)
        const errorMessage = err instanceof Error ? err.message.toLowerCase() : "";
        if (
          errorMessage.includes("rejected") ||
          errorMessage.includes("denied") ||
          errorMessage.includes("cancelled") ||
          errorMessage.includes("canceled") ||
          errorMessage.includes("user refused")
        ) {
          console.log("[Auto Paint] User rejected transaction");
          setAutoPaintStatus("idle");
          return;
        }

        console.error("[Auto Paint] Error:", err);
        setAutoPaintStatus("idle");
        // On other errors, fall back to opening the modal
        setSelectedPixel(pixel);
      } finally {
        abortControllerRef.current = null;
      }
    },
    [
      walletAddress,
      activeWallet,
      selectedColor,
      addRecentColor,
      markSuccessfulTransaction,
    ]
  );

  const handlePixelSelect = useCallback(
    (pixel: SelectedPixel) => {
      if (autoPaint && walletAddress && activeWallet) {
        // Auto paint mode - send payment directly
        void handleAutoPaint(pixel);
      } else {
        // Normal mode - open modal
        setSelectedPixel(pixel);
      }
    },
    [autoPaint, walletAddress, activeWallet, handleAutoPaint]
  );

  const handlePaintSuccess = useCallback(() => {
    // Pixel painted successfully - mark successful transaction
    markSuccessfulTransaction();
  }, [markSuccessfulTransaction]);

  /**
   * Handle paint submission from modal (after authorization)
   * Shows "Painting..." and "Painted!" via StatusIndicator
   */
  const handlePaintStart = useCallback(
    async (request: PaintRequest) => {
      setAutoPaintStatus("submitting");

      try {
        const payRes = await fetch("/api/pixel/paint", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PAYMENT": request.paymentHeader,
          },
          body: JSON.stringify(request.body),
        });

        const result = await payRes.json().catch(() => ({}));

        if (!payRes.ok) {
          throw new Error(result.error ?? result.reason ?? "Payment failed");
        }

        // Success
        setAutoPaintStatus("success");
        addRecentColor(request.selectedColor);
        markSuccessfulTransaction();

        // Reset after success animation
        setTimeout(() => setAutoPaintStatus("idle"), 2000);
      } catch (err) {
        console.error("[Paint] Submission error:", err);
        setAutoPaintStatus("idle");
      }
    },
    [addRecentColor, markSuccessfulTransaction]
  );

  return (
    <>
      {/* Full height canvas */}
      <div className="h-[calc(100vh-4rem)]">
        <PixelCanvas
          onPixelSelect={handlePixelSelect}
          hoverColor={selectedColor}
        />
      </div>

      {/* Status indicator - shows loader with differentiated states */}
      <StatusIndicator
        status={autoPaintStatus}
        selectedColor={selectedColor}
        onCancel={handleCancelAutoPaint}
      />

      {/* Quick color picker overlay - hidden when modal is open */}
      {!selectedPixel && (
        <QuickColorPicker
          selectedColor={selectedColor}
          onColorSelect={setSelectedColor}
          autoPaint={autoPaint}
          onAutoPaintChange={setAutoPaint}
          showAutoPaint={showAutoPaint}
        />
      )}

      {/* Pixel panel modal */}
      {selectedPixel && (
        <PixelPanel
          initialColor={selectedColor}
          onClose={() => setSelectedPixel(null)}
          onColorChange={setSelectedColor}
          onSuccess={handlePaintSuccess}
          onPaintStart={handlePaintStart}
          pixel={selectedPixel}
          autoPaint={autoPaint}
          onAutoPaintChange={setAutoPaint}
          showAutoPaint={showAutoPaint}
        />
      )}
    </>
  );
}
