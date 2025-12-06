"use client";

interface ZoomIndicatorProps {
	scale: number;
}

/**
 * Displays current zoom level in top-right corner
 */
export function ZoomIndicator({ scale }: ZoomIndicatorProps) {
	return (
		<div className="absolute top-4 right-4 z-10 rounded-lg bg-[var(--color-bg-secondary)] px-3 py-2 font-mono text-[var(--color-text-secondary)] text-sm">
			{(scale * 100).toFixed(0)}%
		</div>
	);
}

interface HoveredPixelInfoProps {
	x: number;
	y: number;
}

/**
 * Displays coordinates of hovered pixel in bottom-left corner
 */
export function HoveredPixelInfo({ x, y }: HoveredPixelInfoProps) {
	return (
		<div className="absolute bottom-4 left-4 z-10 rounded-lg bg-[var(--color-bg-secondary)] px-3 py-2 font-mono text-sm">
			<span className="text-[var(--color-text-muted)]">
				({x}, {y})
			</span>
		</div>
	);
}

/**
 * Loading overlay shown while canvas data is being fetched
 */
export function LoadingOverlay() {
	return (
		<div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--color-bg-primary)]/80">
			<div className="flex flex-col items-center gap-4">
				<div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent-cyan)] border-t-transparent" />
				<p className="text-[var(--color-text-secondary)]">Loading canvas...</p>
			</div>
		</div>
	);
}
