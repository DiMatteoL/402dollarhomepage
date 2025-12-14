"use client";

import { useCallback, useState } from "react";

export interface PendingPixel {
  x: number;
  y: number;
  originalColor: string;
  newColor: string;
  updateCount: number;
}

/**
 * Hook to manage locally painted pixels before claiming
 * Tracks pending changes and calculates total price
 */
export function usePendingPixels() {
  // Map key is "x-y", value is the pending pixel data
  const [pendingPixels, setPendingPixels] = useState<Map<string, PendingPixel>>(
    new Map()
  );
  // Undo stack - stores keys in order they were added/modified
  const [undoStack, setUndoStack] = useState<string[]>([]);

  /**
   * Paint a pixel locally (doesn't send to server yet)
   */
  const paintPixel = useCallback(
    (
      x: number,
      y: number,
      newColor: string,
      originalColor: string,
      updateCount: number
    ) => {
      const key = `${x}-${y}`;

      setPendingPixels((prev) => {
        const next = new Map(prev);
        const existing = prev.get(key);

        // If this pixel was already pending, keep the original color from first paint
        const original = existing?.originalColor ?? originalColor;

        next.set(key, {
          x,
          y,
          originalColor: original,
          newColor,
          updateCount,
        });

        return next;
      });

      // Add to undo stack (or move to end if already there)
      setUndoStack((prev) => {
        const filtered = prev.filter((k) => k !== key);
        return [...filtered, key];
      });
    },
    []
  );

  /**
   * Undo the last painted pixel
   */
  const undoLast = useCallback(() => {
    if (undoStack.length === 0) return;

    const lastKey = undoStack[undoStack.length - 1];
    if (!lastKey) return;

    setPendingPixels((prev) => {
      const next = new Map(prev);
      next.delete(lastKey);
      return next;
    });

    setUndoStack((prev) => prev.slice(0, -1));
  }, [undoStack]);

  /**
   * Clear all pending pixels
   */
  const clearAll = useCallback(() => {
    setPendingPixels(new Map());
    setUndoStack([]);
  }, []);

  /**
   * Calculate total price for all pending pixels
   * Price = $0.01 * (updateCount + 1) for each pixel
   */
  const totalPrice = Array.from(pendingPixels.values()).reduce(
    (sum, pixel) => sum + 0.01 * (pixel.updateCount + 1),
    0
  );

  /**
   * Get pending pixels as array for API submission
   */
  const getPendingArray = useCallback(() => {
    return Array.from(pendingPixels.values()).map((p) => ({
      x: p.x,
      y: p.y,
      color: p.newColor,
    }));
  }, [pendingPixels]);

  return {
    pendingPixels,
    pendingCount: pendingPixels.size,
    totalPrice,
    paintPixel,
    undoLast,
    clearAll,
    getPendingArray,
    canUndo: undoStack.length > 0,
  };
}
