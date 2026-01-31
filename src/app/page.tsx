"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_RECENT_COLORS, useRecentColors } from "./_components/color-picker";
import { PixelCanvas } from "./_components/pixel-canvas";
import { QuickColorPicker } from "./_components/quick-color-picker";
import { ClaimModal } from "./_components/claim-modal";
import { usePendingPixels } from "~/lib/use-pending-pixels";

export default function HomePage() {
  // Shared color state - initialized with first default color (red)
  const [selectedColor, setSelectedColor] = useState(
    DEFAULT_RECENT_COLORS[0] ?? "#ff0000"
  );

  // Pending pixels state
  const {
    pendingPixels,
    pendingCount,
    totalPrice,
    paintPixel,
    undoLast,
    clearAll,
    canUndo,
  } = usePendingPixels();

  // Modal state
  const [showClaimModal, setShowClaimModal] = useState(false);

  // Canvas refresh trigger - increment to force refetch after successful transaction
  const [canvasRefreshTrigger, setCanvasRefreshTrigger] = useState(0);

  // Recent colors
  const { addRecentColor } = useRecentColors();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z / Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoLast();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoLast]);

  /**
   * Handle pixel paint - just store locally, no payment yet
   */
  const handlePixelPaint = useCallback(
    (pixel: {
      x: number;
      y: number;
      currentColor: string;
      updateCount: number;
    }) => {
      paintPixel(
        pixel.x,
        pixel.y,
        selectedColor,
        pixel.currentColor,
        pixel.updateCount
      );
    },
    [selectedColor, paintPixel]
  );

  /**
   * Handle claim button click - open the modal
   */
  const handleClaimClick = useCallback(() => {
    setShowClaimModal(true);
  }, []);

  /**
   * Handle successful claim - clear pending pixels and add colors to recent
   */
  const handleClaimSuccess = useCallback(() => {
    // Add all unique colors to recent colors
    const uniqueColors = new Set<string>();
    for (const pixel of pendingPixels.values()) {
      uniqueColors.add(pixel.newColor);
    }
    for (const color of uniqueColors) {
      addRecentColor(color);
    }

    // Clear all pending pixels
    clearAll();

    // Force canvas to refetch data (ensures pixels show on Android where realtime may be unreliable)
    setCanvasRefreshTrigger((prev) => prev + 1);
  }, [pendingPixels, addRecentColor, clearAll]);

  return (
    <>
      {/* Semantic HTML section for AI agents and screen readers */}
      <section
        aria-label="How X402 Dollar Homepage Works"
        className="sr-only"
      >
        <h1>X402 Dollar Homepage</h1>
        <h2>Buy and Paint Pixels with USDC</h2>
        <p>
          X402 Dollar Homepage is a 1000x1000 pixel canvas where you can buy and
          paint pixels using USDC cryptocurrency via the x402 protocol. It is the
          modern, blockchain-powered successor to the original Million Dollar Homepage.
        </p>
        <h3>Pricing</h3>
        <p>
          Each pixel starts at $0.01 USD. The price increases by $0.01 each time
          a pixel is repainted, up to a maximum of $0.10 (10 claims maximum per pixel).
          Payments are instant via the x402 protocol using USDC on the Base network.
        </p>
        <h3>API Access</h3>
        <p>
          Programmatic access is available via REST API. Get canvas data at
          /api/canvas/json or /api/canvas/binary. Paint pixels by sending a POST
          request to /api/pixel/paint with x, y coordinates and a hex color code.
          The API uses the x402 payment protocol - send a request without payment
          to receive payment requirements, then resend with the X-PAYMENT header.
        </p>
        <h3>Documentation</h3>
        <ul>
          <li>AI Agent Guide: /llms.txt</li>
          <li>OpenAPI Specification: /openapi.json</li>
          <li>Single Pixel API: GET/POST /api/pixel/paint</li>
          <li>Batch Pixel API: POST /api/pixel/paint-batch (up to 100 pixels)</li>
          <li>Canvas Data: GET /api/canvas/json</li>
        </ul>
      </section>

      {/* Full height canvas */}
      <div className="h-[calc(100vh-4rem)]">
        <PixelCanvas
          onPixelPaint={handlePixelPaint}
          hoverColor={selectedColor}
          pendingPixels={pendingPixels}
          refreshTrigger={canvasRefreshTrigger}
        />
      </div>

      {/* Quick color picker with integrated pending pixels bar */}
      <QuickColorPicker
        selectedColor={selectedColor}
        onColorSelect={setSelectedColor}
        pendingInfo={
          pendingCount > 0
            ? {
                count: pendingCount,
                totalPrice,
                canUndo,
                onClaim: handleClaimClick,
                onUndoLast: undoLast,
                onClearAll: clearAll,
              }
            : undefined
        }
      />

      {/* Claim modal */}
      {showClaimModal && (
        <ClaimModal
          pendingPixels={pendingPixels}
          totalPrice={totalPrice}
          onClose={() => setShowClaimModal(false)}
          onSuccess={handleClaimSuccess}
        />
      )}
    </>
  );
}
