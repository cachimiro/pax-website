/**
 * Channel adapters for sending messages.
 * Each adapter implements the same interface.
 * Configure credentials via environment variables.
 *
 * Email priority: Gmail (if connected + active) → Resend → dry-run log.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { loadGoogleConfig, getGmailClient, type GoogleConfig } from '../google'
import { buildBrandedEmail, buildMimeMessage } from './email-template'

export interface SendResult {
  success: boolean
  externalId?: string
  error?: string
  sentVia?: 'gmail' | 'resend' | 'dry-run'
}

export interface EmailOptions {
  to: string
  subject: string
  body: string
  senderName?: string
  senderRole?: string
  senderPhone?: string
  senderEmail?: string
  ctaText?: string
  ctaUrl?: string
  preheader?: string
  tracking?: {
    messageLogId: string
    leadId: string
  }
}

// ─── Gmail Send ──────────────────────────────────────────────────────────────

export async function sendViaGmail(
  supabase: SupabaseClient,
  config: GoogleConfig,
  options: EmailOptions
): Promise<SendResult> {
  try {
    const gmail = await getGmailClient(supabase, config)

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'

    const { html, text } = buildBrandedEmail({
      body: options.body,
      senderName: options.senderName ?? 'PaxBespoke',
      senderRole: options.senderRole,
      senderPhone: options.senderPhone,
      senderEmail: options.senderEmail ?? config.email,
      ctaText: options.ctaText,
      ctaUrl: options.ctaUrl,
      preheader: options.preheader,
      tracking: options.tracking ? {
        messageLogId: options.tracking.messageLogId,
        leadId: options.tracking.leadId,
        baseUrl,
      } : undefined,
    })

    const raw = buildMimeMessage({
      from: `${options.senderName ?? 'PaxBespoke'} <${config.email}>`,
      to: options.to,
      subject: options.subject,
      html,
      text,
    })

    const res = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    })

    return {
      success: true,
      externalId: res.data.id ?? undefined,
      sentVia: 'gmail',
    }
  } catch (err: any) {
    console.error('[GMAIL] Send failed:', err.message)
    return { success: false, error: err.message, sentVia: 'gmail' }
  }
}

// ─── Email (Gmail → Resend → dry-run) ────────────────────────────────────────

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  supabase?: SupabaseClient,
  senderContext?: { name?: string; role?: string; phone?: string; email?: string },
  tracking?: { messageLogId: string; leadId: string }
): Promise<SendResult> {
  // Load stored signature config as fallback when no senderContext provided
  let sender = senderContext
  if (!sender && supabase) {
    try {
      const { data: gc } = await supabase
        .from('google_config')
        .select('signature_config, email')
        .limit(1)
        .single()
      if (gc) {
        const sig = (gc.signature_config ?? {}) as Record<string, string>
        sender = {
          name: sig.name || 'PaxBespoke',
          role: sig.role || undefined,
          phone: sig.phone || undefined,
          email: sig.email || gc.email || undefined,
        }
      }
    } catch {
      // No config — use defaults
    }
  }

  // Try Gmail first
  if (supabase) {
    try {
      const config = await loadGoogleConfig(supabase)
      if (config && config.email_active && !config.needs_reauth) {
        const result = await sendViaGmail(supabase, config, {
          to,
          subject,
          body,
          senderName: sender?.name,
          senderRole: sender?.role,
          senderPhone: sender?.phone,
          senderEmail: sender?.email ?? config.email,
          tracking,
        })
        if (result.success) return result
        // Gmail failed — fall through to Resend
        console.warn('[EMAIL] Gmail failed, falling back to Resend:', result.error)
      }
    } catch (err) {
      console.warn('[EMAIL] Gmail check failed, falling back to Resend')
    }
  }

  // Resend fallback (with branded HTML)
  const apiKey = process.env.RESEND_API_KEY
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'

  if (!apiKey) {
    console.log(`[EMAIL] Would send to ${to}: "${subject}" (no credentials configured)`)
    return { success: true, externalId: 'dry-run', sentVia: 'dry-run' }
  }

  const { html, text } = buildBrandedEmail({
    body,
    senderName: sender?.name ?? 'PaxBespoke',
    senderRole: sender?.role,
    senderPhone: sender?.phone,
    senderEmail: sender?.email,
    tracking: tracking ? { ...tracking, baseUrl } : undefined,
  })

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
        html,
        text,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return { success: false, error: err, sentVia: 'resend' }
    }

    const data = await res.json()
    return { success: true, externalId: data.id, sentVia: 'resend' }
  } catch (err: any) {
    return { success: false, error: err.message, sentVia: 'resend' }
  }
}

// ─── Phone Number Formatting ─────────────────────────────────────────────────

/**
 * Normalize a UK phone number to E.164 format (+44...).
 */
function formatE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('44')) return `+${digits}`
  if (digits.startsWith('0')) return `+44${digits.slice(1)}`
  if (digits.startsWith('7')) return `+44${digits}`
  return `+${digits}`
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

  const formattedTo = formatE164(to)

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
          To: formattedTo,
          From: fromNumber,
          Body: body,
        }),
      }
    )

    if (!res.ok) {
      const data = await res.json().catch(() => null)
      const errMsg = parseTwilioError(data, 'sms')
      console.error(`[SMS] Send failed (${res.status}):`, errMsg)
      return { success: false, error: errMsg }
    }

    const data = await res.json()
    return { success: true, externalId: data.sid }
  } catch (err: any) {
    console.error('[SMS] Send error:', err.message)
    return { success: false, error: err.message }
  }
}

// ─── WhatsApp (via Twilio WhatsApp) ──────────────────────────────────────────

// Map CRM template slugs to Twilio Content Template SIDs
// These get approved by Meta and can initiate conversations outside the 24h window
const WA_CONTENT_TEMPLATES: Record<string, { sid: string; vars: (name: string, extra?: string) => Record<string, string> }> = {
  enquiry_ack:          { sid: 'HXdc7f381c5718beb112684aa65dae23ed', vars: (n) => ({ '1': n }) },
  call1_confirmed:      { sid: 'HXfb8b563ae7468005a7b3cfc0da9d7c6f', vars: (n, dt) => ({ '1': n, '2': dt ?? 'your scheduled time' }) },
  call1_reminder:       { sid: 'HX78a52eb6145ebb48ef8863df1af4d953', vars: (n, dt) => ({ '1': n, '2': dt ?? 'your scheduled time' }) },
  call1_reminder_2h:    { sid: 'HX78a52eb6145ebb48ef8863df1af4d953', vars: (n, dt) => ({ '1': n, '2': dt ?? 'your scheduled time' }) },
  call2_confirmed:      { sid: 'HXfb8b563ae7468005a7b3cfc0da9d7c6f', vars: (n, dt) => ({ '1': n, '2': dt ?? 'your scheduled time' }) },
  call2_invite:         { sid: 'HX78a52eb6145ebb48ef8863df1af4d953', vars: (n, dt) => ({ '1': n, '2': dt ?? 'your scheduled time' }) },
  call2_reminder:       { sid: 'HX78a52eb6145ebb48ef8863df1af4d953', vars: (n, dt) => ({ '1': n, '2': dt ?? 'your scheduled time' }) },
  call2_reminder_2h:    { sid: 'HX78a52eb6145ebb48ef8863df1af4d953', vars: (n, dt) => ({ '1': n, '2': dt ?? 'your scheduled time' }) },
  qualified_followup:   { sid: 'HX35888bc9c4e71f7ea22e761ca3f22e71', vars: (n) => ({ '1': n }) },
  deposit_request:      { sid: 'HX620a61ab3e65b37188bcc9570200960f', vars: (n) => ({ '1': n }) },
  onboarding_confirmed: { sid: 'HXfb8b563ae7468005a7b3cfc0da9d7c6f', vars: (n, dt) => ({ '1': n, '2': dt ?? 'your scheduled time' }) },
  onboarding_reminder:  { sid: 'HX78a52eb6145ebb48ef8863df1af4d953', vars: (n, dt) => ({ '1': n, '2': dt ?? 'your scheduled time' }) },
  onboarding_reminder_2h: { sid: 'HX78a52eb6145ebb48ef8863df1af4d953', vars: (n, dt) => ({ '1': n, '2': dt ?? 'your scheduled time' }) },
}

export async function sendWhatsApp(
  to: string,
  body: string,
  templateSlug?: string,
  recipientName?: string,
  templateExtra?: string
): Promise<SendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromRaw = process.env.TWILIO_WHATSAPP_NUMBER
  const fallbackSid = process.env.TWILIO_WHATSAPP_CONTENT_SID // Generic fallback template

  if (!accountSid || !authToken || !fromRaw) {
    console.log(`[WHATSAPP] Would send to ${to}: "${body.slice(0, 50)}..." (no Twilio WhatsApp credentials)`)
    return { success: true, externalId: 'dry-run', sentVia: 'dry-run' as any }
  }

  const formattedTo = formatE164(to)
  const fromNumber = fromRaw.startsWith('whatsapp:') ? fromRaw : `whatsapp:${fromRaw}`
  const auth = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const firstName = recipientName?.split(' ')[0] ?? 'there'

  try {
    // Attempt 1: freeform message (works within 24h conversation window)
    const freeformRes = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': auth, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        To: `whatsapp:${formattedTo}`,
        From: fromNumber,
        Body: body,
      }),
    })

    const freeformData = await freeformRes.json()

    if (freeformRes.ok) {
      // Poll after 3s to catch async rejection (63016)
      const msgSid = freeformData.sid
      await new Promise((r) => setTimeout(r, 3000))

      const statusRes = await fetch(url.replace('/Messages.json', `/Messages/${msgSid}.json`), {
        headers: { 'Authorization': auth },
      })
      const statusData = await statusRes.json()

      if (statusData.status !== 'undelivered' && statusData.status !== 'failed') {
        return { success: true, externalId: msgSid }
      }
      console.warn(`[WHATSAPP] Freeform rejected (${statusData.error_code}), trying template...`)
    } else if (freeformData.code !== 63016 && freeformData.code !== 63007) {
      const errMsg = parseTwilioError(freeformData, 'whatsapp')
      console.error(`[WHATSAPP] Send failed:`, errMsg)
      return { success: false, error: errMsg }
    }

    // Attempt 2: try stage-specific template, then generic fallback
    const stageTemplate = templateSlug ? WA_CONTENT_TEMPLATES[templateSlug] : null
    const templatesToTry: Array<{ sid: string; vars?: Record<string, string>; label: string }> = []

    if (stageTemplate) {
      templatesToTry.push({ sid: stageTemplate.sid, vars: stageTemplate.vars(firstName, templateExtra), label: `stage:${templateSlug}` })
    }
    if (fallbackSid && fallbackSid !== stageTemplate?.sid) {
      templatesToTry.push({ sid: fallbackSid, label: 'generic-fallback' })
    }

    for (const tmpl of templatesToTry) {
      const params: Record<string, string> = {
        To: `whatsapp:${formattedTo}`,
        From: fromNumber,
        ContentSid: tmpl.sid,
      }
      if (tmpl.vars) {
        params.ContentVariables = JSON.stringify(tmpl.vars)
      }

      console.log(`[WHATSAPP] Trying Content Template ${tmpl.label} (${tmpl.sid})`)
      const templateRes = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': auth, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
      })

      const templateData = await templateRes.json()
      if (templateRes.ok) {
        // Poll to verify delivery
        await new Promise((r) => setTimeout(r, 3000))
        const checkRes = await fetch(url.replace('/Messages.json', `/Messages/${templateData.sid}.json`), {
          headers: { 'Authorization': auth },
        })
        const checkData = await checkRes.json()

        if (checkData.status !== 'undelivered' && checkData.status !== 'failed') {
          return { success: true, externalId: templateData.sid }
        }
        console.warn(`[WHATSAPP] Template ${tmpl.label} rejected (${checkData.error_code}), trying next...`)
        continue
      }

      console.warn(`[WHATSAPP] Template ${tmpl.label} API error:`, templateData.message)
    }

    return {
      success: false,
      error: 'WhatsApp: outside 24h window. All templates rejected or pending approval. The customer needs to message you first.',
    }
  } catch (err: any) {
    console.error('[WHATSAPP] Send error:', err.message)
    return { success: false, error: err.message }
  }
}

// ─── Twilio Error Parser ─────────────────────────────────────────────────────

function parseTwilioError(data: any, channel: 'sms' | 'whatsapp'): string {
  if (!data?.code) return data?.message ?? 'Unknown error'

  const code = data.code as number

  const errors = new Map<number, string>([
    [63007, 'Recipient has not opted in to receive WhatsApp messages. They need to message you first or opt in.'],
    [63016, 'Recipient has not opted in to WhatsApp sandbox. Send "join <keyword>" to +14155238886 first.'],
    [21211, 'Invalid phone number — the "To" number is not a valid phone number.'],
    [21212, 'Invalid phone number — the "To" number is not a valid mobile number.'],
    [21214, 'The "To" number is not reachable.'],
    [21408, 'Permission denied — your Twilio account cannot send to this region.'],
    [21608, channel === 'whatsapp'
      ? 'WhatsApp sender number not approved. Check TWILIO_WHATSAPP_NUMBER.'
      : 'Cannot send SMS from this number. Check TWILIO_PHONE_NUMBER.'],
    [21610, 'Recipient has opted out of messages.'],
    [21614, 'The "To" number is not a valid mobile number for SMS.'],
    [20003, 'Twilio authentication failed. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.'],
  ])

  return errors.get(code) ?? `Twilio error ${code}: ${data.message}`
}
