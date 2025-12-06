"use client";

import { useEffect } from "react";

/**
 * Prevents browser-level zoom (Ctrl+scroll, Ctrl++/-, pinch zoom)
 * while allowing canvas zoom to work normally
 */
export function PreventBrowserZoom() {
	useEffect(() => {
		// Prevent Ctrl+wheel zoom
		const handleWheel = (e: WheelEvent) => {
			if (e.ctrlKey) {
				e.preventDefault();
			}
		};

		// Prevent Ctrl++ and Ctrl+- zoom
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.ctrlKey &&
				(e.key === "+" || e.key === "-" || e.key === "=" || e.key === "0")
			) {
				e.preventDefault();
			}
		};

		// Prevent touch zoom gestures at document level
		const handleTouchMove = (e: TouchEvent) => {
			if (e.touches.length > 1) {
				e.preventDefault();
			}
		};

		document.addEventListener("wheel", handleWheel, { passive: false });
		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("touchmove", handleTouchMove, { passive: false });

		return () => {
			document.removeEventListener("wheel", handleWheel);
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("touchmove", handleTouchMove);
		};
	}, []);

	return null;
}
