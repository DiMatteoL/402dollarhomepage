"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { subscribeToPixelUpdates } from "~/lib/supabase";
import { useBinaryCanvas, type CanvasPixel } from "~/lib/use-binary-canvas";
import type { PendingPixel } from "~/lib/use-pending-pixels";
import { CanvasControls } from "./canvas-controls";
import { HoveredPixelInfo, LoadingOverlay, ZoomIndicator } from "./canvas-info";
import { CANVAS_SIZE, COLORS } from "./types";

// Zoom configuration
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 40;

// Use colors from types
const {
  outOfBounds: OUT_OF_BOUNDS_COLOR,
  canvasBg: CANVAS_BG_COLOR,
  grid: GRID_COLOR,
  border: BORDER_COLOR,
} = COLORS;

// Threshold in pixels - if mouse moves more than this, it's a pan not a click
const PAN_THRESHOLD = 5;

// Pending pixel indicator color
const PENDING_INDICATOR_COLOR = "#00ffff";

interface PixelCanvasProps {
  /** Called when user clicks a pixel - provides data needed to paint locally */
  onPixelPaint: (pixel: {
    x: number;
    y: number;
    currentColor: string;
    updateCount: number;
  }) => void;
  /** Currently selected color for painting */
  hoverColor?: string;
  /** Pixels that have been painted locally but not yet claimed */
  pendingPixels?: Map<string, PendingPixel>;
}

/**
 * Canvas rendering component
 * Uses binary format for efficient initial load
 */
// Get DPR once at module level (will be 1 on SSR, updated on client)
const getDpr = () =>
  typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

function CanvasContent({
  onPixelPaint,
  hoveredPixel,
  setHoveredPixel,
  scale,
  hoverColor,
  onHoverData,
  pixels,
  pendingPixels,
  isLoading,
  updatePixel,
}: {
  onPixelPaint: PixelCanvasProps["onPixelPaint"];
  hoveredPixel: { x: number; y: number } | null;
  setHoveredPixel: (pixel: { x: number; y: number } | null) => void;
  scale: number;
  hoverColor: string;
  onHoverData?: (
    data: { mouseX: number; mouseY: number; updateCount: number } | null
  ) => void;
  pixels: Map<string, CanvasPixel>;
  pendingPixels: Map<string, PendingPixel>;
  isLoading: boolean;
  updatePixel: (
    x: number,
    y: number,
    color: string,
    updateCount: number
  ) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dpr, setDpr] = useState(getDpr);

  // Local pixel data ref for rendering (includes real-time updates)
  const pixelDataRef = useRef<
    Map<string, { color: string; updateCount: number }>
  >(new Map());

  // Track mouse position to distinguish clicks from pans
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const isPanning = useRef(false);

  // Refs to store current values for use in render
  const scaleRef = useRef(scale);
  const hoveredPixelRef = useRef(hoveredPixel);
  const hoverColorRef = useRef(hoverColor);
  const pendingPixelsRef = useRef(pendingPixels);

  // Update DPR on client mount (for SSR hydration)
  useEffect(() => {
    setDpr(window.devicePixelRatio || 1);
  }, []);

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

  useEffect(() => {
    pendingPixelsRef.current = pendingPixels;
  }, [pendingPixels]);

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
    const currentPendingPixels = pendingPixelsRef.current;

    // Only resize canvas if dimensions changed (avoids unnecessary clears)
    const targetWidth = CANVAS_SIZE * dpr;
    const targetHeight = CANVAS_SIZE * dpr;
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    // Reset transform and scale for DPR
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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

    // Draw all committed pixels
    for (const [key, pixel] of pixelDataRef.current) {
      // Skip if this pixel has a pending change
      if (currentPendingPixels.has(key)) continue;

      const [xStr, yStr] = key.split("-");
      const x = parseInt(xStr ?? "0", 10);
      const y = parseInt(yStr ?? "0", 10);
      ctx.fillStyle = pixel.color;
      ctx.fillRect(x, y, 1, 1);
    }

    // Draw pending pixels with their new colors and indicator
    for (const [key, pending] of currentPendingPixels) {
      const [xStr, yStr] = key.split("-");
      const x = parseInt(xStr ?? "0", 10);
      const y = parseInt(yStr ?? "0", 10);

      // Fill with the new color
      ctx.fillStyle = pending.newColor;
      ctx.fillRect(x, y, 1, 1);

      // Draw a subtle indicator border for pending pixels (when zoomed in)
      if (currentScale >= 2) {
        ctx.strokeStyle = PENDING_INDICATOR_COLOR;
        ctx.lineWidth = 1 / currentScale;
        ctx.globalAlpha = 0.6;
        ctx.strokeRect(x, y, 1, 1);
        ctx.globalAlpha = 1;
      }
    }

    // Draw hovered pixel with selected color preview
    if (currentHoveredPixel) {
      const hoverKey = `${currentHoveredPixel.x}-${currentHoveredPixel.y}`;
      const isPending = currentPendingPixels.has(hoverKey);

      // Fill pixel with selected color
      ctx.fillStyle = currentHoverColor;
      ctx.fillRect(currentHoveredPixel.x, currentHoveredPixel.y, 1, 1);

      // Border around the pixel
      ctx.strokeStyle = isPending ? PENDING_INDICATOR_COLOR : currentHoverColor;
      ctx.lineWidth = 2 / currentScale;
      ctx.strokeRect(currentHoveredPixel.x, currentHoveredPixel.y, 1, 1);

      // Glow effect
      ctx.shadowColor = isPending ? PENDING_INDICATOR_COLOR : currentHoverColor;
      ctx.shadowBlur = 10 / currentScale;
      ctx.strokeRect(currentHoveredPixel.x, currentHoveredPixel.y, 1, 1);
      ctx.shadowBlur = 0;
    }
  }, [dpr]);

  // Sync binary pixel data to render ref
  useEffect(() => {
    pixelDataRef.current.clear();
    for (const [key, pixel] of pixels) {
      pixelDataRef.current.set(key, {
        color: pixel.color,
        updateCount: pixel.updateCount,
      });
    }
    renderCanvas();
  }, [pixels, renderCanvas]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToPixelUpdates((pixel) => {
      // Update local ref for rendering
      pixelDataRef.current.set(`${pixel.x}-${pixel.y}`, {
        color: pixel.color,
        updateCount: pixel.updateCount,
      });

      // Update parent's pixel map
      updatePixel(pixel.x, pixel.y, pixel.color, pixel.updateCount);

      renderCanvas();
    });

    return unsubscribe;
  }, [renderCanvas, updatePixel]);

  // Re-render on scale/hover/color/pending changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, scale, hoveredPixel, hoverColor, pendingPixels]);

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
    []
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      mouseDownPos.current = { x: e.clientX, y: e.clientY };
      isPanning.current = false;
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pixel = screenToPixel(e);
      setHoveredPixel(pixel);

      // Report hover data for tooltip
      if (pixel && onHoverData) {
        const key = `${pixel.x}-${pixel.y}`;
        // Check pending pixels first, then committed pixels
        const pendingPixel = pendingPixelsRef.current.get(key);
        const pixelData = pixelDataRef.current.get(key);
        onHoverData({
          mouseX: e.clientX,
          mouseY: e.clientY,
          updateCount: pendingPixel?.updateCount ?? pixelData?.updateCount ?? 0,
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
    [screenToPixel, setHoveredPixel, onHoverData]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // Only paint pixel if we weren't panning
      if (!isPanning.current && mouseDownPos.current) {
        const pixel = screenToPixel(e);
        if (pixel) {
          const key = `${pixel.x}-${pixel.y}`;
          const pixelData = pixelDataRef.current.get(key);
          onPixelPaint({
            x: pixel.x,
            y: pixel.y,
            currentColor: pixelData?.color ?? "#1a1a2e",
            updateCount: pixelData?.updateCount ?? 0,
          });
        }
      }

      // Reset tracking
      mouseDownPos.current = null;
      isPanning.current = false;
    },
    [screenToPixel, onPixelPaint]
  );

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
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={canvasRef}
        style={{
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
        }}
      />
    </>
  );
}

/**
 * Main PixelCanvas component with pan/zoom functionality
 */
export function PixelCanvas({
  onPixelPaint,
  hoverColor = "#00ffff",
  pendingPixels = new Map(),
}: PixelCanvasProps) {
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
  const [scale, setScale] = useState(1);
  const [initialScale, setInitialScale] = useState<number | null>(null);

  // Use binary canvas hook for efficient data fetching
  const { pixels, isLoading, updatePixel } = useBinaryCanvas();

  // Calculate max updateCount for price tooltip coloring
  const [maxUpdateCount, setMaxUpdateCount] = useState<number | null>(null);
  useEffect(() => {
    if (pixels.size > 0 && maxUpdateCount === null) {
      let max = 0;
      for (const pixel of pixels.values()) {
        if (pixel.updateCount > max) max = pixel.updateCount;
      }
      setMaxUpdateCount(max);
    }
  }, [pixels, maxUpdateCount]);

  // Calculate initial scale to fit canvas in viewport
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
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
        pinch={{ step: 0.1 }}
        wheel={{ step: 0.1 }}
        smooth={false}
      >
        {() => (
          <>
            <CanvasControls />
            <ZoomIndicator scale={scale} />

            {hoveredPixel && (
              <HoveredPixelInfo x={hoveredPixel.x} y={hoveredPixel.y} />
            )}

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
                onPixelPaint={onPixelPaint}
                scale={scale}
                setHoveredPixel={setHoveredPixel}
                onHoverData={setHoverData}
                pixels={pixels}
                pendingPixels={pendingPixels}
                isLoading={isLoading}
                updatePixel={updatePixel}
              />
            </TransformComponent>

            {/* Hover price tooltip - hidden on mobile (no hover), shown on desktop */}
            {hoverData &&
              (() => {
                const price = 0.01 * (hoverData.updateCount + 1);
                const claimCount = hoverData.updateCount;
                const maxClaims = 10;
                const ratio = maxUpdateCount
                  ? Math.min(claimCount / maxUpdateCount, 1)
                  : 0;
                const hue = 145 - ratio * 145;
                const saturation = 70 + ratio * 5;
                const lightness = 45 + ratio * 5;
                const isMaxed = claimCount >= maxClaims;

                return (
                  <div
                    className="pointer-events-none fixed z-50 hidden md:block"
                    style={{
                      left: hoverData.mouseX + 16,
                      top: hoverData.mouseY - 12,
                    }}
                  >
                    <div
                      className="rounded-lg px-3 py-1.5 font-bold text-white text-sm shadow-xl backdrop-blur-sm flex items-center gap-2"
                      style={{
                        background: isMaxed
                          ? "linear-gradient(135deg, #666 0%, #444 100%)"
                          : `linear-gradient(135deg, hsl(${hue}, ${saturation}%, ${lightness}%) 0%, hsl(${Math.max(
                              hue - 15,
                              0
                            )}, ${saturation + 5}%, ${lightness - 8}%) 100%)`,
                        boxShadow: isMaxed
                          ? "0 4px 15px -2px rgba(100,100,100,0.5)"
                          : `0 4px 15px -2px hsla(${hue}, ${saturation}%, ${lightness}%, 0.5), 0 0 0 1px hsla(${hue}, ${saturation}%, ${
                              lightness + 20
                            }%, 0.3) inset`,
                        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                      }}
                    >
                      {isMaxed ? (
                        <span>Maxed</span>
                      ) : (
                        <>
                          <span>${price.toFixed(2)}</span>
                          {claimCount > 0 && (
                            <span className="text-xs font-normal opacity-80">
                              {claimCount}/{maxClaims}
                            </span>
                          )}
                        </>
                      )}
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
