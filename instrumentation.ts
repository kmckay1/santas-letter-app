import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Called by Next.js 15+ for errors in server components and route handlers.
// Next.js 14 ignores it; kept so the upgrade needs no change here.
export const onRequestError = Sentry.captureRequestError
