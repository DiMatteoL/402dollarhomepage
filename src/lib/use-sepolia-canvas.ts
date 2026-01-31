"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { decodeCanvasToMap } from "./binary-canvas";

/** Pixel data from binary format */
export interface SepoliaCanvasPixel {
  x: number;
  y: number;
  color: string;
  updateCount: number;
}

/** Hook return type */
interface UseSepoliaCanvasReturn {
  /** Map of pixel coordinates to pixel data, keyed by "x-y" */
  pixels: Map<string, SepoliaCanvasPixel>;
  /** Whether the initial fetch is in progress */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refetch canvas data */
  refetch: () => Promise<void>;
  /** Update a single pixel locally (for optimistic updates) */
  updatePixel: (x: number, y: number, color: string, updateCount: number) => void;
}

interface UseSepoliaCanvasOptions {
  /** Increment to trigger a refetch */
  refreshTrigger?: number;
}

/**
 * Hook to fetch and manage sepolia testnet canvas data (100x100)
 */
export function useSepoliaCanvas(options?: UseSepoliaCanvasOptions): UseSepoliaCanvasReturn {
  const [pixels, setPixels] = useState<Map<string, SepoliaCanvasPixel>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const lastRefreshTriggerRef = useRef(options?.refreshTrigger ?? 0);

  const fetchCanvas = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use sepolia API endpoint
      const response = await fetch("/api/sepolia/canvas/binary");

      if (!response.ok) {
        throw new Error(`Failed to fetch sepolia canvas: ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      const pixelMap = decodeCanvasToMap(buffer);

      if (isMountedRef.current) {
        setPixels(pixelMap);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    void fetchCanvas();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchCanvas]);

  // Refetch when refreshTrigger changes
  useEffect(() => {
    const currentTrigger = options?.refreshTrigger ?? 0;
    if (currentTrigger !== lastRefreshTriggerRef.current) {
      lastRefreshTriggerRef.current = currentTrigger;
      console.log("[useSepoliaCanvas] Refresh triggered, refetching canvas...");
      void fetchCanvas();
    }
  }, [options?.refreshTrigger, fetchCanvas]);

  // Update a single pixel
  const updatePixel = useCallback(
    (x: number, y: number, color: string, updateCount: number) => {
      setPixels((prev) => {
        const next = new Map(prev);
        next.set(`${x}-${y}`, { x, y, color, updateCount });
        return next;
      });
    },
    []
  );

  return {
    pixels,
    isLoading,
    error,
    refetch: fetchCanvas,
    updatePixel,
  };
}
