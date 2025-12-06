"use client";

import { useCallback, useEffect, useState } from "react";

// Default recent colors
export const DEFAULT_RECENT_COLORS = [
  "#ff0000", // red
  "#ffff00", // yellow
  "#00ff00", // green
  "#0000ff", // blue
  "#ffffff", // white
];

const STORAGE_KEY = "402-recent-colors";
const MAX_RECENT_COLORS = 5;

/**
 * Hook to manage recent colors with localStorage persistence
 */
export function useRecentColors() {
  const [recentColors, setRecentColors] = useState<string[]>(DEFAULT_RECENT_COLORS);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentColors(parsed.slice(0, MAX_RECENT_COLORS));
        }
      } catch {
        // Invalid JSON, use defaults
      }
    }
  }, []);

  const addRecentColor = useCallback((color: string) => {
    setRecentColors((prev) => {
      // Remove if already exists
      const filtered = prev.filter((c) => c.toLowerCase() !== color.toLowerCase());
      // Add to front, limit to max
      const updated = [color.toLowerCase(), ...filtered].slice(0, MAX_RECENT_COLORS);
      // Persist to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { recentColors, addRecentColor };
}

/**
 * Color swatch button component
 */
interface ColorSwatchProps {
  color: string;
  selected: boolean;
  onClick: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ColorSwatch({
  color,
  selected,
  onClick,
  size = "md",
  className = "",
}: ColorSwatchProps) {
  const sizeClasses = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  return (
    <button
      aria-label={`Select color ${color}`}
      className={`rounded-md border-2 cursor-pointer transition-all duration-200 ${sizeClasses[size]} ${
        selected
          ? "border-[var(--color-accent-cyan)] shadow-[0_0_10px_rgba(0,255,255,0.5)] scale-110"
          : "border-[var(--color-border)] hover:scale-110 hover:border-[var(--color-accent-cyan)]"
      } ${className}`}
      onClick={onClick}
      style={{ backgroundColor: color }}
      title={color}
      type="button"
    />
  );
}

/**
 * Custom color picker trigger that shows a color wheel icon
 */
interface CustomColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  size?: "sm" | "md" | "lg";
}

export function CustomColorPicker({
  currentColor,
  onColorChange,
  size = "md",
}: CustomColorPickerProps) {
  const sizeClasses = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  return (
    <label
      className={`relative rounded-md border-2 border-dashed border-[var(--color-border)] cursor-pointer transition-all duration-200 hover:border-[var(--color-accent-cyan)] flex items-center justify-center overflow-hidden ${sizeClasses[size]}`}
      title="Custom color"
    >
      {/* Rainbow gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background: "conic-gradient(from 0deg, red, yellow, lime, aqua, blue, magenta, red)",
          opacity: 0.7,
        }}
      />
      {/* Plus icon */}
      <span className="relative z-10 text-white text-lg font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        +
      </span>
      <input
        className="absolute inset-0 opacity-0 cursor-pointer"
        onChange={(e) => onColorChange(e.target.value)}
        type="color"
        value={currentColor}
      />
    </label>
  );
}

/**
 * Full color picker with presets and custom input (for modal)
 */
export const PRESET_COLORS = [
  "#ff0000",
  "#ff4400",
  "#ff8800",
  "#ffcc00",
  "#ffff00",
  "#88ff00",
  "#00ff00",
  "#00ff88",
  "#00ffff",
  "#0088ff",
  "#0000ff",
  "#4400ff",
  "#8800ff",
  "#ff00ff",
  "#ff0088",
  "#ffffff",
  "#cccccc",
  "#888888",
  "#444444",
  "#000000",
];

interface FullColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

export function FullColorPicker({ selectedColor, onColorSelect }: FullColorPickerProps) {
  return (
    <div>
      <span className="mb-2 block font-medium text-[var(--color-text-secondary)] text-sm">
        Select Color
      </span>
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <ColorSwatch
            color={color}
            key={color}
            onClick={() => onColorSelect(color)}
            selected={selectedColor.toLowerCase() === color.toLowerCase()}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <label className="sr-only" htmlFor="color-picker">
          Color picker
        </label>
        <input
          className="h-10 w-16 cursor-pointer rounded border-none bg-transparent"
          id="color-picker"
          onChange={(e) => onColorSelect(e.target.value)}
          type="color"
          value={selectedColor}
        />
        <label className="sr-only" htmlFor="color-hex">
          Color hex value
        </label>
        <input
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] px-3 py-2 font-mono text-sm"
          id="color-hex"
          onChange={(e) => {
            if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
              onColorSelect(e.target.value);
            }
          }}
          placeholder="#00ffff"
          type="text"
          value={selectedColor}
        />
      </div>
    </div>
  );
}

