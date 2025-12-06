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
		<>
			{/* Full height canvas */}
			<div className="h-[calc(100vh-4rem)]">
				<PixelCanvas onPixelSelect={handlePixelSelect} />
			</div>

			{/* Pixel panel modal */}
			{selectedPixel && (
				<PixelPanel
					onClose={() => setSelectedPixel(null)}
					onSuccess={handlePaintSuccess}
					pixel={selectedPixel}
				/>
			)}
		</>
	);
}
