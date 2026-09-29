// Posts a message to the Slack-compatible incoming webhook in ALERT_WEBHOOK_URL.
//
// Callers are failure paths such as the Stripe webhook and the mail cron, so
// this must never throw and never hang: a missing URL, a network error or a
// non-2xx response is logged and swallowed. Keep children's names, emails and
// addresses out of messages; send ids that can be looked up instead.
const ALERT_TIMEOUT_MS = 5000

// What happened to one alert. Existing callers ignore it; it exists so a test
// can report the webhook's response without the alert ever throwing.
export type AlertResult =
  | { sent: true; status: number }
  | { sent: false; status?: number; reason: 'not_configured' | 'http_error' | 'network_error' }

export async function sendAlert(message: string): Promise<AlertResult> {
  const url = process.env.ALERT_WEBHOOK_URL
  if (!url) {
    console.warn(`sendAlert: ALERT_WEBHOOK_URL not set, alert not sent: ${message}`)
    return { sent: false, reason: 'not_configured' }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
      signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
    })
    if (!res.ok) {
      console.warn(`sendAlert: webhook returned HTTP ${res.status}: ${message}`)
      return { sent: false, status: res.status, reason: 'http_error' }
    }
    return { sent: true, status: res.status }
  } catch (err) {
    console.warn('sendAlert: POST failed:', err)
    return { sent: false, reason: 'network_error' }
  }
}
