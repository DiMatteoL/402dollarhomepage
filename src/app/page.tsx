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
