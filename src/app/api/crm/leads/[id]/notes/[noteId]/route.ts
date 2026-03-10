import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string; noteId: string }> }

// PATCH /api/crm/leads/[id]/notes/[noteId]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { noteId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { body } = await req.json()
  if (!body?.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('lead_notes')
    .update({ body: body.trim(), updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .select('*, author:profiles(id, full_name, avatar_url)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ note: data })
}
