// Sentry for the Node.js runtime: route handlers, crons, the Stripe webhook.
// Loaded by instrumentation.ts. With SENTRY_DSN unset (local dev) the SDK is a
// no-op.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1,
  // SDK v11 collects request bodies, headers, cookies, query strings, local
  // variables and AI prompts by default. Here those would carry children's
  // names, parents' private notes, emails and home addresses, so every
  // category is off. Error messages, stack traces and source context remain.
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [],
    urlQueryParams: false,
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
  },
})
