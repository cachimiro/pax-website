import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PATCH  /api/crm/templates/[id] — Update a template (admin only)
 * DELETE /api/crm/templates/[id] — Delete a template (admin only)
 */

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin' ? user : null
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const body = await req.json()

  // Only allow updating specific fields
  const allowed: Record<string, unknown> = {}
  const fields = ['name', 'subject', 'body', 'channels', 'active', 'delay_rule', 'delay_minutes', 'trigger_stage', 'trigger_event', 'sort_order'] as const
  for (const f of fields) {
    if (body[f] !== undefined) allowed[f] = body[f]
  }
  allowed.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('message_templates')
    .update(allowed)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { error } = await supabase
    .from('message_templates')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
