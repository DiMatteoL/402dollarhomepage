// Canvas constants
export const CANVAS_SIZE = 1000;

// Colors - exported for potential reuse
export const COLORS = {
	outOfBounds: "#06060a",
	canvasBg: "#0d0d14",
	grid: "rgba(42, 42, 58, 0.3)",
	border: "rgba(0, 255, 255, 0.15)",
	hover: "#00ffff",
} as const;

/**
 * Pixel data structure (matches database schema)
 */
export interface PixelData {
	x: number;
	y: number;
	color: string;
	owner: string;
	price: number;
	updateCount: number;
	timestamp: Date;
}
