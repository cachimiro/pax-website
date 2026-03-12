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

  const { data: sub } = await admin
    .from('subcontractors')
    .select('id, email, name, status, invite_token, user_id')
    .eq('id', payload.subcontractor_id)
    .single()

  if (!sub) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
  }
  if (sub.status === 'suspended') {
    return NextResponse.json({ error: 'This account has been suspended' }, { status: 403 })
  }

  // Already fully activated — treat as success so the UI can redirect to login
  if (sub.status === 'active' && sub.user_id) {
    return NextResponse.json({ success: true, message: 'Account already activated. You can log in.' })
  }

  if (sub.invite_token !== token) {
    return NextResponse.json({ error: 'Invalid invitation link' }, { status: 400 })
  }

  let authUserId: string

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: sub.email,
    password,
    email_confirm: true,
    user_metadata: { roles: ['fitter'], subcontractor_id: sub.id, name: sub.name },
  })

  if (authError) {
    if (!authError.message.includes('already been registered')) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Auth user already exists (double-submit or previous partial activation).
    // Look them up by email, update their password, and complete the subcontractor row.
    const { data: listRes } = await admin.auth.admin.listUsers()
    const existing = listRes?.users?.find(u => u.email === sub.email)
    if (!existing) {
      return NextResponse.json(
        { error: 'Account setup incomplete. Please contact PaxBespoke.' },
        { status: 500 }
      )
    }
    await admin.auth.admin.updateUserById(existing.id, { password })
    authUserId = existing.id
  } else {
    authUserId = authUser.user.id
  }

  await admin.from('subcontractors').update({
    user_id: authUserId,
    status: 'active',
    activated_at: new Date().toISOString(),
    invite_token: null,
  }).eq('id', sub.id)

  return NextResponse.json({ success: true, message: 'Account activated. You can now log in.' })
}
