"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { decodeCanvasToMap } from "./binary-canvas";

/** Pixel data from binary format */
export interface CanvasPixel {
	x: number;
	y: number;
	color: string;
	updateCount: number;
}

/** Hook return type */
interface UseBinaryCanvasReturn {
	/** Map of pixel coordinates to pixel data, keyed by "x-y" */
	pixels: Map<string, CanvasPixel>;
	/** Whether the initial fetch is in progress */
	isLoading: boolean;
	/** Error message if fetch failed */
	error: string | null;
	/** Refetch canvas data */
	refetch: () => Promise<void>;
	/** Update a single pixel locally (for optimistic updates) */
	updatePixel: (x: number, y: number, color: string, updateCount: number) => void;
}

interface UseBinaryCanvasOptions {
	/** Increment to trigger a refetch (useful for forcing refresh after transactions) */
	refreshTrigger?: number;
}

/**
 * Hook to fetch and manage binary canvas data
 *
 * Fetches canvas pixels in efficient binary format (~19x smaller than JSON)
 * and maintains a local Map for fast pixel lookups.
 */
export function useBinaryCanvas(options?: UseBinaryCanvasOptions): UseBinaryCanvasReturn {
	const [pixels, setPixels] = useState<Map<string, CanvasPixel>>(new Map());
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Track if component is mounted to prevent state updates after unmount
	const isMountedRef = useRef(true);
	// Track the last refresh trigger to detect changes
	const lastRefreshTriggerRef = useRef(options?.refreshTrigger ?? 0);

	const fetchCanvas = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const response = await fetch("/api/canvas/binary");

			if (!response.ok) {
				throw new Error(`Failed to fetch canvas: ${response.status}`);
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

	// Refetch when refreshTrigger changes (for post-transaction refresh)
	useEffect(() => {
		const currentTrigger = options?.refreshTrigger ?? 0;
		if (currentTrigger !== lastRefreshTriggerRef.current) {
			lastRefreshTriggerRef.current = currentTrigger;
			console.log("[useBinaryCanvas] Refresh triggered, refetching canvas...");
			void fetchCanvas();
		}
	}, [options?.refreshTrigger, fetchCanvas]);

	// Update a single pixel (for real-time subscription updates)
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
