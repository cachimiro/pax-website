import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyInviteToken } from '@/lib/fitter/tokens'

export async function POST(request: NextRequest) {
  const { token, password } = await request.json()

  if (!token || !password) {
    return NextResponse.json({ error: 'Token and password are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const payload = verifyInviteToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired invitation link' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify subcontractor exists and is in invited state
  const { data: sub } = await admin
    .from('subcontractors')
    .select('id, email, name, status, invite_token')
    .eq('id', payload.subcontractor_id)
    .single()

  if (!sub) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }
  if (sub.status === 'active') {
    return NextResponse.json({ error: 'Account already activated. Please log in.' }, { status: 400 })
  }
  if (sub.status === 'suspended') {
    return NextResponse.json({ error: 'This account has been suspended' }, { status: 403 })
  }
  if (sub.invite_token !== token) {
    return NextResponse.json({ error: 'Invalid invitation link' }, { status: 400 })
  }

  // Create Supabase Auth account
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: sub.email,
    password,
    email_confirm: true,
    user_metadata: { role: 'fitter', subcontractor_id: sub.id, name: sub.name },
  })

  if (authError) {
    // If user already exists, try to link
    if (authError.message.includes('already been registered')) {
      return NextResponse.json({ error: 'An account with this email already exists. Please contact PaxBespoke.' }, { status: 409 })
    }
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // Update subcontractor with user_id
  await admin.from('subcontractors').update({
    user_id: authUser.user.id,
    status: 'active',
    activated_at: new Date().toISOString(),
    invite_token: null, // Clear token
  }).eq('id', sub.id)

  return NextResponse.json({ success: true, message: 'Account activated. You can now log in.' })
}
