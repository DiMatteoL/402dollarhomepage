// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Low sample rate for better performance
  tracesSampleRate: 0.05, // 5% of transactions

  // Only enable debug in development
  debug: process.env.NODE_ENV === "development",

  environment: process.env.NODE_ENV,

  // Disable Sentry in development for better performance
  enabled: process.env.NODE_ENV === "production",

  // Filter out less important breadcrumbs for performance
  beforeBreadcrumb(breadcrumb) {
    // Skip console logs and UI interactions to reduce overhead
    if (breadcrumb.category === "console" || breadcrumb.category === "ui.click") {
      return null;
    }
    return breadcrumb;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
