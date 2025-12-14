"use client";

import {
  ColorSwatch,
  CustomColorPicker,
  useRecentColors,
} from "./color-picker";

interface QuickColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  /** Pending pixels info for the action bar */
  pendingInfo?: {
    count: number;
    totalPrice: number;
    canUndo: boolean;
    onClaim: () => void;
    onUndoLast: () => void;
    onClearAll: () => void;
  };
}

export function QuickColorPicker({
  selectedColor,
  onColorSelect,
  pendingInfo,
}: QuickColorPickerProps) {
  const { recentColors, addRecentColor } = useRecentColors();

  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    addRecentColor(color);
  };

  const handleCustomColor = (color: string) => {
    onColorSelect(color);
    addRecentColor(color);
  };

  const hasPending = pendingInfo && pendingInfo.count > 0;

  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex flex-col items-center">
      {/* Container that moves up smoothly when claim bar appears */}
      <div
        className="flex flex-col items-center transition-transform duration-300 ease-in-out"
        style={{
          transform: hasPending ? "translateY(-32px)" : "translateY(0)",
        }}
      >
        {/* Quick Colors Section */}
        <div className="flex flex-col items-center">
          {/* Label */}
          <div className="text-center mb-2">
            <span className="text-[10px] text-[var(--color-text-muted)] font-medium tracking-wide uppercase">
              Quick Colors
            </span>
          </div>

          {/* Color swatches */}
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/95 backdrop-blur-md px-4 py-3 shadow-2xl shadow-black/50">
            <div className="flex items-center gap-1.5">
              {recentColors.map((color) => (
                <ColorSwatch
                  color={color}
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  selected={selectedColor.toLowerCase() === color.toLowerCase()}
                  size="sm"
                />
              ))}
            </div>

            <div className="pl-2 border-l border-[var(--color-border)]">
              <CustomColorPicker
                currentColor={selectedColor}
                onColorChange={handleCustomColor}
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Pending Pixels Action Bar */}
        <div
          className="mt-3 transition-all duration-300 ease-in-out"
          style={{
            opacity: hasPending ? 1 : 0,
            transform: hasPending ? "translateY(0)" : "translateY(10px)",
            pointerEvents: hasPending ? "auto" : "none",
          }}
        >
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/95 backdrop-blur-md px-4 py-3 shadow-2xl shadow-black/50">
            {/* Claim button */}
            <button
              onClick={pendingInfo?.onClaim}
              className="flex items-center gap-2 rounded-xl bg-[var(--color-accent-green)] px-4 py-2 font-semibold text-sm text-black transition-all hover:bg-[var(--color-accent-green)]/90 hover:shadow-[0_0_20px_rgba(0,255,136,0.3)]"
            >
              <span>
                Claim {pendingInfo?.count ?? 0} pixel
                {(pendingInfo?.count ?? 0) !== 1 ? "s" : ""}
              </span>
              <span className="rounded-lg bg-black/20 px-2 py-0.5 font-mono text-xs">
                ${(pendingInfo?.totalPrice ?? 0).toFixed(2)}
              </span>
            </button>

            {/* Divider */}
            <div className="h-6 w-px bg-[var(--color-border)]" />

            {/* Undo */}
            <button
              onClick={pendingInfo?.onUndoLast}
              disabled={!pendingInfo?.canUndo}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed"
              title="Undo last pixel (Ctrl+Z)"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 7v6h6" />
                <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
              </svg>
              <span>Undo</span>
            </button>

            {/* Clear */}
            <button
              onClick={pendingInfo?.onClearAll}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-accent-orange)]/10 hover:text-[var(--color-accent-orange)]"
              title="Clear all pending pixels"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
