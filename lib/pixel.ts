// Meta Pixel event tracking helper.
// The base Pixel script is loaded in app/layout.tsx (production only).
// This file provides typed wrappers so we don't sprinkle `window.fbq(...)`
// across the codebase, and ensures events are only sent in production.

declare global {
    interface Window {
      fbq?: (
        action: 'track' | 'trackCustom',
        eventName: string,
        params?: Record<string, unknown>
      ) => void
    }
  }
  
  const IS_PRODUCTION = process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'
  
  /**
   * Track a standard Meta Pixel event (e.g. 'Lead', 'Purchase', 'AddToCart').
   * Standard events are recognised by Meta's optimization algorithms.
   * No-op outside production.
   */
  export function trackEvent(
    eventName: string,
    params?: Record<string, unknown>
  ): void {
    if (!IS_PRODUCTION) return
    if (typeof window === 'undefined') return
    if (typeof window.fbq !== 'function') return
  
    try {
      window.fbq('track', eventName, params)
    } catch (err) {
      console.warn('Pixel trackEvent failed:', err)
    }
  }
  
  /**
   * Track a custom (non-standard) event. Useful for funnel-specific events
   * that don't map to Meta's standard event taxonomy.
   * No-op outside production.
   */
  export function trackCustomEvent(
    eventName: string,
    params?: Record<string, unknown>
  ): void {
    if (!IS_PRODUCTION) return
    if (typeof window === 'undefined') return
    if (typeof window.fbq !== 'function') return
  
    try {
      window.fbq('trackCustom', eventName, params)
    } catch (err) {
      console.warn('Pixel trackCustomEvent failed:', err)
    }
  }