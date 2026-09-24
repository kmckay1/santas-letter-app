// Sentry for the Edge runtime. Nothing runs on the edge today, but Next.js
// loads this through instrumentation.ts if a route or middleware ever does.
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
