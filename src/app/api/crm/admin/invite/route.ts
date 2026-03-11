import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DESIGNER_COLORS } from '@/lib/crm/types'

/**
 * POST /api/crm/admin/invite
 * Admin-only. Sends a Supabase invite email and creates a pending profile.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Verify caller is admin
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { email, role, full_name } = await req.json()

  if (!email || !role || !full_name) {
    return NextResponse.json({ error: 'email, role, and full_name are required' }, { status: 400 })
  }

  if (!['admin', 'sales', 'operations'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Auto-assign next colour from palette (cycle based on existing user count)
  const { count } = await admin.from('profiles').select('*', { count: 'exact', head: true })
  const color = DESIGNER_COLORS[(count ?? 0) % DESIGNER_COLORS.length]

  // Check if this email already has a CRM profile (true duplicate)
  // We must do this before calling inviteUserByEmail because Supabase auth
  // shares a single user pool — fitter portal users live there too.
  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const existingAuthUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (existingAuthUser) {
    // Check if they already have a CRM profile
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, role')
      .eq('id', existingAuthUser.id)
      .single()

    if (existingProfile) {
      return NextResponse.json(
        { error: `This email already has a CRM account (${existingProfile.role}).` },
        { status: 409 }
      )
    }

    // Auth user exists (e.g. fitter portal) but no CRM profile — create the profile
    // and send a password reset so they can set a password for CRM access.
    const { error: profileError } = await admin.from('profiles').insert({
      id: existingAuthUser.id,
      full_name,
      role,
      color,
      active: true,
      onboarding_complete: false,
      invited_by: user.id,
    })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Send password reset so they can log in to the CRM
    await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/crm/onboarding` },
    })

    return NextResponse.json({ success: true, userId: existingAuthUser.id, existing_user: true })
  }

  // New user — send standard Supabase invite email
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/crm/onboarding`,
  })

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  // Create the profile row (onboarding_complete: false until they connect Google)
  const { error: profileError } = await admin.from('profiles').insert({
    id: inviteData.user.id,
    full_name,
    role,
    color,
    active: true,
    onboarding_complete: false,
    invited_by: user.id,
  })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, userId: inviteData.user.id })
}
