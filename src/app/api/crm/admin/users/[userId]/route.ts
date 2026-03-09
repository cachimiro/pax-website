import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = { params: Promise<{ userId: string }> }

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>, admin: ReturnType<typeof createAdminClient>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return null
  return user
}

/**
 * PATCH /api/crm/admin/users/[userId]
 * Update role, color, active status for a user. Admin only.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const caller = await assertAdmin(supabase, admin)
  if (!caller) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { userId } = await params
  const body = await req.json()

  const allowed = ['role', 'color', 'active', 'full_name', 'phone']
  const patch: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) patch[key] = body[key]
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}

/**
 * DELETE /api/crm/admin/users/[userId]
 * Soft-delete: sets active=false and clears Google tokens. Admin only.
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const caller = await assertAdmin(supabase, admin)
  if (!caller) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { userId } = await params

  // Prevent self-deletion
  const { data: { user } } = await supabase.auth.getUser()
  if (userId === user?.id) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  await admin.from('profiles').update({
    active: false,
    google_calendar_connected: false,
    google_access_token_enc: null,
    google_refresh_token_enc: null,
  }).eq('id', userId)

  return NextResponse.json({ success: true })
}
