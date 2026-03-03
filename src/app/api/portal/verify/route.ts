import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHash, randomInt } from 'crypto'
import { sendEmail } from '@/lib/crm/messaging/channels'

/**
 * Request a verification code for the client portal.
 * Matches email + phone against leads table, sends 6-digit code via email.
 */
export async function POST(request: NextRequest) {
  const { email, phone } = await request.json()

  if (!email || !phone) {
    return NextResponse.json({ error: 'Email and phone are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedPhone = normalizePhone(phone.trim())
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  console.log(`[PORTAL] Verify request: email=${normalizedEmail}, phone=${normalizedPhone}, ip=${ip}`)

  // Rate limit: max 5 requests per IP per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: ipCount } = await admin
    .from('portal_verifications')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', oneHourAgo)

  // Use a rough IP-based check via audit log
  const { count: ipAuditCount } = await admin
    .from('portal_audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('action', 'verify_request')
    .eq('ip_address', ip)
    .gte('created_at', oneHourAgo)

  if ((ipAuditCount ?? 0) >= 5) {
    // Generic response — don't reveal rate limiting
    return NextResponse.json({ sent: true, verification_id: 'rate-limited' })
  }

  // Rate limit: max 3 codes per email per hour
  const { count: emailCount } = await admin
    .from('portal_verifications')
    .select('id', { count: 'exact', head: true })
    .eq('email', normalizedEmail)
    .gte('created_at', oneHourAgo)

  if ((emailCount ?? 0) >= 3) {
    return NextResponse.json({ sent: true, verification_id: 'rate-limited' })
  }

  // Log the attempt
  await admin.from('portal_audit_log').insert({
    action: 'verify_request',
    ip_address: ip,
    metadata: { email: normalizedEmail },
  })

  // Look up lead by email AND phone
  const { data: leads } = await admin
    .from('leads')
    .select('id, name, email, phone')
    .ilike('email', normalizedEmail)

  // Find a lead whose phone matches (normalized)
  const matchedLead = leads?.find(l => normalizePhone(l.phone ?? '') === normalizedPhone)

  console.log(`[PORTAL] Lead lookup: found ${leads?.length ?? 0} leads by email, phone match: ${!!matchedLead}`)
  if (leads?.length && !matchedLead) {
    console.log(`[PORTAL] Phone mismatch — stored phones: ${leads.map(l => normalizePhone(l.phone ?? '')).join(', ')}, input: ${normalizedPhone}`)
  }

  if (!matchedLead) {
    // Generic response — don't reveal whether account exists
    return NextResponse.json({ sent: true, verification_id: 'no-match' })
  }

  // Check they have active bookings
  const { data: opps } = await admin
    .from('opportunities')
    .select('id')
    .eq('lead_id', matchedLead.id)
    .not('stage', 'in', '("closed_won","closed_lost","closed_not_interested")')

  if (!opps?.length) {
    return NextResponse.json({ sent: true, verification_id: 'no-bookings' })
  }

  // Generate 6-digit code
  const code = String(randomInt(100000, 999999))
  const codeHash = createHash('sha256').update(code).digest('hex')

  // Invalidate previous codes for this email
  await admin
    .from('portal_verifications')
    .update({ expires_at: new Date().toISOString() })
    .eq('email', normalizedEmail)
    .eq('verified', false)
    .gt('expires_at', new Date().toISOString())

  // Store verification
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
  const { data: verification, error: insertError } = await admin
    .from('portal_verifications')
    .insert({
      lead_id: matchedLead.id,
      email: normalizedEmail,
      phone: normalizedPhone,
      code_hash: codeHash,
      expires_at: expiresAt.toISOString(),
    })
    .select('id')
    .single()

  if (insertError || !verification) {
    console.error('[PORTAL] Failed to insert verification:', insertError?.message ?? 'no data returned')
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }

  // Send code via email
  const firstName = (matchedLead.name ?? '').split(' ')[0] || 'there'
  const emailResult = await sendEmail(
    matchedLead.email!,
    'Your PaxBespoke verification code',
    `Hi ${firstName},\n\nYour verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not request this, please ignore this message.\n\nPaxBespoke`,
    admin,
  )

  if (!emailResult.success) {
    console.error('[PORTAL] Failed to send verification email:', emailResult.error)
    return NextResponse.json({ error: 'Failed to send verification code. Please try again.' }, { status: 500 })
  }

  // In dev/dry-run mode, log the code so it's accessible
  if (emailResult.sentVia === 'dry-run') {
    console.log(`[PORTAL] Verification code for ${normalizedEmail}: ${code} (dry-run — no email credentials configured)`)
  } else {
    console.log(`[PORTAL] Verification code sent to ${normalizedEmail} via ${emailResult.sentVia}`)
  }

  return NextResponse.json({
    sent: true,
    verification_id: verification.id,
    // In dev mode, include the code so it can be tested without email
    ...(emailResult.sentVia === 'dry-run' ? { _dev_code: code } : {}),
  })
}

function normalizePhone(phone: string): string {
  // Strip everything except digits and leading +
  let cleaned = phone.replace(/[^\d+]/g, '')
  // Convert 07xxx to +447xxx
  if (cleaned.startsWith('0') && cleaned.length >= 10) {
    cleaned = '+44' + cleaned.slice(1)
  }
  // Ensure +44 prefix for UK numbers without it
  if (cleaned.startsWith('44') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }
  return cleaned
}
