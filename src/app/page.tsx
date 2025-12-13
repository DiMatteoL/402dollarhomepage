"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useCallback, useState } from "react";
import { createWalletClient, custom, publicActions } from "viem";
import { baseSepolia, base } from "viem/chains";
import { preparePaymentHeader, signPaymentHeader } from "x402/client";
import type { PaymentRequirements } from "x402/types";
import {
  DEFAULT_RECENT_COLORS,
  useRecentColors,
} from "./_components/color-picker";
import { PixelCanvas } from "./_components/pixel-canvas";
import { PixelPanel } from "./_components/pixel-panel";
import {
  QuickColorPicker,
  useHasSuccessfulTransaction,
} from "./_components/quick-color-picker";
import { StatusIndicator } from "./_components/status-indicator";

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
  const [isAutoPainting, setIsAutoPainting] = useState(false);

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
   * Auto-paint: directly send payment without modal
   */
  const handleAutoPaint = useCallback(
    async (pixel: SelectedPixel) => {
      if (!walletAddress || !activeWallet) return;

      setIsAutoPainting(true);

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
        const requirements: PaymentRequirements = paymentData.accepts?.[0];
        if (!requirements) throw new Error("No payment options available");

        // 2. Switch chain if needed
        const chain = CHAINS[requirements.network as keyof typeof CHAINS];
        if (!chain) {
          throw new Error(`Unsupported network: ${requirements.network}`);
        }

        await activeWallet.switchChain(chain.id).catch(() => {});

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

        // 4. Sign payment header
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
        const payRes = await fetch("/api/pixel/paint", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PAYMENT": paymentHeader,
          },
          body: JSON.stringify(body),
        });

        const result = await payRes.json().catch(() => ({}));

        if (!payRes.ok) {
          throw new Error(result.error ?? result.reason ?? "Payment failed");
        }

        // Success - update recent colors (UI updates via Supabase real-time)
        addRecentColor(selectedColor);
        markSuccessfulTransaction();
      } catch (err) {
        console.error("[Auto Paint] Error:", err);
        // On error, fall back to opening the modal
        setSelectedPixel(pixel);
      } finally {
        setIsAutoPainting(false);
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

  return (
    <>
      {/* Full height canvas */}
      <div className="h-[calc(100vh-4rem)]">
        <PixelCanvas
          onPixelSelect={handlePixelSelect}
          hoverColor={selectedColor}
          autoPaint={autoPaint}
        />
      </div>

      {/* Status indicator - shows loader when pending, user count otherwise */}
      <StatusIndicator isPending={isAutoPainting} />

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
          pixel={selectedPixel}
        />
      )}
    </>
  );
}
