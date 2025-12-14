// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Low sample rate for better performance
  tracesSampleRate: 0.05, // 5% of transactions

  // Only enable debug in development
  debug: process.env.NODE_ENV === "development",

  environment: process.env.NODE_ENV,

  // Disable Sentry in development for better performance
  enabled: process.env.NODE_ENV === "production",
});
