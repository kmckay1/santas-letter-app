'use client'

import * as Sentry from '@sentry/nextjs'
import NextError from 'next/error'
import { useEffect } from 'react'

// Catches errors thrown while rendering the root layout, which no other error
// boundary can, and reports them to Sentry.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        {/* App Router has no status code to pass, so 0 renders a generic message. */}
        <NextError statusCode={0} />
      </body>
    </html>
  )
}
