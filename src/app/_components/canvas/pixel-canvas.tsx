"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import {
	subscribeToPixelUpdates,
	type RealtimePixel,
} from "~/lib/supabase";
import { api } from "~/trpc/react";
import { CanvasControls } from "./canvas-controls";
import { HoveredPixelInfo, LoadingOverlay, ZoomIndicator } from "./canvas-info";
import { CANVAS_SIZE, COLORS, type PixelData } from "./types";

// Zoom configuration
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 40;
const INITIAL_ZOOM = 1;

// Use colors from types
const {
	outOfBounds: OUT_OF_BOUNDS_COLOR,
	canvasBg: CANVAS_BG_COLOR,
	grid: GRID_COLOR,
	border: BORDER_COLOR,
} = COLORS;

interface PixelCanvasProps {
	onPixelSelect: (pixel: {
		x: number;
		y: number;
		color: string;
		price: number;
		owner: string | null;
		updateCount: number;
	}) => void;
	hoverColor?: string;
	autoPaint?: boolean;
}

/**
 * Inner canvas component that renders the pixel grid
 * This is separated to access the transform context
 */
// Threshold in pixels - if mouse moves more than this, it's a pan not a click
const PAN_THRESHOLD = 5;

function CanvasContent({
	onPixelSelect,
	hoveredPixel,
	setHoveredPixel,
	scale,
	hoverColor,
	onHoverData,
}: {
	onPixelSelect: PixelCanvasProps["onPixelSelect"];
	hoveredPixel: { x: number; y: number } | null;
	setHoveredPixel: (pixel: { x: number; y: number } | null) => void;
	scale: number;
	hoverColor: string;
	onHoverData?: (data: { mouseX: number; mouseY: number; updateCount: number } | null) => void;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const pixelDataRef = useRef<Map<string, PixelData>>(new Map());

	// Track mouse position to distinguish clicks from pans
	const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
	const isPanning = useRef(false);

	// Refs to store current values for use in subscription callback
	const scaleRef = useRef(scale);
	const hoveredPixelRef = useRef(hoveredPixel);
	const hoverColorRef = useRef(hoverColor);

	// Keep refs in sync
	useEffect(() => {
		scaleRef.current = scale;
	}, [scale]);

	useEffect(() => {
		hoveredPixelRef.current = hoveredPixel;
	}, [hoveredPixel]);

	useEffect(() => {
		hoverColorRef.current = hoverColor;
	}, [hoverColor]);

	// tRPC utilities for cache updates
	const utils = api.useUtils();

	// Fetch canvas data
	const { data: pixels, isLoading } = api.canvas.getCanvas.useQuery(undefined, {
		staleTime: 30000,
		refetchOnWindowFocus: false,
	});

	/**
	 * Main render function - uses refs so it doesn't need to be recreated
	 */
	const renderCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;

		const currentScale = scaleRef.current;
		const currentHoveredPixel = hoveredPixelRef.current;
		const currentHoverColor = hoverColorRef.current;
		const dpr = window.devicePixelRatio || 1;

		// Set canvas size to match the logical canvas size
		canvas.width = CANVAS_SIZE * dpr;
		canvas.height = CANVAS_SIZE * dpr;
		ctx.scale(dpr, dpr);

		// Fill background
		ctx.fillStyle = CANVAS_BG_COLOR;
		ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

		// Draw border
		ctx.strokeStyle = BORDER_COLOR;
		ctx.lineWidth = 1;
		ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

		// Draw grid when zoomed in enough
		if (currentScale >= 4) {
			ctx.strokeStyle = GRID_COLOR;
			ctx.lineWidth = 0.5;

			for (let x = 0; x <= CANVAS_SIZE; x += 1) {
				ctx.beginPath();
				ctx.moveTo(x, 0);
				ctx.lineTo(x, CANVAS_SIZE);
				ctx.stroke();
			}

			for (let y = 0; y <= CANVAS_SIZE; y += 1) {
				ctx.beginPath();
				ctx.moveTo(0, y);
				ctx.lineTo(CANVAS_SIZE, y);
				ctx.stroke();
			}
		}

		// Draw all pixels
		for (const [, pixel] of pixelDataRef.current) {
			ctx.fillStyle = pixel.color;
			ctx.fillRect(pixel.x, pixel.y, 1, 1);
		}

		// Draw hovered pixel with selected color preview
		if (currentHoveredPixel) {
			// Fill pixel with selected color
			ctx.fillStyle = currentHoverColor;
			ctx.fillRect(currentHoveredPixel.x, currentHoveredPixel.y, 1, 1);

			// Border around the pixel
			ctx.strokeStyle = currentHoverColor;
			ctx.lineWidth = 2 / currentScale;
			ctx.strokeRect(currentHoveredPixel.x, currentHoveredPixel.y, 1, 1);

			// Glow effect
			ctx.shadowColor = currentHoverColor;
			ctx.shadowBlur = 10 / currentScale;
			ctx.strokeRect(currentHoveredPixel.x, currentHoveredPixel.y, 1, 1);
			ctx.shadowBlur = 0;
		}
	}, []); // No dependencies - uses refs instead

	// Store pixel data and render
	useEffect(() => {
		if (pixels) {
			pixelDataRef.current.clear();
			for (const pixel of pixels) {
				pixelDataRef.current.set(`${pixel.x}-${pixel.y}`, {
					x: pixel.x,
					y: pixel.y,
					color: pixel.color,
					owner: pixel.owner,
					price: pixel.price,
					updateCount: pixel.updateCount,
					timestamp: pixel.timestamp,
				});
			}
			renderCanvas();
		}
	}, [pixels, renderCanvas]);

	// Subscribe to real-time updates - only once on mount
	useEffect(() => {
		const unsubscribe = subscribeToPixelUpdates((pixel: RealtimePixel) => {
			const now = new Date();

			// Update the local ref for immediate canvas rendering
			pixelDataRef.current.set(`${pixel.x}-${pixel.y}`, {
				...pixel,
				timestamp: now,
			});
			renderCanvas();

			// Also update the tRPC query cache so other components get the update
			utils.canvas.getCanvas.setData(undefined, (oldData) => {
				const pixelWithTimestamp: PixelData = { ...pixel, timestamp: now };

				if (!oldData) return [pixelWithTimestamp];

				const existingIndex = oldData.findIndex(
					(p) => p.x === pixel.x && p.y === pixel.y,
				);

				if (existingIndex >= 0) {
					// Update existing pixel
					const newData = [...oldData];
					newData[existingIndex] = {
						...oldData[existingIndex],
						...pixelWithTimestamp,
					};
					return newData;
				}

				// Add new pixel
				return [...oldData, pixelWithTimestamp];
			});
		});
		return unsubscribe;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only run once on mount - renderCanvas and utils are stable refs

	// Re-render on scale/hover/color changes
	useEffect(() => {
		renderCanvas();
	}, [renderCanvas, scale, hoveredPixel, hoverColor]);

	/**
	 * Convert screen coordinates to pixel coordinates
	 */
	const screenToPixel = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			const canvas = canvasRef.current;
			if (!canvas) return null;

			const rect = canvas.getBoundingClientRect();
			const scaleX = CANVAS_SIZE / rect.width;
			const scaleY = CANVAS_SIZE / rect.height;

			const x = Math.floor((e.clientX - rect.left) * scaleX);
			const y = Math.floor((e.clientY - rect.top) * scaleY);

			if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
				return { x, y };
			}
			return null;
		},
		[],
	);

	/**
	 * Handle mouse down - record start position
	 */
	const handleMouseDown = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			mouseDownPos.current = { x: e.clientX, y: e.clientY };
			isPanning.current = false;
		},
		[],
	);

	/**
	 * Handle mouse move - update hovered pixel and detect panning
	 */
	const handleMouseMove = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			const pixel = screenToPixel(e);
			setHoveredPixel(pixel);

			// Report hover data for tooltip
			if (pixel && onHoverData) {
				const pixelData = pixelDataRef.current.get(`${pixel.x}-${pixel.y}`);
				onHoverData({
					mouseX: e.clientX,
					mouseY: e.clientY,
					updateCount: pixelData?.updateCount ?? 0,
				});
			} else if (onHoverData) {
				onHoverData(null);
			}

			// Check if we've moved enough to be considered panning
			if (mouseDownPos.current && !isPanning.current) {
				const dx = Math.abs(e.clientX - mouseDownPos.current.x);
				const dy = Math.abs(e.clientY - mouseDownPos.current.y);
				if (dx > PAN_THRESHOLD || dy > PAN_THRESHOLD) {
					isPanning.current = true;
				}
			}
		},
		[screenToPixel, setHoveredPixel, onHoverData],
	);

	/**
	 * Handle mouse up - select pixel only if we weren't panning
	 */
	const handleMouseUp = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			// Only select pixel if we weren't panning
			if (!isPanning.current && mouseDownPos.current) {
				const pixel = screenToPixel(e);
				if (pixel) {
					const pixelData = pixelDataRef.current.get(`${pixel.x}-${pixel.y}`);
				onPixelSelect({
					x: pixel.x,
					y: pixel.y,
					color: pixelData?.color ?? "#1a1a2e",
					price: pixelData?.price ?? 0.01,
					owner: pixelData?.owner ?? null,
					updateCount: pixelData?.updateCount ?? 0,
				});
				}
			}

			// Reset tracking
			mouseDownPos.current = null;
			isPanning.current = false;
		},
		[screenToPixel, onPixelSelect],
	);

	/**
	 * Handle mouse leave - clear hovered pixel and reset tracking
	 */
	const handleMouseLeave = useCallback(() => {
		setHoveredPixel(null);
		onHoverData?.(null);
		mouseDownPos.current = null;
		isPanning.current = false;
	}, [setHoveredPixel, onHoverData]);

	return (
		<>
			{isLoading && <LoadingOverlay />}
			<canvas
				className="cursor-crosshair"
				height={CANVAS_SIZE}
				onMouseDown={handleMouseDown}
				onMouseLeave={handleMouseLeave}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				ref={canvasRef}
				style={{
					width: CANVAS_SIZE,
					height: CANVAS_SIZE,
					imageRendering: "pixelated",
				}}
				width={CANVAS_SIZE}
			/>
		</>
	);
}

/**
 * Main PixelCanvas component with pan/zoom functionality
 */
export function PixelCanvas({ onPixelSelect, hoverColor = "#00ffff", autoPaint = false }: PixelCanvasProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [hoveredPixel, setHoveredPixel] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const [hoverData, setHoverData] = useState<{
		mouseX: number;
		mouseY: number;
		updateCount: number;
	} | null>(null);
	const [scale, setScale] = useState(INITIAL_ZOOM);
	const [initialScale, setInitialScale] = useState<number | null>(null);

	// Fetch canvas data to get max price (tRPC caches this)
	const { data: pixels } = api.canvas.getCanvas.useQuery(undefined, {
		staleTime: 30000,
		refetchOnWindowFocus: false,
	});

	// Calculate max updateCount once on initial load, then never recalculate
	const [maxUpdateCount, setMaxUpdateCount] = useState<number | null>(null);
	useEffect(() => {
		if (pixels && maxUpdateCount === null) {
			const max = pixels.reduce((m, p) => Math.max(m, p.updateCount), 0);
			setMaxUpdateCount(max);
		}
	}, [pixels, maxUpdateCount]);

	// Calculate initial scale to fit canvas in viewport
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const rect = container.getBoundingClientRect();
		// Fit canvas to container with some padding
		const fitScale =
			Math.min(rect.width / CANVAS_SIZE, rect.height / CANVAS_SIZE) * 0.95;
		setInitialScale(fitScale);
		setScale(fitScale);
	}, []);

	// Don't render until we've calculated the initial scale
	if (initialScale === null) {
		return (
			<div
				className="relative h-full w-full overflow-hidden"
				ref={containerRef}
				style={{ backgroundColor: OUT_OF_BOUNDS_COLOR }}
			>
				<LoadingOverlay />
			</div>
		);
	}

	return (
		<div
			className="relative h-full w-full overflow-hidden"
			ref={containerRef}
			style={{ backgroundColor: OUT_OF_BOUNDS_COLOR }}
		>
			<TransformWrapper
				centerOnInit={true}
				doubleClick={{ disabled: true }}
				initialScale={initialScale}
				key={`transform-${initialScale}`}
				limitToBounds={false}
				maxScale={MAX_ZOOM}
				minScale={MIN_ZOOM}
				onTransformed={(_, state) => {
					setScale(state.scale);
				}}
				panning={{ velocityDisabled: true }}
				wheel={{ step: 0.5 }}
			>
				{() => (
					<>
						{/* Controls - outside TransformComponent so they don't get transformed */}
						<CanvasControls />

						{/* Zoom indicator */}
						<ZoomIndicator scale={scale} />

						{/* Hovered pixel info */}
						{hoveredPixel && (
							<HoveredPixelInfo x={hoveredPixel.x} y={hoveredPixel.y} />
						)}

						{/* Transformed canvas content */}
						<TransformComponent
							contentStyle={{
								width: CANVAS_SIZE,
								height: CANVAS_SIZE,
							}}
							wrapperStyle={{
								width: "100%",
								height: "100%",
							}}
						>
							<CanvasContent
								hoveredPixel={hoveredPixel}
								hoverColor={hoverColor}
								onPixelSelect={onPixelSelect}
								scale={scale}
								setHoveredPixel={setHoveredPixel}
								onHoverData={setHoverData}
							/>
						</TransformComponent>

						{/* Auto-paint price tooltip */}
						{autoPaint && hoverData && (() => {
							const price = 0.01 * (hoverData.updateCount + 1);
							// Map price to 0-1 ratio relative to max price on canvas
							const ratio = maxUpdateCount ? Math.min(hoverData.updateCount / maxUpdateCount, 1) : 0;
							// Green: hsl(145, 70%, 45%) -> Red: hsl(0, 75%, 50%)
							const hue = 145 - (ratio * 145);
							const saturation = 70 + (ratio * 5);
							const lightness = 45 + (ratio * 5);

							return (
								<div
									className="pointer-events-none fixed z-50"
									style={{
										left: hoverData.mouseX + 16,
										top: hoverData.mouseY - 12,
									}}
								>
									<div
										className="rounded-lg px-3 py-1.5 font-bold text-white text-sm shadow-xl backdrop-blur-sm"
										style={{
											background: `linear-gradient(135deg, hsl(${hue}, ${saturation}%, ${lightness}%) 0%, hsl(${Math.max(hue - 15, 0)}, ${saturation + 5}%, ${lightness - 8}%) 100%)`,
											boxShadow: `0 4px 15px -2px hsla(${hue}, ${saturation}%, ${lightness}%, 0.5), 0 0 0 1px hsla(${hue}, ${saturation}%, ${lightness + 20}%, 0.3) inset`,
											textShadow: '0 1px 2px rgba(0,0,0,0.3)',
										}}
									>
										${price.toFixed(2)}
									</div>
								</div>
							);
						})()}
					</>
				)}
			</TransformWrapper>
		</div>
	);
}
