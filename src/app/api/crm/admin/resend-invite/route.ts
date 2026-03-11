import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/crm/messaging/channels'

/**
 * POST /api/crm/admin/resend-invite
 * Admin-only. Sends a fresh invite email to a CRM user who hasn't completed onboarding.
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

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, role, onboarding_complete')
    .eq('id', userId)
    .single()

  if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  if (profile.onboarding_complete) {
    return NextResponse.json({ error: 'User has already completed onboarding' }, { status: 400 })
  }

  // Get the auth user's email
  const { data: authUser } = await admin.auth.admin.getUserById(userId)
  if (!authUser?.user?.email) {
    return NextResponse.json({ error: 'Auth user not found' }, { status: 404 })
  }

  const email = authUser.user.email
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'
  const redirectTo = `${baseUrl}/auth/callback?next=/crm/onboarding`

  const { data: linkData } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo },
  })

  const actionLink = linkData?.properties?.action_link
  if (!actionLink) {
    return NextResponse.json({ error: 'Failed to generate invite link' }, { status: 500 })
  }

  const correctedLink = actionLink.replace(
    /redirect_to=[^&]*/,
    `redirect_to=${encodeURIComponent(redirectTo)}`
  )

  const roleLabel = (profile.role as string).charAt(0).toUpperCase() + (profile.role as string).slice(1)

  await sendEmail(
    email,
    "Your PaxBespoke CRM invite",
    `Hi ${profile.full_name},\n\nHere is your updated invite link to join the PaxBespoke CRM as ${roleLabel}.\n\nClick the link below to set up your account and choose a password:\n\n${correctedLink}\n\nThis link expires in 24 hours.\n\nPaxBespoke`,
    admin,
  )

  return NextResponse.json({ success: true, email })
}
