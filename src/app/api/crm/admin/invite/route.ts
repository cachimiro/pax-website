import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DESIGNER_COLORS } from '@/lib/crm/types'
import { sendEmail } from '@/lib/crm/messaging/channels'

/**
 * POST /api/crm/admin/invite
 * Admin-only. Creates a CRM profile and sends an invite email via our own
 * email system (not Supabase's). Uses createUser + generateLink so the
 * redirectTo URL is not subject to Supabase's redirect allowlist.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

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

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'
  const redirectTo = `${baseUrl}/auth/callback?next=/crm/onboarding`

  const { count } = await admin.from('profiles').select('*', { count: 'exact', head: true })
  const color = DESIGNER_COLORS[(count ?? 0) % DESIGNER_COLORS.length]

  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const existingAuthUser = existingUsers?.users?.find(
    u => u.email?.toLowerCase() === email.toLowerCase()
  )

  if (existingAuthUser) {
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

    await sendInviteEmail(admin, existingAuthUser.email!, full_name, role, redirectTo)
    return NextResponse.json({ success: true, userId: existingAuthUser.id, existing_user: true })
  }

  // New user — create auth account (no password yet), then send recovery link to set one
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: newUser.user.id,
    full_name,
    role,
    color,
    active: true,
    onboarding_complete: false,
    invited_by: user.id,
  })

  if (profileError) {
    await admin.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  await sendInviteEmail(admin, email.trim().toLowerCase(), full_name, role, redirectTo)
  return NextResponse.json({ success: true, userId: newUser.user.id })
}

async function sendInviteEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  fullName: string,
  role: string,
  redirectTo: string,
) {
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  const actionLink = linkData?.properties?.action_link
  if (!actionLink) return

  const correctedLink = actionLink.replace(
    /redirect_to=[^&]*/,
    `redirect_to=${encodeURIComponent(redirectTo)}`
  )

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)

  await sendEmail(
    email,
    "You've been invited to PaxBespoke CRM",
    `Hi ${fullName},\n\nYou've been invited to join the PaxBespoke CRM as ${roleLabel}.\n\nClick the link below to set up your account and choose a password:\n\n${correctedLink}\n\nThis link expires in 24 hours.\n\nPaxBespoke`,
    admin,
  )
}
