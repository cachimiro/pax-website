/**
 * Channel adapters for sending messages.
 * Each adapter implements the same interface.
 * Configure credentials via environment variables.
 *
 * Email priority: Gmail (if connected + active) → Resend → dry-run log.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { loadGoogleConfig, getGmailClient, type GoogleConfig } from '../google'
import { buildBrandedEmail, buildMimeMessage, type EmailCta } from './email-template'

/**
 * Parse [CTA:Button Label|https://url] markers out of a template body.
 * Returns the cleaned body (markers removed) and the extracted CTAs.
 * First CTA is primary, subsequent ones are secondary.
 */
export function extractCtas(body: string): { body: string; ctas: EmailCta[] } {
  const ctas: EmailCta[] = []
  const cleaned = body.replace(/\[CTA:([^\]|]+)\|([^\]]+)\]/g, (_, text, url) => {
    ctas.push({
      text: text.trim(),
      url: url.trim(),
      style: ctas.length === 0 ? 'primary' : 'secondary',
    })
    return '' // remove marker from body
  })
  // Collapse any blank lines left by removed markers
  const collapsedBody = cleaned.replace(/\n{3,}/g, '\n\n').trim()
  return { body: collapsedBody, ctas }
}

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
  /** Legacy single CTA — use ctas[] for multiple buttons */
  ctaText?: string
  ctaUrl?: string
  /** Multiple CTA buttons (extracted from [CTA:text|url] markers or passed directly) */
  ctas?: EmailCta[]
  preheader?: string
  /** If true, appends opt-out CTA links to the email footer */
  autoTriggered?: boolean
  ctaNotInterestedUrl?: string
  ctaNeedMoreTimeUrl?: string
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

    // Extract [CTA:] markers from body, merge with any explicit ctas
    const { body: cleanBody, ctas: extractedCtas } = extractCtas(options.body)
    const allCtas = [...extractedCtas, ...(options.ctas ?? [])]

    const { html, text } = buildBrandedEmail({
      body: cleanBody,
      senderName: options.senderName ?? 'PaxBespoke',
      senderRole: options.senderRole,
      senderPhone: options.senderPhone,
      senderEmail: options.senderEmail ?? config.email,
      ctaText: options.ctaText,
      ctaUrl: options.ctaUrl,
      ctas: allCtas,
      preheader: options.preheader,
      autoTriggered: options.autoTriggered,
      ctaNotInterestedUrl: options.ctaNotInterestedUrl,
      ctaNeedMoreTimeUrl: options.ctaNeedMoreTimeUrl,
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
  tracking?: { messageLogId: string; leadId: string },
  options?: { autoTriggered?: boolean; ctaNotInterestedUrl?: string; ctaNeedMoreTimeUrl?: string; ctas?: EmailCta[] }
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
          ctas: options?.ctas,
          autoTriggered: options?.autoTriggered,
          ctaNotInterestedUrl: options?.ctaNotInterestedUrl,
          ctaNeedMoreTimeUrl: options?.ctaNeedMoreTimeUrl,
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

  const { body: cleanBodyResend, ctas: extractedCtasResend } = extractCtas(body)
  const allCtasResend = [...extractedCtasResend, ...(options?.ctas ?? [])]

  const { html, text } = buildBrandedEmail({
    body: cleanBodyResend,
    senderName: sender?.name ?? 'PaxBespoke',
    senderRole: sender?.role,
    senderPhone: sender?.phone,
    senderEmail: sender?.email,
    ctas: allCtasResend,
    autoTriggered: options?.autoTriggered,
    ctaNotInterestedUrl: options?.ctaNotInterestedUrl,
    ctaNeedMoreTimeUrl: options?.ctaNeedMoreTimeUrl,
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
//
// Approved Twilio templates:
//   paxbespoke_enquiry_ack     HXdc7f381c5718beb112684aa65dae23ed  — vars: {{1}} name
//   paxbespoke_call_reminder   HX78a52eb6145ebb48ef8863df1af4d953  — vars: {{1}} name, {{2}} date/time
//   paxbespoke_followup        HX35888bc9c4e71f7ea22e761ca3f22e71  — vars: {{1}} name
//   paxbespoke_deposit_request HX620a61ab3e65b37188bcc9570200960f  — vars: {{1}} name
//   pax_bespoke (generic)      HX6cdaaee240a20fedead934d2a4685a81  — vars: {{1}} name

const SID = {
  ENQUIRY_ACK:    'HXdc7f381c5718beb112684aa65dae23ed',
  CALL_REMINDER:  'HX78a52eb6145ebb48ef8863df1af4d953',
  FOLLOWUP:       'HX35888bc9c4e71f7ea22e761ca3f22e71',
  DEPOSIT:        'HX620a61ab3e65b37188bcc9570200960f',
  GENERIC:        'HX6cdaaee240a20fedead934d2a4685a81',
} as const

const withDateTime = (sid: string) => ({
  sid,
  vars: (n: string, dt?: string) => ({ '1': n, '2': dt ?? 'your scheduled time' }),
})
const withName = (sid: string) => ({
  sid,
  vars: (n: string) => ({ '1': n }),
})

const WA_CONTENT_TEMPLATES: Record<string, { sid: string; vars: (name: string, extra?: string) => Record<string, string> }> = {
  // Enquiry acknowledgement
  enquiry_ack:              withName(SID.ENQUIRY_ACK),
  confirmation_enquiry:     withName(SID.ENQUIRY_ACK),

  // Call/meeting confirmations & reminders (all use call_reminder template with name + date)
  call1_confirmed:          withDateTime(SID.CALL_REMINDER),
  call1_reminder:           withDateTime(SID.CALL_REMINDER),
  call1_reminder_2h:        withDateTime(SID.CALL_REMINDER),
  call2_confirmed:          withDateTime(SID.CALL_REMINDER),
  call2_invite:             withDateTime(SID.CALL_REMINDER),
  call2_reminder:           withDateTime(SID.CALL_REMINDER),
  call2_reminder_2h:        withDateTime(SID.CALL_REMINDER),
  onboarding_confirmed:     withDateTime(SID.CALL_REMINDER),
  onboarding_reminder:      withDateTime(SID.CALL_REMINDER),
  onboarding_reminder_2h:   withDateTime(SID.CALL_REMINDER),

  // Visit confirmations & reminders
  visit_confirmed:          withDateTime(SID.CALL_REMINDER),
  visit_reminder_24h:       withDateTime(SID.CALL_REMINDER),

  // Follow-ups (general purpose)
  qualified_followup:       withName(SID.FOLLOWUP),
  meet1_thanks:             withName(SID.FOLLOWUP),
  visit_invite:             withName(SID.FOLLOWUP),
  visit_invite_followup:    withName(SID.FOLLOWUP),
  visit_thanks:             withName(SID.FOLLOWUP),
  quote_sent_main:          withName(SID.FOLLOWUP),
  quote_followup_48h:       withName(SID.FOLLOWUP),
  quote_followup_5d:        withName(SID.FOLLOWUP),
  fitting_proposed_main:    withName(SID.FOLLOWUP),
  fitting_followup_48h:     withName(SID.FOLLOWUP),
  fitting_confirmed_email:  withName(SID.FOLLOWUP),
  fitting_reminder_48h:     withName(SID.FOLLOWUP),
  review_request:           withName(SID.FOLLOWUP),
  nurture_1:                withName(SID.FOLLOWUP),
  nurture_2:                withName(SID.FOLLOWUP),
  nurture_3:                withName(SID.FOLLOWUP),
  onboarding_invite:        withName(SID.FOLLOWUP),

  // Deposit
  deposit_request:          withName(SID.DEPOSIT),

  // Form abandonment (use followup)
  form_abandoned_1h:        withName(SID.FOLLOWUP),
  form_abandoned_24h:       withName(SID.FOLLOWUP),
  form_abandoned_72h:       withName(SID.FOLLOWUP),
  form_abandoned_7d:        withName(SID.FOLLOWUP),
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
