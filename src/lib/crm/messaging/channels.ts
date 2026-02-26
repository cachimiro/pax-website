/**
 * Channel adapters for sending messages.
 * Each adapter implements the same interface.
 * Configure credentials via environment variables.
 *
 * When no credentials are configured, messages are logged but not sent.
 */

export interface SendResult {
  success: boolean
  externalId?: string
  error?: string
}

// ─── Email (via Resend or SMTP) ──────────────────────────────────────────────

export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.log(`[EMAIL] Would send to ${to}: "${subject}" (no RESEND_API_KEY configured)`)
    return { success: true, externalId: 'dry-run' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'PaxBespoke <noreply@paxbespoke.uk>',
        to: [to],
        subject,
        text: body,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { success: false, error: err }
    }

    const data = await res.json()
    return { success: true, externalId: data.id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── SMS (via Twilio) ────────────────────────────────────────────────────────

export async function sendSms(
  to: string,
  body: string
): Promise<SendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[SMS] Would send to ${to}: "${body.slice(0, 50)}..." (no Twilio credentials)`)
    return { success: true, externalId: 'dry-run' }
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: body,
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      return { success: false, error: err }
    }

    const data = await res.json()
    return { success: true, externalId: data.sid }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ─── WhatsApp (via Twilio WhatsApp) ──────────────────────────────────────────

export async function sendWhatsApp(
  to: string,
  body: string
): Promise<SendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[WHATSAPP] Would send to ${to}: "${body.slice(0, 50)}..." (no Twilio WhatsApp credentials)`)
    return { success: true, externalId: 'dry-run' }
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: `whatsapp:${to}`,
          From: `whatsapp:${fromNumber}`,
          Body: body,
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      return { success: false, error: err }
    }

    const data = await res.json()
    return { success: true, externalId: data.sid }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
