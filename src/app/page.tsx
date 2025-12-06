"use client";

import { useCallback, useState } from "react";
import { PixelCanvas } from "./_components/pixel-canvas";
import { PixelPanel } from "./_components/pixel-panel";

interface SelectedPixel {
	x: number;
	y: number;
	color: string;
	price: number;
	owner: string | null;
	updateCount: number;
}

export default function HomePage() {
	const [selectedPixel, setSelectedPixel] = useState<SelectedPixel | null>(
		null,
	);

	const handlePixelSelect = useCallback((pixel: SelectedPixel) => {
		setSelectedPixel(pixel);
	}, []);

	const handlePaintSuccess = useCallback(() => {
		// Pixel painted successfully - canvas will update via realtime
	}, []);

	return (
		<div className="flex min-h-[calc(100vh-4rem)] flex-col">
			{/* Header */}
			<div className="px-4 py-6 text-center">
				<h1 className="font-bold text-3xl sm:text-4xl lg:text-5xl">
					<span className="bg-gradient-to-r from-[var(--color-accent-cyan)] via-[var(--color-accent-magenta)] to-[var(--color-accent-yellow)] bg-clip-text text-transparent">
						402 Dollar
					</span>{" "}
					<span className="text-[var(--color-text-primary)]">Homepage</span>
				</h1>
				<p className="mt-2 text-[var(--color-text-secondary)]">
					1,000,000 pixels ×{" "}
					<span className="text-[var(--color-accent-green)]">$0.01</span> ={" "}
					<span className="font-bold text-[var(--color-accent-cyan)]">
						$10,000
					</span>
				</p>
				<p className="mt-1 text-[var(--color-text-muted)] text-sm">
					Click any pixel to paint. Price increases $0.01 each repaint.
				</p>
			</div>

			{/* Canvas container - takes remaining space */}
			<div className="flex-1 px-4 pb-4">
				<div className="mx-auto h-full max-w-5xl">
					<div className="h-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
						<PixelCanvas onPixelSelect={handlePixelSelect} />
					</div>
				</div>
			</div>

			{/* Instructions */}
			<div className="flex flex-wrap justify-center gap-4 px-4 pb-6 text-[var(--color-text-muted)] text-xs">
				<span className="flex items-center gap-2">
					<kbd className="rounded bg-[var(--color-bg-tertiary)] px-2 py-1">
						Click
					</kbd>
					Select pixel
				</span>
				<span className="flex items-center gap-2">
					<kbd className="rounded bg-[var(--color-bg-tertiary)] px-2 py-1">
						Scroll
					</kbd>
					Zoom
				</span>
				<span className="flex items-center gap-2">
					<kbd className="rounded bg-[var(--color-bg-tertiary)] px-2 py-1">
						Shift + Drag
					</kbd>
					Pan
				</span>
			</div>

			{/* Pixel panel modal */}
			{selectedPixel && (
				<PixelPanel
					onClose={() => setSelectedPixel(null)}
					onSuccess={handlePaintSuccess}
					pixel={selectedPixel}
				/>
			)}
		</div>
	);
}
