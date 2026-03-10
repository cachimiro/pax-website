import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

// GET /api/crm/leads/[id]/notes
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('lead_notes')
    .select('*, author:profiles(id, full_name, avatar_url)')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notes: data })
}

// POST /api/crm/leads/[id]/notes
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { section, body: noteBody } = body

  if (!section || !noteBody?.trim()) {
    return NextResponse.json({ error: 'section and body are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('lead_notes')
    .insert({ lead_id: id, section, body: noteBody.trim(), author_id: user.id })
    .select('*, author:profiles(id, full_name, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}
