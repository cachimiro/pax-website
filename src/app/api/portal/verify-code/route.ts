import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHash, randomBytes, timingSafeEqual } from 'crypto'

/**
 * Verify a 6-digit code and return a session token.
 */
export async function POST(request: NextRequest) {
  const { verification_id, code } = await request.json()

  if (!verification_id || !code) {
    return NextResponse.json({ error: 'Verification ID and code are required' }, { status: 400 })
  }

  // Silently reject fake IDs from rate-limited/no-match responses
  if (['rate-limited', 'no-match', 'no-bookings'].includes(verification_id)) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: verification } = await admin
    .from('portal_verifications')
    .select('*')
    .eq('id', verification_id)
    .single()

  if (!verification) {
    return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 })
  }

  // Check expiry
  if (new Date(verification.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Code has expired. Please request a new one.' }, { status: 400 })
  }

  // Check attempts
  if (verification.attempts >= 3) {
    return NextResponse.json({
      error: 'Too many attempts. Please request a new code.',
      locked: true,
    }, { status: 429 })
  }

  // Verify code with timing-safe comparison
  const inputHash = createHash('sha256').update(String(code).trim()).digest('hex')
  const storedHash = verification.code_hash

  let match = false
  try {
    const a = Buffer.from(inputHash, 'hex')
    const b = Buffer.from(storedHash, 'hex')
    match = a.length === b.length && timingSafeEqual(a, b)
  } catch {
    match = false
  }

  if (!match) {
    // Increment attempts
    const newAttempts = verification.attempts + 1
    await admin
      .from('portal_verifications')
      .update({ attempts: newAttempts })
      .eq('id', verification_id)

    const remaining = 3 - newAttempts
    if (remaining <= 0) {
      // Log suspicious activity
      await admin.from('portal_audit_log').insert({
        lead_id: verification.lead_id,
        action: 'verify_locked_out',
        metadata: { verification_id, email: verification.email },
      })
      return NextResponse.json({
        error: 'Too many attempts. Please request a new code.',
        locked: true,
      }, { status: 429 })
    }

    return NextResponse.json({
      error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      remaining,
    }, { status: 400 })
  }

  // Code is correct — generate session token
  const sessionToken = randomBytes(32).toString('hex')
  const sessionExpiry = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

  await admin
    .from('portal_verifications')
    .update({
      verified: true,
      session_token: sessionToken,
      expires_at: sessionExpiry.toISOString(), // extend expiry for session
    })
    .eq('id', verification_id)

  // Audit log
  await admin.from('portal_audit_log').insert({
    lead_id: verification.lead_id,
    action: 'verify_success',
    metadata: { verification_id, email: verification.email },
  })

  return NextResponse.json({
    session_token: sessionToken,
    expires_at: sessionExpiry.toISOString(),
  })
}
