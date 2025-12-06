"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ColorSwatch,
  CustomColorPicker,
  useRecentColors,
} from "./color-picker";

const SUCCESSFUL_TX_KEY = "402-has-successful-tx";

/**
 * Hook to track if user has made a successful transaction
 */
export function useHasSuccessfulTransaction() {
  const [hasSuccessfulTx, setHasSuccessfulTx] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SUCCESSFUL_TX_KEY);
    setHasSuccessfulTx(stored === "true");
  }, []);

  const markSuccessfulTransaction = useCallback(() => {
    localStorage.setItem(SUCCESSFUL_TX_KEY, "true");
    setHasSuccessfulTx(true);
  }, []);

  return { hasSuccessfulTx, markSuccessfulTransaction };
}

interface QuickColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  autoPaint?: boolean;
  onAutoPaintChange?: (enabled: boolean) => void;
  showAutoPaint?: boolean;
}

export function QuickColorPicker({
  selectedColor,
  onColorSelect,
  autoPaint = false,
  onAutoPaintChange,
  showAutoPaint = false,
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

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
      {/* Label on top */}
      <div className="text-center mb-2">
        <span className="text-[10px] text-[var(--color-text-muted)] font-medium tracking-wide uppercase">
          Quick Colors
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/95 backdrop-blur-md px-4 py-3 shadow-2xl shadow-black/50">
        {/* Recent colors */}
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

        {/* Custom color picker */}
        <div className="pl-2 border-l border-[var(--color-border)]">
          <CustomColorPicker
            currentColor={selectedColor}
            onColorChange={handleCustomColor}
            size="sm"
          />
        </div>
      </div>

      {/* Auto paint checkbox - only shown for eligible users */}
      {showAutoPaint && (
        <div className="flex justify-center mt-3">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={autoPaint}
              onChange={(e) => onAutoPaintChange?.(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-tertiary)] text-[var(--color-accent-cyan)] focus:ring-[var(--color-accent-cyan)] focus:ring-offset-0 cursor-pointer accent-[var(--color-accent-cyan)]"
            />
            <span className="text-xs text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors">
              Auto paint on click
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
