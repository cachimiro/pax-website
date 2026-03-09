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

  // Send Supabase invite — creates auth.users entry and sends email
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name, role },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/crm/onboarding`,
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
