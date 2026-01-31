"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_RECENT_COLORS } from "../_components/color-picker";
import { usePendingPixels } from "~/lib/use-pending-pixels";
import { SepoliaCanvas } from "./_components/sepolia-canvas";
import { SepoliaClaimModal } from "./_components/sepolia-claim-modal";

export default function SepoliaPage() {
  // Shared color state
  const [selectedColor, setSelectedColor] = useState(
    DEFAULT_RECENT_COLORS[0] ?? "#ff6600"
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

  // Canvas refresh trigger
  const [canvasRefreshTrigger, setCanvasRefreshTrigger] = useState(0);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undoLast();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undoLast]);

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

  const handleClaimClick = useCallback(() => {
    setShowClaimModal(true);
  }, []);

  const handleClaimSuccess = useCallback(() => {
    clearAll();
    setCanvasRefreshTrigger((prev) => prev + 1);
  }, [clearAll]);

  // Simple color palette for testnet
  const colors = [
    "#ff6600", "#ff0000", "#00ff00", "#0000ff", "#ffff00",
    "#ff00ff", "#00ffff", "#ffffff", "#000000", "#888888",
  ];

  return (
    <>
      {/* Testnet Banner */}
      <div className="bg-orange-500/20 border-b border-orange-500/30 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧪</span>
            <span className="font-medium text-orange-400 text-sm">
              Sepolia Testnet
            </span>
            <span className="text-[var(--color-text-muted)] text-xs">
              100×100 canvas • Resets daily
            </span>
          </div>
          <a
            href="/"
            className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
          >
            ← Back to Mainnet
          </a>
        </div>
      </div>

      {/* Canvas */}
      <div className="h-[calc(100vh-7.5rem)]">
        <SepoliaCanvas
          onPixelPaint={handlePixelPaint}
          hoverColor={selectedColor}
          pendingPixels={pendingPixels}
          refreshTrigger={canvasRefreshTrigger}
        />
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-orange-500/30 bg-[var(--color-bg-primary)]/95 backdrop-blur-md px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Color Picker */}
          <div className="flex items-center gap-2">
            {colors.map((color) => (
              <button
                key={color}
                className={`h-8 w-8 rounded-lg border-2 transition-all ${
                  selectedColor === color
                    ? "border-orange-400 scale-110"
                    : "border-transparent hover:border-[var(--color-border)]"
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setSelectedColor(color)}
                type="button"
              />
            ))}
          </div>

          {/* Pending Info & Actions */}
          {pendingCount > 0 ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--color-text-secondary)]">
                {pendingCount} pixel{pendingCount !== 1 ? "s" : ""} •{" "}
                <span className="text-orange-400 font-medium">
                  ${totalPrice.toFixed(2)}
                </span>
              </span>

              {canUndo && (
                <button
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                  onClick={undoLast}
                  type="button"
                >
                  Undo
                </button>
              )}

              <button
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] transition-colors"
                onClick={clearAll}
                type="button"
              >
                Clear
              </button>

              <button
                className="rounded-lg bg-orange-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
                onClick={handleClaimClick}
                type="button"
              >
                Claim
              </button>
            </div>
          ) : (
            <span className="text-xs text-[var(--color-text-muted)]">
              Click pixels to paint • Uses testnet USDC
            </span>
          )}
        </div>
      </div>

      {/* Claim Modal */}
      {showClaimModal && (
        <SepoliaClaimModal
          pendingPixels={pendingPixels}
          totalPrice={totalPrice}
          onClose={() => setShowClaimModal(false)}
          onSuccess={handleClaimSuccess}
        />
      )}
    </>
  );
}
