import { createHmac, timingSafeEqual } from 'crypto'

/**
 * CTA (Call-To-Action) token system for email action links.
 *
 * Each follow-up email contains links like:
 *   /action/<token>
 *
 * The token encodes the opportunity ID, action, and expiry.
 * Signed with HMAC-SHA256 using CRM_WEBHOOK_SECRET to prevent tampering.
 *
 * Actions:
 *   not-interested    → close deal, stop all sequences
 *   need-more-time    → pause deal, switch to nurture cadence
 *   book-visit        → redirect to visit booking
 *   book-meet2        → redirect to Meet 2 booking
 *   select-fitting    → redirect to fitting date selection
 *   pay-deposit       → redirect to Stripe checkout
 *   proceed           → create invoice, send deposit link
 */

export type CTAAction =
  | 'not-interested'
  | 'need-more-time'
  | 'book-visit'
  | 'book-meet2'
  | 'select-fitting'
  | 'pay-deposit'
  | 'proceed'
  | 'manage-booking'

interface CTAPayload {
  opportunity_id: string
  action: CTAAction
  exp: number // Unix timestamp
}

const SECRET = () => process.env.CRM_WEBHOOK_SECRET || process.env.CRON_SECRET || 'dev-secret'

function sign(data: string): string {
  return createHmac('sha256', SECRET()).update(data).digest('hex')
}

/**
 * Generate a signed CTA token.
 * @param opportunityId - The opportunity this action applies to
 * @param action - The action to perform
 * @param expiresInDays - Token validity (default 30 days)
 * @returns Base64url-encoded signed token
 */
export function generateCTAToken(
  opportunityId: string,
  action: CTAAction,
  expiresInDays = 30
): string {
  const payload: CTAPayload = {
    opportunity_id: opportunityId,
    action,
    exp: Math.floor(Date.now() / 1000) + expiresInDays * 86400,
  }

  const data = toBase64Url(JSON.stringify(payload))
  const signature = sign(data)
  return `${data}.${signature}`
}

// base64url helpers — avoid Buffer.toString('base64url') which isn't supported in browser polyfills
function toBase64Url(str: string): string {
  return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(b64: string): string {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/') + '=='.slice(0, (4 - (b64.length % 4)) % 4)
  return Buffer.from(padded, 'base64').toString()
}

/**
 * Verify and decode a CTA token.
 * @returns The decoded payload, or null if invalid/expired
 */
export function verifyCTAToken(token: string): CTAPayload | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [data, signature] = parts
  const expectedSig = sign(data)

  // Timing-safe comparison
  try {
    const sigBuf = Buffer.from(signature, 'hex')
    const expectedBuf = Buffer.from(expectedSig, 'hex')
    if (sigBuf.length !== expectedBuf.length) return null
    if (!timingSafeEqual(sigBuf, expectedBuf)) return null
  } catch {
    return null
  }

  try {
    const payload = JSON.parse(fromBase64Url(data)) as CTAPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null // Expired
    if (!payload.opportunity_id || !payload.action) return null
    return payload
  } catch {
    return null
  }
}

/**
 * Generate a full CTA URL for use in email templates.
 */
export function generateCTAUrl(
  opportunityId: string,
  action: CTAAction,
  expiresInDays = 30
): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'
  const token = generateCTAToken(opportunityId, action, expiresInDays)
  return `${baseUrl}/action/${token}`
}

/**
 * Generate all standard CTA URLs for an opportunity.
 * Used by the automation engine when building template variables.
 */
export function generateAllCTAUrls(opportunityId: string): Record<string, string> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'
  const manageToken = generateCTAToken(opportunityId, 'manage-booking')
  return {
    cta_not_interested: generateCTAUrl(opportunityId, 'not-interested'),
    cta_need_more_time: generateCTAUrl(opportunityId, 'need-more-time'),
    cta_book_visit: generateCTAUrl(opportunityId, 'book-visit'),
    cta_book_meet2: generateCTAUrl(opportunityId, 'book-meet2'),
    cta_select_fitting: generateCTAUrl(opportunityId, 'select-fitting'),
    cta_pay_deposit: generateCTAUrl(opportunityId, 'pay-deposit'),
    cta_proceed: generateCTAUrl(opportunityId, 'proceed'),
    cta_manage_booking: `${baseUrl}/my-booking?token=${manageToken}`,
  }
}

/**
 * Generate a secure token for the public quote agreement page.
 * Stored in quote_tokens table; validated server-side on the /quote/[token] page.
 */
export async function generateQuoteToken(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  quoteId: string,
  expiresInDays = 30
): Promise<string | null> {
  const expiresAt = new Date(Date.now() + expiresInDays * 86400 * 1000).toISOString()

  const { data, error } = await supabase
    .from('quote_tokens')
    .insert({ quote_id: quoteId, expires_at: expiresAt })
    .select('token')
    .single()

  if (error || !data) {
    console.error('[quote_tokens] Failed to generate token:', error)
    return null
  }

  return data.token
}

/**
 * Build the full public URL for a quote agreement page.
 */
export function buildQuoteUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'
  return `${baseUrl}/quote/${token}`
}
