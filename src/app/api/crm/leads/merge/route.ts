import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { primaryId, secondaryId } = await req.json()

  if (!primaryId || !secondaryId) {
    return NextResponse.json({ error: 'primaryId and secondaryId are required' }, { status: 400 })
  }
  if (primaryId === secondaryId) {
    return NextResponse.json({ error: 'Cannot merge a lead with itself' }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify both leads exist and are not deleted
  const { data: leads, error: fetchErr } = await supabase
    .from('leads')
    .select('id, deleted_at')
    .in('id', [primaryId, secondaryId])

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  if (!leads || leads.length < 2) {
    return NextResponse.json({ error: 'One or both leads not found' }, { status: 404 })
  }

  const secondary = leads.find((l) => l.id === secondaryId)
  if (secondary?.deleted_at) {
    return NextResponse.json({ error: 'Cannot merge a deleted lead' }, { status: 400 })
  }

  // Reassign all related records from secondary → primary
  const tables: { table: string; column: string }[] = [
    { table: 'opportunities',  column: 'lead_id' },
    { table: 'tasks',          column: 'lead_id' },
    { table: 'bookings',       column: 'lead_id' },
    { table: 'message_logs',   column: 'lead_id' },
    { table: 'invoices',       column: 'lead_id' },
    { table: 'email_messages', column: 'lead_id' },
    { table: 'email_threads',  column: 'lead_id' },
  ]

  for (const { table, column } of tables) {
    const { error } = await supabase
      .from(table)
      .update({ [column]: primaryId })
      .eq(column, secondaryId)
    // Ignore errors for tables that may not exist in all environments
    if (error && error.code !== '42P01') {
      return NextResponse.json({ error: `Failed to reassign ${table}: ${error.message}` }, { status: 500 })
    }
  }

  // Soft-delete the secondary lead
  const { error: deleteErr } = await supabase
    .from('leads')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', secondaryId)

  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 })

  return NextResponse.json({ success: true, primaryId })
}
