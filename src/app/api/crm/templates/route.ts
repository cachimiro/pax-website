import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET  /api/crm/templates — List all templates (any authenticated user)
 * POST /api/crm/templates — Create a template (admin only)
 */

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json()
  const { slug, name, subject, body: templateBody, channels, delay_rule, delay_minutes, trigger_stage, trigger_event, sort_order } = body

  if (!slug || !name) {
    return NextResponse.json({ error: 'slug and name required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('message_templates')
    .insert({
      slug,
      name,
      subject: subject ?? '',
      body: templateBody ?? '',
      channels: channels ?? ['email'],
      delay_rule: delay_rule ?? 'immediate',
      delay_minutes: delay_minutes ?? 0,
      trigger_stage: trigger_stage ?? null,
      trigger_event: trigger_event ?? null,
      sort_order: sort_order ?? 99,
      active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
