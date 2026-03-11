import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/crm/messaging/channels'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const admin = createAdminClient()

  // Look up the auth user by email
  const { data: authList } = await admin.auth.admin.listUsers()
  const authUser = authList?.users?.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())

  // Only send if the user exists and is a fitter — always return success to avoid enumeration
  if (authUser && authUser.user_metadata?.role === 'fitter') {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'
    const redirectTo = `${baseUrl}/auth/callback?next=/fitter/reset-password`

    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: authUser.email!,
      options: { redirectTo },
    })

    const actionLink = linkData?.properties?.action_link
    if (actionLink) {
      // Supabase may override redirectTo if the URL isn't in its allowlist.
      // Replace whatever redirect_to ended up in the link with the correct one.
      const correctedLink = actionLink.replace(
        /redirect_to=[^&]*/,
        `redirect_to=${encodeURIComponent(redirectTo)}`
      )

      await sendEmail(
        authUser.email!,
        'Reset your PaxBespoke fitter password',
        `Hi,\n\nClick the link below to reset your PaxBespoke fitter account password.\n\n${correctedLink}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.\n\nPaxBespoke`,
        admin,
      )
    }
  }

  return NextResponse.json({ success: true })
}
