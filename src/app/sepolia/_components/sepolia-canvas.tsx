"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { useSepoliaCanvas, type SepoliaCanvasPixel } from "~/lib/use-sepolia-canvas";
import type { PendingPixel } from "~/lib/use-pending-pixels";
import { CanvasControls } from "../../_components/canvas/canvas-controls";
import { HoveredPixelInfo, LoadingOverlay, ZoomIndicator } from "../../_components/canvas/canvas-info";

// Sepolia canvas is 100x100
const CANVAS_SIZE = 100;

// Zoom configuration
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 40;

// Use same colors as mainnet for consistent visuals
const COLORS = {
  outOfBounds: "#06060a",
  canvasBg: "#0d0d14",
  grid: "rgba(42, 42, 58, 0.3)",
  border: "rgba(0, 255, 255, 0.15)",
  hover: "#00ffff",
} as const;

const PAN_THRESHOLD = 5;
const PENDING_INDICATOR_COLOR = "#00ffff";

interface SepoliaCanvasProps {
  onPixelPaint: (pixel: {
    x: number;
    y: number;
    currentColor: string;
    updateCount: number;
  }) => void;
  hoverColor?: string;
  pendingPixels?: Map<string, PendingPixel>;
  refreshTrigger?: number;
}

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
}: {
  onPixelPaint: SepoliaCanvasProps["onPixelPaint"];
  hoveredPixel: { x: number; y: number } | null;
  setHoveredPixel: (pixel: { x: number; y: number } | null) => void;
  scale: number;
  hoverColor: string;
  onHoverData?: (
    data: { mouseX: number; mouseY: number; updateCount: number } | null
  ) => void;
  pixels: Map<string, SepoliaCanvasPixel>;
  pendingPixels: Map<string, PendingPixel>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dpr, setDpr] = useState(getDpr);

  const pixelDataRef = useRef<
    Map<string, { color: string; updateCount: number }>
  >(new Map());

  const mouseDownPos = useRef<{ x: number; y: number } | null>(null);
  const isPanning = useRef(false);

  const scaleRef = useRef(scale);
  const hoveredPixelRef = useRef(hoveredPixel);
  const hoverColorRef = useRef(hoverColor);
  const pendingPixelsRef = useRef(pendingPixels);

  useEffect(() => {
    setDpr(window.devicePixelRatio || 1);
  }, []);

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

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const currentScale = scaleRef.current;
    const currentHoveredPixel = hoveredPixelRef.current;
    const currentHoverColor = hoverColorRef.current;
    const currentPendingPixels = pendingPixelsRef.current;

    const targetWidth = CANVAS_SIZE * dpr;
    const targetHeight = CANVAS_SIZE * dpr;
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = COLORS.canvasBg;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid when zoomed in
    if (currentScale >= 4) {
      ctx.strokeStyle = COLORS.grid;
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

    // Draw committed pixels
    for (const [key, pixel] of pixelDataRef.current) {
      if (currentPendingPixels.has(key)) continue;

      const [xStr, yStr] = key.split("-");
      const x = parseInt(xStr ?? "0", 10);
      const y = parseInt(yStr ?? "0", 10);
      ctx.fillStyle = pixel.color;
      ctx.fillRect(x, y, 1, 1);
    }

    // Draw pending pixels
    for (const [key, pending] of currentPendingPixels) {
      const [xStr, yStr] = key.split("-");
      const x = parseInt(xStr ?? "0", 10);
      const y = parseInt(yStr ?? "0", 10);

      ctx.fillStyle = pending.newColor;
      ctx.fillRect(x, y, 1, 1);

      if (currentScale >= 2) {
        ctx.strokeStyle = PENDING_INDICATOR_COLOR;
        ctx.lineWidth = 1 / currentScale;
        ctx.globalAlpha = 0.6;
        ctx.strokeRect(x, y, 1, 1);
        ctx.globalAlpha = 1;
      }
    }

    // Draw hovered pixel
    if (currentHoveredPixel) {
      const hoverKey = `${currentHoveredPixel.x}-${currentHoveredPixel.y}`;
      const isPending = currentPendingPixels.has(hoverKey);

      ctx.fillStyle = currentHoverColor;
      ctx.fillRect(currentHoveredPixel.x, currentHoveredPixel.y, 1, 1);

      ctx.strokeStyle = isPending ? PENDING_INDICATOR_COLOR : currentHoverColor;
      ctx.lineWidth = 2 / currentScale;
      ctx.strokeRect(currentHoveredPixel.x, currentHoveredPixel.y, 1, 1);

      ctx.shadowColor = isPending ? PENDING_INDICATOR_COLOR : currentHoverColor;
      ctx.shadowBlur = 10 / currentScale;
      ctx.strokeRect(currentHoveredPixel.x, currentHoveredPixel.y, 1, 1);
      ctx.shadowBlur = 0;
    }
  }, [dpr]);

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

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, scale, hoveredPixel, hoverColor, pendingPixels]);

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

      if (pixel && onHoverData) {
        const key = `${pixel.x}-${pixel.y}`;
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
  );
}

export function SepoliaCanvas({
  onPixelPaint,
  hoverColor = "#00ffff",
  pendingPixels = new Map(),
  refreshTrigger,
}: SepoliaCanvasProps) {
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

  const { pixels, isLoading } = useSepoliaCanvas({ refreshTrigger });

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const fitScale =
      Math.min(rect.width / CANVAS_SIZE, rect.height / CANVAS_SIZE) * 0.95;
    setInitialScale(fitScale);
    setScale(fitScale);
  }, []);

  if (initialScale === null) {
    return (
      <div
        className="relative h-full w-full overflow-hidden"
        ref={containerRef}
        style={{ backgroundColor: COLORS.outOfBounds }}
      >
        <LoadingOverlay />
      </div>
    );
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      ref={containerRef}
      style={{ backgroundColor: COLORS.outOfBounds }}
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
              />
            </TransformComponent>

            {/* Loading overlay - rendered at container level for proper sizing */}
            {isLoading && <LoadingOverlay />}

            {/* Hover price tooltip - same styling as mainnet */}
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
