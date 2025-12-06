"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeToPixelUpdates } from "~/lib/supabase";
import { api } from "~/trpc/react";

const CANVAS_SIZE = 1000;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_SENSITIVITY = 0.001;

// Colors
const OUT_OF_BOUNDS_COLOR = "#06060a";
const CANVAS_BG_COLOR = "#0d0d14";

interface PixelData {
	x: number;
	y: number;
	color: string;
	owner: string;
	price: number;
	updateCount: number;
}

interface PixelCanvasProps {
	onPixelSelect: (pixel: {
		x: number;
		y: number;
		color: string;
		price: number;
		owner: string | null;
		updateCount: number;
	}) => void;
}

export function PixelCanvas({ onPixelSelect }: PixelCanvasProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [zoom, setZoom] = useState<number | null>(null);
	const [initialZoom, setInitialZoom] = useState<number>(1);
	const [pan, setPan] = useState({ x: 0, y: 0 });
	const [isPanning, setIsPanning] = useState(false);
	const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
	const [hoveredPixel, setHoveredPixel] = useState<{
		x: number;
		y: number;
	} | null>(null);
	const pixelDataRef = useRef<Map<string, PixelData>>(new Map());

	// Fetch canvas data
	const { data: pixels, isLoading } = api.canvas.getCanvas.useQuery(undefined, {
		staleTime: 30000,
	});

	// Calculate initial zoom to fit canvas height in viewport
	useEffect(() => {
		const container = containerRef.current;
		if (!container || zoom !== null) return;

		const rect = container.getBoundingClientRect();
		const fitZoom = rect.height / CANVAS_SIZE;
		setInitialZoom(fitZoom);
		setZoom(fitZoom);
	}, [zoom]);

	// Clamp pan to keep canvas center on screen
	const clampPan = useCallback(
		(newPan: { x: number; y: number }, currentZoom: number) => {
			const container = containerRef.current;
			if (!container) return newPan;

			const canvasPixelSize = CANVAS_SIZE * currentZoom;

			// Max pan is half the canvas size (so center stays on screen)
			const maxPanX = canvasPixelSize / 2;
			const maxPanY = canvasPixelSize / 2;

			return {
				x: Math.max(-maxPanX, Math.min(maxPanX, newPan.x)),
				y: Math.max(-maxPanY, Math.min(maxPanY, newPan.y)),
			};
		},
		[],
	);

	// Render canvas
	const renderCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx || zoom === null) return;

		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();

		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		ctx.scale(dpr, dpr);

		// Fill entire canvas with out-of-bounds color
		ctx.fillStyle = OUT_OF_BOUNDS_COLOR;
		ctx.fillRect(0, 0, rect.width, rect.height);

		// Calculate canvas position
		const pixelSize = zoom;
		const offsetX = pan.x + rect.width / 2 - (CANVAS_SIZE * pixelSize) / 2;
		const offsetY = pan.y + rect.height / 2 - (CANVAS_SIZE * pixelSize) / 2;

		// Draw the 1000x1000 canvas area with different background
		ctx.fillStyle = CANVAS_BG_COLOR;
		ctx.fillRect(
			offsetX,
			offsetY,
			CANVAS_SIZE * pixelSize,
			CANVAS_SIZE * pixelSize,
		);

		// Draw subtle border around canvas bounds
		ctx.strokeStyle = "rgba(0, 255, 255, 0.15)";
		ctx.lineWidth = 1;
		ctx.strokeRect(
			offsetX,
			offsetY,
			CANVAS_SIZE * pixelSize,
			CANVAS_SIZE * pixelSize,
		);

		// Calculate visible pixel range
		const startX = Math.max(0, Math.floor(-offsetX / pixelSize));
		const startY = Math.max(0, Math.floor(-offsetY / pixelSize));
		const endX = Math.min(
			CANVAS_SIZE,
			Math.ceil((rect.width - offsetX) / pixelSize),
		);
		const endY = Math.min(
			CANVAS_SIZE,
			Math.ceil((rect.height - offsetY) / pixelSize),
		);

		// Draw grid background (only if zoomed in enough)
		if (pixelSize >= 2) {
			ctx.strokeStyle = "rgba(42, 42, 58, 0.3)";
			ctx.lineWidth = 0.5;

			for (let x = startX; x <= endX; x++) {
				const screenX = x * pixelSize + offsetX;
				ctx.beginPath();
				ctx.moveTo(screenX, Math.max(offsetY, startY * pixelSize + offsetY));
				ctx.lineTo(
					screenX,
					Math.min(
						offsetY + CANVAS_SIZE * pixelSize,
						endY * pixelSize + offsetY,
					),
				);
				ctx.stroke();
			}

			for (let y = startY; y <= endY; y++) {
				const screenY = y * pixelSize + offsetY;
				ctx.beginPath();
				ctx.moveTo(Math.max(offsetX, startX * pixelSize + offsetX), screenY);
				ctx.lineTo(
					Math.min(
						offsetX + CANVAS_SIZE * pixelSize,
						endX * pixelSize + offsetX,
					),
					screenY,
				);
				ctx.stroke();
			}
		}

		// Draw pixels
		for (const [, pixel] of pixelDataRef.current) {
			if (
				pixel.x >= startX &&
				pixel.x < endX &&
				pixel.y >= startY &&
				pixel.y < endY
			) {
				ctx.fillStyle = pixel.color;
				ctx.fillRect(
					pixel.x * pixelSize + offsetX,
					pixel.y * pixelSize + offsetY,
					pixelSize,
					pixelSize,
				);
			}
		}

		// Draw hovered pixel highlight
		if (hoveredPixel) {
			ctx.strokeStyle = "#00ffff";
			ctx.lineWidth = 2;
			ctx.strokeRect(
				hoveredPixel.x * pixelSize + offsetX,
				hoveredPixel.y * pixelSize + offsetY,
				pixelSize,
				pixelSize,
			);

			ctx.shadowColor = "#00ffff";
			ctx.shadowBlur = 10;
			ctx.strokeRect(
				hoveredPixel.x * pixelSize + offsetX,
				hoveredPixel.y * pixelSize + offsetY,
				pixelSize,
				pixelSize,
			);
			ctx.shadowBlur = 0;
		}
	}, [zoom, pan, hoveredPixel]);

	// Store pixel data in ref
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
				});
			}
			renderCanvas();
		}
	}, [pixels, renderCanvas]);

	// Subscribe to real-time updates
	useEffect(() => {
		const unsubscribe = subscribeToPixelUpdates((pixel) => {
			pixelDataRef.current.set(`${pixel.x}-${pixel.y}`, pixel);
			renderCanvas();
		});
		return unsubscribe;
	}, [renderCanvas]);

	// Re-render on zoom/pan changes
	useEffect(() => {
		renderCanvas();
	}, [renderCanvas]);

	// Handle resize - recalculate initial zoom
	useEffect(() => {
		const handleResize = () => {
			const container = containerRef.current;
			if (container) {
				const rect = container.getBoundingClientRect();
				const fitZoom = rect.height / CANVAS_SIZE;
				setInitialZoom(fitZoom);
			}
			renderCanvas();
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [renderCanvas]);

	// Convert screen coordinates to pixel coordinates
	const screenToPixel = useCallback(
		(screenX: number, screenY: number) => {
			const canvas = canvasRef.current;
			if (!canvas || zoom === null) return null;

			const rect = canvas.getBoundingClientRect();
			const pixelSize = zoom;
			const offsetX = pan.x + rect.width / 2 - (CANVAS_SIZE * pixelSize) / 2;
			const offsetY = pan.y + rect.height / 2 - (CANVAS_SIZE * pixelSize) / 2;

			const x = Math.floor((screenX - rect.left - offsetX) / pixelSize);
			const y = Math.floor((screenY - rect.top - offsetY) / pixelSize);

			if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
				return { x, y };
			}
			return null;
		},
		[zoom, pan],
	);

	// Handle mouse wheel zoom
	const handleWheel = useCallback(
		(e: React.WheelEvent) => {
			e.preventDefault();
			const delta = -e.deltaY * ZOOM_SENSITIVITY;
			setZoom((prev) =>
				Math.min(
					MAX_ZOOM,
					Math.max(MIN_ZOOM, (prev ?? initialZoom) * (1 + delta)),
				),
			);
		},
		[initialZoom],
	);

	// Handle mouse down (start pan)
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		if (e.button === 1 || e.button === 2 || e.shiftKey) {
			e.preventDefault();
			setIsPanning(true);
			setLastPanPoint({ x: e.clientX, y: e.clientY });
		}
	}, []);

	// Handle mouse move
	const handleMouseMove = useCallback(
		(e: React.MouseEvent) => {
			if (isPanning) {
				const dx = e.clientX - lastPanPoint.x;
				const dy = e.clientY - lastPanPoint.y;
				const currentZoom = zoom ?? initialZoom;
				setPan((prev) =>
					clampPan({ x: prev.x + dx, y: prev.y + dy }, currentZoom),
				);
				setLastPanPoint({ x: e.clientX, y: e.clientY });
			} else {
				const pixel = screenToPixel(e.clientX, e.clientY);
				setHoveredPixel(pixel);
			}
		},
		[isPanning, lastPanPoint, screenToPixel, zoom, initialZoom, clampPan],
	);

	// Handle mouse up
	const handleMouseUp = useCallback(() => {
		setIsPanning(false);
	}, []);

	// Handle click
	const handleClick = useCallback(
		(e: React.MouseEvent) => {
			if (isPanning) return;

			const pixel = screenToPixel(e.clientX, e.clientY);
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
		},
		[isPanning, screenToPixel, onPixelSelect],
	);

	// Handle touch events for mobile
	const handleTouchStart = useCallback((e: React.TouchEvent) => {
		if (e.touches.length === 1) {
			const touch = e.touches[0];
			if (touch) {
				setLastPanPoint({ x: touch.clientX, y: touch.clientY });
			}
		}
	}, []);

	const handleTouchMove = useCallback(
		(e: React.TouchEvent) => {
			if (e.touches.length === 1) {
				const touch = e.touches[0];
				if (!touch) return;
				const dx = touch.clientX - lastPanPoint.x;
				const dy = touch.clientY - lastPanPoint.y;

				if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
					setIsPanning(true);
					const currentZoom = zoom ?? initialZoom;
					setPan((prev) =>
						clampPan({ x: prev.x + dx, y: prev.y + dy }, currentZoom),
					);
					setLastPanPoint({ x: touch.clientX, y: touch.clientY });
				}
			} else if (e.touches.length === 2) {
				const touch1 = e.touches[0];
				const touch2 = e.touches[1];
				if (!touch1 || !touch2) return;
				const distance = Math.hypot(
					touch2.clientX - touch1.clientX,
					touch2.clientY - touch1.clientY,
				);

				const container = containerRef.current;
				if (container) {
					const prevDistance =
						Number(container.dataset.pinchDistance) || distance;
					const scale = distance / prevDistance;
					setZoom((prev) =>
						Math.min(
							MAX_ZOOM,
							Math.max(MIN_ZOOM, (prev ?? initialZoom) * scale),
						),
					);
					container.dataset.pinchDistance = String(distance);
				}
			}
		},
		[lastPanPoint, initialZoom, zoom, clampPan],
	);

	const handleTouchEnd = useCallback(
		(e: React.TouchEvent) => {
			if (!isPanning && e.changedTouches.length === 1) {
				const touch = e.changedTouches[0];
				if (touch) {
					const pixel = screenToPixel(touch.clientX, touch.clientY);
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
			}

			setIsPanning(false);
			const container = containerRef.current;
			if (container) {
				delete container.dataset.pinchDistance;
			}
		},
		[isPanning, screenToPixel, onPixelSelect],
	);

	// Reset view to fit canvas
	const handleResetView = useCallback(() => {
		setZoom(initialZoom);
		setPan({ x: 0, y: 0 });
	}, [initialZoom]);

	const currentZoom = zoom ?? initialZoom;

	return (
		<div className="relative h-full w-full" ref={containerRef}>
			{/* Controls */}
			<div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
				<button
					className="btn-secondary flex h-10 w-10 items-center justify-center rounded-lg text-lg"
					onClick={() =>
						setZoom((z) => Math.min(MAX_ZOOM, (z ?? initialZoom) * 1.5))
					}
					title="Zoom In"
					type="button"
				>
					+
				</button>
				<button
					className="btn-secondary flex h-10 w-10 items-center justify-center rounded-lg text-lg"
					onClick={() =>
						setZoom((z) => Math.max(MIN_ZOOM, (z ?? initialZoom) / 1.5))
					}
					title="Zoom Out"
					type="button"
				>
					−
				</button>
				<button
					className="btn-secondary flex h-10 w-10 items-center justify-center rounded-lg text-xs"
					onClick={handleResetView}
					title="Reset View"
					type="button"
				>
					⌂
				</button>
			</div>

			{/* Zoom indicator */}
			<div className="absolute top-4 right-4 z-10 rounded-lg bg-[var(--color-bg-secondary)] px-3 py-2 font-mono text-[var(--color-text-secondary)] text-sm">
				{(currentZoom * 100).toFixed(0)}%
			</div>

			{/* Hovered pixel info */}
			{hoveredPixel && (
				<div className="absolute bottom-4 left-4 z-10 rounded-lg bg-[var(--color-bg-secondary)] px-3 py-2 font-mono text-sm">
					<span className="text-[var(--color-text-muted)]">
						({hoveredPixel.x}, {hoveredPixel.y})
					</span>
				</div>
			)}

			{/* Loading overlay */}
			{isLoading && (
				<div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--color-bg-primary)]/80">
					<div className="flex flex-col items-center gap-4">
						<div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent-cyan)] border-t-transparent" />
						<p className="text-[var(--color-text-secondary)]">
							Loading canvas...
						</p>
					</div>
				</div>
			)}

			{/* Canvas */}
			<canvas
				className="h-full w-full cursor-crosshair"
				onClick={handleClick}
				onContextMenu={(e) => e.preventDefault()}
				onMouseDown={handleMouseDown}
				onMouseLeave={handleMouseUp}
				onMouseMove={handleMouseMove}
				onMouseUp={handleMouseUp}
				onTouchEnd={handleTouchEnd}
				onTouchMove={handleTouchMove}
				onTouchStart={handleTouchStart}
				onWheel={handleWheel}
				ref={canvasRef}
				style={{ touchAction: "none" }}
			/>
		</div>
	);
}
