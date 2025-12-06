"use client";

import { usePresence } from "~/lib/use-presence";

interface StatusIndicatorProps {
  isPending: boolean;
}

/**
 * Shows transaction status (loading) or online user count
 */
export function StatusIndicator({ isPending }: StatusIndicatorProps) {
  const onlineCount = usePresence();

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/95 backdrop-blur-md px-4 py-2 shadow-lg">
        {isPending ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-accent-cyan)] border-t-transparent" />
            <span className="text-sm text-[var(--color-text-secondary)]">
              Painting...
            </span>
          </>
        ) : (
          <>
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-[var(--color-text-secondary)]">
              {onlineCount} online
            </span>
          </>
        )}
      </div>
    </div>
  );
}
