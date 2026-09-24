// Sentry in the browser, injected by withSentryConfig. Browser code can only
// read NEXT_PUBLIC_ variables, so this uses NEXT_PUBLIC_SENTRY_DSN (the same
// value as SENTRY_DSN); unset, browser error reporting is simply off.
//
// Session Replay is deliberately not enabled: recording visitors on a site
// that shows children's letters is what the Contentsquare removal undid.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
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
