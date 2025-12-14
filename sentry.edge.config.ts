// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
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
