"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function Navigation() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = useCallback(() => {
    setIsDrawerOpen((prev) => !prev);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    if (isDrawerOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isDrawerOpen, closeDrawer]);

  return (
    <>
      <header className="sticky top-0 z-50 border-[var(--color-border)] border-b bg-[var(--color-bg-primary)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link className="flex items-center gap-3" href="/">
            <div className="relative">
              <div className="-inset-1 absolute rounded-lg bg-gradient-to-r from-[var(--color-accent-cyan)] to-[var(--color-accent-magenta)] opacity-30 blur" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)] font-bold font-mono text-[var(--color-accent-cyan)] text-xs">
                x402
              </div>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg tracking-tight">
                Dollar
                <span className="text-[var(--color-text-muted)]">Homepage</span>
              </h1>
              <p className="text-[var(--color-text-muted)] text-xs">
                $0.01 per pixel
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            {/* Menu Button */}
            <button
              onClick={toggleDrawer}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] transition-all hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-tertiary)]"
              aria-label="Open menu"
              aria-expanded={isDrawerOpen}
            >
              <div className="flex flex-col gap-1.5">
                <span
                  className={`block h-0.5 w-5 bg-[var(--color-text-secondary)] transition-all duration-200 ${
                    isDrawerOpen ? "translate-y-2 rotate-45" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-5 bg-[var(--color-text-secondary)] transition-all duration-200 ${
                    isDrawerOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-5 bg-[var(--color-text-secondary)] transition-all duration-200 ${
                    isDrawerOpen ? "-translate-y-2 -rotate-45" : ""
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed top-16 right-0 z-50 h-[calc(100vh-4rem)] w-72 transform border-[var(--color-border)] border-l bg-[var(--color-bg-primary)] transition-transform duration-300 ease-out ${
          isDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <nav className="flex flex-col p-4">
          {/* Main Links */}
          <div className="space-y-1">
            <Link
              href="/"
              onClick={closeDrawer}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
            >
              <svg
                className="h-5 w-5 text-[var(--color-accent-cyan)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
                />
              </svg>
              <span>Canvas</span>
            </Link>
          </div>

          {/* Divider */}
          <div className="my-4 border-[var(--color-border)] border-t" />

          {/* Legal Links */}
          <div className="space-y-1">
            <p className="mb-2 px-4 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
              Legal
            </p>
            <Link
              href="/privacy"
              onClick={closeDrawer}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <svg
                className="h-5 w-5 text-[var(--color-accent-magenta)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>Privacy Policy</span>
            </Link>
            <Link
              href="/terms"
              onClick={closeDrawer}
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <svg
                className="h-5 w-5 text-[var(--color-accent-magenta)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Terms of Service</span>
            </Link>
          </div>

          {/* Divider */}
          <div className="my-4 border-[var(--color-border)] border-t" />

          {/* Social Links */}
          <div className="space-y-1">
            <p className="mb-2 px-4 font-medium text-[var(--color-text-muted)] text-xs uppercase tracking-wider">
              Social
            </p>
            <a
              href="https://github.com/DiMatteoL"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span>GitHub</span>
            </a>
            <a
              href="https://x.com/Rudnost"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg px-4 py-3 text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>X (Twitter)</span>
            </a>
          </div>

          {/* Divider */}
          <div className="my-4 border-[var(--color-border)] border-t" />

          {/* Footer Info */}
          <div className="mt-auto px-4 py-3">
            <p className="text-[var(--color-text-muted)] text-xs">
              Built by{" "}
              <a
                href="https://x.com/Rudnost"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent-cyan)] hover:underline"
              >
                Rudnost
              </a>
            </p>
            <p className="mt-2 text-[var(--color-text-muted)] text-xs">
              Powered by{" "}
              <span className="font-mono text-[var(--color-accent-magenta)]">
                x402
              </span>
            </p>
            <p className="mt-1 text-[var(--color-text-muted)] text-xs">
              Payments on{" "}
              <span className="font-mono text-[var(--color-accent-cyan)]">
                Base
              </span>
            </p>
          </div>
        </nav>
      </div>
    </>
  );
}
