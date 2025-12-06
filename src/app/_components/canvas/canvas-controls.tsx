"use client";

import { useControls } from "react-zoom-pan-pinch";

/**
 * Zoom controls component - positioned in top-left corner
 * Uses react-zoom-pan-pinch's useControls hook for zoom actions
 */
export function CanvasControls() {
	const { zoomIn, zoomOut, resetTransform } = useControls();

	return (
		<div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
			<button
				className="btn-secondary flex h-10 w-10 items-center justify-center rounded-lg text-lg transition-transform hover:scale-105 active:scale-95"
				onClick={() => zoomIn(0.5)}
				title="Zoom In"
				type="button"
			>
				+
			</button>
			<button
				className="btn-secondary flex h-10 w-10 items-center justify-center rounded-lg text-lg transition-transform hover:scale-105 active:scale-95"
				onClick={() => zoomOut(0.5)}
				title="Zoom Out"
				type="button"
			>
				−
			</button>
			<button
				className="btn-secondary flex h-10 w-10 items-center justify-center rounded-lg text-xs transition-transform hover:scale-105 active:scale-95"
				onClick={() => resetTransform()}
				title="Reset View"
				type="button"
			>
				⌂
			</button>
		</div>
	);
}
