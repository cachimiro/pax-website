import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const admin = createAdminClient()

  // Look up the auth user by email
  const { data: authList } = await admin.auth.admin.listUsers()
  const authUser = authList?.users?.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())

  // Always return success to avoid email enumeration — but only send if the
  // user exists and is a fitter (not a CRM staff account)
  if (authUser && authUser.user_metadata?.role === 'fitter') {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://paxbespoke.uk'
    await admin.auth.admin.generateLink({
      type: 'recovery',
      email: authUser.email!,
      options: { redirectTo: `${baseUrl}/fitter/login` },
    })
  }

  return NextResponse.json({ success: true })
}
