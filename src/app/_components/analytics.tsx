"use client";

import Hotjar from "@hotjar/browser";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { Cookies } from "react-cookie-consent";

const COOKIE_CONSENT_NAME = "x402-cookie-consent";
const HOTJAR_SITE_ID = 6601163;
const HOTJAR_VERSION = 6;

/** Custom event name dispatched when cookie consent changes */
export const COOKIE_CONSENT_EVENT = "cookie-consent-change";

/**
 * Analytics component that only loads tracking scripts after user consent.
 * Respects GDPR by not loading Hotjar or Google Analytics until the user
 * explicitly accepts cookies.
 */
export function Analytics() {
  const [hasConsent, setHasConsent] = useState(false);
  const hotjarInitialized = useRef(false);

  useEffect(() => {
    // Check initial consent status
    const checkConsent = () => {
      const consent = Cookies.get(COOKIE_CONSENT_NAME);
      setHasConsent(consent === "true");
    };

    checkConsent();

    // Listen for consent changes via custom event
    const handleConsentChange = () => checkConsent();
    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);

    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentChange);
    };
  }, []);

  // Initialize Hotjar when consent is given
  useEffect(() => {
    if (hasConsent && !hotjarInitialized.current) {
      Hotjar.init(HOTJAR_SITE_ID, HOTJAR_VERSION);
      hotjarInitialized.current = true;
    }
  }, [hasConsent]);

  // Don't render any tracking scripts until user has given consent
  if (!hasConsent) {
    return null;
  }

  return (
    <>
      {/* Google Analytics */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-46RJWFJTKT"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-46RJWFJTKT');
        `}
      </Script>
    </>
  );
}
