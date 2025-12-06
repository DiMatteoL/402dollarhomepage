"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeToPixelUpdates } from "~/lib/supabase";
import { api } from "~/trpc/react";

const CANVAS_SIZE = 1000;
const INITIAL_ZOOM = 1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;
const ZOOM_SENSITIVITY = 0.001;

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
	const [zoom, setZoom] = useState(INITIAL_ZOOM);
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
		staleTime: 30000, // Cache for 30 seconds
	});

	// Render canvas - defined first so it can be used in other hooks
	const renderCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		const ctx = canvas?.getContext("2d");
		if (!canvas || !ctx) return;

		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();

		// Set canvas size accounting for device pixel ratio
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		ctx.scale(dpr, dpr);

		// Clear canvas
		ctx.fillStyle = "#0a0a0f";
		ctx.fillRect(0, 0, rect.width, rect.height);

		// Calculate visible area
		const pixelSize = zoom;
		const offsetX = pan.x + rect.width / 2 - (CANVAS_SIZE * pixelSize) / 2;
		const offsetY = pan.y + rect.height / 2 - (CANVAS_SIZE * pixelSize) / 2;

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

		// Draw grid background for unpurchased pixels (only if zoomed in enough)
		if (pixelSize >= 2) {
			ctx.strokeStyle = "rgba(42, 42, 58, 0.3)";
			ctx.lineWidth = 0.5;

			for (let x = startX; x <= endX; x++) {
				const screenX = x * pixelSize + offsetX;
				ctx.beginPath();
				ctx.moveTo(screenX, Math.max(0, startY * pixelSize + offsetY));
				ctx.lineTo(screenX, Math.min(rect.height, endY * pixelSize + offsetY));
				ctx.stroke();
			}

			for (let y = startY; y <= endY; y++) {
				const screenY = y * pixelSize + offsetY;
				ctx.beginPath();
				ctx.moveTo(Math.max(0, startX * pixelSize + offsetX), screenY);
				ctx.lineTo(Math.min(rect.width, endX * pixelSize + offsetX), screenY);
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

			// Draw glow effect
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

	// Store pixel data in ref for efficient access
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

	// Handle resize
	useEffect(() => {
		const handleResize = () => renderCanvas();
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [renderCanvas]);

	// Convert screen coordinates to pixel coordinates
	const screenToPixel = useCallback(
		(screenX: number, screenY: number) => {
			const canvas = canvasRef.current;
			if (!canvas) return null;

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
	const handleWheel = useCallback((e: React.WheelEvent) => {
		e.preventDefault();
		const delta = -e.deltaY * ZOOM_SENSITIVITY;
		setZoom((prev) =>
			Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev * (1 + delta))),
		);
	}, []);

	// Handle mouse down (start pan)
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		if (e.button === 1 || e.button === 2 || e.shiftKey) {
			// Middle click, right click, or shift+click to pan
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
				setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
				setLastPanPoint({ x: e.clientX, y: e.clientY });
			} else {
				const pixel = screenToPixel(e.clientX, e.clientY);
				setHoveredPixel(pixel);
			}
		},
		[isPanning, lastPanPoint, screenToPixel],
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

				// Only pan if movement is significant (prevent accidental pans)
				if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
					setIsPanning(true);
					setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
					setLastPanPoint({ x: touch.clientX, y: touch.clientY });
				}
			} else if (e.touches.length === 2) {
				// Pinch zoom
				const touch1 = e.touches[0];
				const touch2 = e.touches[1];
				if (!touch1 || !touch2) return;
				const distance = Math.hypot(
					touch2.clientX - touch1.clientX,
					touch2.clientY - touch1.clientY,
				);

				// Store initial distance for pinch calculation
				const container = containerRef.current;
				if (container) {
					const prevDistance =
						Number(container.dataset.pinchDistance) || distance;
					const scale = distance / prevDistance;
					setZoom((prev) =>
						Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev * scale)),
					);
					container.dataset.pinchDistance = String(distance);
				}
			}
		},
		[lastPanPoint],
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

	// Reset view
	const handleResetView = useCallback(() => {
		setZoom(INITIAL_ZOOM);
		setPan({ x: 0, y: 0 });
	}, []);

	return (
		<div className="relative h-full w-full" ref={containerRef}>
			{/* Controls */}
			<div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
				<button
					className="btn-secondary flex h-10 w-10 items-center justify-center rounded-lg text-lg"
					onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.5))}
					title="Zoom In"
					type="button"
				>
					+
				</button>
				<button
					className="btn-secondary flex h-10 w-10 items-center justify-center rounded-lg text-lg"
					onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.5))}
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
				{(zoom * 100).toFixed(0)}%
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
