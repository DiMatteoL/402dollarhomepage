"use client";

import { useEffect, useState } from "react";

export type PaymentStatus = "idle" | "preparing" | "signing" | "submitting" | "success" | "error";

interface StatusIndicatorProps {
  status: PaymentStatus;
  selectedColor?: string;
  onCancel?: () => void;
}

/**
 * Shows transaction status with differentiated states and success effect
 */
export function StatusIndicator({ status, selectedColor = "#00ffff", onCancel }: StatusIndicatorProps) {
  const [visible, setVisible] = useState(false);

  // Control visibility with auto-hide on success
  useEffect(() => {
    if (status !== "idle") {
      setVisible(true);
      if (status === "success") {
        const timer = setTimeout(() => setVisible(false), 2000);
        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
    }
  }, [status]);

  if (!visible) return null;

  const canCancel = (status === "preparing" || status === "signing") && onCancel;

  return (
    <div className="fixed top-20 left-1/2 z-50 -translate-x-1/2 animate-fade-in">
      <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/95 px-4 py-2 shadow-lg backdrop-blur-md">
        {status === "success" ? (
          <div className="relative animate-success-burst">
            {/* Expanding ring */}
            <div className="absolute inset-0 rounded-full bg-[var(--color-accent-green)]/20 animate-ring-expand" />
            {/* Success circle with checkmark */}
            <div className="relative flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-accent-green)]">
              <svg className="h-2.5 w-2.5 text-[var(--color-bg-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" className="animate-checkmark" />
              </svg>
            </div>
            {/* Particle bursts */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-[var(--color-accent-green)]"
                  style={{
                    '--tx': `${Math.cos((i * 60 * Math.PI) / 180) * 14}px`,
                    '--ty': `${Math.sin((i * 60 * Math.PI) / 180) * 14}px`,
                    animation: 'particle-burst 0.5s ease-out forwards',
                    animationDelay: `${0.1 + i * 0.03}s`,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          </div>
        ) : status === "signing" ? (
          <div className="relative flex h-4 w-4 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--color-accent-magenta)]/30" />
            <div className="absolute inset-0 rounded-full border-2 border-[var(--color-accent-magenta)] border-t-transparent animate-spin" />
          </div>
        ) : status === "submitting" ? (
          <div className="relative flex h-4 w-4 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-[var(--color-accent-cyan)]/30" />
            <div className="absolute inset-0 rounded-full border-2 border-[var(--color-accent-cyan)] border-t-transparent animate-spin" />
            <div
              className="h-2 w-2 rounded-sm"
              style={{ backgroundColor: selectedColor }}
            />
          </div>
        ) : (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent-cyan)] border-t-transparent" />
        )}

        <span className={`text-sm ${
          status === "success"
            ? "text-[var(--color-accent-green)]"
            : status === "signing"
            ? "text-[var(--color-accent-magenta)]"
            : "text-[var(--color-text-secondary)]"
        }`}>
          {status === "preparing" && "Preparing..."}
          {status === "signing" && "Authorizing..."}
          {status === "submitting" && "Painting..."}
          {status === "success" && "Painted!"}
        </span>

        {canCancel && (
          <button
            onClick={onCancel}
            className="ml-1 flex h-5 w-5 items-center justify-center rounded text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            title="Cancel"
            type="button"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
