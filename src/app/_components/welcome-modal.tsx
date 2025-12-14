"use client";

import Image from "next/image";
import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Cookies } from "react-cookie-consent";

const COOKIE_CONSENT_NAME = "x402-cookie-consent";

interface WelcomeModalContextType {
  isOpen: boolean;
  openModal: () => void;
  closeModal: (acceptCookies?: boolean) => void;
}

const WelcomeModalContext = createContext<WelcomeModalContextType | null>(null);

export function useWelcomeModal() {
  const context = useContext(WelcomeModalContext);
  if (!context) {
    throw new Error("useWelcomeModal must be used within WelcomeModalProvider");
  }
  return context;
}

export function WelcomeModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCheckedCookie, setHasCheckedCookie] = useState(false);

  // Check cookie consent on mount - show modal if not accepted
  useEffect(() => {
    const consent = Cookies.get(COOKIE_CONSENT_NAME);
    if (consent !== "true") {
      setIsOpen(true);
    }
    setHasCheckedCookie(true);
  }, []);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback((acceptCookies?: boolean) => {
    setIsOpen(false);

    // Set cookie consent
    if (acceptCookies === true) {
      Cookies.set(COOKIE_CONSENT_NAME, "true", { expires: 365 });
    } else if (acceptCookies === false) {
      Cookies.set(COOKIE_CONSENT_NAME, "false", { expires: 365 });
    }
  }, []);

  // Close on escape key (treats as decline)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeModal(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, closeModal]);

  return (
    <WelcomeModalContext.Provider value={{ isOpen, openModal, closeModal }}>
      {children}
      {hasCheckedCookie && isOpen && <WelcomeModal onClose={closeModal} />}
    </WelcomeModalContext.Provider>
  );
}

function WelcomeModal({
  onClose,
}: {
  onClose: (acceptCookies?: boolean) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => onClose(false)}
        aria-hidden="true"
      />

      {/* Modal container - handles centering and scrolling */}
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Modal */}
        <div className="relative w-full max-w-2xl animate-fade-in overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] shadow-2xl">
          {/* Glow effect */}
          <div className="-inset-px absolute rounded-xl bg-gradient-to-br from-[var(--color-accent-cyan)]/20 via-transparent to-[var(--color-accent-magenta)]/20 opacity-50" />

          {/* Close button */}
          <button
            onClick={() => onClose(false)}
            className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            aria-label="Close modal"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="relative p-6 sm:p-8">
            {/* Header */}
            <div className="mb-6 text-center">
              <div className="mb-2 hidden items-center gap-2 rounded-full border border-[var(--color-accent-cyan)]/30 bg-[var(--color-accent-cyan)]/10 px-3 py-1 font-mono text-[var(--color-accent-cyan)] text-xs sm:inline-flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent-cyan)]" />
                Welcome
              </div>
              <h2 className="mb-2 font-bold text-2xl text-[var(--color-text-primary)] sm:text-3xl">
                A modern take on{" "}
                <span className="bg-gradient-to-r from-[var(--color-accent-cyan)] to-[var(--color-accent-magenta)] bg-clip-text text-transparent">
                  Internet History
                </span>
              </h2>
            </div>

            {/* Image */}
            <div className="group relative mb-6 mx-auto max-w-sm overflow-hidden rounded-lg border border-[var(--color-border)]">
              <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-primary)] via-transparent to-transparent opacity-60" />
              <Image
                src="/milliondollarhomepage.png"
                alt="The Million Dollar Homepage by Alex Tew"
                width={500}
                height={500}
                className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.02]"
                priority
              />
              <div className="absolute right-2 bottom-2 rounded bg-[var(--color-bg-primary)]/80 px-2 py-1 font-mono text-[var(--color-text-muted)] text-xs backdrop-blur-sm">
                The Million Dollar Homepage (2005)
              </div>
            </div>

            {/* Content */}
            <div className="mb-6 space-y-4 text-center">
              <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed sm:text-base">
                This project is a tribute to{" "}
                <a
                  href="https://milliondollarhomepage.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[var(--color-text-primary)] underline decoration-[var(--color-text-muted)]/50 underline-offset-2 transition-colors hover:text-[var(--color-accent-cyan)] hover:decoration-[var(--color-accent-cyan)]"
                >
                  The Million Dollar Homepage
                </a>
                , created by Alex Tew in 2005. Fun fact: the minimum purchase
                was $100 (10×10 pixels).
              </p>
              <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed sm:text-base">
                Thanks to{" "}
                <span className="font-mono font-semibold text-[var(--color-accent-cyan)]">
                  x402
                </span>
                , we can now enable{" "}
                <span className="font-semibold text-[var(--color-accent-magenta)]">
                  true microtransactions
                </span>
                , allowing you to buy pixels for just{" "}
                <span className="font-mono font-bold text-[var(--color-accent-green)]">
                  $0.01
                </span>{" "}
                each, with near-zero fees on{" "}
                <span
                  className="font-mono font-semibold"
                  style={{ color: "#0052FF" }}
                >
                  Base
                </span>
                .
              </p>
              <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed sm:text-base">
                To start painting, you need a wallet with USDC on Base. You can
                get one{" "}
                <a
                  href="https://metamask.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[var(--color-accent-cyan)] underline decoration-[var(--color-accent-cyan)]/30 underline-offset-2 transition-colors hover:text-[var(--color-accent-cyan)]/80 hover:decoration-[var(--color-accent-cyan)]"
                >
                  here
                </a>
                .
              </p>
            </div>

            {/* Features */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-3 text-center">
                <div className="mb-1 font-mono text-lg font-bold text-[var(--color-accent-green)]">
                  0.01
                </div>
                <div className="text-[var(--color-text-muted)] text-xs">
                  USDC per pixel
                </div>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-3 text-center">
                <div className="mb-1 font-mono text-lg font-bold text-[var(--color-accent-cyan)]">
                  x402
                </div>
                <div className="text-[var(--color-text-muted)] text-xs">
                  protocol
                </div>
              </div>
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-tertiary)] p-3 text-center">
                <div
                  className="mb-1 font-mono text-lg font-bold"
                  style={{ color: "#0052FF" }}
                >
                  Base
                </div>
                <div className="text-[var(--color-text-muted)] text-xs">
                  blockchain
                </div>
              </div>
            </div>

            {/* Privacy notice */}
            <p className="mb-4 text-center text-[var(--color-text-muted)] text-xs">
              By continuing, you agree to our use of cookies for analytics and
              wallet connections.{" "}
              <Link
                href="/privacy"
                className="text-[var(--color-accent-cyan)] underline underline-offset-2 hover:text-[var(--color-accent-cyan)]/80"
              >
                Privacy Policy
              </Link>
            </p>

            {/* CTA Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => onClose(false)}
                className="btn btn-secondary flex-1 text-sm"
              >
                Decline
              </button>
              <button
                onClick={() => onClose(true)}
                className="btn btn-primary flex-1 text-base"
              >
                <span>Accept & Start</span>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
